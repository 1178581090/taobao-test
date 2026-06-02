# 店铺诊断 Tab + 标题工作台 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第四个 Tab「店铺诊断」，包含店铺激活向导（8项清单）+ 标题工作台（关键词分析 → 标题生成），帮助新店打破零曝光死循环。

**Architecture:** 单文件 `index.html` 内联所有 HTML/CSS/JS。复用现有 Tab 切换模式、扩展消息通道、`getKeywordFrequency()` 分词、`openWithSteps()` 步骤面板、localStorage 持久化。扩展 `content.js` 新增提取搜索结果总数。

**Tech Stack:** 纯 HTML/CSS/JS（无框架），Chrome Manifest V3 扩展

---

## 文件结构

| 文件 | 变更类型 | 职责 |
|------|----------|------|
| `index.html` | 修改 | 新增 Tab 按钮 + DOM 结构（在 `</div>` 闭合前插入）+ CSS 样式 + JS 逻辑 |
| `extension/content.js` | 修改 | 搜索页新增提取搜索结果总数 |
| `extension/background.js` | 修改 | 搜索数据回传时携带 totalCount |

---

### Task 1: 新增 Tab 按钮和页面骨架 HTML

**Files:**
- Modify: `index.html:850-856`（Tab 按钮区域）
- Modify: `index.html:1180-1182`（tabActivityFilter 结束后，`<script>` 之前）

- [ ] **Step 1: 新增第四个 Tab 按钮**

在 `.topbar-tabs` 容器内追加第四个按钮（`index.html:853` 之后）：

```html
    <button class="topbar-tab" data-tab="diagnosis">店铺诊断</button>
```

修改后的 `.topbar-tabs` 区域：
```html
  <div class="topbar-tabs">
    <button class="topbar-tab active" data-tab="competitor">竞品分析</button>
    <button class="topbar-tab" data-tab="promotion">推广分析</button>
    <button class="topbar-tab" data-tab="activityFilter">活动筛选</button>
    <button class="topbar-tab" data-tab="diagnosis">店铺诊断</button>
  </div>
```

- [ ] **Step 2: 新增 tabDiagnosis DOM 骨架**

在 `</div>` `<!-- tabActivityFilter 闭合 -->` 之后、`<script>` 之前（`index.html:1181` 之后）插入完整 DOM：

```html
<div id="tabDiagnosis" class="main" style="display:none;">
  <!-- 左侧面板 -->
  <div class="setup-panel">
    <!-- === 店铺激活向导 === -->
    <div class="setup-section-title">店铺激活向导</div>
    <div id="diagChecklistCard" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;">
      <div id="diagProgress" style="margin-bottom:10px;"></div>
      <div id="diagChecklist"></div>
      <div id="diagComplete" style="display:none;text-align:center;padding:16px;color:var(--green);"></div>
    </div>

    <!-- === 标题工作台 === -->
    <div class="setup-section-title" style="margin-top:14px;">标题工作台</div>

    <div style="margin-bottom:8px;">
      <label style="font-size:11px;color:var(--text-secondary);">商品名称</label>
      <input class="field-input" id="twProductName" placeholder="如：红色肚皮舞套装（选填）" maxlength="30" style="margin-bottom:4px;">
      <div id="twProductList" style="display:none;max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;background:var(--surface);"></div>
    </div>

    <div style="margin-bottom:6px;">
      <label style="font-size:11px;color:var(--text-secondary);">舞种 <span style="color:var(--red);">*</span></label>
      <select id="twDance" class="field-input" style="margin-bottom:2px;">
        <option value="">请选择</option>
        <option>肚皮舞</option><option>民族舞</option><option>爵士</option><option>现代</option>
        <option>古典</option><option>拉丁</option><option>街舞</option><option>芭蕾</option>
        <option value="__custom__">其他（自填）</option>
      </select>
      <input id="twDanceCustom" class="field-input" placeholder="自填舞种" maxlength="20" style="display:none;">
    </div>

    <div style="margin-bottom:6px;">
      <label style="font-size:11px;color:var(--text-secondary);">性别</label>
      <div style="display:flex;gap:8px;">
        <label style="font-size:12px;"><input type="radio" name="twGender" value="女" checked> 女</label>
        <label style="font-size:12px;"><input type="radio" name="twGender" value="男"> 男</label>
        <label style="font-size:12px;"><input type="radio" name="twGender" value="通用"> 通用</label>
      </div>
    </div>

    <div style="margin-bottom:6px;">
      <label style="font-size:11px;color:var(--text-secondary);">面料（选填）</label>
      <div id="twFabricChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;"></div>
      <input id="twFabricCustom" class="field-input" placeholder="自填面料" maxlength="20" style="width:100%;">
    </div>

    <div style="margin-bottom:6px;">
      <label style="font-size:11px;color:var(--text-secondary);">场景（选填）</label>
      <div id="twSceneChips" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    </div>

    <div style="margin-bottom:8px;">
      <label style="font-size:11px;color:var(--text-secondary);">价格档位</label>
      <div id="twPriceRange" style="font-size:12px;color:var(--text-muted);"></div>
    </div>

    <button class="btn btn-primary" id="btnTwFetch" style="width:100%;" onclick="startTitleAnalysis()">
      抓取竞品关键词
    </button>
    <div id="twFetchStatus" class="setup-hint" style="margin-top:6px;display:none;"></div>
  </div>

  <!-- 右侧面板 -->
  <div class="result-panel">
    <div id="twEmpty" class="empty-state">
      <div class="empty-icon">📝</div>
      <div class="empty-title">标题工作台</div>
      <div class="empty-desc">选择舞种后点击「抓取竞品关键词」，分析竞品用词帮你生成标题</div>
    </div>

    <div id="twResult" style="display:none;">
      <!-- 关键词分析 -->
      <div class="card" id="twKeywordCard">
        <div class="card-header"><h3>📊 关键词分析 <span id="twKeywordStale" style="font-weight:400;font-size:11px;color:var(--amber);display:none;"></span></h3></div>
        <div id="twKeywordArea"></div>
      </div>

      <!-- 标题候选 -->
      <div class="card" id="twTitleCard" style="display:none;">
        <div class="card-header"><h3>✨ 标题候选</h3></div>
        <div id="twTitleList"></div>
      </div>

      <!-- 历史记录 -->
      <div class="card" id="twHistoryCard" style="display:none;">
        <div class="card-header" style="cursor:pointer;" onclick="toggleTwHistory()">
          <h3>📋 历史记录（<span id="twHistoryCnt">0</span>）<span id="twHistoryArrow" style="font-size:11px;color:var(--text-muted);">▸</span></h3>
        </div>
        <div id="twHistoryList" style="display:none;"></div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: 新增 toast 元素（用于复制反馈）**

在 `</body>` 之前（`index.html:3737` 之前）追加：

```html
<div id="twToast" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.2);opacity:0;transition:opacity .3s;pointer-events:none;"></div>
```

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "feat: 新增店铺诊断Tab HTML骨架——激活向导+标题工作台"
```

