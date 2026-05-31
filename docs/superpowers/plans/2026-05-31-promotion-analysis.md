# 推广分析一期 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 index.html 新增「推广分析」Tab，基于内置渠道知识库 + 竞品搜索数据，生成优先级排序的行动清单，告诉用户「下一步做什么、为什么、怎么做、花多少钱」。

**Architecture:** 纯前端单文件，所有改动在 `index.html`。新增 Tab 导航切换，推广分析 Tab 复用竞品分析 Tab 搜索产生的同行活动标签数据（通过 `window._lastAnalysis` 桥接）。用户开通状态存 `localStorage`。

**Tech Stack:** 纯 HTML/CSS/JS，无构建工具，无依赖。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `index.html` | 修改 | 新增 Tab 导航、推广分析 HTML/CSS/JS 全部内容 |

改动集中在三个区域：
- `<style>` 块：新增约 60 行推广分析专属样式
- `<body>` 内 `<div class="topbar">` 之后：新增 Tab 导航 + 推广分析 HTML 结构
- `<script>` 块末尾：新增约 350 行 JS

---

### Task 1: 添加 Tab 导航栏

**Files:**
- Modify: `index.html` — topbar 和主布局

- [ ] **Step 1: 在 topbar 添加 Tab 按钮，包裹现有 main 为 Tab 容器**

将 topbar 从品牌名改为 Tab 导航：

```html
<div class="topbar">
  <div class="topbar-tabs">
    <button class="topbar-tab active" data-tab="competitor">竞品分析</button>
    <button class="topbar-tab" data-tab="promotion">推广分析</button>
  </div>
  <span class="topbar-sub">淘宝演出服定制类目</span>
</div>
```

将 `<div class="main">` 包裹为 `<div id="tabCompetitor" class="main">`，紧接其后添加空的推广分析容器：

```html
<div id="tabCompetitor" class="main">
  <!-- 原有竞品分析的 setup-panel + result-panel 全部内容 -->
</div>

<div id="tabPromotion" class="main" style="display:none;">
  <!-- 下一步填充 -->
</div>
```

- [ ] **Step 2: 添加 Tab 导航 CSS**

在 `<style>` 块中 `.topbar-sub` 之后插入：

```css
.topbar-tabs { display: flex; gap: 4px; }
.topbar-tab {
  padding: 6px 16px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all .2s;
}
.topbar-tab:hover { background: #f3f4f6; color: var(--text); }
.topbar-tab.active { background: var(--brand-light); color: var(--brand); }
```

删除原有的 `.topbar-brand` 和 `.topbar-dot` 样式规则（不再需要）。

- [ ] **Step 3: 添加 Tab 切换 JS**

在 `<script>` 块末尾（`</script>` 之前）添加：

```javascript
// ===== Tab 切换 =====
document.querySelector('.topbar-tabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.topbar-tab');
  if (!tab) return;
  var target = tab.dataset.tab;
  document.querySelectorAll('.topbar-tab').forEach(function(t) { t.classList.remove('active'); });
  tab.classList.add('active');
  document.querySelectorAll('.main').forEach(function(m) { m.style.display = 'none'; });
  if (target === 'competitor') {
    $('tabCompetitor').style.display = 'grid';
  } else {
    $('tabPromotion').style.display = 'grid';
    renderPromotionTab();
  }
});
```

- [ ] **Step 5: 验证 Tab 切换**

在浏览器打开 `index.html`，确认两个 Tab 可以正常切换，竞品分析功能不受影响。

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: 添加推广分析Tab导航框架"
```

---

### Task 2: 推广分析 Tab HTML 结构

**Files:**
- Modify: `index.html` — `#tabPromotion` 容器内

- [ ] **Step 1: 写入推广分析完整 HTML**

将 `#tabPromotion` 内容替换为：

