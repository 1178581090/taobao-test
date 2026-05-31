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

async function scanQianniuStore(requestingTabId) {
  var tab = await chrome.tabs.create({ url: 'https://myseller.taobao.com/home.htm', active: false });
  var tabId = tab.id;
  try {
    await waitForTabLoad(tabId);
    await sleep(4000);
    var resp = await chrome.tabs.sendMessage(tabId, { action: 'autoExtract', mode: 'qianniu' });
    if (!resp || !resp.store) {
      throw new Error('千牛店铺数据提取失败');
    }
    chrome.tabs.sendMessage(requestingTabId, { action: 'qianniuData', data: resp })
      .catch(function() {});
  } catch (err) {
    chrome.tabs.sendMessage(requestingTabId, {
      action: 'qianniuError', error: err.message || '千牛扫描失败'
    }).catch(function() {});
  } finally {
    chrome.tabs.remove(tabId).catch(function() {});
  }
}

// 存储待注入的步骤（tabId → steps），支持跨页面跳转持久注入
var _pendingSteps = {};

// 此函数会被 chrome.scripting.executeScript 序列化注入到目标页面
function showPanelFn(name, stepsHtml) {
  var oldPanel = document.getElementById('tb-step-panel');
  if (oldPanel) oldPanel.remove();

  var panel = document.createElement('div');
  panel.id = 'tb-step-panel';
  panel.innerHTML =
    '<div style="position:fixed;top:80px;right:16px;width:320px;max-height:70vh;overflow-y:auto;background:#fff;border:2px solid #ff5000;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,PingFang SC,Microsoft YaHei,sans-serif;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e8eaed;background:#fff1eb;border-radius:10px 10px 0 0;">' +
        '<strong style="font-size:14px;color:#ff5000;">📋 ' + (name || '操作步骤') + '</strong>' +
        '<button id="tb-step-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#9ca3af;padding:0;">✕</button>' +
      '</div>' +
      '<div style="padding:14px 16px;font-size:13px;line-height:2;color:#1f2937;">' + (stepsHtml || '') + '</div>' +
      '<div style="padding:8px 16px;font-size:10px;color:#9ca3af;border-top:1px solid #e8eaed;">对照上方步骤在当前页面操作</div>' +
    '</div>';
  document.body.appendChild(panel);
  document.getElementById('tb-step-close').onclick = function() { panel.remove(); };

  // 在目标页面设置轮询恢复（解决 SPA 内跳转）
  if (!window._tbStepRestoreId) {
    window._tbStepRestoreId = setInterval(function() {
      if (!document.getElementById('tb-step-panel') && document.body) {
        var p = document.createElement('div'); p.id = 'tb-step-panel';
        p.innerHTML = panel.querySelector('div').outerHTML;
        document.body.appendChild(p);
        document.getElementById('tb-step-close').onclick = function() { p.remove(); };
      }
    }, 3000);
  }
}

// 监听标签页 URL 变化，每次导航都用 scripting API 动态注入面板
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'complete' && _pendingSteps[tabId]) {
    var s = _pendingSteps[tabId];
    var code = '(' + showPanelFn.toString() + ')(' + JSON.stringify(s.name) + ',' + JSON.stringify(s.steps) + ');';
    setTimeout(function() {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showPanelFn,
        args: [s.name, s.steps]
      }).catch(function() {});
    }, 2000);
  }
});

async function openWithSteps(url, name, steps, requestingTabId) {
  var tab = await chrome.tabs.create({ url: url, active: true });
  _pendingSteps[tab.id] = { name: name, steps: steps };
  // 首次注入（用 scripting API，不依赖 content_scripts 匹配）
  try {
    await waitForTabLoad(tab.id);
    await sleep(2000);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showPanelFn,
      args: [name, steps]
    }).catch(function() {});
  } catch (e) {
    // 忽略，onUpdated 会重试
  }
}

// 标签页关闭时清理
chrome.tabs.onRemoved.addListener(function(tabId) {
  delete _pendingSteps[tabId];
});

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
  if (message.action === 'scanQianniu') {
    scanQianniuStore(sender.tab.id).catch(function(err) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'qianniuError',
        error: err.message || '千牛扫描失败'
      }).catch(function() {});
    });
    return true;
  }
  if (message.action === 'openWithSteps') {
    openWithSteps(message.url, message.name, message.steps, sender.tab.id)
      .catch(function(err) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'qianniuError', error: err.message
        }).catch(function() {});
      });
    return true;
  }
});