---

### Task 2: 新增 CSS 样式

**Files:**
- Modify: `index.html:78`（在 `.topbar-tab.active` 规则之后插入新样式）

- [ ] **Step 1: 在 `<style>` 中插入新 CSS**

在现有 `.topbar-tab.active` 规则之后（约第 77 行之后）插入：

```css
/* ── 店铺诊断 Tab ── */

/* 清单进度条 */
.diag-progress-bar {
  height: 6px;
  background: #e8eaed;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.diag-progress-fill {
  height: 100%;
  background: var(--green);
  border-radius: 3px;
  transition: width .3s;
}
.diag-progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

/* 清单项 */
.diag-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: #f9fafb;
  transition: all .2s;
}
.diag-item.done {
  opacity: .5;
  background: #f0fdf4;
}
.diag-item input[type="checkbox"] {
  margin-top: 2px;
  flex-shrink: 0;
}
.diag-item-body { flex: 1; min-width: 0; }
.diag-item-title { font-size: 13px; font-weight: 600; }
.diag-item-desc { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.diag-item-link {
  font-size: 11px;
  color: var(--brand);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.diag-item-link:hover { text-decoration: underline; }
.diag-complete-msg {
  font-size: 14px;
  font-weight: 600;
  padding: 12px;
}

/* 芯片/标签 */
.tw-chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  border: 1px solid var(--border);
  cursor: pointer;
  background: #f9fafb;
  user-select: none;
  transition: all .15s;
}
.tw-chip:hover { border-color: var(--brand); }
.tw-chip.selected { background: #fff1eb; border-color: var(--brand); color: var(--brand); font-weight: 600; }

/* 关键词标签 */
.tw-kw-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  margin: 3px;
  cursor: pointer;
  user-select: none;
  transition: all .15s;
}
.tw-kw-tag.strong { background: #e6f4ea; color: #137333; border: 1px solid #a8dab5; }
.tw-kw-tag.defend { background: #fef7e0; color: #92600a; border: 1px solid #fcd34d; }
.tw-kw-tag.longtail { background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; }
.tw-kw-tag.selected { box-shadow: 0 0 0 2px var(--brand); transform: scale(1.05); }

/* 标题候选 */
.tw-candidate {
  background: #f9fafb;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
  position: relative;
}
.tw-candidate-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  word-break: break-all;
}
.tw-candidate-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 12px;
}
.tw-candidate-label {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #e8f0fe;
  color: #1967d2;
}
.tw-btn-copy {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  cursor: pointer;
  color: var(--text-secondary);
}
.tw-btn-copy:hover { background: #f3f4f6; color: var(--text); }

/* 历史记录 */
.tw-history-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.tw-history-item:last-child { border-bottom: none; }
.tw-history-title { font-weight: 600; margin-bottom: 2px; }
.tw-history-meta { color: var(--text-muted); font-size: 11px; }

/* 对比视图 */
.tw-compare-pane {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  min-height: 60px;
}
```

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "style: 店铺诊断Tab CSS——清单/芯片/关键词标签/标题候选"
```

---

### Task 3: 更新 Tab 切换逻辑

**Files:**
- Modify: `index.html:3211-3228`（现有 Tab 切换 handler）

- [ ] **Step 1: 添加 diagnosis 分支**

在现有 switch 逻辑中追加 `diagnosis` case。找到现有代码（`index.html:3211-3228`）：

```js
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
  } else if (target === 'activityFilter') {
    $('tabActivityFilter').style.display = 'grid';
    initActivityFilter();
  } else if (target === 'diagnosis') {
    $('tabDiagnosis').style.display = 'grid';
    initDiagnosisTab();
  } else {
    $('tabPromotion').style.display = 'grid';
    renderPromotionTab();
  }
});
```

关键变更：新增 `else if (target === 'diagnosis')` 分支，调用 `initDiagnosisTab()`。

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "feat: Tab切换支持店铺诊断——初始化激活向导+标题工作台"
```

---

### Task 4: 店铺激活向导 JS 模块

**Files:**
- Modify: `index.html` — 在 `</script>` 之前（约第 3735 行）插入新 JS

- [ ] **Step 1: 定义清单数据和渲染函数**

在 `</script>` 之前（`index.html:3735` 之后）插入：

