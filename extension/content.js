// content.js — 注入淘宝搜索页/商品详情页，提取商品数据

// ===== 页面类型检测 =====

function detectPageType() {
  if (location.hostname === 's.taobao.com' && location.pathname.startsWith('/search')) {
    return 'search';
  }
  if (location.hostname === 'item.taobao.com' || location.hostname === 'detail.tmall.com') {
    return 'product';
  }
  if (location.protocol === 'file:') return 'main';
  return 'unknown';
}

// ===== 从 URL 提取商品 ID =====

function getItemId(url) {
  var match = url.match(/[?&]id=(\d+)/);
  return match ? match[1] : '';
}

// ===== 搜索页提取（已有逻辑） =====

function extractProducts() {
  const products = [];
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
  const titleEl = cardLink.querySelector('[class*="title--"]');
  const title = titleEl ? titleEl.textContent.trim() : '';

  const priceIntEl = cardLink.querySelector('[class*="priceInt--"]');
  const priceFloatEl = cardLink.querySelector('[class*="priceFloat--"]');
  let price = 0;
  if (priceIntEl) {
    const intPart = priceIntEl.textContent.trim().replace(/[^0-9]/g, '');
    const floatPart = priceFloatEl ? priceFloatEl.textContent.trim().replace(/[^0-9]/g, '') : '';
    price = parseFloat(intPart + '.' + (floatPart || '0'));
  }

  const priceWrapper = cardLink.querySelector('[class*="innerNormalPriceWrapper--"], [class*="innerPriceWrapper--"]');
  let sales = '';
  if (priceWrapper && price > 0) {
    const fullText = priceWrapper.textContent.trim();
    const intText = priceIntEl.textContent.trim();
    const floatText = priceFloatEl ? priceFloatEl.textContent.trim() : '';
    const prefixIdx = fullText.indexOf('¥' + intText);
    if (prefixIdx >= 0) {
      let rest = fullText.substring(prefixIdx + 1 + intText.length);
      if (rest.startsWith('.')) {
        rest = rest.substring(1 + floatText.length);
      }
      rest = rest.replace(/^(优惠后|券后)/, '');
      const match = rest.match(/^([\d.]+万?\+?人付款)/);
      if (match) sales = match[1];
    }
  }

  const shopEl = cardLink.querySelector('[class*="shopName--"]');
  let shop = '';
  if (shopEl) {
    shop = shopEl.textContent.trim();
  }

  const isTmall = cardLink.href.includes('detail.tmall.com');

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
    promo,
    itemId: getItemId(cardLink.href)
  };
}

// ===== 商品详情页：提取标题 → 拆解关键词 → 跳转搜索 =====

function getProductTitle() {
  // 方式 1: meta og:title（最稳定）
  var ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content && ogTitle.content.trim().length > 3) {
    return ogTitle.content.trim();
  }

  // 方式 2: document.title 解析
  var pageTitle = (document.title || '').trim();
  var patterns = [
    /^(.+?)\s*[-–—|]\s*淘宝[网]?\s*[-–—|]?\s*天猫\s*$/,
    /^(.+?)\s*[-–—|]\s*淘宝[网]?\s*$/i,
    /^(.+?)\s*[-–—|]\s*天猫\s*$/i,
    /^(.+?)\s*[-–—|].+$/  // generic: "xxx - yyy"
  ];
  for (var pi = 0; pi < patterns.length; pi++) {
    var m = pageTitle.match(patterns[pi]);
    if (m && m[1].trim().length > 3) return m[1].trim();
  }

  // 方式 3: 页面内标题元素
  var hSelectors = [
    '[data-spm="1000983"]', '.tb-main-title', '.tb-detail-hd h3',
    'h1[data-spm]', '[class*="ItemTitle"]', '[class*="itemTitle"]',
    'h1', 'h2'
  ];
  for (var hi = 0; hi < hSelectors.length; hi++) {
    var el = document.querySelector(hSelectors[hi]);
    if (el) {
      var text = el.textContent.trim();
      if (text.length > 5 && text.length < 200 &&
          !/^(参数|详情|评价|推荐|相关|店铺|分类|规格|图文|视频|问答|商品|宝贝)/.test(text)) {
        return text;
      }
    }
  }

  return pageTitle;
}

