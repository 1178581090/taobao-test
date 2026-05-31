// scan-qianniu.js — 扫描千牛网页版，输出结构化 JSON
// 用法：node scan-qianniu.js
// 输出：scan-qianniu.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.browser-state', 'state.json');
const OUTPUT_FILE = path.join(__dirname, 'scan-qianniu.json');

const PAGES = {
  home: 'https://myseller.taobao.com/home.htm',
  activity: 'https://myseller.taobao.com/home.htm/starb/tmc-next/sale/seller/homepage.htm',
  promotion: 'https://myseller.taobao.com/home.htm/tuiguangcenter_new/',
  promotionCenter: 'https://myseller.taobao.com/home.htm/tuiguangcenter_new/'
};

async function main() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error('[scan] 未找到登录态，请先运行 "node fetch-page.js https://myseller.taobao.com/home.htm" 登录一次');
    process.exit(1);
  }

  console.error('[scan] 启动浏览器...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: STATE_FILE
  });
  const page = await context.newPage();

  const result = { scannedAt: new Date().toISOString(), store: {}, activities: [], promotions: [] };

  // ---- 页面 1：首页 → 店铺状态 ----
  console.error('[scan] 抓取首页店铺状态...');
  await page.goto(PAGES.home, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  if (page.url().includes('login')) {
    console.error('[scan] 登录态过期，请重新运行 fetch-page.js 登录');
    await browser.close();
    process.exit(1);
  }

  const storeData = await page.evaluate(() => {
    const body = document.body ? document.body.textContent : '';
    function extract(pattern) {
      const m = body.match(pattern);
      return m ? m[1].trim() : null;
    }
    return {
      level: extract(/店铺成长层级\s*(Lv\.?\d+)/) || extract(/成长层级\s*(Lv\.?\d+)/) || '',
      expScore: extract(/真实体验分\s*(\d+[\.\d]*)/) || extract(/体验分\s*(\d+[\.\d]*)/) || '',
      deposit: extract(/保证金\s*(.{1,20}?)缴纳/) || extract(/保证金\s*(无需缴纳|已缴|未缴)/) || '',
      violations: extract(/违规\s*(\d+)/) || '0',
      creditLevel: extract(/信用等级\s*(.{1,20}?)店铺保证金/) || extract(/信用等级\s*(.{1,10})/) || '',
    };
  });

  const panelData = await page.evaluate(() => {
    const body = document.body ? document.body.textContent : '';
    function extract(pattern) { const m = body.match(pattern); return m ? parseInt(m[1]) || 0 : 0; }
    return {
      payment: extract(/支付金额\s*(\d+)/),
      visitors: extract(/访客数\s*(\d+)/),
      orders: extract(/支付子订单数\s*(\d+)/),
      pageViews: extract(/浏览量\s*(\d+)/),
    };
  });

  result.store = {
    level: storeData.level || '未知',
    expScore: storeData.expScore === '' ? 0 : parseFloat(storeData.expScore) || 0,
    deposit: storeData.deposit || '未知',
    violations: parseInt(storeData.violations) || 0,
    creditLevel: storeData.creditLevel || '未知',
    orders30d: panelData.orders,
    visitors: panelData.visitors,
    lastPayment: panelData.payment,
  };
  console.error('[scan] 店铺状态: ' + JSON.stringify(result.store));

  // ---- 页面 2：活动报名页 → 活动列表 ----
  console.error('[scan] 抓取活动报名页...');
  await page.goto(PAGES.activity, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const activityData = await page.evaluate(() => {
    const activities = [];
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent.trim();
      const href = a.href;
      if (!text || text.length < 2 || text.length > 80) return;
      if (href.includes('javascript') && !href.includes('http')) return;

      const activityKeywords = ['活动', '报名', '促销', '大促', '折扣', '补贴', '秒杀', '立减', '狂欢', '特卖', '特价', '淘金币', '品牌新享', '消费券'];
      const isActivity = activityKeywords.some(kw => text.includes(kw));
      if (!isActivity) return;

      activities.push({
        name: text,
        url: href,
        status: text.includes('已结束') ? '已结束' :
                text.includes('暂停') ? '暂停中' :
                text.includes('售卖中') ? '进行中' : '未知',
      });
    });

    const seen = new Set();
    return activities.filter(a => {
      const key = a.name.slice(0, 20);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  result.activities = activityData;
  console.error('[scan] 活动列表: ' + activityData.length + ' 项');

  // ---- 页面 3：推广中心 → 推广产品 ----
  console.error('[scan] 抓取推广中心...');
  await page.goto(PAGES.promotion, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const promoData = await page.evaluate(() => {
    const promotions = [];

    const subNavAnchors = document.querySelectorAll('[class*="menu"] a, [class*="nav"] a, [class*="sidebar"] a');
    subNavAnchors.forEach(a => {
      const text = a.textContent.trim();
      if (!text || text.length < 2 || text.length > 30) return;
      promotions.push({ name: text, url: a.href, type: '推广子菜单' });
    });

    document.querySelectorAll('[class*="card"], [class*="item"], [class*="product"], [class*="promo"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.length < 5 || text.length > 500) return;
      promotions.push({
        name: text.split('\n')[0].slice(0, 60),
        url: el.querySelector('a') ? el.querySelector('a').href : '',
        type: '推广产品',
      });
    });

    return promotions;
  });

  const seen = new Set();
  result.promotions = promoData.filter(p => {
    const key = p.name.slice(0, 25);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.error('[scan] 推广产品: ' + result.promotions.length + ' 项');

  // ---- 页面 4：推广中心 → 商品成交锦囊 ----
  console.error('[scan] 抓取推广中心商品推荐...');
  await page.goto(PAGES.promotionCenter, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(5000);

  var productRecs = await page.evaluate(function() {
    var body = document.body ? document.body.textContent : '';

    // 提取商品 ID
    var ids = [];
    var idPattern = /商品ID[：:]\s*(\d+)/g;
    var m;
    while ((m = idPattern.exec(body)) !== null) {
      ids.push(m[1]);
    }

    // 提取推荐策略
    var strategies = [];
    var strategyPattern = /建议使用【(.+?)】|建议用【(.+?)】/g;
    var sm;
    while ((sm = strategyPattern.exec(body)) !== null) {
      strategies.push(sm[1] || sm[2]);
    }

    // 提取策略关键词
    var keywords = [];
    var kwPattern = /(精准关键词锁屏|用户意图截流|新客流量转化|爆品人群复制|新品冷启|潜力打爆|爆品续航)/g;
    var kwm;
    while ((kwm = kwPattern.exec(body)) !== null) {
      keywords.push(kwm[1]);
    }

    // 提取价格
    var prices = [];
    var pricePattern = /(限时\d+元抵\d+元|下单立享[：:][^\s]{2,20})/g;
    var pm;
    while ((pm = pricePattern.exec(body)) !== null) {
      prices.push(pm[1]);
    }

    // channelHint → channelId 映射
    var hintMap = {
      '关键词推广': 'keywordPromo',
      '人群推广': 'crowdPromo',
      '精准人群推广': 'crowdPromo',
      '内容推广': 'contentPromo',
      '货品全站推': 'allStorePromo',
      '淘宝联盟': 'tbUnion'
    };

    // 组合结果
    var recs = [];
    for (var i = 0; i < ids.length && i < 10; i++) {
      var hint = strategies[i] || '';
      recs.push({
        productName: '商品' + ids[i],
        productId: ids[i],
        strategy: keywords[i] || hint,
        channelHint: hint,
        channelId: hintMap[hint] || '',
        priceInfo: prices[i] || ''
      });
    }
    return recs;
  });

  result.productRecommendations = productRecs;
  console.error('[scan] 商品推荐: ' + productRecs.length + ' 条');

  // ---- 输出 ----
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.error('[scan] 输出: ' + OUTPUT_FILE);
  console.log(JSON.stringify(result));
  await browser.close();
  console.error('[scan] 完成');
}

main().catch(err => {
  console.error('[scan] 错误:', err.message);
  process.exit(1);
});