```js
// ===== 店铺激活向导 =====
var STORE_CHECKLIST = [
  { id: 1, cat: '装修', title: '店招上传', desc: '1200×120横幅，放店名+主营类目。参考同行：搜"肚皮舞演出服"看前3名店铺。', url: 'https://myseller.taobao.com/home.htm' },
  { id: 2, cat: '装修', title: '店铺简介', desc: '100字以内：我是___，专注___，___年经验。告诉买家你是谁/做什么。', url: 'https://myseller.taobao.com/home.htm' },
  { id: 3, cat: '装修', title: '类目属性补全', desc: '品牌、适用性别、适用场景等属性填满，帮助搜索匹配。', url: 'https://myseller.taobao.com/home.htm' },
  { id: 4, cat: '装修', title: '店铺认证', desc: '保证金缴纳 / 主体认证状态检查，确保店铺正常展示。', url: 'https://myseller.taobao.com/home.htm' },
  { id: 5, cat: '权重', title: '破零销量', desc: '完成第1单打破零销量。建议：找朋友下单/低价引流款/送样给熟人。', url: null },
  { id: 6, cat: '权重', title: '首场活动报名', desc: '从活动筛选Tab可参加中选门槛最低的先报。免费活动优先。', url: null },
  { id: 7, cat: '内容', title: '微淘/订阅基础帖', desc: '发2-3条内容（没粉丝也要发，店铺权重因子）。模板：上新预告/买家秀/面料展示。', url: 'https://myseller.taobao.com/home.htm' },
  { id: 8, cat: '内容', title: '商品短视频', desc: '30秒以内主图视频。拍摄提纲：前3秒全身→细节→场景→舞者上身。', url: 'https://myseller.taobao.com/home.htm' }
];

var _checklistStatus = null;

function loadChecklistStatus() {
  if (_checklistStatus) return _checklistStatus;
  try {
    var raw = localStorage.getItem('tb_store_checklist');
    if (raw) { _checklistStatus = JSON.parse(raw); }
  } catch (_) {}
  if (!_checklistStatus) { _checklistStatus = {}; }
  return _checklistStatus;
}

function saveChecklistStatus() {
  try {
    localStorage.setItem('tb_store_checklist', JSON.stringify(_checklistStatus));
  } catch (_) { /* 静默降级 */ }
}

function renderChecklist() {
  var status = loadChecklistStatus();
  var doneCount = 0;
  var html = '';
  STORE_CHECKLIST.forEach(function(item) {
    var isDone = !!status[item.id];
    if (isDone) doneCount++;
    if (isDone) {
      html += '<div class="diag-item done">' +
        '<input type="checkbox" checked disabled>' +
        '<div class="diag-item-body"><div class="diag-item-title">' + escHtml(item.title) + '</div></div>' +
        '<span style="font-size:11px;color:var(--green);flex-shrink:0;">✓ 已完成</span>' +
        '</div>';
    } else {
      html += '<div class="diag-item">' +
        '<input type="checkbox" onchange="toggleChecklistItem(' + item.id + ', this)">' +
        '<div class="diag-item-body">' +
        '<div class="diag-item-title">' + escHtml(item.title) + '</div>' +
        '<div class="diag-item-desc">' + escHtml(item.desc) + '</div>' +
        '</div>' +
        (item.url
          ? '<span class="diag-item-link" onclick="openChecklistUrl(\'' + escHtml(item.url) + '\',\'' + escHtml(item.title) + '\')">去操作 →</span>'
          : '<span class="diag-item-link" style="color:var(--text-muted);">待完成</span>') +
        '</div>';
    }
  });
  $('diagChecklist').innerHTML = html;

  // 进度条
  var pct = Math.round(doneCount / STORE_CHECKLIST.length * 100);
  var barHtml = '<div class="diag-progress-bar"><div class="diag-progress-fill" style="width:' + pct + '%;"></div></div>' +
    '<div class="diag-progress-text">' + doneCount + '/' + STORE_CHECKLIST.length + ' 已完成</div>';
  $('diagProgress').innerHTML = barHtml;

  // 全完成
  if (doneCount === STORE_CHECKLIST.length) {
    $('diagComplete').style.display = 'block';
    $('diagComplete').innerHTML = '<div class="diag-complete-msg">🎉 店铺基础搭建完成！<br><span style="font-size:12px;font-weight:400;color:var(--text-secondary);">接下来用标题工作台优化商品搜索排名</span></div>';
  } else {
    $('diagComplete').style.display = 'none';
  }
}

function toggleChecklistItem(id, checkbox) {
  // 200ms 防抖
  if (checkbox._debounce) return;
  checkbox._debounce = true;
  setTimeout(function() { checkbox._debounce = false; }, 200);

  var status = loadChecklistStatus();
  status[id] = checkbox.checked;
  saveChecklistStatus();
  renderChecklist();
}

function openChecklistUrl(url, name) {
  window.postMessage({
    type: 'tb-open-with-steps',
    url: url,
    name: name,
    steps: '<div style="font-size:12px;line-height:2;">请按左侧清单指引完成操作</div>'
  }, '*');
}
```

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "feat: 店铺激活向导JS——8项清单+进度条+localStorage+防抖"
```

---

### Task 5: 标题工作台 JS — 输入区 + 商品选择器

**Files:**
- Modify: `index.html` — 在 Task 4 代码之后继续插入

- [ ] **Step 1: 面料和场景芯片初始化**

在 Task 4 代码之后继续插入：

```js
// ===== 标题工作台 =====
var TW_FABRICS = ['蕾丝', '雪纺', '氨纶', '亮片', '流苏', '棉麻', '网纱'];
var TW_SCENES = ['年会', '舞台', '考级', '婚礼', '广场舞', '日常'];

var _twPendingResult = null; // Tab 切换时暂存的搜索结果

function initDiagnosisTab() {
  renderChecklist();
  initTitleWorkbench();
}

function initTitleWorkbench() {
  // 渲染面料芯片
  var fabricHtml = '';
  TW_FABRICS.forEach(function(f) {
    fabricHtml += '<span class="tw-chip" data-fabric="' + escHtml(f) + '" onclick="toggleChip(this)">' + escHtml(f) + '</span>';
  });
  $('twFabricChips').innerHTML = fabricHtml;

  // 渲染场景芯片
  var sceneHtml = '';
  TW_SCENES.forEach(function(s) {
    sceneHtml += '<span class="tw-chip" data-scene="' + escHtml(s) + '" onclick="toggleChip(this)">' + escHtml(s) + '</span>';
  });
  $('twSceneChips').innerHTML = sceneHtml;

  // 舞种下拉变化处理
  $('twDance').addEventListener('change', function() {
    var custom = $('twDanceCustom');
    if (this.value === '__custom__') {
      custom.style.display = 'block';
      custom.focus();
    } else {
      custom.style.display = 'none';
    }
    updateFetchButton();
  });
  $('twDanceCustom').addEventListener('input', updateFetchButton);

  // 商品名输入
  $('twProductName').addEventListener('input', function() {
    showProductSuggestions(this.value);
  });
  $('twProductName').addEventListener('focus', function() {
    showProductSuggestions(this.value);
  });
  $('twProductName').addEventListener('blur', function() {
    setTimeout(function() { $('twProductList').style.display = 'none'; }, 200);
  });

  // 恢复偏好
  restoreTitlePrefs();
  updatePriceRange();
  updateFetchButton();

  // 渲染暂存结果
  if (_twPendingResult) {
    renderKeywordAnalysis(_twPendingResult);
    _twPendingResult = null;
  }
}

