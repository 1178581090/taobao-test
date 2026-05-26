// content.js — 注入淘宝搜索页，提取商品数据

function extractProducts() {
  const products = [];

  // 淘宝2026版搜索页：商品卡片是 <a class="doubleCardWrapperAdapt--...">
  const cardLinks = document.querySelectorAll('a[class*="doubleCardWrapperAdapt"]');
  console.log('找到商品卡片链接:', cardLinks.length);

  cardLinks.forEach((link, index) => {
    try {
      const product = extractSingleProduct(link, index);
      if (product && product.title && product.price > 0) {
        products.push(product);
      }
    } catch (e) {
      // 跳过解析失败的商品
    }
  });

  return products;
}

function extractSingleProduct(cardLink, index) {
  // 标题：title--ASSt27UY
  const titleEl = cardLink.querySelector('[class*="title--"]');
  const title = titleEl ? titleEl.textContent.trim() : '';

  // 价格：整数 priceInt--yqqZMJ5a + 小数 priceFloat--XpixvyQ1
  const priceIntEl = cardLink.querySelector('[class*="priceInt--"]');
  const priceFloatEl = cardLink.querySelector('[class*="priceFloat--"]');
  let price = 0;
  if (priceIntEl) {
    const intPart = priceIntEl.textContent.trim().replace(/[^0-9]/g, '');
    const floatPart = priceFloatEl ? priceFloatEl.textContent.trim().replace(/[^0-9]/g, '') : '';
    price = parseFloat(intPart + '.' + (floatPart || '0'));
  }

  // 销量：priceWrapper 中 "¥价格" 和 "销量+人付款" 紧挨在一起，无分隔
  // 如 "¥20.83000+人付款山东菏泽" → 价格=20.8, 销量=3000+人付款
  const priceWrapper = cardLink.querySelector('[class*="innerNormalPriceWrapper--"], [class*="innerPriceWrapper--"]');
  let sales = '';
  if (priceWrapper && price > 0) {
    const fullText = priceWrapper.textContent.trim();
    const intText = priceIntEl.textContent.trim();
    const floatText = priceFloatEl ? priceFloatEl.textContent.trim() : '';
    // 定位 "¥<int>" 在文本中的位置
    const prefixIdx = fullText.indexOf('¥' + intText);
    if (prefixIdx >= 0) {
      let rest = fullText.substring(prefixIdx + 1 + intText.length);
      // 跳过 ".浮点数"
      if (rest.startsWith('.')) {
        rest = rest.substring(1 + floatText.length);
      }
      // 跳过可选的 "优惠后"/"券后"
      rest = rest.replace(/^(优惠后|券后)/, '');
      const match = rest.match(/^([\d.]+万?\+?人付款)/);
      if (match) sales = match[1];
    }
  }

  // 店铺名：shopName--hdF527QA
  const shopEl = cardLink.querySelector('[class*="shopName--"]');
  let shop = '';
  if (shopEl) {
    shop = shopEl.textContent.trim();
  }

  // 天猫判断：链接指向 detail.tmall.com
  const isTmall = cardLink.href.includes('detail.tmall.com');

  // 活动标签：subIconWrapper--Vl8zAdQn 下的 span
  const activityTags = [];
  const subIconWrapper = cardLink.querySelector('[class*="subIconWrapper--"]');
  if (subIconWrapper) {
    const spans = subIconWrapper.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      if (text && text.length < 20) {
        activityTags.push(text);
      }
    });
  }

  // 优惠券
  let promo = '';
  const couponEl = cardLink.querySelector('[class*="coupon"], [class*="Coupon"]');
  if (couponEl) {
    promo = couponEl.textContent.trim();
  }

  return {
    index: index + 1,
    title,
    price,
    sales,
    shop,
    isTmall,
    activityTags,
    promo
  };
}

function init() {
  const products = extractProducts();
  console.log('提取到有效商品数量:', products.length);

  const bar = document.createElement('div');
  bar.id = '__tb_extract_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#ff5000;color:#fff;padding:10px 20px;display:flex;' +
    'align-items:center;justify-content:center;gap:12px;font-size:14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  const text = document.createElement('span');
  text.textContent = products.length > 0
    ? `已提取 ${products.length} 个商品数据`
    : `未提取到商品数据（找到 ${document.querySelectorAll('*').length} 个 DOM 元素）`;

  const btn = document.createElement('button');
  btn.textContent = products.length > 0 ? '复制到剪贴板' : '调试信息';
  btn.style.cssText = 'background:#fff;color:#ff5000;border:none;padding:6px 16px;' +
    'border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;';
  btn.onclick = async () => {
    if (products.length > 0) {
      const json = JSON.stringify({ source: 'taobao-search', url: location.href, count: products.length, products });
      try {
        await navigator.clipboard.writeText(json);
        text.textContent = `已复制 ${products.length} 个商品到剪贴板，请返回工具页面`;
        btn.textContent = '已复制 ✓';
        btn.style.background = '#e8f5e9';
        btn.style.color = '#2e7d32';
      } catch (e) {
        text.textContent = '复制失败，请点击重试';
      }
    } else {
      // 调试模式
      console.log('页面 URL:', location.href);
      console.log('页面标题:', document.title);
      console.log('DOM 元素总数:', document.querySelectorAll('*').length);
      console.log('doubleCardWrapperAdapt 卡片数:', document.querySelectorAll('[class*="doubleCardWrapperAdapt"]').length);
      console.log('item.taobao.com 链接数:', document.querySelectorAll('a[href*="item.taobao.com"]').length);
    }
  };

  bar.appendChild(text);
  bar.appendChild(btn);
  document.body.insertBefore(bar, document.body.firstChild);
}

// 延迟提取，等淘宝动态内容渲染
setTimeout(init, 3000);