```html
<div id="tabPromotion" class="main" style="display:none;">

  <!-- 左侧面板 -->
  <div class="setup-panel">

    <!-- 数据状态提示 -->
    <div id="promoDataStatus" class="setup-hint">
      尚未搜索竞品数据。请先在「竞品分析」Tab 完成一次搜索，再回到这里查看推广建议。
    </div>

    <div class="setup-section-title">我的推广现状</div>

    <div style="margin-bottom:4px;">
      <span class="field-label">服务工具</span>
    </div>
    <div id="promoCheckTools">
      <label class="promo-check"><input type="checkbox" data-id="freightInsurance" onchange="savePromoStatus()"> 运费险</label>
      <label class="promo-check"><input type="checkbox" data-id="goldCoins" onchange="savePromoStatus()"> 淘金币</label>
      <label class="promo-check"><input type="checkbox" data-id="sevenDayReturn" onchange="savePromoStatus()"> 7天无理由</label>
      <label class="promo-check"><input type="checkbox" data-id="fastRefund" onchange="savePromoStatus()"> 极速退款</label>
    </div>

    <div style="margin-top:12px;margin-bottom:4px;">
      <span class="field-label">付费推广</span>
    </div>
    <div id="promoCheckPaid">
      <label class="promo-check"><input type="checkbox" data-id="zhitongche" onchange="savePromoStatus()"> 直通车</label>
      <label class="promo-check"><input type="checkbox" data-id="yinlimofang" onchange="savePromoStatus()"> 引力魔方</label>
      <label class="promo-check"><input type="checkbox" data-id="wanxiangtai" onchange="savePromoStatus()"> 万相台</label>
      <label class="promo-check"><input type="checkbox" data-id="taoke" onchange="savePromoStatus()"> 淘客</label>
    </div>

    <div style="margin-top:12px;margin-bottom:4px;">
      <span class="field-label">平台活动</span>
    </div>
    <div id="promoCheckActivity">
      <label class="promo-check"><input type="checkbox" data-id="juhuasuan" onchange="savePromoStatus()"> 聚划算</label>
      <label class="promo-check"><input type="checkbox" data-id="tiantitemai" onchange="savePromoStatus()"> 天天特卖</label>
    </div>

    <div style="margin-top:14px;">
      <label class="field-label">月推广预算（¥）<span style="color:var(--text-muted);font-weight:400;">选填，后期使用</span></label>
      <input class="field-input" id="promoMonthlyBudget" type="number" placeholder="如：2000" onchange="savePromoBudget()">
    </div>

    <button class="btn btn-primary" id="btnPromoGenerate" style="width:100%;margin-top:10px;" onclick="renderPromotionTab()">
      生成推荐
    </button>

    <div class="setup-hint" style="margin-top:12px;">
      勾选你已开通的渠道（开通状态自动保存）。工具会基于你未开通的渠道生成推荐清单。
    </div>
  </div>

  <!-- 右侧面板 -->
  <div class="result-panel">
    <div id="promoEmpty" class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">推广行动清单</div>
      <div class="empty-desc">勾选左侧的推广现状，点击「生成推荐」查看你应该优先开通的渠道</div>
    </div>

    <div id="promoResult" style="display:none;">
      <!-- 综合状态卡片 -->
      <div class="result-strip" id="promoSummary"></div>

      <!-- 行动清单 P0 -->
      <div class="card-accent" id="promoListP0Card" style="display:none;">
        <div class="card-header"><h3><span class="card-dot" style="background:var(--red);"></span>优先处理（P0）</h3></div>
        <div class="improve-list" id="promoListP0"></div>
      </div>

      <!-- 行动清单 P1 -->
      <div class="card-accent" id="promoListP1Card" style="display:none;">
        <div class="card-header"><h3><span class="card-dot" style="background:var(--amber);"></span>尽快执行（P1）</h3></div>
        <div class="improve-list" id="promoListP1"></div>
      </div>

      <!-- 行动清单 P2 -->
      <div class="card-accent-green" id="promoListP2Card" style="display:none;">
        <div class="card-header"><h3><span class="card-dot"></span>可选尝试（P2）</h3></div>
        <div class="improve-list" id="promoListP2"></div>
      </div>

      <!-- 同行对标卡片 -->
      <div class="card" id="promoPeerCard" style="display:none;">
        <div class="card-header"><h3><span class="card-dot"></span>同行活动覆盖</h3></div>
        <div id="promoPeerContent"></div>
      </div>

      <!-- 渠道详情（折叠） -->
      <div class="toggle-bar open" id="promoDetailToggle" onclick="togglePromoDetail()">
        <span class="arr" id="promoDetailToggleIcon">▶</span> 全部渠道知识库
      </div>
      <div class="toggle-content open" id="promoDetailContent"></div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: 推广分析Tab HTML结构"
```