function updateFetchButton() {
  var dance = getDanceValue();
  $('btnTwFetch').disabled = !dance;
  $('btnTwFetch').style.opacity = dance ? '1' : '.5';
}

function getDanceValue() {
  return $('twDance').value === '__custom__' ? $('twDanceCustom').value.trim() : $('twDance').value;
}

function getSelectedChips(containerId, dataAttr) {
  var chips = document.querySelectorAll('#' + containerId + ' .tw-chip.selected');
  var result = [];
  chips.forEach(function(c) {
    result.push(c.getAttribute(dataAttr));
  });
  // 自填面料
  if (containerId === 'twFabricChips') {
    var custom = $('twFabricCustom').value.trim();
    if (custom) result.push(custom);
  }
  return result;
}

function toggleChip(el) {
  el.classList.toggle('selected');
}

function updatePriceRange() {
  var cost = parseFloat(localStorage.getItem('tb_my_cost'));
  if (isNaN(cost) || cost <= 0) {
    $('twPriceRange').textContent = '未设置成本（请在竞品分析Tab填写）';
  } else {
    $('twPriceRange').textContent = '¥' + Math.round(cost * 1.5) + ' ~ ¥' + Math.round(cost * 2.5);
  }
}

function getGenderValue() {
  var checked = document.querySelector('input[name="twGender"]:checked');
  return checked ? checked.value : '女';
}
```

- [ ] **Step 2: 商品选择器和偏好恢复**

继续插入：

```js
function showProductSuggestions(input) {
  var history = loadTitleHistory();
  if (!history.length) { $('twProductList').style.display = 'none'; return; }
  var names = [];
  var seen = {};
  history.forEach(function(h) {
    if (h.product && !seen[h.product]) { names.push(h.product); seen[h.product] = true; }
  });
  if (!input) {
    // 显示所有历史商品名
    if (names.length === 0) { $('twProductList').style.display = 'none'; return; }
    var html = '';
    names.forEach(function(n) {
      html += '<div class="tw-chip" style="display:block;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;" onmousedown="selectProduct(\'' + escHtml(n).replace(/'/g, "\\'") + '\')">' + escHtml(n) + '</div>';
    });
    $('twProductList').innerHTML = html;
    $('twProductList').style.display = 'block';
    return;
  }
  // 模糊匹配
  var matches = names.filter(function(n) { return n.indexOf(input) >= 0; });
  if (matches.length === 0) { $('twProductList').style.display = 'none'; return; }
  var html = '';
  matches.forEach(function(n) {
    html += '<div class="tw-chip" style="display:block;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;" onmousedown="selectProduct(\'' + escHtml(n).replace(/'/g, "\\'") + '\')">' + escHtml(n) + '</div>';
  });
  $('twProductList').innerHTML = html;
  $('twProductList').style.display = 'block';
}

function selectProduct(name) {
  $('twProductName').value = name;
  $('twProductList').style.display = 'none';
  restoreTitlePrefs(name);
}

function restoreTitlePrefs(productName) {
  try {
    var raw = localStorage.getItem('tb_title_prefs');
    if (raw) {
      var allPrefs = JSON.parse(raw);
      var prefs = (productName && allPrefs[productName]) || {};
      // 舞种
      if (prefs.dance) {
        if (TW_FABRICS.indexOf(prefs.dance) < 0 && ['肚皮舞','民族舞','爵士','现代','古典','拉丁','街舞','芭蕾'].indexOf(prefs.dance) < 0) {
          $('twDance').value = '__custom__';
          $('twDanceCustom').style.display = 'block';
          $('twDanceCustom').value = prefs.dance;
        } else {
          $('twDance').value = prefs.dance;
          $('twDanceCustom').style.display = 'none';
        }
      }
      // 性别
      if (prefs.gender) {
        var radios = document.querySelectorAll('input[name="twGender"]');
        radios.forEach(function(r) { if (r.value === prefs.gender) r.checked = true; });
      }
      // 面料（芯片恢复）
      if (prefs.fabrics) {
        var chips = document.querySelectorAll('#twFabricChips .tw-chip');
        chips.forEach(function(c) { c.classList.remove('selected'); });
        prefs.fabrics.forEach(function(f) {
          chips.forEach(function(c) { if (c.getAttribute('data-fabric') === f) c.classList.add('selected'); });
        });
      }
      // 场景
      if (prefs.scenes) {
        var sChips = document.querySelectorAll('#twSceneChips .tw-chip');
        sChips.forEach(function(c) { c.classList.remove('selected'); });
        prefs.scenes.forEach(function(s) {
          sChips.forEach(function(c) { if (c.getAttribute('data-scene') === s) c.classList.add('selected'); });
        });
      }
    }
  } catch (_) {}
  updateFetchButton();
}

function saveTitlePrefs() {
  var productName = ($('twProductName').value || '').trim();
  var prefs = {
    dance: getDanceValue(),
    gender: getGenderValue(),
    fabrics: getSelectedChips('twFabricChips', 'data-fabric'),
    scenes: getSelectedChips('twSceneChips', 'data-scene')
  };
  try {
    var raw = localStorage.getItem('tb_title_prefs');
    var allPrefs = raw ? JSON.parse(raw) : {};
    if (productName) {
      allPrefs[productName] = prefs;
    } else {
      allPrefs['_default'] = prefs;
    }
    localStorage.setItem('tb_title_prefs', JSON.stringify(allPrefs));
  } catch (_) {}
}
```

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: 标题工作台输入区——商品选择器+芯片+偏好恢复"
```

---

### Task 6: 标题工作台 JS — 关键词抓取与分析

**Files:**
- Modify: `index.html` — 在 Task 5 代码之后继续插入

- [ ] **Step 1: 抓取入口 + 超时处理**

```js
// ===== 关键词抓取 =====
var _twFetchTimer = null;

function startTitleAnalysis() {
  var dance = getDanceValue();
  if (!dance) { showTwToast('请先选择舞种'); return; }

  // 保存偏好
  saveTitlePrefs();

  // 按钮加载态
  $('btnTwFetch').disabled = true;
  $('btnTwFetch').textContent = '搜索中...';
  $('twFetchStatus').style.display = 'block';
  $('twFetchStatus').textContent = '正在搜索同类商品...';
  $('twFetchStatus').style.color = 'var(--text-secondary)';

  // 显示结果区
  $('twEmpty').style.display = 'none';
  $('twResult').style.display = 'block';
  $('twKeywordCard').style.display = 'block';
  $('twKeywordArea').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">⏳ 等待搜索结果...</div>';

  // 超时检测 40s
  clearTimeout(_twFetchTimer);
  _twFetchTimer = setTimeout(function() {
    $('btnTwFetch').disabled = false;
    $('btnTwFetch').textContent = '重新抓取';
    $('twFetchStatus').textContent = '搜索超时，请重试或切换到手动输入模式';
    $('twFetchStatus').style.color = 'var(--red)';
    $('twKeywordArea').innerHTML = renderManualInputFallback();
  }, 40000);

  // 发起抓取
  window.postMessage({
    type: 'tb-search-competitors',
    keyword: dance + '演出服'
  }, '*');
}

function renderManualInputFallback() {
  return '<div style="padding:12px;">' +
    '<p style="font-size:12px;color:var(--amber);margin-bottom:8px;">⚠ 扩展未连接或搜索超时，请手动粘贴竞品标题进行分析：</p>' +
    '<textarea id="twManualTitles" rows="5" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:12px;" placeholder="每行一个竞品标题，从淘宝搜索结果页复制..."></textarea>' +
    '<button class="btn btn-primary" style="margin-top:8px;" onclick="analyzeManualTitles()">分析关键词</button>' +
    '</div>';
}

function analyzeManualTitles() {
  var text = ($('twManualTitles').value || '').trim();
  if (!text) { showTwToast('请粘贴竞品标题'); return; }
  var titles = text.split('\n').filter(function(l) { return l.trim(); });
  if (titles.length === 0) { showTwToast('未识别到有效标题'); return; }
  var keywords = getKeywordFrequency(titles);
  renderKeywordTags(keywords, null);
}
```

- [ ] **Step 2: 处理抓取结果 — 关键词分级与渲染**

```js
function handleTitleAnalysisResult(data) {
  clearTimeout(_twFetchTimer);
  $('btnTwFetch').disabled = false;
  $('btnTwFetch').textContent = '重新抓取';
  $('twFetchStatus').style.display = 'none';

  // 提取标题列表
  var titles = [];
  if (data.products && data.products.length > 0) {
    data.products.forEach(function(p) { if (p.title) titles.push(p.title); });
  } else if (Array.isArray(data)) {
    data.forEach(function(p) { if (p.title) titles.push(p.title); });
  }

  if (titles.length === 0) {
    $('twKeywordArea').innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-muted);">未找到相关竞品，尝试换一个舞种或关键词</p>';
    return;
  }

  var keywords = getKeywordFrequency(titles);
  var totalCount = data.totalCount; // 扩展新增字段
  renderKeywordTags(keywords, totalCount);

  // 缓存结果
  try {
    var cache = { fetchedAt: new Date().toLocaleString(), keyword: getDanceValue() + '演出服', titles: titles, totalCount: totalCount };
    localStorage.setItem('tb_title_keywords', JSON.stringify(cache));
  } catch (_) {}
}

function renderKeywordTags(keywords, totalCount) {
  if (!keywords || keywords.length === 0) {
    $('twKeywordArea').innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-muted);">未提取到有效关键词</p>';
    return;
  }

  // 检查缓存过期
  checkKeywordStale();

  // 分级
  var html = '<div style="margin-bottom:8px;font-size:12px;color:var(--text-secondary);">点击关键词选中，已选词将用于标题生成：</div><div id="twKwTags" style="line-height:2;">';
  keywords.forEach(function(kw) {
    var level;
    if (totalCount === null || totalCount === undefined) {
      // 无竞争度数据，全灰
      level = 'longtail';
    } else if (kw.pct >= 30 && totalCount < 5000) {
      level = 'strong';
    } else if (kw.pct >= 30 && totalCount >= 5000) {
      level = 'defend';
    } else {
      level = 'longtail';
    }
    html += '<span class="tw-kw-tag ' + level + '" data-word="' + escHtml(kw.word) + '" onclick="toggleKwTag(this)">' +
      escHtml(kw.word) + ' <span style="font-size:10px;opacity:.7;">' + kw.count + '</span></span> ';
  });
  html += '</div>';

  if (totalCount === null || totalCount === undefined) {
    html += '<div style="font-size:11px;color:var(--amber);margin-top:4px;">⚠ 竞争度数据暂不可用，所有关键词按频次展示</div>';
  }

  html += '<div style="margin-top:10px;font-size:12px;color:var(--text-secondary);">已选 <span id="twSelectedCnt" style="font-weight:600;color:var(--brand);">0</span> 个词</div>';
  html += '<button class="btn btn-primary" style="margin-top:8px;" onclick="generateTitles()">✨ 生成标题候选</button>';
  $('twKeywordArea').innerHTML = html;

  // 隐藏标题候选和历史（新抓取时重置）
  $('twTitleCard').style.display = 'none';
}

function checkKeywordStale() {
  try {
    var raw = localStorage.getItem('tb_title_keywords');
    if (!raw) return;
    var cache = JSON.parse(raw);
    if (!cache.fetchedAt) return;
    var fetched = new Date(cache.fetchedAt);
    var now = new Date();
    var daysOld = (now - fetched) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) {
      $('twKeywordStale').style.display = 'inline';
      $('twKeywordStale').textContent = '（数据已过期，建议重新抓取）';
    } else {
      $('twKeywordStale').style.display = 'none';
    }
  } catch (_) {}
}

function toggleKwTag(el) {
  el.classList.toggle('selected');
  var count = document.querySelectorAll('#twKwTags .tw-kw-tag.selected').length;
  var cntEl = document.getElementById('twSelectedCnt');
  if (cntEl) cntEl.textContent = count;
}
```

- [ ] **Step 3: 接收扩展回传消息**

找到现有 `window.addEventListener('message', ...)` 处理扩展回传的位置（搜索 `handleAutoResult` 或 `searchResults`），新增 `tb-title-analysis` 消息处理。

需要先查看现有消息监听的位置和结构：

搜索 `window.addEventListener('message'` 和 `handleAutoResult`。

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "feat: 标题工作台关键词抓取——分级标签+加载态+超时+手动降级"
```

---

### Task 7: 标题工作台 JS — 标题生成 + 历史记录

**Files:**
- Modify: `index.html` — 在 Task 6 代码之后继续插入

- [ ] **Step 1: 标题生成逻辑**

```js
// ===== 标题生成 =====
function generateTitles() {
  var selected = document.querySelectorAll('#twKwTags .tw-kw-tag.selected');
  if (selected.length === 0) { showTwToast('请至少选择一个关键词'); return; }

  var words = [];
  selected.forEach(function(el) {
    var word = el.getAttribute('data-word');
    if (word) words.push(word);
  });

  // 按标签优先级排序：强推 > 长尾 > 防守
  var strong = [], defend = [], longtail = [];
  selected.forEach(function(el) {
    var word = el.getAttribute('data-word');
    if (el.classList.contains('strong')) strong.push(word);
    else if (el.classList.contains('defend')) defend.push(word);
    else longtail.push(word);
  });
  var sorted = strong.concat(longtail).concat(defend);

  var candidates = [
    buildTitle('search', sorted),
    buildTitle('click', sorted),
    buildTitle('balanced', sorted)
  ];

  renderTitleCandidates(candidates);

  // 保存到历史
  var productName = ($('twProductName').value || '').trim() || '未命名商品';
  candidates.forEach(function(c) {
    addTitleHistory(productName, c.title, words);
  });
  renderHistory();
}

function buildTitle(strategy, sortedWords) {
  var dance = getDanceValue();
  var scenes = getSelectedChips('twSceneChips', 'data-scene');
  var fabrics = getSelectedChips('twFabricChips', 'data-fabric');
  var gender = getGenderValue();

  var parts = [];
  var core = dance + '演出服';
  var sceneStr = scenes.length > 0 ? scenes.join('') : '';
  var fabricStr = fabrics.length > 0 ? fabrics.join('') : '';
  var kwStr = sortedWords.filter(function(w) {
    return w !== core && scenes.indexOf(w) < 0 && fabrics.indexOf(w) < 0;
  }).slice(0, 6).join('');

  if (strategy === 'search') {
    // 搜索导向：关键词密度高
    parts = [core, kwStr, sceneStr, fabricStr];
  } else if (strategy === 'click') {
    // 点击导向：营销前缀
    var prefix = '新款现货';
    if (gender === '女') prefix = '新款女装现货';
    else if (gender === '男') prefix = '新款男装现货';
    parts = [prefix, core, sceneStr, fabricStr];
  } else {
    // 均衡导向：前半搜索+后半修饰
    parts = [core, sceneStr + fabricStr, kwStr.slice(0, 4)];
  }

  var title = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  // 30字硬约束
  if (title.length > 30) {
    // 从末尾逐词缩减
    var t = title;
    while (t.length > 30 && t.lastIndexOf(' ') > 0) {
      t = t.substring(0, t.lastIndexOf(' ')).trim();
    }
    if (t.length > 30) {
      t = t.substring(0, 29) + '…';
    }
    title = t;
  }

  return { title: title, strategy: strategy, charCount: title.length };
}
```

- [ ] **Step 2: 标题候选渲染**

```js
var _twCandidates = []; // 当前候选，供复制用

function renderTitleCandidates(candidates) {
  _twCandidates = candidates;
  var labels = { search: '搜索导向', click: '点击导向', balanced: '均衡导向' };
  var html = '';
  candidates.forEach(function(c, i) {
    var label = labels[c.strategy] || '';
    html += '<div class="tw-candidate">' +
      '<div class="tw-candidate-title" contenteditable="true" oninput="updateCharCount(this, ' + i + ')">' + escHtml(c.title) + '</div>' +
      '<div class="tw-candidate-meta">' +
      '<span class="tw-candidate-label">' + label + '</span>' +
      '<span class="tw-char-count">' + c.charCount + '/30</span>' +
      '<button class="tw-btn-copy" onclick="copyTitle(' + i + ')">📋 复制</button>' +
      '</div>' +
      '</div>';
  });
  $('twTitleList').innerHTML = html;
  $('twTitleCard').style.display = 'block';
}

function updateCharCount(el, idx) {
  var text = el.textContent.trim();
  var count = text.length;
  var cntEl = el.parentElement.querySelector('.tw-char-count');
  if (cntEl) cntEl.textContent = count + '/30';
  if (_twCandidates[idx]) {
    _twCandidates[idx].title = text;
    _twCandidates[idx].charCount = count;
  }
}

function copyTitle(idx) {
  var title = _twCandidates[idx] ? _twCandidates[idx].title : '';
  if (!title) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(title).then(function() {
      showTwToast('已复制');
    }).catch(function() {
      fallbackCopy(title);
    });
  } else {
    fallbackCopy(title);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showTwToast('已复制（手动方式）'); } catch (_) { showTwToast('复制失败，请手动 Ctrl+C'); }
  document.body.removeChild(ta);
}

function showTwToast(msg) {
  var toast = $('twToast');
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._twTimer);
  toast._twTimer = setTimeout(function() { toast.style.opacity = '0'; }, 1500);
}
```

- [ ] **Step 3: 历史记录**

```js
// ===== 标题历史 =====
function loadTitleHistory() {
  try {
    var raw = localStorage.getItem('tb_title_history');
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function addTitleHistory(product, title, keywords) {
  var history = loadTitleHistory();
  history.unshift({
    product: product,
    time: new Date().toLocaleString(),
    title: title,
    keywords: keywords
  });
  // 最多保留 20 条
  if (history.length > 20) history = history.slice(0, 20);
  try { localStorage.setItem('tb_title_history', JSON.stringify(history)); } catch (_) {}
}

function renderHistory() {
  var history = loadTitleHistory();
  $('twHistoryCnt').textContent = history.length;
  if (history.length > 0) {
    $('twHistoryCard').style.display = 'block';
  }
}

function toggleTwHistory() {
  var list = $('twHistoryList');
  var arrow = $('twHistoryArrow');
  if (list.style.display === 'none') {
    list.style.display = 'block';
    arrow.textContent = '▾';
    renderHistoryList();
  } else {
    list.style.display = 'none';
    arrow.textContent = '▸';
  }
}

function renderHistoryList() {
  var history = loadTitleHistory();
  if (history.length === 0) {
    $('twHistoryList').innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px;">暂无历史记录</div>';
    return;
  }
  // 按商品分组
  var groups = {};
  history.forEach(function(h) {
    var key = h.product || '未命名商品';
    if (!groups[key]) groups[key] = [];
    groups[key].push(h);
  });
  var html = '';
  Object.keys(groups).forEach(function(product) {
    html += '<div style="font-size:11px;font-weight:700;padding:8px 12px;background:#f9fafb;color:var(--text-secondary);">' + escHtml(product) + '（' + groups[product].length + '条）</div>';
    groups[product].forEach(function(h, i) {
      html += '<div class="tw-history-item">' +
        '<div class="tw-history-title">' + escHtml(h.title) + '</div>' +
        '<div class="tw-history-meta">' + escHtml(h.time) + ' | 关键词：' + (h.keywords || []).map(function(k) { return escHtml(k); }).join('、') + '</div>' +
        '<button class="tw-btn-copy" style="margin-top:4px;" onclick="copyHistoryTitle(\'' + escHtml(h.title).replace(/'/g, "\\'") + '\')">复制</button>' +
        '</div>';
    });
  });
  $('twHistoryList').innerHTML = html;
}

function copyHistoryTitle(title) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(title).then(function() { showTwToast('已复制'); });
  } else {
    fallbackCopy(title);
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "feat: 标题生成+历史记录——3策略候选+30字约束+复制+分组历史"
```

---

### Task 8: 扩展 content.js — 提取搜索结果总数

**Files:**
- Modify: `extension/content.js:763-772`（search 模式的 sendResponse）

- [ ] **Step 1: 新增提取搜索结果总数函数**

在 `content.js` 中 `extractProducts()` 函数之后（约第 113 行之后）插入：

```js
function extractSearchTotalCount() {
  // 淘宝搜索结果页顶部显示 «共 12,345 件»
  // 尝试多个选择器
  var selectors = [
    '.search-count',
    '[class*="total--"]',
    '[class*="total"] span',
    '.s-summary .total',
    '[class*="summary--"]',
    '[class*="result--"]'
  ];
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) {
      var text = el.textContent.trim();
      var match = text.match(/([\d,]+)\s*件/);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''));
      }
      // 纯数字也尝试
      var numMatch = text.match(/^[\d,]+$/);
      if (numMatch) {
        return parseInt(text.replace(/,/g, ''));
      }
    }
  }
  return null;
}
```

- [ ] **Step 2: 在搜索结果回传中加入 totalCount**

修改 `content.js:763-772` 中 search 模式的 `sendResponse`（约第 763 行），在 `data` 对象中增加 `totalCount` 字段：

将：
```js
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
```

改为：
```js
    var totalCount = extractSearchTotalCount();
    sendResponse({
      action: 'searchExtracted',
      data: {
        source: 'taobao-search',
        url: location.href,
        count: products.length,
        totalCount: totalCount,
        products: products,
        myProduct: myProduct
      }
    });