function extractKeywords(title) {
  const stopWords = new Set(['的', '和', '与', '及', '之', '是', '在', '有', '为', '等', '了', '不', '也', '都', '就', '还', '要', '会', '可', '个', '这', '那', '我', '你', '他', '她', '它', '们', '新', '款', '色', '号', '码', '包邮']);
  const noiseWords = new Set(['包邮', '顺丰', '现货', '正品', '实拍', '特价', '促销', '清仓', '爆款', '新品', '批发', '代发', '高端', '品质', '专业']);

  // Step 1: Try delimiter split
  const parts = title.split(/[\s,，、/｜|+·\-—–]+/).filter(w => w.length >= 2);
  const delimitedWords = parts.filter(w => !stopWords.has(w) && !noiseWords.has(w) && w.length <= 8);
  if (delimitedWords.length >= 4) return delimitedWords.slice(0, 6);

  // Step 2: Dictionary-based matching for the costume domain
  const DICT = [
    // 品类词
    '演出服', '舞蹈服', '古装', '汉服', '旗袍', '礼服', '婚纱', 'Cosplay', '铠甲', '战袍',
    '戏服', '舞台服', '表演服', '合唱服', '练功服', '芭蕾舞服', '拉丁舞服', '爵士舞服',
    // 场景词
    '舞台剧', '舞台', '演出', '表演', '比赛', '影楼', '摄影', '年会', '六一', '艺考',
    '排练', '走秀', '庆典', '话剧', '戏曲', '舞蹈',
    // 定制词
    '定制', '来图', '来样', '批量',
    // 材质/工艺
    '刺绣', '缎面', '雪纺', '蕾丝', '钉珠', '印花',
    // 人群词
    '成人', '儿童', '少儿', '幼儿', '男女',
    // 红楼梦人物（3-4字常见名）
    '红楼梦', '贾宝玉', '林黛玉', '薛宝钗', '王熙凤', '贾元春', '贾迎春', '贾探春', '贾惜春',
    '史湘云', '妙玉', '贾母', '刘姥姥', '晴雯', '袭人', '贾琏', '贾政', '王夫人',
    '秦可卿', '贾赦', '贾珍', '贾蓉', '贾兰',
    // 常见古装角色
    '花木兰', '白娘子', '许仙', '小青', '梁山伯', '祝英台', '唐僧', '孙悟空',
    '猪八戒', '沙僧', '诸葛亮', '关羽', '张飞', '赵云', '吕布', '貂蝉', '杨贵妃',
    // 属性词
    '原版', '复刻', '高定', '重工', '渐变', '大袖', '齐胸', '襦裙', '马面裙'
  ];

  // Match known dictionary words in the title
  const dictMatches = [];
  for (const word of DICT) {
    let idx = title.indexOf(word);
    while (idx >= 0) {
      dictMatches.push({ word, start: idx, end: idx + word.length });
      idx = title.indexOf(word, idx + 1);
    }
  }
  dictMatches.sort((a, b) => a.start - b.start);

  // Select dict words: only skip if fully contained in another dict word
  const dictSelected = [];
  for (const m of dictMatches) {
    if (dictSelected.some(d => d.start <= m.start && d.end >= m.end)) continue;
    for (let i = dictSelected.length - 1; i >= 0; i--) {
      if (m.start <= dictSelected[i].start && m.end >= dictSelected[i].end) {
        dictSelected.splice(i, 1);
      }
    }
    dictSelected.push(m);
  }

  // Step 3: Fill gaps between dict words with n-gram
  const ngrams = [];
  const fullSegment = parts.join('');

  for (let len = 2; len <= 3; len++) {
    for (let i = 0; i <= fullSegment.length - len; i++) {
      const gram = fullSegment.substring(i, i + len);
      if (/[^一-龥a-zA-Z0-9]/.test(gram)) continue;
      if (stopWords.has(gram) || noiseWords.has(gram)) continue;
      // Skip if gram overlaps with any dict match
      const overlaps = dictMatches.some(m => i < m.end && i + len > m.start);
      if (overlaps) continue;
      ngrams.push({ word: gram, start: i, end: i + len, score: len === 3 ? 2 : 1 });
    }
  }

  // Greedy select n-grams, no overlap with each other or dict
  ngrams.sort((a, b) => b.score - a.score);
  const ngramSelected = [];
  const used = dictSelected.map(m => ({ start: m.start, end: m.end }));

  for (const g of ngrams) {
    if (used.some(u => g.start < u.end && g.end > u.start)) continue;
    ngramSelected.push(g.word);
    used.push({ start: g.start, end: g.end });
  }

  // Combine: dict words + n-gram fillers, ordered by position
  const all = [...dictSelected, ...ngrams.map((w, i) => ({ word: w, start: 0, end: 0 }))];
  // Keep dict words in position order, then ngrams
  const combined = [...dictSelected.map(m => m.word), ...ngramSelected];
  return combined.slice(0, 8);
}

