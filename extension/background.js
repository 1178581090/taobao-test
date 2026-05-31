// background.js — Service Worker，编排后台标签页自动竞品分析

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function waitForTabLoad(tabId, timeoutMs) {
  timeoutMs = timeoutMs || 30000;
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('标签页加载超时（' + (timeoutMs / 1000) + '秒）'));
    }, timeoutMs);

    function listener(tid, info) {
      if (tid === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function extractFromProductPage(productUrl) {
  var tab = await chrome.tabs.create({ url: productUrl, active: false });
  var tabId = tab.id;
  try {
    await waitForTabLoad(tabId);
    await sleep(2500); // 等待 React 动态内容渲染
    var resp = await chrome.tabs.sendMessage(tabId, { action: 'autoExtract', mode: 'product' });
    if (!resp || !resp.title || resp.keywords.length === 0) {
      throw new Error('无法从商品页提取标题或关键词');
    }
    return resp;
  } finally {
    chrome.tabs.remove(tabId).catch(function() {});
  }
}

async function extractFromSearchPage(keywords, myProduct) {
  var searchUrl = 'https://s.taobao.com/search?q=' + encodeURIComponent(keywords.join(' '));
  var tab = await chrome.tabs.create({ url: searchUrl, active: false });
  var tabId = tab.id;
  try {
    await waitForTabLoad(tabId);
    await sleep(3000); // 等待 CSS Modules 渲染
    var resp = await chrome.tabs.sendMessage(tabId, {
      action: 'autoExtract', mode: 'search', myProduct: myProduct
    });
    if (!resp || !resp.data) {
      throw new Error('搜索页数据提取失败');
    }
    return resp.data;
  } finally {
    chrome.tabs.remove(tabId).catch(function() {});
  }
}

async function runPipeline(productUrl, requestingTabId) {
  // Phase 1: 提取商品信息
  var productData = await extractFromProductPage(productUrl);

  // Phase 2: 通知主页面进度
  chrome.tabs.sendMessage(requestingTabId, { action: 'searchProgress', step: 'search' })
    .catch(function() {});

  // Phase 3: 搜索同类竞品
  var searchData = await extractFromSearchPage(
    productData.keywords,
    {
      title: productData.title,
      shop: productData.shop,
      price: productData.price,
      sales: productData.sales,
      itemId: productData.itemId
    }
  );

  // Phase 4: 回传结果
  chrome.tabs.sendMessage(requestingTabId, {
    action: 'searchResults',
    data: searchData
  }).catch(function() {}); // 主页面可能已关闭
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'searchCompetitors') {
    var productUrl = message.productUrl;
    if (!productUrl) {
      sendResponse({ error: '未提供商品链接' });
      return;
    }
    runPipeline(productUrl, sender.tab.id).catch(function(err) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'searchError',
        error: err.message || '未知错误'
      }).catch(function() {});
    });
    return true; // 保持异步通道
  }
});