```

- [ ] **Step 3: 提交**

```bash
git add extension/content.js
git commit -m "feat: 扩展搜索页提取搜索结果总数——用于关键词竞争度分级"
```

---

### Task 9: 扩展 background.js — 透传 totalCount

**Files:**
- Modify: `extension/background.js:42-58`（`extractFromSearchPage` 函数）
- Modify: `extension/background.js:232-245`（`searchCompetitors` 消息处理）

- [ ] **Step 1: searchCompetitors 支持纯关键词搜索**

现有 `searchCompetitors` action 要求 `productUrl`，需要新增关键词直搜路径。

在 `background.js:232-245` 处，将现有 `if (message.action === 'searchCompetitors')` 块替换为：

```js
  if (message.action === 'searchCompetitors') {
    if (message.keyword) {
      // 纯关键词搜索（标题工作台用）
      extractFromSearchPage([message.keyword], null).then(function(data) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'titleAnalysisResult',
          data: data
        }).catch(function() {});
      }).catch(function(err) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'titleAnalysisError',
          error: err.message || '搜索失败'
        }).catch(function() {});
      });
      return true;
    }
    var productUrl = message.productUrl;
    if (!productUrl) {
      sendResponse({ error: '未提供商品链接或关键词' });
      return;
    }
    runPipeline(productUrl, sender.tab.id).catch(function(err) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'searchError',
        error: err.message || '未知错误'
      }).catch(function() {});
    });
    return true;
  }