function getProductShop() {
  // 方式 1: meta 标签
  var metaShop = document.querySelector('meta[property="og:product:nick"], meta[name="microshop-shop-name"]');
  if (metaShop && metaShop.content && metaShop.content.trim().length > 0) {
    return metaShop.content.trim();
  }

  // 方式 2: 页面中所有指向店铺的链接（不依赖 CSS class）
  var allLinks = document.querySelectorAll("a[href*='shop']");
  for (var ai = 0; ai < allLinks.length; ai++) {
    var text = allLinks[ai].textContent.trim();
    if (text.length > 1 && text.length < 30 && !/^(店铺|首页|全部|分类|宝贝|新品|微淘|动态|会员|联系|描述|评价|推荐)/.test(text)) {
      return text;
    }
  }

  // 方式 3: CSS 选择器（可能因 CSS Modules 失效）
  var selectors = [
    '.tb-shop-name', '.J_ShopName', '[data-spm="shop"]',
    'a[class*="name"][href*="shop"]',
    '[class*="shopName"]', '[class*="ShopName"]', '[class*="shop-name"]',
    '[class*="seller"][class*="name"]',
    '.slogo-shopname', '[data-spm*="shop"] span'
  ];
  for (var si = 0; si < selectors.length; si++) {
    var el = document.querySelector(selectors[si]);
    if (el) {
      var t = el.textContent.trim();
      if (t.length > 0 && t.length < 50 && !/^(店铺|首页|全部|分类|宝贝|新品|微淘|动态|会员|联系)/.test(t)) {
        return t;
      }
    }
  }

  // 方式 4: 全文搜索 "店铺" 关键词后的文字
  var bodyText = document.body.textContent;
  var shopLabelIdx = bodyText.search(/[店铺][名名称]|掌柜/);
  if (shopLabelIdx >= 0) {
    var after = bodyText.substring(shopLabelIdx + 2).trim();
    var match = after.match(/^[：: ]*([一-龥a-zA-Z0-9_-]{2,20})/);
    if (match && !/^(店铺|首页|全部|分类|宝贝|新品)/.test(match[1])) {
      return match[1];
    }
  }

  // 方式 5: 从 URL 中猜店铺名（Tmall 二级域名）
  var hostMatch = location.hostname.match(/^([a-z0-9]+).(taobao|tmall).com$/);
  if (hostMatch && hostMatch[1] && hostMatch[1].length > 1 && !/^(item|detail|s|www|shop)$/.test(hostMatch[1])) {
    return hostMatch[1];
  }

  return '';
}

function getProductPrice() {
  // 方式 1: meta 标签（最稳定）
  var metaPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]');
  if (metaPrice && metaPrice.content) {
    var val = parseFloat(metaPrice.content);
    if (val > 0) return val;
  }

  // 方式 2: JSON-LD 结构化数据
  var ldJson = document.querySelector('script[type="application/ld+json"]');
  if (ldJson) {
    try {
      var ld = JSON.parse(ldJson.textContent);
      if (ld.offers && ld.offers.price) {
        var p = parseFloat(ld.offers.price);
        if (p > 0) return p;
      }
    } catch (_) {}
  }

  // 方式 3: 价格 DOM 元素
  var selectors = [
    '#J_StrPrice .tb-rmb-num', '.tb-rmb-num',
    '[class*="priceValue"]', '[class*="PriceValue"]',
    '[class*="currentPrice"]', '[class*="CurrentPrice"]',
    '[class*="priceNum"]', '[class*="PriceNum"]',
    'em[class*="price"]', 'span[class*="price"]',
    '.tm-price', '.tm-promo-price',
    '[data-spm="price"]'
  ];
  for (var si = 0; si < selectors.length; si++) {
    var el = document.querySelector(selectors[si]);
    if (el) {
      var text = el.textContent.replace(/[^0-9.]/g, '').trim();
      var val = parseFloat(text);
      if (val > 0) return val;
    }
  }

  // 方式 4: 尝试从所有包含 ¥ 的元素中提取（放宽约束）
  var allElements = document.querySelectorAll('*');
  for (var ai = 0; ai < allElements.length; ai++) {
    var t = allElements[ai].textContent.trim();
    var match = t.match(/^[¥￥]\s*([\d,.]+)\s*$/);
    if (match) {
      var num = parseFloat(match[1].replace(/,/g, ''));
      if (num > 1 && num < 999999) return num;
    }
  }

  return 0;
}

