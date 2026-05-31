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

// 此函数会被序列化注入到千牛页面，必须自包含
function injectStepPanel(name, stepsHtml) {
  // 移除旧面板
  var old = document.getElementById('tb-step-panel');
  if (old) old.remove();

  // 创建浮动面板
  var panel = document.createElement('div');
  panel.id = 'tb-step-panel';
  panel.innerHTML =
    '<div id=\"tb-step-inner\" style=\"position:fixed;top:80px;right:16px;width:320px;max-height:70vh;overflow-y:auto;background:#fff;border:2px solid #ff5000;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.25);z-index:2147483647;font-family:system-ui,PingFang SC,Microsoft YaHei,sans-serif;\">' +
      '<div style=\"display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e8eaed;background:#fff1eb;border-radius:10px 10px 0 0;\">' +
        '<strong style=\"font-size:14px;color:#ff5000;\">📋 ' + name + '</strong>' +
        '<button id=\"tb-step-close\" style=\"background:none;border:none;font-size:18px;cursor:pointer;color:#9ca3af;padding:0 4px;\">✕</button>' +
      '</div>' +
      '<div style=\"padding:14px 16px;font-size:13px;line-height:2;color:#1f2937;\">' + stepsHtml + '</div>' +
      '<div style=\"padding:8px 16px;font-size:10px;color:#9ca3af;border-top:1px solid #e8eaed;\">对照步骤在当前页面操作</div>' +
    '</div>';

  // 把面板加到 html 元素上（body 可能被 SPA 替换）
  if (document.body) {
    document.body.appendChild(panel);
  } else {
    (document.documentElement || document).appendChild(panel);
  }

  // 关闭按钮
  var closeBtn = document.getElementById('tb-step-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      var p = document.getElementById('tb-step-panel');
      if (p) { p.remove(); clearInterval(window._tbRestoreTimer); }
    };
  }

  // 启动轮询：SPA 导航后 body 可能被替换，面板消失时自动恢复
  if (window._tbRestoreTimer) clearInterval(window._tbRestoreTimer);
  window._tbRestoreTimer = setInterval(function() {
    var p = document.getElementById('tb-step-panel');
    var inner = document.getElementById('tb-step-inner');
    if ((!p || !inner) && document.body) {
      // 面板被 SPA 移除了，重新创建
      if (p) p.remove();
      var newPanel = document.createElement('div');
      newPanel.id = 'tb-step-panel';
      newPanel.innerHTML = panel.innerHTML;
      document.body.appendChild(newPanel);
      var cb = document.getElementById('tb-step-close');
      if (cb) cb.onclick = function() {
        var pp = document.getElementById('tb-step-panel');
        if (pp) { pp.remove(); clearInterval(window._tbRestoreTimer); }
      };
    }
  }, 2000);
}

// 存储待注入的步骤（tabId → steps），支持跨页面跳转持久注入
var _pendingSteps = {};


async function openWithSteps(url, name, steps, requestingTabId) {
  // 存到 chrome.storage.local，content script 启动时读取
  chrome.storage.local.set({ tb_pending_steps: { name: name, steps: steps } });

  // 打开千牛页面
  var tab = await chrome.tabs.create({ url: url, active: true });
  _pendingSteps[tab.id] = { name: name, steps: steps };

  // 等页面加载完后注入面板脚本
  await waitForTabLoad(tab.id);
  await sleep(3000);

  // 用 scripting.executeScript 注入面板
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: injectStepPanel,
    args: [name, steps]
  }).catch(function() {});

  // 监听原标签页 URL 变化 + 搭配购等在新标签页打开时也能注入
  var updateListener = function(tabId, changeInfo) {
    if (changeInfo.status === 'complete' && _pendingSteps[tabId]) {
      var s = _pendingSteps[tabId];
      setTimeout(function() {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: injectStepPanel,
          args: [s.name, s.steps]
        }).catch(function() {});
      }, 2000);
    }
  };
  chrome.tabs.onUpdated.addListener(updateListener);

  // 监听从原标签页打开的新标签页
  var createListener = function(newTab) {
    if (newTab.openerTabId === tab.id) {
      _pendingSteps[newTab.id] = { name: name, steps: steps };
    }
  };
  chrome.tabs.onCreated.addListener(createListener);

  // 10 分钟后清理
  setTimeout(function() {
    chrome.tabs.onUpdated.removeListener(updateListener);
    chrome.tabs.onCreated.removeListener(createListener);
    for (var tid in _pendingSteps) {
      if (_pendingSteps[tid] && _pendingSteps[tid].name === name) delete _pendingSteps[tid];
    }
  }, 600000);
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
  if (message.action === 'openUrl') {
    chrome.tabs.create({ url: message.url, active: true });
    return;
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
