# 活动筛选 Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建「活动筛选」Tab，基于千牛网页版真实店铺数据和活动列表做个性化资格匹配推荐；同时将推广分析 Tab 从推荐引擎降级为工具手册。

**Architecture:** scan-qianniu.js 脚本扫描千牛 3 个页面输出结构化 JSON → ACTIVITY_RULES 规则数组做资格匹配 → 活动筛选 Tab 分 4 组渲染（可参加/差一步/暂不可参加/平台暂停）。推广分析 Tab 移除 getPromoPlan + hero + section，仅保留勾选面板和渠道详情。

**Tech Stack:** Playwright 脚本 + 纯前端 HTML/CSS/JS（无框架）

---

## File Structure

| 文件 | 职责 | 改动类型 |
|------|------|---------|
| `scan-qianniu.js` | 扫描千牛 3 页面输出 JSON | 新建 |
| `index.html:927-1040` | 推广分析 Tab HTML 骨架 | 修改（降级） |
| `index.html:1042-1360` | CHANNEL_KNOWLEDGE（保持不变） | 不修改 |
| `index.html:1362-1505` | getPromoPlan + renderPromotionTab + renderPromoHero + renderPromoSection | 删除（约 140 行） |
| `index.html:1507-1658` | renderPromoDetail + renderPromoPeerCard + toggle | 保留 |
| `index.html:1700+` | 活动筛选 Tab 全部代码 | 新增（约 300 行） |
| `index.html:<style>` | 活动筛选 Tab CSS | 新增（约 80 行） |
| `index.html:TabNav` | Tab 导航加"活动筛选"按钮 | 修改 |

---

### Task 1: scan-qianniu.js — 千牛扫描脚本

**Files:**
- Create: `E:\taobaoTest\scan-qianniu.js`
- Depends on: 已存在的 `.browser-state/state.json`（fetch-page.js 已登录保存）

- [ ] **Step 1: 创建脚本骨架**