function getProductSales() {
  // 尝试提取月销量
  var selectors = [
    '[class*="sellCount"]', '[class*="SellCount"]',
    '[class*="saleCount"]', '[class*="SaleCount"]',
    '[class*="monthSell"]', '[class*="MonthSell"]',
    'em[class*="sale"]', 'span[class*="sale"]',
    '[data-spm="sales"]'
  ];
  for (var si = 0; si < selectors.length; si++) {
    var el = document.querySelector(selectors[si]);
    if (el) {
      var text = el.textContent.trim();
      // 匹配 "月销 100+" 或 "100+人付款" 等
      var match = text.match(/([\d,.]+[万]?\+?)/);
      if (match) return match[1].replace(/,/g, '');
    }
  }
  return '';
}

function showProductPageBar(title, keywords) {
  var shop = getProductShop();
  var price = getProductPrice();
  var sales = getProductSales();

  // 存储当前产品信息（价格可能后续被用户手动修改）
  var itemId = getItemId(location.href);
  var currentProduct = { title: title, shop: shop, price: price, sales: sales, itemId: itemId };
  chrome.storage.local.set({ myProduct: currentProduct });
  console.log('[竞品助手] 产品信息已存储:', currentProduct);
  const bar = document.createElement('div');
  bar.id = '__tb_extract_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#ff5000;color:#fff;padding:14px 20px;display:flex;' +
    'flex-direction:column;align-items:center;gap:8px;font-size:14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'text-align:center;max-width:800px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  titleRow.textContent = '已识别：' + title + (shop ? ' | 店铺：' + shop : '') + (price > 0 ? ' | 售价：¥' + price : ' | 售价未识别') + (sales ? ' | 销量：' + sales : '');

  // Active keywords (can be toggled off)
  const activeKeywords = new Set(keywords);

  function getActiveKeywords() {
    return keywords.filter(k => activeKeywords.has(k));
  }

  const keywordRow = document.createElement('div');
  keywordRow.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;';

  const keywordLabel = document.createElement('span');
  keywordLabel.textContent = '关键词（点击移除）：';
  keywordLabel.style.cssText = 'opacity:.85;font-size:12px;';

  keywordRow.appendChild(keywordLabel);

  function renderTags() {
    // Clear existing tags (keep the label)
    while (keywordRow.children.length > 1) keywordRow.removeChild(keywordRow.lastChild);

    keywords.forEach(kw => {
      const tag = document.createElement('span');
      tag.textContent = kw;
      tag.style.cssText = activeKeywords.has(kw)
        ? 'background:rgba(255,255,255,.2);padding:2px 10px;border-radius:4px;font-size:13px;cursor:pointer;user-select:none;'
        : 'background:transparent;padding:2px 10px;border-radius:4px;font-size:13px;text-decoration:line-through;opacity:.4;cursor:pointer;user-select:none;';
      tag.title = '点击' + (activeKeywords.has(kw) ? '移除' : '恢复') + '此关键词';
      tag.onclick = () => {
        if (activeKeywords.has(kw)) {
          activeKeywords.delete(kw);
        } else {
          activeKeywords.add(kw);
        }
        renderTags();
      };
      keywordRow.appendChild(tag);
    });
  }

  renderTags();

  // Custom keyword input
  const addRow = document.createElement('div');
  addRow.style.cssText = 'display:flex;gap:6px;align-items:center;';

  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.placeholder = '手动添加关键词，回车确认…';
  addInput.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;font-size:13px;width:200px;';

  addInput.onkeydown = (e) => {
    if (e.key === 'Enter' && addInput.value.trim()) {
      const newKw = addInput.value.trim();
      if (!keywords.includes(newKw)) {
        keywords.push(newKw);
        activeKeywords.add(newKw);
        renderTags();
      }
      addInput.value = '';
    }
  };

  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.style.cssText = 'background:rgba(255,255,255,.2);color:#fff;border:none;' +
    'width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;';
  addBtn.onclick = () => {
    const newKw = addInput.value.trim();
    if (newKw && !keywords.includes(newKw)) {
      keywords.push(newKw);
      activeKeywords.add(newKw);
      renderTags();
    }
    addInput.value = '';
  };

  addRow.appendChild(addInput);
  addRow.appendChild(addBtn);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const searchBtn = document.createElement('button');
  searchBtn.textContent = '搜索同类竞品';
  searchBtn.style.cssText = 'background:#fff;color:#ff5000;border:none;padding:8px 20px;' +
    'border-radius:4px;cursor:pointer;font-size:14px;font-weight:600;';
  searchBtn.onclick = () => {
    const q = getActiveKeywords().join(' ');
    window.open('https://s.taobao.com/search?q=' + encodeURIComponent(q), '_blank');
    searchBtn.textContent = '已打开搜索页 ✓';
    searchBtn.style.background = '#e8f5e9';
    searchBtn.style.color = '#2e7d32';
  };

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'background:rgba(255,255,255,.2);color:#fff;' +
    'border:1px solid rgba(255,255,255,.4);padding:8px 16px;' +
    'border-radius:4px;cursor:pointer;font-size:13px;';
  closeBtn.onclick = () => bar.remove();

  btnRow.appendChild(searchBtn);
  btnRow.appendChild(closeBtn);
  bar.appendChild(titleRow);

  // 如果价格未识别，显示手动输入框
  if (price <= 0) {
    var priceRow = document.createElement('div');
    priceRow.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;';
    var priceLabel = document.createElement('span');
    priceLabel.textContent = '手动输入售价：¥';
    priceLabel.style.cssText = 'font-size:13px;opacity:.85;';
    var priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.placeholder = '输入你的售价';
    priceInput.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;font-size:13px;width:120px;';
    priceInput.onchange = function() {
      var val = parseFloat(priceInput.value);
      if (val > 0) {
        currentProduct.price = val;
        chrome.storage.local.set({ myProduct: currentProduct });
        priceInput.style.background = '#e8f5e9';
        priceInput.style.color = '#2e7d32';
      }
    };
    var priceNote = document.createElement('span');
    priceNote.textContent = '（输入后自动保存）';
    priceNote.style.cssText = 'font-size:11px;opacity:.6;';
    priceRow.appendChild(priceLabel);
    priceRow.appendChild(priceInput);
    priceRow.appendChild(priceNote);
    bar.appendChild(priceRow);
  }

  bar.appendChild(keywordRow);
  bar.appendChild(addRow);
  bar.appendChild(btnRow);
  document.body.insertBefore(bar, document.body.firstChild);
}