```

- [ ] **Step 2: 确认 extractFromSearchPage 的 totalCount 透传**

`extractFromSearchPage` 返回 `resp.data`，而 `resp.data` 已在 Task 8 中包含了 `totalCount` 字段。无需额外修改 — `data` 对象原样透传即可。

- [ ] **Step 3: 更新 manifest.json 权限（如需）**

检查 `manifest.json` 中 `s.taobao.com` 是否已在 `content_scripts.matches` 中：

```bash
grep "s.taobao.com" extension/manifest.json
```

预期已存在，无需修改。

- [ ] **Step 4: 提交**

```bash
git add extension/background.js
git commit -m "feat: 扩展支持纯关键词搜索——标题工作台直搜+透传totalCount"
```

---

### Task 10: 扩展 content.js — 中继标题工作台消息

**Files:**
- Modify: `extension/content.js:859-888`（`setupMainPageRelay` 的 message listener）
- Modify: `extension/content.js:831-853`（`chrome.runtime.onMessage` 的转发逻辑）

- [ ] **Step 1: 新增 outgoing 消息转发（index.html → background）**

在 `setupMainPageRelay()` 的消息监听中（`content.js:888` 之前，最后一个 `if` 块之后）新增：

```js
    if (e.data && e.data.type === 'tb-search-competitors') {
      chrome.runtime.sendMessage({
        action: 'searchCompetitors',
        keyword: e.data.keyword
      });
    }
