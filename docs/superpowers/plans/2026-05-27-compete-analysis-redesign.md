# 竞品分析板块重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构竞品分析结果展示区，从「卡片展示数据」升级为「诊断 → 建议 → 对标」三层可执行面板。

**Architecture:** 纯前端单页面，修改 `index.html` 内联 CSS/JS。新增 3 个渲染函数（renderDiagnostic、renderImprovements、renderPeerComparison），原四张分析卡片移至折叠区，旧 actionPlan 相关代码清理。

**Tech Stack:** 原生 HTML/CSS/JS，SVG 环形图，无第三方依赖。

---

## File Map

| 文件 | 变更类型 | 职责 |
|------|---------|------|
| `index.html` CSS 区 (~L104-135) | 替换/新增 | 新组件样式 |
| `index.html` HTML 区 (~L335-390) | 替换 | 竞品结果区结构 |
| `index.html` JS 区 (~L691-1243) | 修改/新增 | 渲染逻辑重构 |

---

### Task 1: 替换旧 CSS 并新增新组件样式

**Files:**
- Modify: `E:\taobaoTest\index.html` CSS 区 (旧 action-plan 样式 L107-135)

- [ ] **Step 1: 替换旧 action-plan CSS 块为 full-width 新样式**

删除 L107-135 (从 `/* 行动方案卡片 */` 到 `.btn-copy:hover`)，替换为以下内容：