// ===== UI：注入顶部操作条 =====

function showExtractionBar(products, sourceLabel) {
  const bar = document.createElement('div');
  bar.id = '__tb_extract_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#ff5000;color:#fff;padding:10px 20px;display:flex;' +
    'align-items:center;justify-content:center;gap:12px;font-size:14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  const text = document.createElement('span');
  text.textContent = products.length > 0
    ? '已提取 ' + products.length + ' 个' + sourceLabel + '数据'
    : '未提取到商品数据';

  const btn = document.createElement('button');
  btn.textContent = products.length > 0 ? '复制到剪贴板' : '调试信息';
  btn.style.cssText = 'background:#fff;color:#ff5000;border:none;padding:6px 16px;' +
    'border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;';
  btn.onclick = async () => {
    if (products.length > 0) {
      const source = detectPageType() === 'search' ? 'taobao-search' : 'taobao-similar';
      const jsonObj = { source, url: location.href, count: products.length, products };
      try {
        const stored = await chrome.storage.local.get("myProduct");
        if (stored.myProduct) {
          // 用商品 ID 精确匹配（不会出错）
          var myItemId = (stored.myProduct.itemId || "");
          var matchIdx = myItemId ? products.findIndex(function(p) { return p.itemId === myItemId; }) : -1;
          // 兜底: 店铺名匹配
          if (matchIdx < 0) {
            var myShop = (stored.myProduct.shop || "").trim();
            if (myShop) {
              matchIdx = products.findIndex(function(p) { return p.shop && p.shop.trim() === myShop; });
              if (matchIdx < 0) {
                matchIdx = products.findIndex(function(p) { return p.shop && (p.shop.indexOf(myShop) >= 0 || myShop.indexOf(p.shop) >= 0); });
              }
            }
          }
          if (matchIdx >= 0) {
            var matched = products[matchIdx];
            jsonObj.myProduct = {
              title: matched.title,
              shop: matched.shop,
              price: matched.price,
              sales: matched.sales,
              isTmall: matched.isTmall,
              activityTags: matched.activityTags || [],
              promo: matched.promo || "",
              matched: true
            };
            products.splice(matchIdx, 1);
            jsonObj.count = products.length;
            console.log("[竞品助手] 匹配到你的商品并已从竞品列表移除:", matched.title, "¥" + matched.price, matched.sales);
          } else {
            jsonObj.myProduct = stored.myProduct;
            console.log("[竞品助手] 未在搜索结果中匹配到你的商品，使用产品页数据");
          }
          chrome.storage.local.remove("myProduct");
        }
      } catch (_) {}
      const json = JSON.stringify(jsonObj);
      try {
        await navigator.clipboard.writeText(json);
        text.textContent = '已复制 ' + products.length + ' 个商品到剪贴板，请返回工具页面';
        btn.textContent = '已复制 ✓';
        btn.style.background = '#e8f5e9';
        btn.style.color = '#2e7d32';
      } catch (e) {
        text.textContent = '复制失败，请点击重试';
      }
    } else {
      console.log('Page URL:', location.href);
      console.log('Page title:', document.title);
      console.log('DOM elements:', document.querySelectorAll('*').length);
    }
  };

  bar.appendChild(text);
  bar.appendChild(btn);
  document.body.insertBefore(bar, document.body.firstChild);
}

