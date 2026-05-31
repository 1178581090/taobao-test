# 活动筛选 Tab — 设计文档

**日期：** 2026-05-31  
**状态：** 设计已确认，待实施

---

## 1. 问题与目标

### 当前问题

1. 千牛后台营销/推广菜单项过多（30+ 子项），新手不知道哪些该点
2. 推广分析 Tab 的 13 个静态渠道推荐不基于用户真实店铺数据，实际意义有限
3. 活动报名页有大量活动，但用户不知道哪些自己够资格参加
4. 推广分析和活动筛选如果都做推荐会功能重叠

### 目标

- **新建「活动筛选」Tab**：唯一推荐引擎。基于用户真实千牛店铺数据 + 千牛活动报名页实际活动列表 + 推广中心实际推广产品，做资格匹配和个性化推荐
- **推广分析 Tab 降级**：改为工具手册。移除推荐排序逻辑，保留勾选面板（标记已开通）+ 渠道详情卡片（操作步骤 + 直达链接 + 截图辅助）。纯按需查阅

---

## 2. 架构

```
┌─────────────────────────────────────────────────────┐
│                  index.html                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 竞品分析  │  │ 推广分析  │  │ 活动筛选（新增）   │  │
│  │ (不变)    │  │ (降级)    │  │                  │  │
│  │          │  │          │  │ 读取 scan.json    │  │
│  │          │  │ 移除推荐  │  │ → 资格匹配       │  │
│  │          │  │ 保留手册  │  │ → 分组渲染       │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↑
                  scan-qianniu.json
                         ↑
┌─────────────────────────────────────────────────────┐
│              scan-qianniu.js (Playwright)            │
│  1. 登录千牛（持久化 cookie）                         │
│  2. 抓取首页 → 店铺状态                              │
│  3. 抓取活动报名页 → 活动列表 + 资格状态              │
│  4. 抓取推广中心 → 推广产品                          │
│  5. 输出结构化 JSON                                  │
└─────────────────────────────────────────────────────┘
```

### 文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `index.html` | 修改 | 新增 Tab + 降级推广分析 |
| `scan-qianniu.js` | 新建 | 千牛扫描脚本 |
| `scan-qianniu.json` | 新建（git ignore） | 扫描结果缓存 |
| `fetch-page.js` | 保留 | 单页抓取工具（scan 脚本依赖它或直接内联） |

---

## 3. 数据获取层（scan-qianniu.js）

### 3.1 执行方式

```bash
node scan-qianniu.js
```

- 复用 `fetch-page.js` 的登录态持久化机制（`.browser-state/state.json`）
- 依次访问 3 个页面，每页提取结构化数据

### 3.2 抓取页面及提取内容

**页面 1：千牛首页** `https://myseller.taobao.com/home.htm`

| 提取字段 | DOM 来源 | 示例值 |
|---------|---------|--------|
| `store.level` | 含 "店铺成长层级" 的文本 | "Lv.2" |
| `store.expScore` | 含 "真实体验分" 的文本 | 0（或数字） |
| `store.deposit` | 含 "保证金" 的文本 | "无需缴纳" |
| `store.creditLevel` | 含 "信用等级" 的链接文本 | "❤❤❤❤" |
| `store.violations` | 含 "违规" 的数字 | 0 |
| `store.orders30d` | 数据面板（由生意参谋提供） | 0 |
| `store.visitors` | 数据面板 | 5 |

**页面 2：活动报名页** `https://myseller.taobao.com/home.htm/starb/tmc-next/sale/seller/homepage.htm`

| 提取字段 | DOM 来源 |
|---------|---------|
| `activities[].name` | 活动名称文本 |
| `activities[].status` | "可报" / "资格不足" / "已结束" / "暂停中" |
| `activities[].url` | 活动的 href |
| `activities[].deadline` | 截止时间文本 |
| `activities[].requirements` | 页面上标注的资格条件文本 |

**页面 3：推广中心** `https://myseller.taobao.com/home.htm/tuiguangcenter_new/`

| 提取字段 | DOM 来源 |
|---------|---------|
| `promotions[].name` | 推广产品名称 |
| `promotions[].type` | "付费推广"/"免费工具" |
| `promotions[].url` | 链接 |
| `promotions[].entryPrice` | 入门价格文本（如 "1元抵101元"） |
| `promotions[].guarantee` | 效果保障文本（如 "7天销量破0，无成交必赔"） |

