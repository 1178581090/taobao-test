// content.js — 注入淘宝搜索页/商品详情页，提取商品数据

// ===== 页面类型检测 =====

function detectPageType() {
  if (location.hostname === 's.taobao.com' && location.pathname.startsWith('/search')) {
    return 'search';
  }
  if (location.hostname === 'item.taobao.com' || location.hostname === 'detail.tmall.com') {
    return 'product';
  }
  return 'unknown';
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
    promo
  };
}

// ===== 商品详情页：提取标题 → 拆解关键词 → 跳转搜索 =====

function getProductTitle() {
  // 淘宝/天猫商品页 title 格式: "商品标题-淘宝网" 或 "商品标题 - 天猫"
  const pageTitle = (document.title || '').trim();

  const patterns = [
    /^(.+?)\s*[-–—|]\s*淘宝[网]?\s*[-–—|]?\s*天猫\s*$/,
    /^(.+?)\s*[-–—|]\s*淘宝[网]?\s*$/i,
    /^(.+?)\s*[-–—|]\s*天猫\s*$/i,
    /^(.+?)\s*[-–—|].+$/  // generic: "xxx - yyy"
  ];

  for (const p of patterns) {
    const m = pageTitle.match(p);
    if (m && m[1].trim().length > 3) return m[1].trim();
  }

  // Fallback: try heading elements
  const headings = document.querySelectorAll('h1, h2, h3, [class*="title"], [class*="Title"]');
  for (const h of headings) {
    const text = h.textContent.trim();
    if (text.length > 5 && text.length < 200 && !/^(参数|详情|评价|推荐|相关|店铺|分类|规格|图文|视频|问答)/.test(text)) {
      return text;
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

function showProductPageBar(title, keywords) {
  const bar = document.createElement('div');
  bar.id = '__tb_extract_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'background:#ff5000;color:#fff;padding:14px 20px;display:flex;' +
    'flex-direction:column;align-items:center;gap:8px;font-size:14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'text-align:center;max-width:800px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  titleRow.textContent = '已识别：' + title;

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
      const json = JSON.stringify({ source, url: location.href, count: products.length, products });
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

setTimeout(init, 3000);