function showFallbackBar(fallback) {
  const bar = document.createElement('div');
  bar.id = '__tb_extract_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#e65100;color:#fff;padding:14px 20px;display:flex;' +
    'flex-direction:column;align-items:center;gap:8px;font-size:14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  const msgDiv = document.createElement('div');
  msgDiv.textContent = fallback.message;
  msgDiv.style.textAlign = 'center';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center;';

  const keywordSpan = document.createElement('span');
  keywordSpan.textContent = '建议关键词：' + fallback.suggestedKeyword;
  keywordSpan.style.cssText = 'background:#fff;color:#e65100;padding:4px 12px;border-radius:4px;font-size:13px;';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = '复制关键词';
  copyBtn.style.cssText = 'background:#fff;color:#e65100;border:none;padding:4px 12px;' +
    'border-radius:4px;cursor:pointer;font-size:13px;';
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(fallback.suggestedKeyword);
      copyBtn.textContent = '已复制 ✓';
    } catch (e) {
      copyBtn.textContent = '复制失败';
    }
  };

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'background:rgba(255,255,255,.2);color:#fff;' +
    'border:1px solid rgba(255,255,255,.4);padding:4px 12px;' +
    'border-radius:4px;cursor:pointer;font-size:13px;';
  closeBtn.onclick = () => bar.remove();

  row.appendChild(keywordSpan);
  row.appendChild(copyBtn);
  row.appendChild(closeBtn);
  bar.appendChild(msgDiv);
  bar.appendChild(row);
  document.body.insertBefore(bar, document.body.firstChild);
}

// ===== 自动提取：响应 background 的消息，不显示 UI 栏 =====