---

### Task 3: 推广分析 CSS 样式

**Files:**
- Modify: `index.html` — `<style>` 块内

- [ ] **Step 1: 添加推广分析专属样式**

在 `</style>` 之前插入：

```css
/* ── Promotion Tab ── */
.promo-check {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
}
.promo-check input[type="checkbox"] {
  accent-color: var(--brand);
  width: 14px; height: 14px;
  cursor: pointer;
}
.promo-check:has(input:checked) {
  color: var(--text);
  font-weight: 500;
}

.promo-action-item {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: box-shadow .2s;
}
.promo-action-item:hover { box-shadow: var(--shadow); }
.promo-action-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  font-family: var(--font-mono);
  border-right: 1px solid var(--border);
}
.promo-action-body { padding: 14px 18px; }
.promo-action-body .act-title {
  font-size: 13px; font-weight: 700; color: var(--text);
  margin-bottom: 3px;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.promo-action-body .act-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 4px; }
.promo-action-body .act-meta {
  display: flex; gap: 12px; flex-wrap: wrap; margin-top: 5px;
}
.promo-action-meta-item {
  font-size: 10px; color: var(--text-muted);
  background: #f9fafb; border: 1px solid var(--border);
  padding: 2px 7px; border-radius: 4px;
}
.promo-action-side { padding: 14px 18px 14px 0; display: flex; align-items: flex-start; }

.promo-why-tag {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.promo-why-tag.peer { background: var(--brand-light); color: var(--brand); }
.promo-why-tag.knowledge { background: #f3f4f6; color: var(--text-muted); }

@media (max-width: 900px) {
  .promo-action-item { grid-template-columns: 36px 1fr; }
  .promo-action-side { grid-column: 1/-1; padding: 0 16px 12px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "style: 推广分析Tab专属样式"
```

---

### Task 4: 渠道知识库

**Files:**
- Modify: `index.html` — `<script>` 块内

- [ ] **Step 1: 定义渠道知识库常量**

在 `<script>` 块内，通用工具函数 `$(id)` 之后插入：