```

- [ ] **Step 2: 新增 incoming 消息转发（background → index.html）**

在 `chrome.runtime.onMessage` 的 action 判断中（`content.js:832-833` 行的条件）新增 `titleAnalysisResult` 和 `titleAnalysisError`：

将：
```js
  if (message.action === 'searchResults' || message.action === 'searchError' || message.action === 'searchProgress' ||
      message.action === 'qianniuData' || message.action === 'qianniuError') {
```

改为：
```js
  if (message.action === 'searchResults' || message.action === 'searchError' || message.action === 'searchProgress' ||
      message.action === 'qianniuData' || message.action === 'qianniuError' ||
      message.action === 'titleAnalysisResult' || message.action === 'titleAnalysisError') {
```

并在该 if 块内部的 else-if 链（`content.js:848` 之后）新增两个分支：

```js
    } else if (message.action === 'titleAnalysisResult') {
      eventType = 'tb-title-analysis-result';
      payload = message.data;
    } else if (message.action === 'titleAnalysisError') {
      eventType = 'tb-title-analysis-error';
      payload = message.error;
```

- [ ] **Step 3: 提交**

```bash
git add extension/content.js
git commit -m "feat: content.js中继标题工作台消息——tb-search-competitors+titleAnalysisResult"
```

---

### Task 11: index.html — 消息路由 + 边界情况收尾（原 Task 10）

**Files:**
- Modify: `index.html` — 在 Task 7 代码之后继续插入

- [ ] **Step 1: 消息监听处理扩展回传**

在现有 `window.addEventListener('message', ...)` 处理位置（`index.html:3192` 之后，`});` 闭合之前），新增对 `tb-title-analysis-result` 和 `tb-title-analysis-error` 的处理：

```js
    if (e.data && e.data.type === 'tb-title-analysis-result') {
      handleTitleAnalysisResult(e.data.data);
    }
    if (e.data && e.data.type === 'tb-title-analysis-error') {
      clearTimeout(_twFetchTimer);
      $('btnTwFetch').disabled = false;
      $('btnTwFetch').textContent = '重新抓取';
      $('twFetchStatus').style.display = 'block';
      $('twFetchStatus').textContent = '搜索失败：' + (e.data.error || '未知错误');
      $('twFetchStatus').style.color = 'var(--red)';
      $('twKeywordArea').innerHTML = renderManualInputFallback();
    }