### 3.3 输出格式

```json
{
  "scannedAt": "2026-05-31T20:37:00+08:00",
  "store": {
    "level": "Lv.2",
    "expScore": 0,
    "deposit": "无需缴纳",
    "creditLevel": "4心",
    "violations": 0,
    "orders30d": 0,
    "visitors": 5
  },
  "activities": [
    {
      "name": "淘金币百亿加抵",
      "status": "可报",
      "url": "https://myseller.taobao.com/home.htm/taojinbi/",
      "deadline": "长期",
      "category": "常驻活动",
      "requirements": "无门槛"
    }
  ],
  "promotions": [
    {
      "name": "关键词推广",
      "type": "付费推广",
      "url": "https://myseller.taobao.com/home.htm/subway_new/",
      "entryPrice": "1元抵101元",
      "guarantee": "7天销量破0，无成交必赔"
    }
  ]
}
```

### 3.4 错误处理

- 任意页面加载失败 → 保留上次成功数据，标记 `stale: true`
- 登录态过期 → 提示用户重新登录
- DOM 结构变化导致提取失败 → 输出 warning 日志，该页面数据返回空数组

---

## 4. 规则引擎（资格匹配）

### 4.1 规则定义

每条活动/工具对应一条规则。规则文件维护在 `index.html` 内（新的 `ACTIVITY_RULES` 数组），和 `CHANNEL_KNOWLEDGE` 同级。

```javascript
var ACTIVITY_RULES = [
  {
    id: '618carnival',
    name: '618狂欢节',
    category: '大促活动',
    source: '营销 > 活动报名',
    rules: {
      storeLevel: { min: 'Lv.1' },
      expScore: { min: 4.2 },
      orders30d: { min: 30 }
    },
    costType: 'free',
    effort: 'high',
    effect: '618专属搜索+推荐流量，全链路活动氛围',
    howToImprove: '积累 30 单真实交易获得体验分后再参加大促'
  },
  {
    id: 'tjCoinBuyPlus',
    name: '淘金币百亿加抵',
    category: '常驻活动',
    source: '营销 > 淘金币',
    rules: {},  // 无门槛
    costType: 'free',
    effort: 'low',
    effect: '4%~10%货品补贴，亿级频道流量',
    howToImprove: null
  }
  // ... 更多规则
];
```

### 4.2 匹配逻辑

```javascript
function matchActivity(rule, storeState) {
  var failed = [];
  if (rule.rules.storeLevel && !matchLevel(storeState.level, rule.rules.storeLevel.min)) {
    failed.push({ field: '店铺层级', current: storeState.level, required: rule.rules.storeLevel.min });
  }
  if (rule.rules.expScore && storeState.expScore < rule.rules.expScore.min) {
    failed.push({ field: '体验分', current: storeState.expScore, required: rule.rules.expScore.min });
  }
  if (rule.rules.orders30d && storeState.orders30d < rule.rules.orders30d.min) {
    failed.push({ field: '近30天订单', current: storeState.orders30d, required: rule.rules.orders30d.min });
  }
  // ... 更多维度

  if (failed.length === 0) return { result: 'eligible', failed: [] };
  if (failed.length <= 2) return { result: 'almost', failed: failed };
  return { result: 'ineligible', failed: failed };
}
```

### 4.3 动态活动与静态规则的桥接

- 脚本扫描到的活动列表中，在 `ACTIVITY_RULES` 里有对应条目的 → 用静态规则匹配（规则更详细）
- 脚本扫描到但规则库里没有的新活动 → 用页面上标注的 `requirements` 文本做简单匹配，标记"待验证"
- 规则库里有但扫描没扫到的 → 如果状态是"已结束"或"暂停中"，归入对应分组

---

## 5. 推广分析 Tab 降级

### 5.1 移除的内容

- `getPromoPlan()` 函数（推荐排序 + 分组逻辑）
- `renderPromoHero()` 函数
- `renderPromoSection()` 函数
- Hero 卡片 HTML、"一键开通"/"需要投入"等分组卡片 HTML
- Hero 相关的 CSS
- "生成推荐"按钮 → 改为"刷新"，仅重新渲染勾选状态和详情

### 5.2 保留的内容