```javascript
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
  promotion: 'https://myseller.taobao.com/home.htm/tuiguangcenter_new/'
};

async function main() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error('[scan] 未找到登录态，请先运行 fetch-page.js 登录一次');
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
  // ... 各页面抓取逻辑

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.error('[scan] 输出: ' + OUTPUT_FILE);
  console.log(JSON.stringify(result));
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: 实现首页抓取 — 店铺状态**

在 `main()` 中添加：

```javascript
  console.error('[scan] 抓取首页店铺状态...');
  await page.goto(PAGES.home, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  // 检测登录态
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

  // 数据面板在 iframe 或 script 中，尝试从页面文本提取
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
```

- [ ] **Step 3: 实现活动报名页抓取 — 活动列表**

```javascript
  console.error('[scan] 抓取活动报名页...');
  await page.goto(PAGES.activity, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const activityData = await page.evaluate(() => {
    const activities = [];
    const body = document.body ? document.body.textContent : '';

    // 提取所有链接，筛选活动相关
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent.trim();
      const href = a.href;
      if (!text || text.length < 2 || text.length > 80) return;
      if (href.includes('javascript') && !href.includes('http')) return;

      // 活动相关关键词
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

    // 去重（按 name）
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
```

- [ ] **Step 4: 实现推广中心抓取 — 推广产品**

```javascript
  console.error('[scan] 抓取推广中心...');
  await page.goto(PAGES.promotion, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const promoData = await page.evaluate(() => {
    const promotions = [];
    const body = document.body ? document.body.textContent : '';

    // 提取推广子菜单的所有链接
    const subNavAnchors = document.querySelectorAll('[class*="menu"] a, [class*="nav"] a, [class*="sidebar"] a');
    subNavAnchors.forEach(a => {
      const text = a.textContent.trim();
      if (!text || text.length < 2 || text.length > 30) return;
      promotions.push({ name: text, url: a.href, type: '推广子菜单' });
    });

    // 提取推广产品卡片（带价格的）
    const pricePattern = /(\d+)\s*元/;
    document.querySelectorAll('[class*="card"], [class*="item"], [class*="product"], [class*="promo"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.length < 5 || text.length > 500) return;
      const priceMatch = text.match(pricePattern);
      promotions.push({
        name: text.split('\n')[0].slice(0, 60),
        url: el.querySelector('a') ? el.querySelector('a').href : '',
        type: '推广产品',
        hasPrice: !!priceMatch,
      });
    });

    return promotions;
  });

  // 去重
  const seen = new Set();
  result.promotions = promoData.filter(p => {
    const key = p.name.slice(0, 25);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.error('[scan] 推广产品: ' + result.promotions.length + ' 项');
```

- [ ] **Step 5: 运行扫描验证**

```bash
node E:/taobaoTest/scan-qianniu.js 2>&1
```

Expected：浏览器打开并依次访问 3 个页面，输出 JSON 到控制台，`scan-qianniu.json` 文件生成。

- [ ] **Step 6: Commit**

```bash
git add scan-qianniu.js
git commit -m "feat: 新增 scan-qianniu.js 千牛扫描脚本"
```

---

### Task 2: ACTIVITY_RULES — 静态规则数组

**Files:**
- Modify: `E:\taobaoTest\index.html` — 在 CHANNEL_KNOWLEDGE 数组后面新增

- [ ] **Step 1: 定义规则数组**

在 `var CHANNEL_KNOWLEDGE = [...]` 的结束 `];` 之后，添加：

```javascript
// ===== 活动规则库（资格匹配） =====
var ACTIVITY_RULES = [
  // ===== 营销工具 =====
  { id: 'evalGift', name: '评价有礼', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: 'AI自动发奖，积累有效评价，提升商品转化',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'coupon', name: '优惠券', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '多场景优惠凭证工具，提升转化率',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'singleBao', name: '单品宝', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '单品标价工具，限时限量提转化，以价换量',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'multiDiscount', name: '多件优惠', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '满件满元合并下单优惠，提升客单价',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'gift', name: '赠品', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '下单即赠，满元满件赠，提升主品转化',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'singleReduce', name: '单品立减', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '支持SKU级设置，精准调整单品券后价',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'csCoupon', name: '客服专属优惠', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '客服向买家发送商品立减优惠，提升询单转化',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'pricePlan', name: '价格计划', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '官方调价工具，直接设置到手价自动配置优惠',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },
  { id: 'matchBuy', name: '搭配购', category: '营销工具', source: '营销 > 营销工具',
    rules: {}, costType: 'free', effort: 'low',
    effect: '搭配组合销售，提升客单价',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/nebula/mkt-tools/mkt-tools-home/home'
  },

  // ===== 营销活动 =====
  { id: 'taojinbi', name: '淘金币抵扣', category: '常驻活动', source: '营销 > 淘金币',
    rules: {}, costType: 'free', effort: 'low',
    effect: '淘金币频道曝光 + 搜索加权',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/taojinbi/'
  },
  { id: 'flashSale', name: '淘宝秒杀', category: '常驻活动', source: '营销 > 淘宝秒杀',
    rules: { expScore: { min: 4.2 }, orders30d: { min: 10 } },
    costType: 'free', effort: 'medium',
    effect: '秒杀频道流量，适合测款引流',
    howToImprove: '积累 10 单真实交易 + 体验分 ≥ 4.2 后解锁',
    url: 'https://myseller.taobao.com/home.htm/ltao-home/'
  },
  { id: 'superReduce', name: '超级立减', category: '常驻活动', source: '营销 > 超级立减',
    rules: {}, costType: 'free', effort: 'medium',
    effect: '单品立减券，平台补贴部分金额',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/starb/tmc-next/sale/seller/ttmjpt.htm',
    note: '大促期间（如618）暂停，预计大促结束后恢复'
  },
  { id: 'dailyDeal', name: '天天特价', category: '常驻活动', source: '营销 > 活动报名',
    rules: { expScore: { min: 4.2 }, orders30d: { min: 5 } },
    costType: 'free', effort: 'medium',
    effect: '日常特卖频道，门槛低，适合清库存或引流款',
    howToImprove: '积累 5 单真实交易 + 体验分 ≥ 4.2 后解锁',
    url: 'https://myseller.taobao.com/home.htm/starb/tmc-next/sale/seller/homepage.htm'
  },
  { id: 'bybt', name: '百亿补贴', category: '常驻活动', source: '营销 > 百亿补贴',
    rules: { expScore: { min: 4.5 }, orders30d: { min: 50 } },
    costType: 'free', effort: 'high',
    effect: '平台级补贴流量，需有价格竞争力',
    howToImprove: '体验分 ≥ 4.5 且近30天 ≥ 50单后解锁。当前差距较大，先积累基础销量',
    url: 'https://myseller.taobao.com/home.htm/qn-jhs-bybt-seller/bybt'
  },
  { id: 'brandNew', name: '品牌新享', category: '常驻活动', source: '营销 > 品牌新享',
    rules: { storeLevel: { min: 'Lv.3' } },
    costType: 'free', effort: 'medium',
    effect: '品牌新品扶持流量，适合有品牌资质的店铺',
    howToImprove: '提升店铺层级到 Lv.3 后解锁',
    url: 'https://myseller.taobao.com/home.htm/qianniu-alimama-ppxx/'
  },
  { id: 'couponMarketing', name: '消费券', category: '常驻活动', source: '营销 > 消费券',
    rules: {},
    costType: 'free', effort: 'medium',
    effect: '平台补贴消费券，提升大促转化',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/coupon_marketing/home'
  },
  { id: 'bidHot', name: '爆款竞价', category: '常驻活动', source: '营销 > 爆款竞价',
    rules: { orders30d: { min: 100 } },
    costType: 'free', effort: 'high',
    effect: '爆款竞价排名，适合已有爆款的店铺',
    howToImprove: '需近30天 ≥ 100单。当前差距很大，暂时不需要考虑',
    url: 'https://myseller.taobao.com/home.htm/starb/bidding/sale/race/market?biddingCode=all'
  },

  // ===== 推广产品 =====
  { id: 'keywordPromo', name: '关键词推广（原直通车）', category: '付费推广', source: '推广 > 关键词推广',
    rules: { deposit: { required: true } },
    costType: 'paid', effort: 'high',
    effect: '搜索广告位按点击付费，新手可 1 元抵 101 元试投',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/subway_new/'
  },
  { id: 'crowdPromo', name: '人群推广（原引力魔方）', category: '付费推广', source: '推广 > 人群推广',
    rules: { deposit: { required: true } },
    costType: 'paid', effort: 'high',
    effect: '推荐流广告按点击付费，适合主图视觉好的商品',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/display_new/'
  },
  { id: 'contentPromo', name: '内容推广', category: '付费推广', source: '推广 > 内容推广',
    rules: {},
    costType: 'paid', effort: 'high',
    effect: '短视频+直播推广，需要内容制作能力',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/adstrategy_content/'
  },
  { id: 'allStorePromo', name: '货品全站推', category: '付费推广', source: '推广 > 货品全站推',
    rules: {},
    costType: 'paid', effort: 'medium',
    effect: '全站流量智能投放，系统自动匹配',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/alltaopromotion/'
  },
  { id: 'tbUnion', name: '淘宝联盟（淘客）', category: '付费推广', source: '推广 > 淘宝联盟',
    rules: {},
    costType: 'paid', effort: 'low',
    effect: '按成交付费 CPS，不成交不花钱',
    howToImprove: null,
    url: 'https://myseller.taobao.com/home.htm/union-adv/'
  }
];
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: 新增 ACTIVITY_RULES 静态规则数组（23 条）"
```

---

### Task 3: 活动筛选 Tab — HTML 骨架

**Files:**
- Modify: `E:\taobaoTest\index.html` — Tab 导航 + 新 Tab 面板

- [ ] **Step 1: 添加 Tab 按钮**

找到现有 Tab 导航（搜索 `<button` 含 `onclick="switchTab"` 的部分），在推广分析按钮后添加：

```html
<button class="tab-btn" onclick="switchTab('activityFilter')">活动筛选</button>
```

- [ ] **Step 2: 添加 Tab 面板 HTML**

在 `</div>` (tabPromotion 结束) 之后，`<script>` 之前：

```html
<div id="tabActivityFilter" class="main" style="display:none;">
  <!-- 左侧面板 -->
  <div class="setup-panel">
    <div class="setup-section-title">店铺状态</div>
    <div id="afStoreCard" class="af-store-card">
      <div id="afStoreContent">尚未扫描店铺数据</div>
    </div>
    <button class="btn btn-primary" id="btnAfScan" style="width:100%;margin-top:8px;" onclick="scanStore()">
      重新扫描店铺数据
    </button>
    <div id="afScanStatus" class="setup-hint" style="margin-top:6px;display:none;"></div>

    <div class="setup-section-title" style="margin-top:14px;">筛选</div>
    <div id="afFilters">
      <label class="promo-check"><input type="checkbox" data-filter="eligible" checked onchange="applyAfFilter()"> 可参加 (<span id="afCntEligible">0</span>)</label>
      <label class="promo-check"><input type="checkbox" data-filter="almost" checked onchange="applyAfFilter()"> 差一步 (<span id="afCntAlmost">0</span>)</label>
      <label class="promo-check"><input type="checkbox" data-filter="ineligible" onchange="applyAfFilter()"> 暂不可参加 (<span id="afCntIneligible">0</span>)</label>
      <label class="promo-check"><input type="checkbox" data-filter="paused" onchange="applyAfFilter()"> 平台暂停 (<span id="afCntPaused">0</span>)</label>
    </div>
  </div>

  <!-- 右侧面板 -->
  <div class="result-panel">
    <div id="afEmpty" class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">活动筛选</div>
      <div class="empty-desc">点击左侧「重新扫描店铺数据」，基于你的真实千牛店铺状态筛选可参加的活动</div>
    </div>

    <div id="afResult" style="display:none;">
      <div class="result-strip" id="afSummary"></div>

      <!-- 四组活动列表 -->
      <div class="card" id="afGroupEligible" style="display:none;">
        <div class="card-header"><h3>✅ 可参加 (<span id="afGroupEligibleCnt">0</span>)</h3></div>
        <div id="afListEligible"></div>
      </div>

      <div class="card" id="afGroupAlmost" style="display:none;">
        <div class="card-header"><h3>⚠️ 差一步 (<span id="afGroupAlmostCnt">0</span>)</h3></div>
        <div id="afListAlmost"></div>
      </div>

      <div class="card" id="afGroupIneligible" style="display:none;">
        <div class="card-header"><h3>❌ 暂不可参加 (<span id="afGroupIneligibleCnt">0</span>) <span style="font-weight:400;font-size:11px;color:var(--text-muted);">（点击展开）</span></h3></div>
        <div id="afListIneligible" class="promo-collapsible" style="display:none;"></div>
      </div>

      <div class="card" id="afGroupPaused" style="display:none;">
        <div class="card-header"><h3>🔒 平台暂停 (<span id="afGroupPausedCnt">0</span>) <span style="font-weight:400;font-size:11px;color:var(--text-muted);">（点击展开）</span></h3></div>
        <div id="afListPaused" class="promo-collapsible" style="display:none;"></div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: 新增活动筛选 Tab HTML 骨架"
```

---

### Task 4: 活动筛选 Tab — CSS

**Files:**
- Modify: `E:\taobaoTest\index.html` `<style>` 区域

- [ ] **Step 1: 添加活动筛选专属 CSS**

在 `</style>` 之前添加：

```css
/* ===== 活动筛选 Tab ===== */
.af-store-card {
  padding: 12px;
  background: #f9fafb;
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.8;
  border: 1px solid var(--border);
}
.af-store-card .af-field { display: flex; justify-content: space-between; }
.af-store-card .af-label { color: var(--text-muted); }
.af-store-card .af-value { font-weight: 600; }
.af-store-card .af-value.good { color: var(--green); }
.af-store-card .af-value.bad { color: var(--red); }
.af-store-card .af-value.warn { color: var(--amber); }

.af-activity-card {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.af-activity-card:last-child { border-bottom: none; }
.af-activity-card:hover { background: #f9fafb; }
.af-activity-name {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.af-activity-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 400;
  white-space: nowrap;
}
.af-tag-tool { background: #e8f0fe; color: #1967d2; }
.af-tag-resident { background: #e6f4ea; color: #137333; }
.af-tag-campaign { background: #fce8e6; color: #c5221f; }
.af-tag-paid { background: #fef7e0; color: #ea8600; }
.af-activity-effect { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
.af-activity-rules { font-size: 11px; line-height: 1.7; margin-bottom: 6px; }
.af-rule-pass { color: var(--green); }
.af-rule-fail { color: var(--red); }
.af-activity-improve { font-size: 11px; color: var(--amber); margin-bottom: 6px; }
.af-activity-action { margin-top: 4px; }

/* 折叠组标题可点击 */
#afGroupIneligible .card-header h3,
#afGroupPaused .card-header h3 { cursor: pointer; }
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "style: 新增活动筛选 Tab CSS"
```

---

### Task 5: 活动筛选 Tab — JS 核心逻辑

**Files:**
- Modify: `E:\taobaoTest\index.html` `<script>` 区域

- [ ] **Step 1: 加载扫描数据 + 资格匹配函数**

在 script 区域末尾添加：

```javascript
// ===== 活动筛选 =====
var _afData = null;  // 缓存的扫描数据

function loadAfData() {
  if (_afData) return _afData;
  try {
    var raw = localStorage.getItem('tb_af_scan');
    if (raw) { _afData = JSON.parse(raw); }
  } catch (_) {}
  return _afData;
}

function saveAfData(data) {
  _afData = data;
  localStorage.setItem('tb_af_scan', JSON.stringify(data));
}

// 层级比较："Lv.2" vs "Lv.1" → true (2 >= 1)
function compareLevel(current, required) {
  var curNum = parseFloat((current || '').replace(/[^0-9.]/g, '')) || 0;
  var reqNum = parseFloat((required || '').replace(/[^0-9.]/g, '')) || 0;
  return curNum >= reqNum;
}

function matchRule(rule, store) {
  var failed = [];
  if (rule.rules.storeLevel) {
    if (!compareLevel(store.level, rule.rules.storeLevel.min)) {
      failed.push({ field: '店铺层级', current: store.level || '未知', required: rule.rules.storeLevel.min });
    }
  }
  if (rule.rules.expScore) {
    var curScore = parseFloat(store.expScore) || 0;
    if (curScore < rule.rules.expScore.min) {
      failed.push({ field: '体验分', current: curScore, required: rule.rules.expScore.min });
    }
  }
  if (rule.rules.orders30d) {
    var curOrders = parseInt(store.orders30d) || 0;
    if (curOrders < rule.rules.orders30d.min) {
      failed.push({ field: '近30天订单', current: curOrders, required: rule.rules.orders30d.min });
    }
  }
  if (rule.rules.deposit && rule.rules.deposit.required) {
    if (store.deposit && (store.deposit.includes('未缴') || store.deposit === '0')) {
      failed.push({ field: '保证金', current: '未缴', required: '已缴' });
    }
  }
  if (rule.rules.violations) {
    var curViolations = parseInt(store.violations) || 0;
    if (curViolations > rule.rules.violations.max) {
      failed.push({ field: '违规次数', current: curViolations, required: '≤ ' + rule.rules.violations.max });
    }
  }
  return failed;
}

function matchAllRules(store) {
  var results = [];
  ACTIVITY_RULES.forEach(function(rule) {
    var failed = matchRule(rule, store);
    var group;
    if (failed.length === 0) { group = 'eligible'; }
    else if (failed.length <= 2) { group = 'almost'; }
    else { group = 'ineligible'; }

    // 检查是否有 note 表明暂停
    if (rule.note && rule.note.includes('暂停')) { group = 'paused'; }

    results.push({ rule: rule, group: group, failed: failed });
  });

  // 排序：eligible 在前，每个组内按 category 排
  var order = { eligible: 0, almost: 1, paused: 2, ineligible: 3 };
  results.sort(function(a, b) {
    if (order[a.group] !== order[b.group]) return order[a.group] - order[b.group];
    return (a.rule.name || '').localeCompare(b.rule.name || '');
  });
  return results;
}
```

- [ ] **Step 2: 渲染函数**

```javascript
var TAG_CLASS = {
  '营销工具': 'af-tag-tool',
  '常驻活动': 'af-tag-resident',
  '大促活动': 'af-tag-campaign',
  '付费推广': 'af-tag-paid'
};

function renderAfResults() {
  var data = loadAfData();
  if (!data || !data.store) {
    $('afEmpty').style.display = '';
    $('afResult').style.display = 'none';
    return;
  }

  $('afEmpty').style.display = 'none';
  $('afResult').style.display = 'flex';
  $('afResult').style.flexDirection = 'column';
  $('afResult').style.gap = '18px';

  var matched = matchAllRules(data.store);
  var groups = { eligible: [], almost: [], ineligible: [], paused: [] };
  matched.forEach(function(m) { groups[m.group].push(m); });

  // 摘要
  $('afSummary').innerHTML =
    '<span style="font-size:13px;color:var(--text-muted);">' +
    '共 <strong>' + matched.length + '</strong> 项 · ' +
    '可参加 <strong style="color:var(--green);">' + groups.eligible.length + '</strong> 项 · ' +
    '差一步 <strong style="color:var(--amber);">' + groups.almost.length + '</strong> 项 · ' +
    '数据更新于 ' + (data.scannedAt ? data.scannedAt.slice(0, 16).replace('T', ' ') : '未知') +
    '</span>';

  // 渲染四组
  renderAfGroup('eligible', groups.eligible, 'afGroupEligible', 'afListEligible', 'afGroupEligibleCnt', true);
  renderAfGroup('almost', groups.almost, 'afGroupAlmost', 'afListAlmost', 'afGroupAlmostCnt', true);
  renderAfGroup('ineligible', groups.ineligible, 'afGroupIneligible', 'afListIneligible', 'afGroupIneligibleCnt', false);
  renderAfGroup('paused', groups.paused, 'afGroupPaused', 'afListPaused', 'afGroupPausedCnt', false);

  // 更新筛选计数
  $('afCntEligible').textContent = groups.eligible.length;
  $('afCntAlmost').textContent = groups.almost.length;
  $('afCntIneligible').textContent = groups.ineligible.length;
  $('afCntPaused').textContent = groups.paused.length;

  // 渲染店铺状态卡片
  renderAfStoreCard(data.store);
}

function renderAfGroup(groupKey, items, cardId, listId, cntId, defaultOpen) {
  if (items.length === 0) { $(cardId).style.display = 'none'; return; }
  $(cardId).style.display = '';
  $(cntId).textContent = items.length;

  // 折叠组标题可点击
  if (!defaultOpen) {
    $(cardId).querySelector('.card-header h3').onclick = function() { togglePromoSection(listId); };
  } else {
    $(listId).style.display = '';
  }

  var html = '';
  items.forEach(function(item) {
    var r = item.rule;
    var tagClass = TAG_CLASS[r.category] || 'af-tag-tool';
    var tagText = r.costType === 'paid' ? r.category + ' · 付费' : r.category;

    // 规则通过/失败
    var rulesHtml = '';
    var costEffortHtml = '';
    if (item.group === 'eligible') {
      costEffortHtml = '<span class="af-rule-pass">✓ ' +
        (r.costType === 'free' ? '免费' : '付费') + ' · ' +
        ({ low: '低精力', medium: '中等精力', high: '高精力' }[r.effort] || r.effort) +
        '</span>';
    } else {
      item.failed.forEach(function(f) {
        rulesHtml += '<span class="af-rule-fail">✗ ' + f.field + ': 需 ' + f.required + ', 当前 ' + f.current + '</span><br>';
      });
    }

    var improveHtml = r.howToImprove
      ? '<div class="af-activity-improve">💡 ' + escHtml(r.howToImprove) + '</div>'
      : '';

    var actionHtml = r.url
      ? '<a class="btn-xs btn-xs-primary" href="' + escHtml(r.url) + '" target="_blank" rel="noopener" style="text-decoration:none;">去参加 →</a>'
      : '';

    html += '<div class="af-activity-card">' +
      '<div class="af-activity-name">' +
        escHtml(r.name) +
        ' <span class="af-activity-tag ' + tagClass + '">' + escHtml(tagText) + '</span>' +
      '</div>' +
      '<div class="af-activity-effect">' + escHtml(r.effect) + '</div>' +
      (item.group === 'eligible'
        ? '<div class="af-activity-rules">' + costEffortHtml + '</div>'
        : '<div class="af-activity-rules">' + rulesHtml + '</div>'
      ) +
      improveHtml +
      '<div class="af-activity-action">' + actionHtml + '</div>' +
    '</div>';
  });
  $(listId).innerHTML = html;
}

function renderAfStoreCard(store) {
  function val(v, cls) { return '<span class="af-value ' + (cls || '') + '">' + escHtml(String(v)) + '</span>'; }
  var expCls = (parseFloat(store.expScore) || 0) >= 4.2 ? 'good' : 'bad';
  $('afStoreContent').innerHTML =
    '<div class="af-field"><span class="af-label">店铺层级</span>' + val(store.level) + '</div>' +
    '<div class="af-field"><span class="af-label">体验分</span>' + val(store.expScore || '暂无', expCls) + '</div>' +
    '<div class="af-field"><span class="af-label">保证金</span>' + val(store.deposit || '未知') + '</div>' +
    '<div class="af-field"><span class="af-label">信用等级</span>' + val(store.creditLevel || '未知') + '</div>' +
    '<div class="af-field"><span class="af-label">违规次数</span>' + val(store.violations || '0') + '</div>' +
    '<div class="af-field"><span class="af-label">近30天订单</span>' + val(store.orders30d || '0') + '</div>' +
    '<div class="af-field"><span class="af-label">昨日访客</span>' + val(store.visitors || '0') + '</div>' +
    '<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">数据来源: scan-qianniu.js</div>';
}

function applyAfFilter() {
  var filters = {};
  document.querySelectorAll('#afFilters input[data-filter]').forEach(function(cb) {
    filters[cb.dataset.filter] = cb.checked;
  });
  ['eligible', 'almost', 'ineligible', 'paused'].forEach(function(g) {
    var card = $('afGroup' + g.charAt(0).toUpperCase() + g.slice(1));
    if (card) { card.style.display = filters[g] ? '' : 'none'; }
  });
}
```

- [ ] **Step 3: scanStore 函数（触发扫描）**

```javascript
function scanStore() {
  $('afScanStatus').style.display = '';
  $('afScanStatus').textContent = '扫描中... 浏览器窗口将打开并自动抓取千牛数据，请勿关闭';
  $('afScanStatus').style.background = '#fef5e7';
  $('btnAfScan').disabled = true;

  // 尝试从 localStorage 读取已有数据先渲染
  var existing = loadAfData();
  if (existing) {
    $('afScanStatus').textContent = '已有历史数据（' + (existing.scannedAt || '').slice(0, 10) + '），扫描完成后将更新';
  }

  // 无法在前端直接调 Playwright —— 提示用户手动运行
  $('afScanStatus').innerHTML =
    '请在终端运行：<br><code style="background:#f3f4f6;padding:2px 6px;border-radius:3px;">node scan-qianniu.js</code><br>' +
    '然后将生成的 scan-qianniu.json 拖入页面，或复制内容粘贴到下方：<br>' +
    '<textarea id="afJsonInput" style="width:100%;height:80px;margin-top:4px;font-size:11px;" placeholder="粘贴 scan-qianniu.json 内容..."></textarea>' +
    '<button class="btn btn-primary btn-sm" onclick="importAfJson()" style="margin-top:4px;">导入数据</button>';
  $('afScanStatus').style.background = '#e8f0fe';
  $('btnAfScan').disabled = false;
}

function importAfJson() {
  try {
    var json = JSON.parse($('afJsonInput').value);
    saveAfData(json);
    $('afScanStatus').style.display = 'none';
    renderAfResults();
  } catch (e) {
    $('afScanStatus').textContent = 'JSON 格式错误，请检查: ' + e.message;
    $('afScanStatus').style.background = '#fce8e6';
  }
}

// 页面加载时恢复已有数据
function initActivityFilter() {
  var data = loadAfData();
  if (data) { renderAfResults(); }
}
```

- [ ] **Step 4: 在 switchTab 中添加新 Tab 的初始化**

找到 `switchTab` 函数，在推广分析 Tab 的 case 后面添加：

```javascript
  if (tab === 'activityFilter') {
    initActivityFilter();
  }
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: 新增活动筛选 Tab JS 核心逻辑（匹配引擎 + 渲染 + 导入）"
```

---

### Task 6: 推广分析 Tab 降级

**Files:**
- Modify: `E:\taobaoTest\index.html`

- [ ] **Step 1: 删除推荐引擎函数**

删除以下函数（整块删除）：
- `getPromoPlan()` — 约 40 行
- `renderPromoHero()` — 约 28 行
- `renderPromoSection()` — 约 42 行
- `togglePromoSection()` — 约 6 行
- `goToDetail()` — 约 16 行

- [ ] **Step 2: 重写 renderPromotionTab()**

```javascript
function renderPromotionTab() {
  restorePromoCheckboxes();
  var peerData = window._lastAnalysis;

  // 数据状态提示
  var hasPeer = peerData && peerData.total > 0;
  if (hasPeer) {
    var kwPart = peerData.keyword ? '「<strong>' + escHtml(peerData.keyword) + '</strong>」' : '';
    $('promoDataStatus').innerHTML = '已读取竞品搜索数据' + kwPart + '（' + peerData.total + ' 个商品），同行标签用于辅助。';
    $('promoDataStatus').style.background = '#eafaf1';
    $('promoDataStatus').style.borderColor = 'var(--green)';
  } else {
    $('promoDataStatus').innerHTML = '尚未搜索竞品数据。请先在「竞品分析」Tab 完成一次搜索以获得同行对比数据。';
    $('promoDataStatus').style.background = '#fef5e7';
    $('promoDataStatus').style.borderColor = 'var(--amber)';
  }

  _lastPromoRenderTs = peerData ? peerData.timestamp : 0;

  // 综合状态
  var myStatus = loadPromoStatus();
  var enabledCount = Object.values(myStatus).filter(Boolean).length;
  var totalCount = CHANNEL_KNOWLEDGE.length;
  $('promoSummary').innerHTML =
    '<span style="font-size:13px;color:var(--text-muted);">' +
    '你已开通 <strong style="color:var(--green);">' + enabledCount + '</strong> / ' + totalCount + ' 项。' +
    '下方为全部渠道操作手册，按需查阅。' +
    '</span>';

  // 同行对标
  renderPromoPeerCard();

  // 渠道详情（全部，按推荐分排序）
  renderPromoManual();
}
```

- [ ] **Step 3: 简化 renderPromoDetail → renderPromoManual**

将 `renderPromoDetail(plan)` 改名为 `renderPromoManual()`，移除 plan 参数和推荐排序逻辑：

```javascript
function renderPromoManual() {
  var myStatus = loadPromoStatus();
  var html = '';
  var effortLabels = { low: '一键搞定 · 几乎不费精力', medium: '偶尔维护 · 每周看一眼即可', high: '持续投入 · 需要经常看数据调整' };
  var effortColors = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)' };

  var unopened = [];
  var opened = [];
  CHANNEL_KNOWLEDGE.forEach(function(ch) {
    if (myStatus[ch.id]) { opened.push(ch); } else { unopened.push(ch); }
  });

  // 先渲染未开通，再渲染已开通（折叠）
  renderManualGroup('未开通渠道', unopened);
  renderManualGroup('已开通渠道', opened);

  function renderManualGroup(title, list) {
    if (list.length === 0) return;
    html += '<div style="font-weight:600;font-size:13px;margin:12px 0 6px;color:var(--text);">' + title + ' (' + list.length + ')</div>';
    list.forEach(function(ch) {
      var effortLabel = effortLabels[ch.effortLevel] || ch.effortLevel;
      var effortColor = effortColors[ch.effortLevel] || 'var(--text-muted)';
      var actionHtml = ch.directUrl
        ? '<a class="btn-xs btn-xs-primary" href="' + escHtml(ch.directUrl) + '" target="_blank" rel="noopener" style="margin-top:8px;display:inline-block;text-decoration:none;">在网页版打开</a>'
        : '<button class="btn-xs btn-xs-outline" onclick="showOcrZone(\'' + ch.id + '\')" style="margin-top:8px;">📸 截图辅助定位</button>';
      var stepsHtml = escHtml(ch.detailedSteps).replace(/\n/g, '<br>');
      var costNote = ch.costLevel !== 'low'
        ? ' <span style="font-size:10px;color:var(--amber);">（付费渠道，新手优先试免费）</span>' : '';

      html += '<div class="a-card" style="margin-bottom:10px;">' +
        '<div class="a-card-hd"><h4>' + escHtml(ch.name) + ' <span style="font-size:10px;color:var(--text-muted);font-weight:400;">' + escHtml(ch.type) + '</span></h4></div>' +
        '<div class="a-card-bd">' +
          '<strong>效果：</strong>' + escHtml(ch.effectDesc) + '<br>' +
          '<strong>路径：</strong>' + escHtml(ch.path) + '<br>' +
          '<strong>操作步骤：</strong><br>' + stepsHtml + '<br>' +
          '<strong>费用：</strong>' + escHtml(ch.costDesc) + costNote + '<br>' +
          '<strong>门槛：</strong>' + escHtml(ch.threshold) + '<br>' +
          '<strong>精力投入：</strong><span style="color:' + effortColor + ';font-weight:600;">' + effortLabel + '</span>' +
          '<br>' + actionHtml +
        '</div>' +
      '</div>';
    });
  }

  $('promoManualContent').innerHTML = html;
}
```

- [ ] **Step 4: 更新 HTML 结构**

删除不再使用的 HTML 元素：
- `<div id="promoHeroCard">` 整块
- `<div class="card" id="promoQuickWinsCard">` 整块
- `<div class="card" id="promoPaidCard">` 整块
- `<div class="card" id="promoLaterCard">` 整块
- 删除 `promoDetailToggle` 和 `promoDetailContent`，替换为 `<div id="promoManualContent"></div>`

"生成推荐"按钮改为"刷新"：

```html
<button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="renderPromotionTab()">刷新</button>
```

- [ ] **Step 5: 删除不再用的 CSS**

删除 hero 卡片和 section-item 相关 CSS（如 `.hero-badge`, `.hero-body`, `.section-item`, `.promo-why-tag` 等）。

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "refactor: 推广分析 Tab 降级为工具手册，移除推荐引擎"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 运行扫描并导入**

```bash
node E:/taobaoTest/scan-qianniu.js 2>&1
```

将输出的 JSON 保存，然后在浏览器中打开 `index.html`，切换到活动筛选 Tab，点击"重新扫描店铺数据"，在文本框中粘贴 JSON，点击"导入数据"。

- [ ] **Step 2: 验证活动筛选 Tab**

检查：
- 店铺状态卡片正确显示（层次、体验分、保证金等）
- 可参加数量正确（体验分为 0 时，大部分应该不可参加）
- 差一步项目显示"缺什么条件"
- 筛选开关切换正常

- [ ] **Step 3: 验证推广分析 Tab**

检查：
- 勾选"运费险"+"淘金币" → 刷新 → 未开通 11 项 + 已开通 2 项分开显示
- 每个卡片有正确的操作按钮
- 英雄卡片和分组列表不再出现

- [ ] **Step 4: Commit**

```bash
git add index.html scan-qianniu.json
git commit -m "verify: 端到端验证完成"
```

---

## Self-Review

1. **Spec coverage:** 检查设计文档的每个部分：
   - [x] 数据获取层 scan-qianniu.js → Task 1
   - [x] 规则引擎 ACTIVITY_RULES → Task 2
   - [x] 活动筛选 Tab HTML → Task 3
   - [x] 活动筛选 Tab CSS → Task 4
   - [x] 活动筛选 Tab JS → Task 5
   - [x] 推广分析降级 → Task 6
   - [x] 端到端验证 → Task 7

2. **Placeholder scan:** 无 TBD/TODO。所有步骤有完整代码。

3. **Type consistency:**
   - `ACTIVITY_RULES` 数组 → `matchRule` 函数使用 `rule.rules` → `matchAllRules` 返回 `{rule, group, failed}` → `renderAfResults` 渲染 all pass
   - `loadAfData` / `saveAfData` 使用 localStorage key `tb_af_scan`
   - `scanStore` → `importAfJson` → `renderAfResults` 数据流完整
   - `renderPromoManual` 替代 `renderPromoDetail`，HTML ID `promoManualContent` 匹配
