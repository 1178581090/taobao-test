const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: false });
  const c = await b.newContext({ storageState: '.browser-state/state.json' });
  const p = await c.newPage();
  await p.goto('https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(5000);

  // 注入红色测试面板
  await p.evaluate(() => {
    var panel = document.createElement('div');
    panel.id = 'tb-step-panel';
    panel.innerHTML = '<div style="position:fixed;top:80px;right:16px;width:320px;background:#ff5000;z-index:2147483647;padding:20px;color:#fff;font-size:16px;border-radius:8px;">📋 操作步骤面板</div>';
    document.body.appendChild(panel);
  });
  console.log('面板已注入');

  // 用 Playwright 原生 click 点击搭配购
  const card = await p.locator('div').filter({ hasText: '搭配购' }).first();
  if (await card.count() > 0) {
    console.log('找到搭配购，点击...');
    await card.click();
    await p.waitForTimeout(5000);
  }

  console.log('URL:', p.url());
  console.log('Title:', await p.title());

  // 检查面板
  const state = await p.evaluate(() => {
    var panel = document.getElementById('tb-step-panel');
    var bodyText = document.body ? document.body.textContent.slice(0, 300) : '';
    return JSON.stringify({
      panelExists: !!panel,
      bodyId: document.body.getAttribute('data-test-id'),
      hasCreateBtn: bodyText.includes('新建搭配') || bodyText.includes('创建')
    });
  });
  console.log('State:', state);

  await b.close();
})().catch(e => console.log('ERROR:', e.message));
