// 抓取千牛网页版页面内容（支持登录态持久化）
// 用法: node fetch-page.js <URL>
// 首次使用会弹出浏览器窗口供手动登录，登录态自动保存到 .browser-state/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.argv[2];
if (!TARGET_URL) {
  console.error('用法: node fetch-page.js <URL>');
  process.exit(1);
}

const STATE_DIR = path.join(__dirname, '.browser-state');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

async function main() {
  // 确保状态目录存在
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

  const contextOpts = {
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  // 复用之前的登录态
  if (fs.existsSync(STATE_FILE)) {
    console.error('[fetch] 加载已保存的登录态...');
    contextOpts.storageState = STATE_FILE;
  }

  let browser, context;

  if (fs.existsSync(STATE_FILE)) {
    console.error('[fetch] 加载已保存的登录态...');
  }

  browser = await chromium.launch({ headless: false });
  context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: fs.existsSync(STATE_FILE) ? STATE_FILE : undefined
  });

  // 如果已保存登录态，直接用 headless 也能访问
  const hasState = fs.existsSync(STATE_FILE);
  const page = await context.newPage();

  console.error('[fetch] 导航到: ' + TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 等待 SPA 渲染
  await page.waitForTimeout(4000);

  // 检查页面是否可用（非登录页/非空白页）
  var currentUrl = page.url();
  var isLoginPage = currentUrl.includes('login.taobao.com') || currentUrl.includes('loginmyseller')
    || currentUrl.includes('login.taobao') || currentUrl.includes('oauth');

  // 也检测页面内容是否像登录页
  if (!isLoginPage) {
    var bodyText = await page.evaluate(() => (document.body ? document.body.textContent || '' : ''));
    if (bodyText.includes('扫码登录') || bodyText.includes('账号登录') || bodyText.includes('手机验证码登录')) {
      isLoginPage = true;
    }
  }

  if (isLoginPage) {
    if (hasState) {
      console.error('[fetch] 登录态已过期，删除旧状态...');
      try { fs.unlinkSync(STATE_FILE); } catch (_) {}
    }
    console.error('[fetch] ⚠️  需要登录。浏览器窗口已打开，请在其中扫码或输入账号密码。');
    console.error('[fetch] 登录后将自动检测并继续（最多等待 300 秒）...');

    // 轮询检测登录成功（页面内容变化）
    var loggedIn = false;
    var startTime = Date.now();
    while (Date.now() - startTime < 300000) { // 5 分钟
      await page.waitForTimeout(3000);
      currentUrl = page.url();
      // 检查是否已跳离登录页
      if (!currentUrl.includes('login.taobao') && !currentUrl.includes('loginmyseller') && !currentUrl.includes('oauth')) {
        // 二次确认：页面是否有千牛/卖家中心的内容
        bodyText = await page.evaluate(() => (document.body ? document.body.textContent || '' : ''));
        if (bodyText.length > 500 && !bodyText.includes('扫码登录') && !bodyText.includes('验证码')) {
          loggedIn = true;
          break;
        }
      }
    }

    if (!loggedIn) {
      console.error('[fetch] 登录超时（5 分钟）。请重试。');
      await browser.close();
      process.exit(1);
    }

    console.error('[fetch] 登录成功！保存登录态...');
    await page.context().storageState({ path: STATE_FILE });
    console.error('[fetch] 登录态已保存到 .browser-state/state.json');
    await page.waitForTimeout(3000);
  } else if (!hasState) {
    console.error('[fetch] 保存登录态...');
    await page.context().storageState({ path: STATE_FILE });
    console.error('[fetch] 登录态已保存到 .browser-state/state.json');
  }

  // 提取页面内容
  console.error('[fetch] 提取页面内容...');
  const result = await page.evaluate(() => {
    const title = document.title || '(无标题)';

    // 提取所有可见文本（按区域组织）
    function getVisibleText(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent) continue;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const t = node.textContent.trim();
        if (t.length > 1) texts.push(t);
      }
      return texts;
    }

    // 提取导航菜单
    const navTexts = [];
    const navSelectors = [
      '[class*="menu"]', '[class*="nav"]', '[class*="sidebar"]',
      '[class*="leftNav"]', '[class*="aside"]', 'nav'
    ];
    navSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const t = el.textContent.trim();
        if (t.length > 5 && t.length < 500) navTexts.push(t);
      });
    });

    // 提取按钮和链接
    const clickables = [];
    document.querySelectorAll('a, button, [role="button"], [class*="btn"]').forEach(el => {
      const text = el.textContent.trim().slice(0, 100);
      const href = el.href || el.getAttribute('data-url') || '';
      if (text.length > 1) clickables.push({ text, href: href.slice(0, 200) });
    });

    // 提取所有链接
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.textContent.trim().slice(0, 80), href: a.href }))
      .filter(l => l.href && !l.href.startsWith('javascript:') && l.text)
      .slice(0, 200);

    // 提取表格/列表
    const tables = [];
    document.querySelectorAll('table, [class*="table"], [class*="list"]').forEach(el => {
      const t = el.textContent.trim();
      if (t.length > 20 && t.length < 2000) tables.push(t);
    });

    return {
      title,
      currentUrl: window.location.href,
      bodyText: (document.body ? document.body.textContent : '').slice(0, 20000),
      navMenus: [...new Set(navTexts)].slice(0, 30),
      clickables: clickables.slice(0, 300),
      links: links,
      tables: tables.slice(0, 20)
    };
  });

  console.log(JSON.stringify(result, null, 2));
  console.error('[fetch] 完成');
  await browser.close();
}

main().catch(err => {
  console.error('[fetch] 错误:', err.message);
  process.exit(1);
});