```css
/* ===== 竞品分析结果 ===== */
.comp-result-section { margin-bottom:20px; }

/* 诊断总览 */
.diagnostic-grid {
  display: grid;
  grid-template-columns: 200px 1fr 300px;
  gap: 14px;
}
.score-card {
  background: #fff; border-radius: 12px; padding: 24px 18px;
  text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.score-ring-wrap { position: relative; width: 100px; height: 100px; margin-bottom: 8px; }
.score-ring-wrap svg { transform: rotate(-90deg); display: block; }
.score-value-num {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 34px; font-weight: 700; font-family: 'Courier New', monospace;
  color: #ff5000; line-height: 1;
}
.score-desc { font-size: 12px; color: #999; line-height: 1.5; }

.dim-card {
  background: #fff; border-radius: 12px; padding: 22px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; gap: 18px; justify-content: center;
}
.dim-item { display: flex; flex-direction: column; gap: 4px; }
.dim-head { display: flex; justify-content: space-between; align-items: baseline; }
.dim-name { font-size: 13px; color: #666; }
.dim-val { font-size: 13px; font-weight: 600; }
.dim-track { height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
.dim-fill { height: 100%; border-radius: 3px; }
.dim-fill.high { background: #ef5350; }
.dim-fill.med  { background: #ff9800; }
.dim-fill.low  { background: #66bb6a; }

.finding-card {
  background: #fff; border-radius: 12px; padding: 22px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  border-left: 4px solid #ff5000;
  display: flex; flex-direction: column; justify-content: center;
}
.finding-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .1em;
  color: #ff5000; margin-bottom: 4px; font-weight: 600;
}
.finding-text { font-size: 16px; font-weight: 600; color: #333; line-height: 1.5; margin-bottom: 12px; }
.finding-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.finding-stat {
  background: #fff8f5; border-radius: 6px; padding: 7px 12px; text-align: center; min-width: 64px;
}
.finding-stat .sn { font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; color: #ff5000; line-height: 1.2; }
.finding-stat .sl { font-size: 11px; color: #999; margin-top: 1px; }

/* 改进清单 */
.improve-list { display: flex; flex-direction: column; gap: 8px; }
.improve-item {
  background: #fff; border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden;
}
.improve-inner {
  display: grid; grid-template-columns: 46px 1fr auto; align-items: stretch;
}
.improve-rank {
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace;
  color: #ccc; border-right: 1px solid #f0f0f0;
}
.improve-item.pri-high .improve-rank { color: #ef5350; }
.improve-item.pri-med  .improve-rank { color: #ff9800; }
.improve-item.pri-low  .improve-rank { color: #66bb6a; }
.improve-body { padding: 14px 18px; }
.improve-body .title {
  font-size: 14px; font-weight: 600; color: #333; margin-bottom: 2px;
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}
.improve-body .desc { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 4px; }
.improve-body .evidence {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: #999; background: #fafafa;
  border: 1px solid #f0f0f0; padding: 3px 8px; border-radius: 4px;
  font-family: 'Courier New', monospace;
}
.ev-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.improve-action { padding: 14px 18px 14px 0; display: flex; align-items: flex-start; }

.impact-badge {
  display: inline-flex; font-size: 10px; font-weight: 600;
  padding: 1px 7px; border-radius: 10px; text-transform: uppercase; letter-spacing: .04em;
}
.impact-badge.high { background: #ffebee; color: #c62828; }
.impact-badge.med  { background: #fff3e0; color: #e65100; }
.impact-badge.low  { background: #e8f5e9; color: #2e7d32; }

/* 相近竞品对标 */
.peer-card { background: #fff; border-radius: 10px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.peer-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.peer-table th {
  text-align: left; font-size: 11px; font-weight: 600; color: #999;
  padding: 8px 12px; border-bottom: 2px solid #f0f0f0;
}
.peer-table td { padding: 10px 12px; border-bottom: 1px solid #f5f5f5; color: #555; vertical-align: top; }
.peer-table tr:last-child td { border-bottom: none; }
.peer-table .my-col { background: #fff8f5; }
.peer-table .my-col td { color: #ff5000; font-weight: 500; }
.peer-table .diff-highlight { background: #fff3e0; padding: 1px 4px; border-radius: 2px; color: #e65100; }
.peer-table .title-col { max-width: 240px; word-break: break-all; }

/* 折叠面板 */
.detail-toggle {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  padding: 14px 20px; background: #fff; border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); user-select: none; margin-bottom: 14px;
}
.detail-toggle:hover { background: #fafafa; }
.detail-toggle .toggle-icon { font-size: 11px; color: #999; display: inline-block; transition: transform .2s; }
.detail-toggle.open .toggle-icon { transform: rotate(90deg); }
.detail-content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-content .analysis-card { margin: 0; }

/* 响应式 */
@media (max-width: 800px) {
  .diagnostic-grid { grid-template-columns: 1fr; }
  .improve-inner { grid-template-columns: 38px 1fr; }
  .improve-action { grid-column: 1 / -1; padding: 0 18px 12px; }
  .detail-content { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verify CSS is valid**

在浏览器打开 `index.html`，检查 Console 无 CSS 相关错误。

---

### Task 2: 更新竞品结果区 HTML 结构

**Files:**
- Modify: `E:\taobaoTest\index.html` L335-390

- [ ] **Step 1: 替换 HTML 结构**

将 L335-390 替换为：

```html
	    <div id="compResult" style="display:none;">
	      <div class="result-header card">
	        <span class="count" id="compResultCount"></span>
	        <span style="font-size:13px;color:#999;">仅分析搜索结果第 1 页</span>
	      </div>

	      <!-- 诊断总览 -->
	      <div class="diagnostic-grid" id="diagnosticGrid" style="display:none;"></div>

	      <!-- 改进清单 -->
	      <div class="card" id="improveCard" style="display:none;">
	        <h2 id="improveTitle" style="font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
	          <span style="width:8px;height:8px;border-radius:50%;background:#ff5000;flex-shrink:0;"></span>
	          改进清单
	        </h2>
	        <div class="improve-list" id="improveList"></div>
	      </div>

	      <!-- 相近竞品对标 -->
	      <div class="peer-card" id="peerCard" style="display:none;margin-bottom:16px;">
	        <h2 style="font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
	          <span style="width:8px;height:8px;border-radius:50%;background:#ff5000;flex-shrink:0;"></span>
	          相近竞品对标
	        </h2>
	        <div id="peerContent"></div>
	      </div>

	      <!-- 详细数据（折叠） -->
	      <div class="detail-toggle" id="detailToggle" onclick="toggleDetail()">
	        <span class="toggle-icon" id="detailToggleIcon">▶</span>
	        <span style="font-size:14px;font-weight:600;color:#666;">详细数据</span>
	      </div>
	      <div class="detail-content" id="detailContent" style="display:none;">
	        <div id="cardTitle" class="analysis-card">
	          <div class="card-header">
	            <h3>标题关键词分析</h3>
	            <span class="badge" id="titleBadge"></span>
	          </div>
	          <div class="card-body" id="titleBody"></div>
	          <div class="card-suggestion" id="titleSuggestion"></div>
	        </div>
	        <div id="cardPrice" class="analysis-card">
	          <div class="card-header">
	            <h3>价格竞争力</h3>
	            <span class="badge" id="priceBadge"></span>
	          </div>
	          <div class="stat-row" id="priceStats"></div>
	          <div class="card-suggestion" id="priceSuggestion"></div>
	        </div>
	        <div id="cardActivity" class="analysis-card">
	          <div class="card-header">
	            <h3>活动与优惠对比</h3>
	            <span class="badge" id="activityBadge"></span>
	          </div>
	          <div class="card-body" id="activityBody"></div>
	          <div class="card-suggestion" id="activitySuggestion"></div>
	        </div>
	        <div id="cardProfit" class="analysis-card">
	          <div class="card-header">
	            <h3>利润测算</h3>
	            <span class="badge" id="profitBadge"></span>
	          </div>
	          <div class="card-body" id="profitBody"></div>
	        </div>
	      </div>

	      <!-- 原始数据表 -->
	      <div class="card" style="margin-top:12px;">
	        <h2 style="cursor:pointer;" onclick="toggleDataTable()">原始数据 <span style="font-size:12px;color:#999;" id="dataTableToggle">▼ 展开</span></h2>
	        <div id="dataTableWrap" class="data-table-wrap" style="display:none;"></div>
	      </div>

	      <!-- 词典管理 -->
	      <div class="card" style="margin-top:12px;" id="dictCard"></div>
	    </div>