```javascript
// ===== 渠道知识库 =====
var CHANNEL_KNOWLEDGE = [
  {
    id: 'freightInsurance', name: '运费险', type: '服务工具',
    baseScore: 95, costLevel: 'low',
    costDesc: '按售价 1%~2%，单均约 ¥0.5~2',
    threshold: '无门槛，千牛一键开通',
    path: '千牛卖家中心 → 商家保障 → 运费险 → 立即加入',
    effectDesc: '退货补运费，买家下单顾虑降低。演出服定制类退货率偏高，开通后转化率通常提升 10-20%。',
    searchWeight: '搜索加权 + 转化率提升'
  },
  {
    id: 'goldCoins', name: '淘金币', type: '服务工具',
    baseScore: 85, costLevel: 'low',
    costDesc: '买家抵扣 2%~5%，卖家承担费用，单均几分到几毛',
    threshold: '无门槛，千牛一键开通',
    path: '千牛卖家中心 → 营销中心 → 淘金币 → 立即开通',
    effectDesc: '淘宝最大积分体系，开通后商品在淘金币频道有额外曝光，搜索有加权。',
    searchWeight: '搜索加权 + 淘金币频道流量'
  },
  {
    id: 'sevenDayReturn', name: '7天无理由', type: '服务工具',
    baseScore: 80, costLevel: 'low',
    costDesc: '免费开通，退货由买家承担运费（非质量问题）',
    threshold: '无门槛，千牛一键开通',
    path: '千牛卖家中心 → 消费者保障 → 7天无理由退换货 → 加入',
    effectDesc: '基础信任标识，无此标识的商品搜索排序靠后，买家下单率降低。',
    searchWeight: '搜索基础加权'
  },
  {
    id: 'fastRefund', name: '极速退款', type: '服务工具',
    baseScore: 75, costLevel: 'low',
    costDesc: '免费开通',
    threshold: '需店铺信用达标',
    path: '千牛卖家中心 → 消费者保障 → 极速退款 → 开通',
    effectDesc: '缩短买家退款等待时间，提升购物体验和复购率。',
    searchWeight: '轻度搜索加权'
  },
  {
    id: 'zhitongche', name: '直通车', type: '付费推广',
    baseScore: 70, costLevel: 'medium',
    costDesc: '按点击付费（CPC），类目均价约 ¥0.5~2/次，建议日预算 ¥30~100 起步',
    threshold: '需充值，最低 ¥200 起充',
    path: '千牛卖家中心 → 营销中心 → 直通车 → 新建推广计划 → 选商品 → 设关键词出价',
    effectDesc: '搜索关键词精准流量，是最直接的获客方式。按点击付费，不成交不扣费（仅扣点击费）。',
    searchWeight: '搜索首位曝光'
  },
  {
    id: 'yinlimofang', name: '引力魔方', type: '付费推广',
    baseScore: 60, costLevel: 'medium',
    costDesc: '按点击付费（CPC），建议日预算 ¥50~200',
    threshold: '需充值',
    path: '千牛卖家中心 → 营销中心 → 引力魔方 → 新建计划 → 选商品 → 设人群定向',
    effectDesc: '推荐流量（猜你喜欢、购后推荐等），适合获取非搜索的被动曝光。',
    searchWeight: '推荐位曝光'
  },
  {
    id: 'wanxiangtai', name: '万相台', type: '付费推广',
    baseScore: 55, costLevel: 'medium',
    costDesc: '按点击付费，建议日预算 ¥50~300',
    threshold: '需充值',
    path: '千牛卖家中心 → 营销中心 → 万相台 → 新建推广',
    effectDesc: '阿里妈妈智能投放平台，自动在搜索+推荐+内容多渠道分配预算。适合不想手动调价的卖家。',
    searchWeight: '多渠道智能投放'
  },
  {
    id: 'taoke', name: '淘客', type: '付费推广',
    baseScore: 50, costLevel: 'medium',
    costDesc: '按成交付费（CPS），佣金比例自行设定（建议 5%~20%）',
    threshold: '需设置佣金计划',
    path: '千牛卖家中心 → 营销中心 → 淘宝客 → 设置佣金 → 推广计划',
    effectDesc: '按成交付费，不成交不花钱。适合让利换量，但注意佣金会压缩利润。演出服客单价高，佣金金额大，需谨慎设置比例。',
    searchWeight: '淘客渠道额外流量'
  },
  {
    id: 'juhuasuan', name: '聚划算', type: '平台活动',
    baseScore: 45, costLevel: 'high',
    costDesc: '活动保证金 + 佣金扣点（通常 2%~5%）+ 活动价要求',
    threshold: '需店铺资质审核，商品需有销量基础',
    path: '千牛卖家中心 → 营销中心 → 活动报名 → 聚划算 → 提交申请',
    effectDesc: '淘宝最大团购IP，单品爆发力强。但定制类目商品周期长，需评估产能能否支撑活动单量。',
    searchWeight: '活动流量 + 搜索加权'
  },
  {
    id: 'tiantitemai', name: '天天特卖', type: '平台活动',
    baseScore: 40, costLevel: 'medium',
    costDesc: '需让利（活动价要求）+ 佣金扣点',
    threshold: '商品需有一定销量和好评基础',
    path: '千牛卖家中心 → 营销中心 → 活动报名 → 天天特卖 → 提交申请',
    effectDesc: '日常特卖活动，门槛低于聚划算，适合清库存或引流款。',
    searchWeight: '活动流量'
  }
];
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: 渠道知识库常量定义"
```

---

### Task 5: 用户状态管理（localStorage 读写）

**Files:**
- Modify: `index.html` — `<script>` 块内

- [ ] **Step 1: 实现状态读写函数**

在渠道知识库之后插入：