// —— 步骤浮窗（跨页面持久化）——
function showStepsPanel(name, stepsHtml) {
  var oldPanel = document.getElementById('tb-step-panel');
  if (oldPanel) oldPanel.remove();

  var panel = document.createElement('div');
  panel.id = 'tb-step-panel';
  panel.innerHTML =
    '<div style="position:fixed;top:80px;right:16px;width:320px;max-height:70vh;overflow-y:auto;background:#fff;border:2px solid #ff5000;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:99999;font-family:-apple-system,BlinkMacSystemFont,PingFang SC,Microsoft YaHei,sans-serif;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e8eaed;background:#fff1eb;border-radius:10px 10px 0 0;">' +
        '<strong style="font-size:14px;color:#ff5000;">📋 ' + (name || '操作步骤') + '</strong>' +
        '<button id="tb-step-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#9ca3af;padding:0;">✕</button>' +
      '</div>' +
      '<div style="padding:14px 16px;font-size:13px;line-height:2;color:#1f2937;">' + (stepsHtml || '') + '</div>' +
      '<div style="padding:8px 16px;font-size:10px;color:#9ca3af;border-top:1px solid #e8eaed;">对照上方步骤在当前页面操作</div>' +
    '</div>';
  document.body.appendChild(panel);
  document.getElementById('tb-step-close').onclick = function() {
    panel.remove();
    try { sessionStorage.removeItem('tb_inject_steps_name'); } catch(_) {}
    try { sessionStorage.removeItem('tb_inject_steps_html'); } catch(_) {}
  };
}