```

- [ ] **Step 2: 修改旧 actionPlanCard 引用**

查找并删除 `$('actionPlanCard')` 及 `$('actionPlanContent')` 相关的 JS 引用（在 `analyzeAndRender` 和 `renderActionPlan` 中），后续任务会重写。

---

### Task 3: 新增 renderDiagnostic 函数

**Files:**
- Modify: `E:\taobaoTest\index.html` — 在 `getKeywordFrequency` 函数之前插入

- [ ] **Step 1: 添加 renderDiagnostic 函数**

在 `getKeywordFrequency` 函数定义之前（约 L927 之前）插入：

```javascript
function renderDiagnostic(products, myPrice, topKeywords, sortedActivities, avgPrice, minPrice, maxPrice) {
  const valid = products.filter(p => p.title && p.price > 0);
  const total = valid.length;
  if (total === 0) { $('diagnosticGrid').style.display = 'none'; return; }

  // 价格定位分 (越接近中位价越高)
  const prices = valid.map(p => p.price).sort((a, b) => a - b);
  const p50 = prices[Math.floor(prices.length * 0.5)] || 0;
  const priceDiff = myPrice > 0 ? Math.abs(myPrice - p50) / Math.max(p50, 1) : 0;
  const priceScore = myPrice > 0 ? Math.max(0, 100 - priceDiff * 100) : 0;

  // 标题覆盖分 (模拟：基于高频词数量)
  const significantKeywords = topKeywords.filter(k => k.pct >= 30);
  const titleScore = Math.min(100, significantKeywords.length * 8);

  // 活动覆盖分
  const hiActivities = sortedActivities.filter(([name, cnt]) => cnt / total >= 0.3);
  const activityScore = Math.min(100, hiActivities.length * 30 + 30);

  // 综合分
  const overall = Math.round((priceScore * 0.4 + titleScore * 0.35 + activityScore * 0.25));

  // 位置描述
  let position = '中等偏下';
  if (overall >= 70) position = '中等偏上';
  else if (overall >= 50) position = '中等';
  else if (overall >= 30) position = '中等偏下';
  else position = '靠后';

  // 环形图: circumference = 2*PI*44 ≈ 276.46
  const circ = 276.46;
  const offset = circ - (circ * overall / 100);

  // 维度条
  const pricePct = Math.round(priceScore);
  const titlePct = Math.round(titleScore);
  const activityPct = Math.round(activityScore);

  // 首要行动
  let firstAction = '', firstActionData = '';
  if (myPrice > 0 && Math.abs((myPrice - avgPrice) / avgPrice * 100) > 15) {
    const diff = Math.round((myPrice - avgPrice) / avgPrice * 100);
    firstAction = '优先调整定价，将售价从 ¥' + myPrice + ' 降至 ¥' + Math.round(avgPrice) + ' 附近';
    firstActionData =
      '<div class="finding-stat"><div class="sn">¥' + Math.round(avgPrice) + '</div><div class="sl">同行均价</div></div>' +
      '<div class="finding-stat"><div class="sn">¥' + myPrice + '</div><div class="sl">你的售价</div></div>' +
      '<div class="finding-stat"><div class="sn">' + (diff > 0 ? '+' : '') + diff + '%</div><div class="sl">偏离幅度</div></div>';
  } else if (significantKeywords.length < 5) {
    firstAction = '标题高频词覆盖不足，建议补充同行常用关键词';
    firstActionData =
      '<div class="finding-stat"><div class="sn">' + significantKeywords.length + '个</div><div class="sl">已覆盖高频词</div></div>' +
      '<div class="finding-stat"><div class="sn">' + topKeywords.length + '个</div><div class="sl">同行高频词</div></div>';
  } else {
    firstAction = '竞争力正常，持续关注竞品价格和活动变化';
    firstActionData = '<div class="finding-stat"><div class="sn">' + overall + '分</div><div class="sl">综合评分</div></div>';
  }

  var html = '';

  // 评分卡
  html += '<div class="score-card">';
  html += '<div class="score-ring-wrap">';
  html += '<svg width="100" height="100" viewBox="0 0 100 100">';
  html += '<circle cx="50" cy="50" r="44" fill="none" stroke="#f0f0f0" stroke-width="7"/>';
  html += '<circle cx="50" cy="50" r="44" fill="none" stroke="#ff5000" stroke-width="7"';
  html += ' stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" stroke-linecap="round"/>';
  html += '</svg>';
  html += '<div class="score-value-num">' + overall + '</div>';
  html += '</div>';
  html += '<div class="score-desc">在 ' + total + ' 个竞品中<br>处于' + position + '</div>';
  html += '</div>';

  // 维度卡
  html += '<div class="dim-card">';
  html += '<div class="dim-item"><div class="dim-head"><span class="dim-name">价格定位</span><span class="dim-val" style="color:#ef5350">' + (myPrice > 0 ? pricePct + '分' : '未填') + '</span></div><div class="dim-track"><div class="dim-fill high" style="width:' + pricePct + '%"></div></div></div>';
  html += '<div class="dim-item"><div class="dim-head"><span class="dim-name">标题关键词覆盖</span><span class="dim-val" style="color:#ff9800">' + titlePct + '分</span></div><div class="dim-track"><div class="dim-fill med" style="width:' + titlePct + '%"></div></div></div>';
  html += '<div class="dim-item"><div class="dim-head"><span class="dim-name">活动覆盖</span><span class="dim-val" style="color:#66bb6a">' + activityPct + '分</span></div><div class="dim-track"><div class="dim-fill low" style="width:' + activityPct + '%"></div></div></div>';
  html += '</div>';

  // 首要行动卡
  html += '<div class="finding-card">';
  html += '<div class="finding-label">首要行动</div>';
  html += '<div class="finding-text">' + firstAction + '</div>';
  html += '<div class="finding-stats">' + firstActionData + '</div>';
  html += '</div>';

  $('diagnosticGrid').innerHTML = html;
  $('diagnosticGrid').style.display = '';
}
```

---

### Task 4: 新增 renderImprovements 函数

**Files:**
- Modify: `E:\taobaoTest\index.html` — 在 `renderDiagnostic` 之后插入

- [ ] **Step 1: 添加 renderImprovements 函数**

```javascript
function renderImprovements(products, myPrice, myCost, topKeywords, sortedActivities, avgPrice, minPrice, maxPrice) {
  const valid = products.filter(p => p.title && p.price > 0);
  const total = valid.length;
  if (total === 0) { $('improveCard').style.display = 'none'; return; }

  const prices = valid.map(p => p.price).sort((a, b) => a - b);
  const p50 = prices[Math.floor(prices.length * 0.5)] || 0;
  var items = [];
  var num = 0;

  // 定价建议
  if (myPrice > 0 && avgPrice > 0) {
    var diff = Math.round((myPrice - avgPrice) / avgPrice * 100);
    if (Math.abs(diff) > 15) {
      num++;
      var targetLo = Math.round(avgPrice * 0.92);
      var targetHi = Math.round(avgPrice * 1.08);
      var desc, evidence;
      if (diff > 0) {
        desc = '你的售价 <strong>¥' + myPrice + '</strong>，同行 75% 的商品定价在 <strong>¥' + prices[Math.floor(prices.length * 0.25)] + '–' + prices[Math.floor(prices.length * 0.75)] + '</strong> 区间。建议调至 <strong>¥' + targetLo + '–' + targetHi + '</strong>，接近同行中位价。';
        evidence = '同行均价 ¥' + Math.round(avgPrice) + ' · 中位价 ¥' + p50 + ' · 偏离 +' + diff + '%';
      } else {
        desc = '你的售价 <strong>¥' + myPrice + '</strong> 低于同行均价。建议提价至 <strong>¥' + targetLo + '–' + targetHi + '</strong>，提升利润空间。';
        evidence = '同行均价 ¥' + Math.round(avgPrice) + ' · 中位价 ¥' + p50 + ' · 偏离 ' + diff + '%';
      }
      items.push({
        pri: 'high', impact: '高影响', num: num,
        title: '调整定价 — ' + (diff > 0 ? '降低售价 ' + Math.round(Math.abs(diff) * 0.6) + '%–' + Math.round(Math.abs(diff) * 0.8) + '%' : '提高售价 ' + Math.round(Math.abs(diff) * 0.5) + '%'),
        desc: desc, evidence: evidence, dotColor: '#ef5350', btn: '复制调价建议', btnClass: 'btn-primary'
      });
    }
  }

  // 标题建议
  var searchKeyword = $('compKeyword').value.trim() || '';
  var suggested = generateSuggestedTitle(topKeywords, searchKeyword);
  if (suggested.missingKeywords.length > 0) {
    num++;
    items.push({
      pri: 'med', impact: '中影响', num: num,
      title: '补充标题关键词 — 增加 ' + suggested.missingKeywords.length + ' 个高频词',
      desc: '同行高频但你可能缺失的关键词：<strong>' + suggested.missingKeywords.map(function(k) { return '「' + escHtml(k) + '」'; }).join('、') + '</strong>。',
      evidence: '同行高频词 ' + topKeywords.length + ' 个 · 建议标题: ' + escHtml(suggested.title),
      dotColor: '#ff9800', btn: '查看建议标题', btnClass: 'btn-secondary'
    });
  }

  // 活动建议
  var hiActivities = sortedActivities.filter(function(a) { return a[1] / total >= 0.3; });
  if (hiActivities.length > 0) {
    num++;
    var actNames = hiActivities.map(function(a) { return a[0].replace('优惠:', ''); });
    var actTexts = hiActivities.map(function(a) { return a[0].replace('优惠:', '') + ' (' + Math.round(a[1] / total * 100) + '%)'; });
    items.push({
      pri: 'low', impact: '低影响', num: num,
      title: '配置活动和优惠',
      desc: '同行热门活动：<strong>' + actTexts.join('、') + '</strong>。建议优先开通覆盖率高的活动。',
      evidence: '操作路径：千牛卖家中心 → 营销中心 → 店铺优惠券/满减活动',
      dotColor: '#66bb6a', btn: '复制操作路径', btnClass: 'btn-secondary'
    });
  }

  if (items.length === 0) {
    $('improveCard').style.display = 'none';
    return;
  }

  var html = '';
  items.forEach(function(item) {
    html += '<div class="improve-item pri-' + item.pri + '">';
    html += '<div class="improve-inner">';
    html += '<div class="improve-rank">' + item.num + '</div>';
    html += '<div class="improve-body">';
    html += '<div class="title">' + item.title + ' <span class="impact-badge ' + item.pri + '">' + item.impact + '</span></div>';
    html += '<div class="desc">' + item.desc + '</div>';
    html += '<div class="evidence"><span class="ev-dot" style="background:' + item.dotColor + '"></span> ' + escHtml(item.evidence) + '</div>';
    html += '</div>';
    html += '<div class="improve-action"><button class="btn ' + item.btnClass + '" onclick="improvAction(\'' + item.pri + '\',\'' + escHtml(item.title) + '\')">' + item.btn + '</button></div>';
    html += '</div></div>';
  });

  $('improveList').innerHTML = html;
  $('improveCard').style.display = '';
}
```

- [ ] **Step 2: 添加 improvAction 辅助函数**

```javascript
function improvAction(pri, title) {
  if (pri === 'high') {
    var text = document.querySelector('#improveList .pri-high .desc').textContent;
    navigator.clipboard.writeText(text).catch(function(){});
    var btn = document.querySelector('#improveList .pri-high .btn');
    if (btn) { var orig = btn.textContent; btn.textContent = '已复制 ✓'; setTimeout(function(){ btn.textContent = orig; }, 2000); }
  } else if (pri === 'med') {
    var titleEl = document.querySelector('#improveList .pri-med .evidence');
    if (titleEl) {
      navigator.clipboard.writeText(titleEl.textContent.replace(/^[^:]*:\s*/, '')).catch(function(){});
      var btn2 = document.querySelector('#improveList .pri-med .btn');
      if (btn2) { var orig2 = btn2.textContent; btn2.textContent = '已复制 ✓'; setTimeout(function(){ btn2.textContent = orig2; }, 2000); }
    }
  } else {
    navigator.clipboard.writeText('千牛卖家中心 → 营销中心 → 店铺优惠券/满减活动').catch(function(){});
    var btn3 = document.querySelector('#improveList .pri-low .btn');
    if (btn3) { var orig3 = btn3.textContent; btn3.textContent = '已复制 ✓'; setTimeout(function(){ btn3.textContent = orig3; }, 2000); }
  }
}
```

---

### Task 5: 新增 renderPeerComparison 函数

**Files:**
- Modify: `E:\taobaoTest\index.html` — 在 `renderImprovements` 之后插入

- [ ] **Step 1: 添加 renderPeerComparison 函数**

```javascript
function renderPeerComparison(products, myPrice) {
  var valid = products.filter(function(p) { return p.title && p.price > 0; });
  if (!myPrice || valid.length === 0) { $('peerCard').style.display = 'none'; return; }

  // 找价格 ±15% 范围内的竞品
  var lo = myPrice * 0.85, hi = myPrice * 1.15;
  var peers = valid.filter(function(p) { return p.price >= lo && p.price <= hi; });
  if (peers.length < 2) {
    lo = myPrice * 0.75; hi = myPrice * 1.25;
    peers = valid.filter(function(p) { return p.price >= lo && p.price <= hi; });
  }
  if (peers.length === 0) { $('peerCard').style.display = 'none'; return; }

  // 取前 3 个
  peers.sort(function(a, b) { return Math.abs(a.price - myPrice) - Math.abs(b.price - myPrice); });
  peers = peers.slice(0, 3);

  // 获取 topKeywords 用于标题差异（用外部变量）
  var topWords = (typeof lastAnalysisResult !== 'undefined' && lastAnalysisResult && lastAnalysisResult.topKeywords)
    ? lastAnalysisResult.topKeywords.slice(0, 8).map(function(k) { return k.word; }) : [];

  var html = '<table class="peer-table"><thead><tr>';
  html += '<th style="width:90px;"></th>';
  html += '<th style="color:#ff5000;">你的商品 <span style="font-size:11px;font-weight:400;">¥' + myPrice + '</span></th>';
  peers.forEach(function(p, i) {
    html += '<th>竞品 #' + (i + 1) + ' <span style="font-size:11px;font-weight:400;">¥' + p.price + '</span></th>';
  });
  html += '</tr></thead><tbody>';

  // 标题行
  html += '<tr>';
  html += '<td style="font-weight:600;color:#333;">标题</td>';
  html += '<td class="my-col title-col">—</td>';
  peers.forEach(function(p) {
    html += '<td class="title-col">' + escHtml(p.title).substring(0, 45) + (p.title.length > 45 ? '...' : '') + '</td>';
  });
  html += '</tr>';

  // 销量行
  html += '<tr>';
  html += '<td style="font-weight:600;color:#333;">销量</td>';
  html += '<td class="my-col">—</td>';
  peers.forEach(function(p) {
    html += '<td>' + (p.sales || '-') + '</td>';
  });
  html += '</tr>';

  // 店铺行
  html += '<tr>';
  html += '<td style="font-weight:600;color:#333;">店铺</td>';
  html += '<td class="my-col">—</td>';
  peers.forEach(function(p) {
    html += '<td>' + escHtml(p.shop || '-') + (p.isTmall ? ' <span style="font-size:11px;color:#ff5000;">天猫</span>' : '') + '</td>';
  });
  html += '</tr>';

  // 活动行
  html += '<tr>';
  html += '<td style="font-weight:600;color:#333;">活动/优惠</td>';
  html += '<td class="my-col">—</td>';
  peers.forEach(function(p) {
    var acts = [].concat(p.activityTags || [], p.promo ? [p.promo] : []);
    html += '<td>' + (acts.length > 0 ? escHtml(acts.join(' / ')) : '无') + '</td>';
  });
  html += '</tr>';

  html += '</tbody></table>';
  $('peerContent').innerHTML = html;
  $('peerCard').style.display = '';
}
```

---

### Task 6: 修改 analyzeAndRender 函数

**Files:**
- Modify: `E:\taobaoTest\index.html` — `analyzeAndRender` 函数 (L869-925)

- [ ] **Step 1: 替换 analyzeAndRender 函数体**

将 L869-925 的 `analyzeAndRender` 函数替换为：

```javascript
function analyzeAndRender(products, myPrice, myCost) {
  const valid = products.filter(p => p.title && p.price > 0);

  const allTitles = valid.map(p => p.title);
  const keywordFreq = getKeywordFrequency(allTitles);
  const topKeywords = keywordFreq.slice(0, 15);

  const prices = valid.map(p => p.price).sort((a, b) => a - b);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices[0] || 0;
  const maxPrice = prices[prices.length - 1] || 0;

  const activityCount = {};
  valid.forEach(p => {
    if (p.activityTags) {
      p.activityTags.forEach(tag => { activityCount[tag] = (activityCount[tag] || 0) + 1; });
    }
    if (p.promo) {
      const key = '优惠:' + p.promo;
      activityCount[key] = (activityCount[key] || 0) + 1;
    }
  });
  const sortedActivities = Object.entries(activityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 新版三板块
  renderDiagnostic(products, myPrice, topKeywords, sortedActivities, avgPrice, minPrice, maxPrice);
  renderImprovements(products, myPrice, myCost, topKeywords, sortedActivities, avgPrice, minPrice, maxPrice);
  renderPeerComparison(products, myPrice);

  // 详细数据（折叠区内）
  renderTitleCard(topKeywords, valid.length);
  renderPriceCard(myPrice, avgPrice, minPrice, maxPrice);
  renderActivityCard(sortedActivities, valid.length);
  if (myCost > 0 && myPrice > 0) {
    renderProfitCard(myPrice, myCost, sortedActivities);
  } else {
    $('cardProfit').style.display = 'none';
  }

  renderDataTable(valid);

  // 保存分析结果
  lastAnalysisResult = {
    topKeywords, myPrice, avgPrice, minPrice, maxPrice,
    sortedActivities, valid, totalCount: products.length, myCost
  };

  generateChecklistTasks(lastAnalysisResult);
}
```

---

### Task 7: 清理旧代码

**Files:**
- Modify: `E:\taobaoTest\index.html`

- [ ] **Step 1: 删除旧 renderActionPlan 函数**

删除 `renderActionPlan` 函数（L1076-1243），该函数已被 `renderDiagnostic` + `renderImprovements` + `renderPeerComparison` 替代。

- [ ] **Step 2: 删除旧 copySuggestedTitle 函数**

删除 `copySuggestedTitle` 函数（L1245-1262），复制功能已整合到 `improvAction` 中。

- [ ] **Step 3: 添加 toggleDetail 函数**

在合适位置添加：

```javascript
function toggleDetail() {
  const content = $('detailContent');
  const toggle = $('detailToggle');
  const icon = $('detailToggleIcon');
  if (content.style.display === 'none') {
    content.style.display = '';
    toggle.classList.add('open');
  } else {
    content.style.display = 'none';
    toggle.classList.remove('open');
  }
}
```

- [ ] **Step 4: 验证旧引用已清除**

确认以下内容在代码中不再被引用（grep 检查）：
- `actionPlanCard`
- `actionPlanContent`
- `renderActionPlan`
- `copySuggestedTitle`
- `action-item` (CSS 类名，已被 `improve-item` 替代)

---

### Task 8: 验证

**Files:**
- 无需修改

- [ ] **Step 1: 在浏览器打开 index.html 验证布局**

用浏览器打开 `E:\taobaoTest\index.html`，切换到「竞品分析」Tab，确认：
- 输入区域正常显示（关键词、价格、成本、搜索按钮）
- 无 Console 错误

- [ ] **Step 2: 用示例数据测试分析功能**

在粘贴区输入以下测试 JSON 并点击「分析数据」:

```json
{"products":[{"title":"红楼梦古装演出服黛玉同款古典舞成人飘逸刺绣定制","price":128,"sales":"2.3万+","shop":"古韵坊旗舰店","isTmall":true,"activityTags":["满200减15","运费险"]},{"title":"儿童古装汉服演出服女童六一表演服仙女飘逸","price":98,"sales":"1.8万+","shop":"童星舞台服饰","isTmall":false,"activityTags":["运费险"]},{"title":"重工刺绣古装演出服古典舞成人定制舞台表演服","price":158,"sales":"9600+","shop":"绣韵阁","isTmall":true,"activityTags":["满200减15"]},{"title":"仙女风古装舞蹈服成人飘逸演出服定制汉服","price":118,"sales":"5200+","shop":"舞艺轩","isTmall":false,"activityTags":["运费险","淘金币"]},{"title":"古风汉服女成人演出服古典舞飘逸渐变定制","price":138,"sales":"4100+","shop":"汉韵华裳","isTmall":false,"activityTags":["满200减15","运费险"]},{"title":"儿童古装演出服女童汉服舞蹈服六一表演服定制","price":108,"sales":"8700+","shop":"童韵阁","isTmall":false,"activityTags":["运费险"]},{"title":"古典舞演出服成人飘逸仙女风重工刺绣定制","price":148,"sales":"3500+","shop":"舞韵坊旗舰店","isTmall":true,"activityTags":["满200减15","运费险","淘金币"]}]}
```

验证：
- 诊断总览显示：环形评分、三维度进度条、首要行动卡片
- 改进清单按优先级显示（定价 → 标题 → 活动）
- 相近竞品对标显示表格
- 点击「详细数据」展开/折叠
- 四张分析卡片正常渲染
- 数据表正常显示

- [ ] **Step 3: 提交**

```bash
git add E:\taobaoTest\index.html
git commit -m "feat: 重构竞品分析结果展示，升级为诊断-建议-对标三层面板"
```