```javascript
// ===== 推广状态管理 =====
var PROMO_DEFAULT_STATUS = {
  freightInsurance: false, goldCoins: false, sevenDayReturn: false, fastRefund: false,
  zhitongche: false, yinlimofang: false, wanxiangtai: false, taoke: false,
  juhuasuan: false, tiantitemai: false
};

function loadPromoStatus() {
  try {
    var saved = localStorage.getItem('tb_promo_mystatus');
    if (saved) {
      var parsed = JSON.parse(saved);
      return Object.assign({}, PROMO_DEFAULT_STATUS, parsed);
    }
  } catch (_) {}
  return Object.assign({}, PROMO_DEFAULT_STATUS);
}

function savePromoStatus() {
  var status = {};
  document.querySelectorAll('#tabPromotion input[type="checkbox"][data-id]').forEach(function(cb) {
    status[cb.dataset.id] = cb.checked;
  });
  localStorage.setItem('tb_promo_mystatus', JSON.stringify(status));
}

function savePromoBudget() {
  localStorage.setItem('tb_promo_monthly_budget', $('promoMonthlyBudget').value);
}

function restorePromoCheckboxes() {
  var status = loadPromoStatus();
  document.querySelectorAll('#tabPromotion input[type="checkbox"][data-id]').forEach(function(cb) {
    cb.checked = !!status[cb.dataset.id];
  });
  var savedBudget = localStorage.getItem('tb_promo_monthly_budget');
  if (savedBudget) $('promoMonthlyBudget').value = savedBudget;
}
```

- [ ] **Step 2: 在 DOMContentLoaded 中调用恢复函数**

在现有 `DOMContentLoaded` 监听器末尾添加：

```javascript
restorePromoCheckboxes();
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: 推广状态localStorage读写"
```

---

### Task 6: 竞品数据桥接

**Files:**
- Modify: `index.html` — `analyzeAndRender()` 函数尾部

- [ ] **Step 1: 在 analyzeAndRender 末尾保存分析结果**

找到 `analyzeAndRender()` 函数的最后一行 `renderDataTable(valid);`，在其后添加：

```javascript
// 保存分析结果供推广分析 Tab 使用
window._lastAnalysis = {
  sortedActivities: sortedActivities,
  activityCount: activityCount,
  total: valid.length,
  products: valid,
  timestamp: Date.now()
};
```

- [ ] **Step 2: 实现同行标签匹配函数**

在推广状态管理函数之后插入：

```javascript
// ===== 同行标签匹配 =====
// 将竞品搜索结果中的活动标签，映射到渠道知识库的 id
var ACTIVITY_TAG_TO_CHANNEL = {
  '运费险': 'freightInsurance',
  '退货运费险': 'freightInsurance',
  '淘金币': 'goldCoins',
  '金币': 'goldCoins',
  '7天无理由': 'sevenDayReturn',
  '7天退换': 'sevenDayReturn',
  '极速退款': 'fastRefund',
  '聚划算': 'juhuasuan',
  '天天特卖': 'tiantitemai'
};

function getPeerCoverage(peerData) {
  // 返回 { channelId: { count, pct } } 映射
  if (!peerData || !peerData.activityCount || peerData.total === 0) return {};
  var result = {};
  Object.keys(peerData.activityCount).forEach(function(tag) {
    var chId = ACTIVITY_TAG_TO_CHANNEL[tag];
    if (chId) {
      var count = peerData.activityCount[tag];
      result[chId] = { count: count, pct: Math.round(count / peerData.total * 100) };
    }
  });
  return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: 竞品数据桥接window._lastAnalysis"
```

---

### Task 7: 推荐引擎

**Files:**
- Modify: `index.html` — `<script>` 块内

- [ ] **Step 1: 实现推荐生成函数**

在桥接函数之后插入：

```javascript
// ===== 推荐引擎 =====
function generateRecommendations() {
  var myStatus = loadPromoStatus();
  var peerData = window._lastAnalysis;
  var peerCoverage = peerData ? getPeerCoverage(peerData) : {};
  var hasPeerData = peerData && peerData.total >= 10;

  var recommendations = [];

  CHANNEL_KNOWLEDGE.forEach(function(ch) {
    if (myStatus[ch.id]) return;

    var pri;
    if (ch.costLevel === 'low' && ch.baseScore >= 75) {
      pri = 'P0';
    } else if (ch.costLevel === 'medium' || ch.baseScore >= 55) {
      pri = 'P1';
    } else {
      pri = 'P2';
    }

    var peerCov = peerCoverage[ch.id];
    var peerText = '';
    if (peerCov && peerCov.count >= 3) {
      peerText = '同行 <strong>' + peerCov.pct + '%</strong> 已开通（' + peerCov.count + '/' + peerData.total + ' 个商品）。';
    } else if (hasPeerData) {
      peerText = '同行样本不足（仅 ' + peerData.total + ' 个商品中有活动标签），以下基于行业经验推荐。';
    } else {
      peerText = '';
    }

    var whyText = (peerText ? peerText + ' ' : '') + ch.effectDesc;

    recommendations.push({
      channel: ch,
      priority: pri,
      whyText: whyText,
      hasPeer: !!(peerCov && peerCov.count >= 3)
    });
  });

  var priOrder = { P0: 0, P1: 1, P2: 2 };
  recommendations.sort(function(a, b) {
    if (priOrder[a.priority] !== priOrder[b.priority]) return priOrder[a.priority] - priOrder[b.priority];
    return b.channel.baseScore - a.channel.baseScore;
  });

  return recommendations;
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: 推广推荐引擎"
```