- 勾选面板（左侧："我的推广现状"）——标记已开通渠道，数据 localStorage 持久化
- 13 个渠道的 `CHANNEL_KNOWLEDGE` 数组
- `renderPromoDetail()` — 渠道详情卡片（操作步骤 + 直达链接 + 截图辅助）
- 同行对标卡片 `renderPromoPeerCard()`
- OCR 截图辅助区域
- toggle 折叠

### 5.3 调整后的 UI

```
[左侧面板]
  我的推广现状
  服务工具: [运费险] [淘金币] [7天无理由] [极速退款] [新品成长] [iFashion]
  付费推广: [万相台无界版] [淘客] [超级直播] [超级短视频]
  平台活动: [聚划算] [天天特卖] [淘宝秒杀]
  [刷新] 按钮
  提示: 勾选你已开通的渠道，刷新后查看详情

[右侧面板]
  同行活动覆盖 (数据充足时显示)
  未开通渠道详情 (折叠 toggle)
```

---

## 6. 活动筛选 Tab UI

### 6.1 布局

左右两栏，和推广分析 Tab 结构一致。

**左侧面板（350px）：**

```
店铺状态卡片
┌──────────────────────┐
│ 店铺状态 · 最后更新 5分钟前 │
│ 层级: Lv.2              │
│ 体验分: 暂无 (需30单)     │
│ 保证金: 已缴             │
│ 信用: ❤❤❤❤ (4心)       │
│ 违规: 0 次              │
│ 近30天: 0 单            │
│                        │
│ [重新扫描店铺数据]        │
└──────────────────────┘

筛选
☑ 可参加 (2)
☑ 差一步 (3)
☐ 暂不可参加 (10)
☐ 平台暂停 (1)
```

**右侧面板（flex）：**

```
结果条: "共 15 项 · 可参加 2 项 · 差一步 3 项"

▼ ✅ 可参加 (2)
┌─────────────────────────────────┐
│ 淘金币百亿加抵  [常驻活动]         │
│ 4%~10%货品补贴，亿级频道流量      │
│ ✓ 无门槛 · 免费 · 低精力         │
│ [去参加 →]                      │
│ ▼ 详情: 操作步骤 / 费用说明...    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 评价有礼  [营销工具]              │
│ AI自动发奖，积累有效评价          │
│ ✓ 免费 · 低精力                 │
│ [去设置 →]                      │
└─────────────────────────────────┘

▼ ⚠️ 差一步 (3)
┌─────────────────────────────────┐
│ 618狂欢节  [大促活动]             │
│ 618专属搜索+推荐流量             │
│ ✓ 层级 Lv.2 达标               │
│ ✗ 体验分: 需 ≥ 4.2, 当前暂无     │
│ ✗ 近30天订单: 需 ≥ 30, 当前 0    │
│ 💡 积累 30 单后解锁              │
│ [查看详情]                       │
└─────────────────────────────────┘
  ... (其他差一步项)

▶ ❌ 暂不可参加 (10) — 点击展开

▶ 🔒 平台暂停 (1) — 点击展开
```

### 6.2 交互

- 左侧开关切换即时过滤右侧列表
- "去参加"按钮：`directUrl` 有值的用链接跳转，没值的用截图辅助
- 差一步项的"💡 改进方法"是规则里的 `howToImprove` 字段
- 整组折叠/展开，默认可参加和差一步展开，其余折叠
- 底部也保留一个"全部活动详情"折叠区，和推广分析的渠道详情卡片风格一致

---

## 7. 实现顺序

1. **scan-qianniu.js** — 千牛扫描脚本（基于 fetch-page.js 扩展）
2. **ACTIVITY_RULES** — 静态规则数组（先覆盖千牛营销 Tab 所有子菜单项 + 推广 Tab 推广产品 + 活动报名页常驻活动）
3. **活动筛选 Tab HTML + CSS** — 新 Tab 按钮 + 左右面板骨架
4. **活动筛选渲染逻辑** — 读取 `scan-qianniu.json` + 匹配规则 + 渲染卡片列表
5. **推广分析降级** — 移除推荐逻辑，保留工具手册
6. **Tab 导航更新** — index.html 顶部 Tab 栏加"活动筛选"

---

## 8. 自检

- [x] 无 TBD/TODO
- [x] 和推广分析的职责分界明确（推荐 vs 手册）
- [x] 数据流清晰（scan → json → render）
- [x] 错误处理覆盖（登录过期、DOM 变化、扫描失败）