```

- [ ] **Step 2: 现有消息监听器位置定位**

找到 `window.addEventListener('message', ...)` 的位置，确认追加点。

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: 标题工作台消息路由——扩展回传结果+异常降级"
```

---

### Task 12: 验证 — 手动测试完整流程

- [ ] **Step 1: 打开 index.html，验证第四个 Tab 显示**

在浏览器打开 `index.html`，确认顶部出现四个 Tab 按钮：竞品分析 / 推广分析 / 活动筛选 / 店铺诊断。

- [ ] **Step 2: 验证店铺激活向导**

- 点击「店铺诊断」Tab → 左侧显示 8 项清单
- 进度条显示 0/8
- 勾选第一项 → 该项收起变灰，进度条变为 1/8
- 刷新页面 → 勾选状态保持
- 全部勾选 → 显示鼓励文案

- [ ] **Step 3: 验证标题工作台输入区**

- 舞种下拉正常工作，选择「其他」显示自填框
- 面料芯片可点选/取消
- 场景芯片可点选/取消
- 未选舞种时「抓取竞品关键词」按钮禁用

- [ ] **Step 4: 验证关键词抓取**

- 选择舞种，点击抓取 → 按钮变为「搜索中...」，状态提示显示
- 扩展正常时 → 回传结果，关键词标签按三级渲染
- 标签可点选/取消，已选计数更新
- 扩展未连接时 → 40s 后超时，显示手动输入降级框
- 手动粘贴标题 → 分析按钮触发 word frequency 分析

- [ ] **Step 5: 验证标题生成**

- 选中至少一个关键词 → 点「生成标题候选」
- 右侧显示 3 个候选标题，分别标注搜索导向/点击导向/均衡导向
- 每个候选字数不超过 30
- 点「复制」按钮 → toast 显示「已复制」
- 点击标题文字可编辑 → 字数实时更新

- [ ] **Step 6: 验证历史记录**

- 生成标题后，历史记录数增加
- 展开历史 → 按商品名分组显示
- 可复制历史标题
- 刷新后历史保持

- [ ] **Step 7: 验证边界情况**

- localStorage 手动损坏（改 JSON）→ 刷新不崩溃
- 成本未设置时 → 价格档位显示「未设置成本」
- 0 个关键词选中点生成 → toast 提示
- 输入很长商品名 → 截断到 30 字符

---

## 实施顺序依赖

```
Task 1 (HTML骨架) → Task 2 (CSS) → Task 3 (Tab切换)
                                     ↓
                    Task 4 (激活向导) + Task 5 (输入区)
                                     ↓
                    Task 8 (content.js提取totalCount) + Task 9 (background.js关键词搜索) + Task 10 (content.js中继消息)
                                     ↓
                    Task 6 (关键词抓取) → Task 7 (标题生成+历史)
                                     ↓
                    Task 11 (index.html消息路由+边界) → Task 12 (验证)
```

Task 4/5 可并行；Task 8/9/10 可并行。