---

### Task 8: 渲染函数

**Files:**
- Modify: `index.html` — `<script>` 块内

- [ ] **Step 1: 实现主渲染函数 `renderPromotionTab()`**

```javascript
// ===== 推广分析渲染 =====
function renderPromotionTab() {
  restorePromoCheckboxes();
  var recs = generateRecommendations();
  var myStatus = loadPromoStatus();
  var peerData = window._lastAnalysis;
  var hasPeer = peerData && peerData.total > 0;

  // 空状态处理
  if (recs.length === 0) {
    $('promoEmpty').style.display = '';
    $('promoResult').style.display = 'none';
    $('promoEmpty').querySelector('.empty-title').textContent = '全部渠道已开通';
    $('promoEmpty').querySelector('.empty-desc').textContent = '你已开通所有已知推广渠道，暂无新推荐。';
    return;
  }

  $('promoEmpty').style.display = 'none';
  $('promoResult').style.display = 'flex';
  $('promoResult').style.flexDirection = 'column';
  $('promoResult').style.gap = '18px';

  // 更新数据状态提示
  if (hasPeer) {
    $('promoDataStatus').innerHTML = '已读取竞品搜索数据（' + peerData.total + ' 个商品），同行标签用于辅助推荐。';
    $('promoDataStatus').style.background = '#eafaf1';
    $('promoDataStatus').style.borderColor = 'var(--green)';
  } else {
    $('promoDataStatus').innerHTML = '尚未搜索竞品数据。推荐将基于行业经验，建议先在「竞品分析」Tab 完成一次搜索以获得同行对比。';
    $('promoDataStatus').style.background = '#fef5e7';
    $('promoDataStatus').style.borderColor = 'var(--amber)';
  }

  // 综合状态
  var enabledCount = Object.values(myStatus).filter(Boolean).length;
  var totalCount = CHANNEL_KNOWLEDGE.length;
  var p0Count = recs.filter(function(r) { return r.priority === 'P0'; }).length;
  var p1Count = recs.filter(function(r) { return r.priority === 'P1'; }).length;
  var p2Count = recs.filter(function(r) { return r.priority === 'P2'; }).length;

  $('promoSummary').innerHTML =
    '<span style="font-size:13px;color:var(--text-muted);">' +
    '已开通 <strong style="color:var(--green);">' + enabledCount + '</strong> / ' + totalCount + ' 项' +
    ' · 推荐开通 <strong style="color:var(--brand);">' + recs.length + '</strong> 项' +
    '（P0: <strong style="color:var(--red);">' + p0Count + '</strong> · P1: <strong style="color:var(--amber);">' + p1Count + '</strong> · P2: ' + p2Count + '）' +
    '</span>';

  // 按优先级分组渲染
  renderPromoGroup('P0', recs.filter(function(r) { return r.priority === 'P0'; }));
  renderPromoGroup('P1', recs.filter(function(r) { return r.priority === 'P1'; }));
  renderPromoGroup('P2', recs.filter(function(r) { return r.priority === 'P2'; }));

  // 同行对标卡片
  renderPromoPeerCard();

  // 渠道详情
  renderPromoDetail();
}
```

- [ ] **Step 2: 实现分组渲染函数 `renderPromoGroup()`**

