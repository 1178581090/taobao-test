// content.js — 注入淘宝搜索页，提取商品数据

function extractProducts() {
  const products = [];

  const selectors = [
    '.m-itemlist .item',
    '[data-spm="item"]',
    '.J_MatchItem',
    '.item.J_MatchItem',
    '.grid-view .item'
  ];

  let items = [];
  for (const sel of selectors) {
    items = document.querySelectorAll(sel);
    if (items.length > 0) break;
  }

  if (items.length === 0) {
    const allItems = document.querySelectorAll('[data-nid], [data-item-id]');
    if (allItems.length > 0) {
      items = allItems;
    }
  }

  items.forEach((item, index) => {
    try {
      const product = extractSingleProduct(item, index);
      if (product && product.title && product.price) {
        products.push(product);
      }
    } catch (e) {
      // 跳过解析失败的商品
    }
  });

  return products;
}

function extractSingleProduct(item, index) {
  const titleEl = item.querySelector('.title a, .J_ClickStat, a[title], .row-2 a');
  const title = (titleEl ? titleEl.textContent.trim() || titleEl.getAttribute('title') : '');

  const priceEl = item.querySelector('.price strong, .price, .c-price, [class*="price"] strong');
  let price = '';
  if (priceEl) {
    price = priceEl.textContent.trim().replace(/[^0-9.]/g, '');
  }

  const salesEl = item.querySelector('.deal-cnt, .sale-cnt, [class*="deal"], [class*="sale"]');
  let sales = '';
  if (salesEl) {
    sales = salesEl.textContent.trim();
  }

  const shopEl = item.querySelector('.shopname, .shop span, [class*="shop"] span, [class*="seller"]');
  let shop = '';
  if (shopEl) {
    shop = shopEl.textContent.trim();
  }

  const isTmall = !!item.querySelector('.tmall, [class*="tmall"], .icon-tmall, img[src*="tmall"]');

  const activityTags = [];
  const tagEls = item.querySelectorAll('.icon, .tag, [class*="icon"], [class*="tag"], .activity');
  tagEls.forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length < 20 && !/^\d+$/.test(text)) {
      activityTags.push(text);
    }
  });

  const promoEl = item.querySelector('.coupon, [class*="coupon"], [class*="promo"], .yh');
  let promo = '';
  if (promoEl) {
    promo = promoEl.textContent.trim();
  }

  return {
    index: index + 1,
    title,
    price: parseFloat(price) || 0,
    sales,
    shop,
    isTmall,
    activityTags,
    promo
  };
}

function init() {
  const products = extractProducts();

  if (products.length === 0) return;

  const bar = document.createElement('div');
  bar.id = '__tb_extract_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#ff5000;color:#fff;padding:10px 20px;display:flex;' +
    'align-items:center;justify-content:center;gap:12px;font-size:14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  const text = document.createElement('span');
  text.textContent = `已提取 ${products.length} 个商品数据`;

  const btn = document.createElement('button');
  btn.textContent = '复制到剪贴板';
  btn.style.cssText = 'background:#fff;color:#ff5000;border:none;padding:6px 16px;' +
    'border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;';
  btn.onclick = async () => {
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
  };

  bar.appendChild(text);
  bar.appendChild(btn);
  document.body.insertBefore(bar, document.body.firstChild);
}

setTimeout(init, 2000);