// 页面加载时自动恢复 + hash 路由监听 + 定时轮询
(function() {
  function restorePanel() {
    try {
      var savedName = sessionStorage.getItem('tb_inject_steps_name');
      var savedHtml = sessionStorage.getItem('tb_inject_steps_html');
      if (savedName && savedHtml && !document.getElementById('tb-step-panel')) {
        if (document.body) showStepsPanel(savedName, savedHtml);
      }
    } catch(_) {}
  }
  // 首次加载
  setTimeout(restorePanel, 1500);
  // hash 路由变化（SPA 内部跳转）
  window.addEventListener('hashchange', function() { setTimeout(restorePanel, 1000); });
  // popstate（pushState/replaceState 导航）
  window.addEventListener('popstate', function() { setTimeout(restorePanel, 1000); });
  // 每 5 秒轮询兜底
  setInterval(restorePanel, 5000);
})();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // —— 商品页自动提取 ——
  if (message.action === 'autoExtract' && message.mode === 'product') {
    var title = getProductTitle();
    var keywords = extractKeywords(title);
    var shop = getProductShop();
    var price = getProductPrice();
    var sales = getProductSales();
    var itemId = getItemId(location.href);
    sendResponse({
      action: 'productExtracted',
      title: title,
      keywords: keywords,
      shop: shop,
      price: price,
      sales: sales,
      itemId: itemId
    });
    return true;
  }

  // —— 搜索页自动提取 ——
  if (message.action === 'autoExtract' && message.mode === 'search') {
    var products = extractProducts();
    var myProduct = message.myProduct || null;
    if (myProduct) {
      var myItemId = myProduct.itemId || '';
      var matchIdx = myItemId ? products.findIndex(function(p) { return p.itemId === myItemId; }) : -1;
      if (matchIdx < 0) {
        var myShop = (myProduct.shop || '').trim();
        if (myShop) {
          matchIdx = products.findIndex(function(p) { return p.shop && p.shop.trim() === myShop; });
          if (matchIdx < 0) {
            matchIdx = products.findIndex(function(p) { return p.shop && (p.shop.indexOf(myShop) >= 0 || myShop.indexOf(p.shop) >= 0); });
          }
        }
      }
      if (matchIdx >= 0) {
        var matched = products[matchIdx];
        myProduct = {
          title: matched.title, shop: matched.shop, price: matched.price,
          sales: matched.sales, isTmall: matched.isTmall,
          activityTags: matched.activityTags || [], promo: matched.promo || '',
          matched: true
        };
        products.splice(matchIdx, 1);
      } else {
        myProduct.matched = false;
      }
    }
    sendResponse({
      action: 'searchExtracted',
      data: {
        source: 'taobao-search',
        url: location.href,
        count: products.length,
        products: products,
        myProduct: myProduct
      }
    });
    return true;
  }

  if (message.action === 'autoExtract' && message.mode === 'qianniu') {
    var body = (document.body || document.documentElement).textContent;

    function extract(pattern) {
      var m = body.match(pattern);
      return m ? m[1].trim() : '';
    }

    var store = {
      level: extract(/店铺成长层级\s*(Lv\.?\d+)/) || extract(/成长层级\s*(Lv\.?\d+)/),
      expScore: extract(/真实体验分\s*(\d+[\.\d]*)/) || extract(/体验分\s*(\d+[\.\d]*)/),
      deposit: extract(/保证金\s*(.{1,20}?)缴纳/) || extract(/保证金\s*(无需缴纳|已缴|未缴)/),
      violations: extract(/违规\s*(\d+)/),
      creditLevel: extract(/信用等级\s*(.{1,20}?)店铺保证金/) || extract(/信用等级\s*(.{1,10})/),
    };

    function panelNum(pattern) {
      var m = body.match(pattern);
      return m ? (parseInt(m[1]) || 0) : 0;
    }
    store.orders30d = panelNum(/支付子订单数\s*(\d+)/);
    store.visitors = panelNum(/访客数\s*(\d+)/);
    store.lastPayment = panelNum(/支付金额\s*(\d+)/);

    // 活动列表（从链接提取）
    var activities = [];
    var seen = new Set();
    var kw = ['活动', '报名', '促销', '大促', '折扣', '补贴', '秒杀', '立减', '狂欢', '特卖', '特价', '淘金币', '品牌新享', '消费券'];
    document.querySelectorAll('a').forEach(function(a) {
      var t = a.textContent.trim();
      if (t.length < 2 || t.length > 80) return;
      if (!kw.some(function(k) { return t.indexOf(k) >= 0; })) return;
      var key = t.slice(0, 20);
      if (seen.has(key)) return;
      seen.add(key);
      activities.push({ name: t, url: a.href });
    });

    sendResponse({
      scannedAt: new Date().toISOString(),
      store: store,
      activities: activities
    });
    return true;
  }

  // —— 步骤注入（千牛页面显示操作浮窗）——
  if (message.action === 'injectSteps') {
    // 存入 sessionStorage，跨页面跳转时持久化
    try { sessionStorage.setItem('tb_inject_steps_name', message.name); } catch(_) {}
    try { sessionStorage.setItem('tb_inject_steps_html', message.steps); } catch(_) {}
    showStepsPanel(message.name, message.steps);
    return;
  }

  // —— 主页面：收到结果后转发给页面 JS ——
  if (message.action === 'searchResults' || message.action === 'searchError' || message.action === 'searchProgress' ||
      message.action === 'qianniuData' || message.action === 'qianniuError') {
    var eventType;
    var payload;
    if (message.action === 'qianniuData') {
      eventType = 'tb-qianniu-data';
      payload = message.data;
    } else if (message.action === 'qianniuError') {
      eventType = 'tb-qianniu-error';
      payload = message.error;
    } else if (message.action === 'searchResults') {
      eventType = 'tb-competitor-result';
      payload = message.data;
    } else if (message.action === 'searchError') {
      eventType = 'tb-competitor-error';
      payload = message.error;
    } else {
      eventType = 'tb-competitor-progress';
      payload = message.step;
    }
    window.postMessage({ type: eventType, data: payload, error: message.error, step: message.step }, '*');
  }
});

// ===== 主页面事件中继 =====

function setupMainPageRelay() {
  window.addEventListener('message', function(e) {
    if (e.source !== window) return;
    if (e.data && e.data.type === 'tb-competitor-search') {
      chrome.runtime.sendMessage({
        action: 'searchCompetitors',
        productUrl: e.data.productUrl
      });
    }
    if (e.data && e.data.type === 'tb-qianniu-scan') {
      chrome.runtime.sendMessage({ action: 'scanQianniu' });
    }
    if (e.data && e.data.type === 'tb-open-steps') {
      chrome.runtime.sendMessage({
        action: 'openWithSteps',
        url: e.data.url,
        name: e.data.name,
        steps: e.data.steps
      });
    }
  });
}

// ===== 入口 =====

function init() {
  const pageType = detectPageType();

  if (pageType === 'search') {
    const products = extractProducts();
    showExtractionBar(products, '搜索结果');
  } else if (pageType === 'product') {
    const title = getProductTitle();
    const keywords = extractKeywords(title);
    showProductPageBar(title, keywords);
  }
}

var pageType = detectPageType();
if (pageType === 'main') {
  setupMainPageRelay();
} else if (pageType !== 'unknown') {
  setTimeout(init, 3000);
}