```javascript
var PROMO_PRI_COLORS = { P0: '#e74c3c', P1: '#f5a623', P2: '#27ae60' };

function renderPromoGroup(pri, items) {
  var cardEl = $('promoList' + pri + 'Card');
  var listEl = $('promoList' + pri);
  if (items.length === 0) { cardEl.style.display = 'none'; return; }
  cardEl.style.display = '';

  var html = '';
  items.forEach(function(item, i) {
    var ch = item.channel;
    var color = PROMO_PRI_COLORS[pri];
    var whyTagClass = item.hasPeer ? 'peer' : 'knowledge';
    var whyTagText = item.hasPeer ? '同行验证' : '行业经验';
    html += '<div class="promo-action-item">' +
      '<div class="promo-action-rank" style="color:' + color + ';">' + (i + 1) + '</div>' +
      '<div class="promo-action-body">' +
        '<div class="act-title"><span class="promo-why-tag ' + whyTagClass + '">' + whyTagText + '</span>' + escHtml(ch.name) + ' · ' + escHtml(ch.type) + '</div>' +
        '<div class="act-desc">' + item.whyText + '</div>' +
        '<div class="act-meta">' +
          '<span class="promo-action-meta-item">💰 ' + escHtml(ch.costDesc) + '</span>' +
          '<span class="promo-action-meta-item">📋 ' + escHtml(ch.threshold) + '</span>' +
          '<span class="promo-action-meta-item">🚀 ' + escHtml(ch.searchWeight) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="promo-action-side">' +
        '<button class="btn btn-primary btn-sm" onclick="addToChecklist(\'' + ch.id + '\')">+ 写入清单</button>' +
      '</div>' +
    '</div>';
  });
  listEl.innerHTML = html;
}
```

- [ ] **Step 3: 实现同行对标卡片 `renderPromoPeerCard()`**

```javascript
function renderPromoPeerCard() {
  var peerData = window._lastAnalysis;
  if (!peerData || peerData.total === 0) { $('promoPeerCard').style.display = 'none'; return; }

  var coverage = getPeerCoverage(peerData);
  var tools = ['freightInsurance', 'goldCoins', 'sevenDayReturn', 'fastRefund'];
  var myStatus = loadPromoStatus();
  var hasAny = tools.some(function(id) { return coverage[id] && coverage[id].count >= 3; });
  if (!hasAny) { $('promoPeerCard').style.display = 'none'; return; }

  $('promoPeerCard').style.display = '';

  var html = '<table class="peer-table"><thead><tr><th>工具</th><th>同行覆盖率</th><th>你的状态</th></tr></thead><tbody>';
  tools.forEach(function(id) {
    var ch = CHANNEL_KNOWLEDGE.find(function(c) { return c.id === id; });
    if (!ch) return;
    var cov = coverage[id];
    var covText = (cov && cov.count >= 3) ? cov.pct + '%（' + cov.count + '/' + peerData.total + '）' : '数据不足';
    var myText = myStatus[id] ? '<span style="color:var(--green);font-weight:600;">已开通</span>' : '<span style="color:var(--red);">未开通</span>';
    html += '<tr><td style="font-weight:600;">' + escHtml(ch.name) + '</td><td>' + covText + '</td><td>' + myText + '</td></tr>';
  });
  html += '</tbody></table>';
  html += '<p style="font-size:10px;color:var(--text-muted);margin-top:6px;">基于「竞品分析」Tab 最新搜索结果（' + peerData.total + ' 个商品）。覆盖率 ≥ 3 个商品才显示数字，否则显示"数据不足"。</p>';

  $('promoPeerContent').innerHTML = html;
}
```

- [ ] **Step 4: 实现渠道详情折叠面板 `renderPromoDetail()`**

```javascript
function renderPromoDetail() {
  var html = '';
  CHANNEL_KNOWLEDGE.forEach(function(ch) {
    html += '<div class="a-card" style="margin-bottom:10px;">' +
      '<div class="a-card-hd"><h4>' + escHtml(ch.name) + ' <span style="font-size:10px;color:var(--text-muted);font-weight:400;">' + escHtml(ch.type) + '</span></h4></div>' +
      '<div class="a-card-bd">' +
        '<strong>费用：</strong>' + escHtml(ch.costDesc) + '<br>' +
        '<strong>门槛：</strong>' + escHtml(ch.threshold) + '<br>' +
        '<strong>效果：</strong>' + escHtml(ch.effectDesc) + '<br>' +
        '<strong>路径：</strong>' + escHtml(ch.path) +
      '</div>' +
    '</div>';
  });
  $('promoDetailContent').innerHTML = html;
}

function togglePromoDetail() {
  var content = $('promoDetailContent');
  var toggle = $('promoDetailToggle');
  var icon = $('promoDetailToggleIcon');
  if (content.classList.contains('open')) {
    content.classList.remove('open');
    toggle.classList.remove('open');
  } else {
    content.classList.add('open');
    toggle.classList.add('open');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: 推广分析渲染函数"
```

---

### Task 9: 写入明日清单

**Files:**
- Modify: `index.html` — `<script>` 块内

- [ ] **Step 1: 实现写入清单函数**

在渲染函数之后插入：

```javascript
// ===== 写入明日清单 =====
function addToChecklist(channelId) {
  var ch = CHANNEL_KNOWLEDGE.find(function(c) { return c.id === channelId; });
  if (!ch) return;

  var taskText = '【推广】开通' + ch.name + '：' + ch.path + '（' + ch.costDesc + '）';

  try {
    var tasks = JSON.parse(localStorage.getItem('tb_checklist_tasks') || '[]');
    var exists = tasks.some(function(t) { return t.text === taskText; });
    if (exists) { alert('该任务已在明日清单中'); return; }
    tasks.push({ text: taskText, done: false, createdAt: Date.now() });
    localStorage.setItem('tb_checklist_tasks', JSON.stringify(tasks));
    alert('已添加到明日清单 ✓');
  } catch (_) {
    alert('添加失败，请重试');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: 推广推荐写入明日清单"
```

---

### Task 10: 端到端验证

**Files:**
- 无新建文件

- [ ] **Step 1: 验证 Tab 切换**

在浏览器打开 `index.html`：
1. 默认显示「竞品分析」Tab，原有功能正常
2. 点击「推广分析」Tab，正确切换
3. 来回切换，状态保持

- [ ] **Step 2: 验证空状态**

1. 未搜索时切到推广分析 Tab
2. 左侧显示"尚未搜索竞品数据"黄色提示
3. 右侧显示空状态引导
4. 勾选/取消勾选渠道 checkbox，刷新页面确认状态保持

- [ ] **Step 3: 验证推荐生成**

1. 切回竞品分析 Tab，执行一次搜索分析
2. 切到推广分析 Tab，点击「生成推荐」
3. 确认 P0/P1/P2 分组正确显示
4. 确认已勾选的渠道不出现在推荐中
5. 确认"同行验证"/"行业经验"标签切换正确

- [ ] **Step 4: 验证写入清单**

1. 点击某条推荐右侧「+ 写入清单」按钮
2. 前往明日清单（如有）确认任务已添加
3. 同一任务重复点击，确认提示"已在清单中"

- [ ] **Step 5: 验证控制台无报错**

打开浏览器开发者工具 Console，执行所有操作后确认无红色错误。

- [ ] **Step 6: Commit（如有修复）**

```bash
git add index.html
git commit -m "fix: 端到端验证修复"
```

---

## 自审检查

**1. Spec 覆盖**

| 设计文档要求 | 对应任务 |
|-------------|----------|
| Tab 导航切换 | Task 1 |
| 左侧面板（数据状态 + 现状勾选 + 生成按钮） | Task 2 |
| 渠道知识库（10 个渠道，5 要素） | Task 4 |
| 分层置信度（硬知识主导 + 同行辅助） | Task 6, 7 |
| 行动清单 P0/P1/P2 分组 | Task 8 |
| 同行对标卡片 | Task 8 Step 3 |
| 渠道详情折叠面板 | Task 8 Step 4 |
| localStorage 持久化 | Task 5 |
| 竞品数据复用 | Task 6 |
| 写入明日清单 | Task 9 |
| 空状态处理 | Task 8 Step 1 |

**2. Placeholder 检查** — 无 TBD/TODO/占位符，所有代码块为实际实现。

**3. 类型一致性** — 渠道知识库 `id` 与 `PROMO_DEFAULT_STATUS` 键名、checkbox `data-id`、`ACTIVITY_TAG_TO_CHANNEL` value 三者完全对齐，均为 camelCase。
