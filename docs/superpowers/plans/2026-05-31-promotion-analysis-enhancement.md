# 推广分析增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强推广分析 Tab：每个渠道新增适合/不适合判断、分步操作指引、精力投入度、千牛直达链接；移除明日清单和预算功能；新增截图 OCR 辅助定位。

**Architecture:** 单文件 `index.html` 内所有修改。数据层（CHANNEL_KNOWLEDGE +16 个字段）→ 渲染层（renderPromoDetail 展示新字段）→ 交互层（截图粘贴 OCR 辅助）。不移除现有推荐逻辑，只增强信息展示。

**Tech Stack:** 纯前端 HTML/CSS/JS，无框架，无构建工具

---

### Task 1: 更新 CHANNEL_KNOWLEDGE — 所有 16 个渠道新增 6 个字段

**Files:**
- Modify: `E:\taobaoTest\index.html:996-1151`

**说明：** 每个渠道在现有字段基础上新增 `suitableFor`、`notSuitableFor`、`effortLevel`、`detailedSteps`、`directUrl`，以及补充 `checkAfter`（已有部分渠道有，统一补全）。

- [ ] **Step 1: 替换整个 CHANNEL_KNOWLEDGE 数组**

将 `index.html` 第 996-1151 行的 `var CHANNEL_KNOWLEDGE = [...]` 整体替换为以下内容：

```javascript
var CHANNEL_KNOWLEDGE = [
  {
    id: 'freightInsurance', name: '运费险', type: '服务工具',
    baseScore: 95, costLevel: 'low',
    costDesc: '按售价 1%~2%，单均约 ¥0.5~2',
    effortLevel: 'low',
    threshold: '无门槛，千牛一键开通',
    path: '千牛卖家中心 → 商家保障 → 运费险 → 立即加入',
    detailedSteps: '1. 打开千牛卖家中心首页\n2. 左侧导航找到「商家保障」\n3. 在保障列表中找到「运费险」条目\n4. 点击「立即加入」按钮\n5. 阅读协议后点击确认开通',
    suitableFor: '所有店铺都适合，尤其是退货率偏高的类目。演出服定制类商品因尺码/款式问题退换较多，建议优先开通。',
    notSuitableFor: '几乎没有不适用的场景。如果商品利润极薄（单件毛利 < ¥5），注意计算保费成本是否可接受。',
    directUrl: null,
    effectDesc: '退货补运费，买家下单顾虑降低。演出服定制类退货率偏高，开通后转化率通常提升 10-20%。',
    searchWeight: '搜索加权 + 转化率提升',
    checkAfter: '开通后在「生意参谋 → 交易」看转化率是否提升'
  },
  {
    id: 'goldCoins', name: '淘金币', type: '服务工具',
    baseScore: 85, costLevel: 'low',
    costDesc: '买家抵扣 2%~5%，卖家承担费用，单均几分到几毛',
    effortLevel: 'low',
    threshold: '无门槛，千牛一键开通',
    path: '千牛卖家中心 → 营销中心 → 淘金币 → 立即开通',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 在营销工具中找到「淘金币」\n4. 点击「立即开通」按钮\n5. 设置金币抵扣比例（建议默认 2%）',
    suitableFor: '所有店铺都适合。淘金币是淘宝最大的积分体系，买家习惯使用淘金币抵扣，开通后商品有搜索加权和淘金币频道额外曝光。',
    notSuitableFor: '如果商品单价极低（< ¥20），淘金币抵扣比例可能影响利润。不过单均抵扣只有几分到几毛钱，影响很小。',
    directUrl: null,
    effectDesc: '淘宝最大积分体系，开通后商品在淘金币频道有额外曝光，搜索有加权。',
    searchWeight: '搜索加权 + 淘金币频道流量',
    checkAfter: '开通后在「生意参谋 → 流量」看淘金币频道是否有新增访客'
  },
  {
    id: 'sevenDayReturn', name: '7天无理由', type: '服务工具',
    baseScore: 80, costLevel: 'low',
    costDesc: '免费开通，退货由买家承担运费（非质量问题）',
    effortLevel: 'low',
    threshold: '无门槛，千牛一键开通',
    path: '千牛卖家中心 → 消费者保障 → 7天无理由退换货 → 加入',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「消费者保障」\n3. 找到「7天无理由退换货」服务\n4. 点击「加入」按钮\n5. 确认服务协议后开通',
    suitableFor: '所有店铺都必须开通。这是淘宝基础服务标识，不开通会直接影响搜索排序和买家下单意愿。',
    notSuitableFor: '定制类商品（如刻字、来图定制）可申请特殊类目豁免，但需提供证明材料。普通演出服建议保持开通。',
    directUrl: null,
    effectDesc: '基础信任标识，无此标识的商品搜索排序靠后，买家下单率降低。',
    searchWeight: '搜索基础加权',
    checkAfter: '开通后搜索自己的商品，确认「7天无理由」标识已在商品详情页展示'
  },
  {
    id: 'fastRefund', name: '极速退款', type: '服务工具',
    baseScore: 75, costLevel: 'low',
    costDesc: '免费开通',
    effortLevel: 'low',
    threshold: '需店铺信用达标',
    path: '千牛卖家中心 → 消费者保障 → 极速退款 → 开通',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「消费者保障」\n3. 找到「极速退款」服务\n4. 点击「开通」按钮\n5. 系统自动审核店铺信用，达标即时开通',
    suitableFor: '店铺信用良好的卖家。能缩短买家退款等待时间，提升购物体验和复购率。',
    notSuitableFor: '需要店铺信用达标才能开通。如果店铺信用分较低，可能暂时无法开通，需要先积累信用。',
    directUrl: null,
    effectDesc: '缩短买家退款等待时间，提升购物体验和复购率。',
    searchWeight: '轻度搜索加权',
    checkAfter: '开通后在商品详情页确认「极速退款」标识已展示'
  },
  {
    id: 'zhitongche', name: '直通车', type: '付费推广',
    baseScore: 70, costLevel: 'medium',
    costDesc: '按点击付费（CPC），类目均价约 ¥0.5~2/次，建议日预算 ¥30~100 起步',
    effortLevel: 'high',
    threshold: '需充值，最低 ¥200 起充',
    path: '千牛卖家中心 → 营销中心 → 直通车 → 新建推广计划 → 选商品 → 设关键词出价',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「直通车」进入\n4. 点击「新建推广计划」\n5. 选择要推广的商品\n6. 设置日预算（新手建议 ¥30-100）\n7. 添加关键词并设置出价\n8. 提交等待审核',
    suitableFor: '有一定预算且愿意持续优化投放的卖家。适合主推利润较高的款式，按点击付费，精准触达搜索用户，是最直接的获客方式。',
    notSuitableFor: '预算有限（月 < ¥500）或没有时间每天看数据调价的卖家。新手建议先从日预算 ¥30 开始测试，跑 1-2 周积累数据后再调整。',
    directUrl: null,
    effectDesc: '搜索关键词精准流量，是最直接的获客方式。按点击付费，不成交不扣费（仅扣点击费）。',
    searchWeight: '搜索首位曝光'
  },
  {
    id: 'yinlimofang', name: '引力魔方', type: '付费推广',
    baseScore: 60, costLevel: 'medium',
    costDesc: '按点击付费（CPC），建议日预算 ¥50~200',
    effortLevel: 'high',
    threshold: '需充值',
    path: '千牛卖家中心 → 营销中心 → 引力魔方 → 新建计划 → 选商品 → 设人群定向',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「引力魔方」进入\n4. 点击「新建计划」\n5. 选择推广商品\n6. 设置人群定向（新手建议先用系统智能推荐）\n7. 设置日预算（建议 ¥50-200）\n8. 提交',
    suitableFor: '希望获取推荐流量的卖家。适合商品主图视觉效果好、点击率高的商品，能在「猜你喜欢」「购后推荐」等位置获得曝光。',
    notSuitableFor: '商品主图质量一般的情况下，点击率低，投放效率不高。建议先优化主图（清晰、有吸引力）再考虑投放。',
    directUrl: null,
    effectDesc: '推荐流量（猜你喜欢、购后推荐等），适合获取非搜索的被动曝光。',
    searchWeight: '推荐位曝光'
  },
  {
    id: 'wanxiangtai', name: '万相台', type: '付费推广',
    baseScore: 55, costLevel: 'medium',
    costDesc: '按点击付费，建议日预算 ¥50~300',
    effortLevel: 'medium',
    threshold: '需充值',
    path: '千牛卖家中心 → 营销中心 → 万相台 → 新建推广',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「万相台」进入\n4. 点击「新建推广」\n5. 选择投放目标（拉新客/促成交）\n6. 设置日预算\n7. 提交，系统自动在搜索+推荐+内容渠道分配预算',
    suitableFor: '不想分别管理多个推广工具的卖家。万相台自动在搜索+推荐+内容多渠道分配预算，省心省力，适合精力有限的卖家。',
    notSuitableFor: '需要精细控制每个渠道投放的卖家。万相台是智能托管模式，无法分别调控每个渠道的出价和预算分配。',
    directUrl: null,
    effectDesc: '阿里妈妈智能投放平台，自动在搜索+推荐+内容多渠道分配预算。适合不想手动调价的卖家。',
    searchWeight: '多渠道智能投放'
  },
  {
    id: 'taoke', name: '淘客', type: '付费推广',
    baseScore: 50, costLevel: 'medium',
    costDesc: '按成交付费（CPS），佣金比例自行设定（建议 5%~10% 起步）',
    effortLevel: 'low',
    threshold: '需设置佣金计划',
    path: '千牛卖家中心 → 营销中心 → 淘宝客 → 设置佣金 → 推广计划',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「淘宝客」进入\n4. 点击「设置佣金」\n5. 创建推广计划\n6. 设置佣金比例（演出服建议 5-10% 起步，后续根据效果调整）\n7. 保存生效',
    suitableFor: '愿意用佣金换销量的卖家。按成交付费，不成交不花钱，风险低。设定好佣金后几乎不需要日常维护。',
    notSuitableFor: '利润薄的商品（毛利率 < 30%），佣金会大幅压缩利润。演出服客单价高，佣金金额可观，建议从 5% 起步慢慢测试。',
    directUrl: null,
    effectDesc: '按成交付费，不成交不花钱。适合让利换量，但注意佣金会压缩利润。演出服客单价高，佣金金额大，需谨慎设置比例。',
    searchWeight: '淘客渠道额外流量'
  },
  {
    id: 'juhuasuan', name: '聚划算', type: '平台活动',
    baseScore: 45, costLevel: 'high',
    costDesc: '活动保证金 + 佣金扣点（通常 2%~5%）+ 活动价要求',
    effortLevel: 'high',
    threshold: '需店铺资质审核，商品需有销量基础',
    path: '千牛卖家中心 → 营销中心 → 活动报名 → 聚划算 → 提交申请',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「活动报名」\n4. 找到「聚划算」活动入口\n5. 查看当期活动要求和坑位门槛\n6. 准备活动价和库存方案\n7. 提交商品申请\n8. 等待审核（通常 3-7 个工作日）',
    suitableFor: '有一定销量基础和产能的店铺。聚划算单品爆发力强，适合打造爆款。需要做好活动期间的产能和客服准备。',
    notSuitableFor: '新店或销量低的店铺很难通过审核。定制类商品生产周期长，需提前评估产能能否支撑活动期间的单量，否则容易超卖导致店铺处罚。',
    directUrl: null,
    effectDesc: '淘宝最大团购IP，单品爆发力强。但定制类目商品周期长，需评估产能能否支撑活动单量。',
    searchWeight: '活动流量 + 搜索加权'
  },
  {
    id: 'tiantitemai', name: '天天特卖', type: '平台活动',
    baseScore: 40, costLevel: 'high',
    costDesc: '需让利（活动价要求）+ 佣金扣点',
    effortLevel: 'medium',
    threshold: '商品需有一定销量和好评基础',
    path: '千牛卖家中心 → 营销中心 → 活动报名 → 天天特卖 → 提交申请',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「活动报名」\n4. 找到「天天特卖」\n5. 选择适合的活动场次\n6. 提交商品并设置活动价\n7. 等待审核',
    suitableFor: '希望清理库存或做低价引流的卖家。门槛低于聚划算，更适合日常使用。可拿出一两个基础款参加活动为店铺引流。',
    notSuitableFor: '高客单价商品不太适合（天天特卖用户对价格敏感）。利润薄的商品让利空间有限，参加活动可能亏本。',
    directUrl: null,
    effectDesc: '日常特卖活动，门槛低于聚划算，适合清库存或引流款。',
    searchWeight: '活动流量'
  },
  {
    id: 'newProductGrowth', name: '新品成长', type: '平台工具',
    baseScore: 78, costLevel: 'low',
    costDesc: '免费，平台扶持新品获得初始曝光',
    effortLevel: 'low',
    threshold: '商品上架 ≤90 天即可，无销量门槛',
    path: '千牛卖家中心 → 营销中心 → 新品成长 → 选择新品 → 启动加速',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 找到「新品成长」入口\n4. 系统自动列出上架 90 天内的新品\n5. 选择要推广的新品\n6. 点击「启动加速」按钮',
    suitableFor: '持续上新的店铺最受益。演出服款型多、上新频繁，非常适合用新品成长推新款，帮助新品快速度过冷启动期获得初始曝光。',
    notSuitableFor: '商品上架超过 90 天无法参与。如果店铺很少上新，能用到的机会不多。',
    directUrl: null,
    effectDesc: '平台为新品提供搜索和推荐位额外曝光，帮助新品快速度过冷启动期。演出服款型多、上新频繁，非常适合用新品成长推新款。',
    searchWeight: '搜索加权 + 推荐流量',
    checkAfter: '加速 7 天后在「生意参谋 → 商品」看新品访客数是否增长'
  },
  {
    id: 'ifashion', name: 'iFashion', type: '行业渠道',
    baseScore: 70, costLevel: 'low',
    costDesc: '免费入驻（需审核），无额外费用',
    effortLevel: 'medium',
    threshold: '服饰类目店铺，商品有设计感或风格统一',
    path: '千牛卖家中心 → 营销中心 → iFashion → 提交入驻申请',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 找到「iFashion」入口\n4. 点击「提交入驻申请」\n5. 填写店铺风格描述\n6. 上传具有设计感的商品图片\n7. 提交等待审核（通常 3-7 个工作日）',
    suitableFor: '服饰类目店铺，商品有设计感或统一风格。演出服、舞台装属于服饰类目，入驻后可获取精准的演出服/舞台装流量入口。',
    notSuitableFor: '非服饰类目无法入驻。商品如果以通货为主、缺乏设计感，审核可能不通过。店铺需要有一定数量的风格统一的商品。',
    directUrl: null,
    effectDesc: '淘宝服饰行业官方频道，入驻后商品获得行业专属推荐位。演出服属于服饰类目，可获取精准的舞台装/演出服流量入口。',
    searchWeight: '行业频道流量 + 精准人群曝光',
    checkAfter: '入驻后在 iFashion 频道搜索类目关键词，确认商品已展示'
  },
  {
    id: 'flashSale', name: '淘宝秒杀', type: '平台活动',
    baseScore: 65, costLevel: 'medium',
    costDesc: '需设置活动价（通常 7~9 折），无额外扣点',
    effortLevel: 'low',
    threshold: '店铺评分 ≥4.4，商品有一定销量基础',
    path: '千牛卖家中心 → 营销中心 → 活动报名 → 淘宝秒杀 → 提交商品',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「活动报名」\n4. 找到「淘宝秒杀」入口\n5. 查看当期活动要求\n6. 提交商品并设置活动价（建议 7-9 折）\n7. 等待审核',
    suitableFor: '想测试商品价格竞争力的卖家。门槛低于聚划算和天天特卖，适合拿出一两个基础款参加秒杀为店铺引流。',
    notSuitableFor: '店铺评分 < 4.4 无法报名。0 销量的商品建议先积累基础销量再参加，否则报名成功率低。',
    directUrl: null,
    effectDesc: '淘宝日常秒杀频道，门槛低于聚划算，适合测试商品价格竞争力。可设置部分基础款参加秒杀为店铺引流。',
    searchWeight: '秒杀频道流量',
    checkAfter: '活动期间关注商品访客数和转化率，评估引流效果'
  },
  {
    id: 'jisutui', name: '极速推', type: '付费推广',
    baseScore: 62, costLevel: 'medium',
    costDesc: '按曝光付费（CPM），建议日预算 ¥30~100',
    effortLevel: 'medium',
    threshold: '需充值，最低 ¥100 起',
    path: '千牛卖家中心 → 营销中心 → 极速推 → 选商品 → 设预算 → 一键推广',
    detailedSteps: '1. 打开千牛卖家中心\n2. 左侧导航找到「营销中心」\n3. 点击「极速推」进入\n4. 选择要推广的商品\n5. 设置日预算（新手建议 ¥30-100）\n6. 点击「一键推广」按钮\n7. 系统自动匹配人群投放',
    suitableFor: '新手卖家或不擅长关键词投放的卖家。操作比直通车简单很多，无需手动设置关键词，系统自动匹配人群，适合新品测款和快速获取曝光。',
    notSuitableFor: '需要精准控制投放人群和关键词的卖家。极速推的定向精度不如直通车，不适合复杂的投放策略。',
    directUrl: null,
    effectDesc: '操作比直通车更简单，系统自动匹配人群，无需手动设关键词。适合新手快速获取曝光、推广新品或测款。',
    searchWeight: '推荐位 + 搜索位曝光',
    checkAfter: '推广 3 天后在「生意参谋 → 流量」看新增访客来源'
  },
  {
    id: 'superLive', name: '超级直播', type: '付费推广',
    baseScore: 45, costLevel: 'medium',
    costDesc: '按观看付费（CPV）或按点击付费，日预算 ¥50~200',
    effortLevel: 'high',
    threshold: '需开播 + 充值',
    path: '千牛卖家中心 → 营销中心 → 超级直播 → 创建直播推广',
    detailedSteps: '1. 先使用千牛或淘宝主播 App 开播\n2. 打开千牛卖家中心\n3. 左侧导航找到「营销中心」\n4. 点击「超级直播」进入\n5. 点击「创建直播推广」\n6. 关联正在进行的直播\n7. 设置日预算（建议 ¥50-200）\n8. 开始推广',
    suitableFor: '有直播条件和意愿的卖家。演出服上身效果和定制细节在直播中展示力强，转化率明显高于图文。能定期开播（每周至少 1-2 次）的情况下值得投入。',
    notSuitableFor: '没有主播或时间开播的卖家不建议。直播推广需要配合开播才有用，不开播就没有意义。副业卖家需评估能否每周固定时间开播。',
    directUrl: null,
    effectDesc: '为直播间引流，演出服上身效果和定制细节在直播中展示力强。直播能有效提升转化率，但需主播和时间投入。',
    searchWeight: '直播频道 + 搜索直播卡曝光',
    checkAfter: '推广后在直播数据看板查看引流效果和成交转化'
  },
  {
    id: 'superShortVideo', name: '超级短视频', type: '付费推广',
    baseScore: 42, costLevel: 'medium',
    costDesc: '按观看付费（CPV），建议日预算 ¥30~100',
    effortLevel: 'medium',
    threshold: '需制作短视频 + 充值',
    path: '千牛卖家中心 → 营销中心 → 超级短视频 → 选视频 → 设预算出价',
    detailedSteps: '1. 先在千牛或淘宝 App 发布商品短视频\n2. 打开千牛卖家中心\n3. 左侧导航找到「营销中心」\n4. 点击「超级短视频」进入\n5. 选择已发布的短视频\n6. 设置日预算（建议 ¥30-100）\n7. 设置出价\n8. 开始推广',
    suitableFor: '能制作商品展示视频的卖家。演出服的穿着效果、细节展示在短视频中表现力强。一条优质短视频可持续带来免费+付费流量，投入一次长期受益。',
    notSuitableFor: '没有条件拍摄和剪辑短视频的卖家。短视频需要一定的拍摄和剪辑能力，如果视频质量差反而会影响商品形象。',
    directUrl: null,
    effectDesc: '为短视频引流，演出服的穿着效果、细节展示在短视频中表现力强。一条优质短视频可持续带来免费+付费流量。',
    searchWeight: '短视频推荐流曝光',
    checkAfter: '推广后在视频数据看板查看播放量和商品点击率'
  }
];
```

- [ ] **Step 2: 确认语法正确**

在浏览器打开 `index.html`，检查控制台是否有 JS 语法错误。

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: CHANNEL_KNOWLEDGE 新增 suitableFor/notSuitableFor/effortLevel/detailedSteps/directUrl 字段"
```

---

### Task 2: 移除明日清单和预算相关代码

**Files:**
- Modify: `E:\taobaoTest\index.html`

**说明：** 移除 `addToChecklist()` 函数、`savePromoBudget()` 函数、预算恢复逻辑、HTML 中的预算输入框和清单按钮。

- [ ] **Step 1: 移除 HTML 中的月预算输入框**

找到第 929-932 行，删除：

```html
    <div style="margin-top:14px;">
      <label class="field-label">月推广预算（¥）<span style="color:var(--text-muted);font-weight:400;">选填，后期使用</span></label>
      <input class="field-input" id="promoMonthlyBudget" type="number" placeholder="如：2000" onchange="savePromoBudget()">
    </div>
```

- [ ] **Step 2: 移除英雄卡片中的"+ 写入明日清单"按钮**

找到 `renderPromoHero` 函数中的按钮（约 1353 行），将：

```javascript
        '<button class="btn btn-primary btn-sm" onclick="addToChecklist(\'' + ch.id + '\')">+ 写入明日清单</button>' +
```

替换为：

```javascript
        '' +
```

- [ ] **Step 3: 移除分组列表中的"+ 写入清单"按钮**

找到 `renderPromoSection` 函数中的按钮（约 1383 行），将：

```javascript
      '<button class="btn btn-primary btn-sm" onclick="addToChecklist(\'' + ch.id + '\')">+ 写入清单</button>' +
```

替换为：

```javascript
      '' +
```

- [ ] **Step 4: 移除 `savePromoBudget()` 函数**

删除第 1181-1183 行的函数：

```javascript
function savePromoBudget() {
  localStorage.setItem('tb_promo_monthly_budget', $('promoMonthlyBudget').value);
}
```

- [ ] **Step 5: 移除 `restorePromoCheckboxes()` 中的预算恢复逻辑**

找到第 1190-1191 行，删除：

```javascript
  var savedBudget = localStorage.getItem('tb_promo_monthly_budget');
  if (savedBudget) $('promoMonthlyBudget').value = savedBudget;
```

`restorePromoCheckboxes()` 最终变为：

```javascript
function restorePromoCheckboxes() {
  var status = loadPromoStatus();
  document.querySelectorAll('#tabPromotion input[type="checkbox"][data-id]').forEach(function(cb) {
    cb.checked = !!status[cb.dataset.id];
  });
}
```

- [ ] **Step 6: 移除 `addToChecklist()` 函数**

删除第 1459-1476 行的整个函数：

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

- [ ] **Step 7: 确认无语法错误**

在浏览器打开 `index.html`，检查控制台是否有 `ReferenceError`（引用了已删除的函数）。

- [ ] **Step 8: 提交**

```bash
git add index.html
git commit -m "refactor: 移除明日清单和月预算相关代码"
```

---

### Task 3: 更新 renderPromoDetail() 展示新字段

**Files:**
- Modify: `E:\taobaoTest\index.html:1431-1445`

**说明：** 知识库区域展示所有新字段：效果 → 适合谁 → 不适合 → 操作步骤 → 费用 → 门槛 → 精力投入度 → 效果验证 → 千牛直达/截图辅助按钮。

- [ ] **Step 1: 替换 `renderPromoDetail()` 函数**

将第 1431-1445 行的 `renderPromoDetail` 函数替换为：

```javascript
function renderPromoDetail() {
  var html = '';
  var effortLabels = { low: '一键搞定 · 几乎不费精力', medium: '偶尔维护 · 每周看一眼即可', high: '持续投入 · 需要经常看数据调整' };
  var effortColors = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)' };

  CHANNEL_KNOWLEDGE.forEach(function(ch) {
    var effortLabel = effortLabels[ch.effortLevel] || ch.effortLevel;
    var effortColor = effortColors[ch.effortLevel] || 'var(--text-muted)';

    var actionHtml = ch.directUrl
      ? '<a class="btn btn-outline btn-sm" href="' + escHtml(ch.directUrl) + '" target="_blank" rel="noopener" style="margin-top:8px;display:inline-block;">在千牛打开</a>'
      : '<button class="btn btn-outline btn-sm" onclick="showOcrZone(\'' + ch.id + '\')" style="margin-top:8px;">截图辅助定位</button>';

    var checkAfterHtml = ch.checkAfter
      ? '<br><strong>效果验证：</strong>' + escHtml(ch.checkAfter)
      : '';

    var stepsHtml = escHtml(ch.detailedSteps).replace(/\n/g, '<br>');

    html += '<div class="a-card" style="margin-bottom:10px;">' +
      '<div class="a-card-hd"><h4>' + escHtml(ch.name) + ' <span style="font-size:10px;color:var(--text-muted);font-weight:400;">' + escHtml(ch.type) + '</span></h4></div>' +
      '<div class="a-card-bd">' +
        '<strong>效果：</strong>' + escHtml(ch.effectDesc) + '<br>' +
        '<strong>适合谁：</strong>' + escHtml(ch.suitableFor) + '<br>' +
        '<strong>不适合：</strong>' + escHtml(ch.notSuitableFor) + '<br>' +
        '<strong>操作步骤：</strong><br>' + stepsHtml + '<br>' +
        '<strong>费用：</strong>' + escHtml(ch.costDesc) + '<br>' +
        '<strong>门槛：</strong>' + escHtml(ch.threshold) + '<br>' +
        '<strong>精力投入：</strong><span style="color:' + effortColor + ';font-weight:600;">' + effortLabel + '</span>' +
        checkAfterHtml +
        '<br>' + actionHtml +
      '</div>' +
    '</div>';
  });
  $('promoDetailContent').innerHTML = html;
}
```

- [ ] **Step 2: 同步更新 `renderPromoHero()` 展示精力投入度**

在英雄卡片的费用/门槛行后追加精力投入度显示。找到约 1349 行，在：

```javascript
'<div class="hero-cost">💰 ' + escHtml(ch.costDesc) + ' · 📋 ' + escHtml(ch.threshold) + '</div>' +
```

之后插入：

```javascript
(function() {
  var effortLabel = { low: '不费精力 · 一键搞定', medium: '偶尔维护即可', high: '需要持续关注调整' }[ch.effortLevel] || '';
  return '<div class="hero-effort">⏱ ' + escHtml(effortLabel) + '</div>';
})() +
```

- [ ] **Step 3: 确认渲染正确**

在浏览器打开 `index.html`，切换到推广分析 Tab，展开知识库，检查各渠道卡片是否正确展示所有新字段。

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "feat: renderPromoDetail 展示适合/不适合/操作步骤/精力投入度/千牛直达按钮"
```

---

### Task 4: 新增 OCR 截图粘贴区域和交互逻辑

**Files:**
- Modify: `E:\taobaoTest\index.html`

**说明：** 在推广分析右侧面板底部添加截图粘贴区域（默认隐藏），用户点击某个渠道的"截图辅助定位"按钮后显示。粘贴截图后展示预览，引导用户保存截图并告知 Claude 来识别。

- [ ] **Step 1: 添加 CSS 样式**

在 `<style>` 标签内，约 `#promoDetailContent` 样式附近，追加 OCR 区域样式：

```css
.ocr-zone {
  background: var(--card-bg);
  border: 2px dashed var(--amber);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
  margin-top: 12px;
}
.ocr-zone-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.ocr-channel-name {
  font-size: 12px;
  color: var(--brand);
  margin-bottom: 12px;
}
.ocr-paste-box {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 40px 20px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 13px;
  transition: border-color 0.2s;
}
.ocr-paste-box:hover { border-color: var(--brand); }
.ocr-preview-img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 4px;
  margin-bottom: 12px;
}
.ocr-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  line-height: 1.6;
}
```

- [ ] **Step 2: 添加 HTML 结构**

在 `promoDetailContent` 的 `</div>` 之后（约 986 行），在 `</div>`（`promoResult` 关闭前，约 987 行）之前，插入：

```html
      <!-- OCR 截图辅助区域（默认隐藏） -->
      <div id="ocrZone" class="ocr-zone" style="display:none;">
        <div class="ocr-zone-title">截图辅助定位</div>
        <div class="ocr-channel-name" id="ocrChannelName"></div>
        <div id="ocrPasteBox" class="ocr-paste-box">
          在千牛打开对应页面后截图（Win+Shift+S）<br>回到此页面，点击此处后 Ctrl+V 粘贴截图
        </div>
        <img id="ocrPreview" class="ocr-preview-img" style="display:none;" alt="截图预览">
        <a id="ocrSaveBtn" class="btn btn-primary btn-sm" style="display:none;" download="qianniu-screenshot.png">下载截图</a>
        <div id="ocrHint" class="ocr-hint" style="display:none;">
          截图已就绪。请下载截图并告诉我文件路径，<br>我会识别截图中的千牛界面并告诉你具体操作步骤。
        </div>
      </div>
```

- [ ] **Step 3: 添加 JS 交互逻辑**

在 `renderPromoDetail()` 函数后方，添加 OCR 相关函数：

```javascript
// ===== OCR 截图辅助 =====
var _ocrChannelId = null;

function showOcrZone(channelId) {
  _ocrChannelId = channelId;
  var ch = CHANNEL_KNOWLEDGE.find(function(c) { return c.id === channelId; });
  $('ocrChannelName').textContent = ch ? '正在定位：' + ch.name : '';
  $('ocrZone').style.display = '';
  $('ocrPasteBox').style.display = '';
  $('ocrPreview').style.display = 'none';
  $('ocrSaveBtn').style.display = 'none';
  $('ocrHint').style.display = 'none';
  $('ocrZone').scrollIntoView({ behavior: 'smooth' });
}

// 全局 paste 事件监听 —— 仅在 OCR 区域可见时处理图片粘贴
document.addEventListener('paste', function(e) {
  var ocrZone = $('ocrZone');
  if (!ocrZone || ocrZone.style.display === 'none') return;

  var items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      e.preventDefault();
      var blob = items[i].getAsFile();
      var reader = new FileReader();
      reader.onload = function(ev) {
        $('ocrPreview').src = ev.target.result;
        $('ocrPreview').style.display = '';
        $('ocrSaveBtn').href = ev.target.result;
        $('ocrSaveBtn').style.display = '';
        $('ocrHint').style.display = '';
        $('ocrPasteBox').style.display = 'none';
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
});

// 点击粘贴框也可触发（提示用户用 Ctrl+V）
$('ocrPasteBox').addEventListener('click', function() {
  // 仅作提示，实际粘贴通过全局 paste 事件处理
});
```

- [ ] **Step 4: 确认功能可用**

在浏览器打开 `index.html`，展开知识库，点击某个渠道的"截图辅助定位"按钮，确认 OCR 区域出现。截图后 Ctrl+V 粘贴，确认预览显示。

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "feat: 新增 OCR 截图粘贴区域，辅助定位千牛操作入口"
```

---

### Task 5: 最终验证

**说明：** 整合验证所有改动，确保无回归问题。

- [ ] **Step 1: 检查控制台错误**

打开 `index.html`，F12 打开控制台，执行以下操作：
- 切换到推广分析 Tab
- 勾选/取消勾选各渠道
- 点击"生成推荐"
- 展开知识库，浏览所有 16 个渠道卡片
- 点击"截图辅助定位"按钮
- 粘贴一张截图

确认控制台无任何 JS 错误。

- [ ] **Step 2: 检查 localStorage 清理**

在控制台执行：
```javascript
console.log(localStorage.getItem('tb_promo_mystatus'));
```
确认勾选状态仍正常保存/恢复。确认不再写入 `tb_checklist_tasks` 和 `tb_promo_monthly_budget`。

- [ ] **Step 3: 检查竞品分析 Tab**

切换到竞品分析 Tab，执行一次分析（如有扩展可用），确认功能正常、无 JS 错误。

- [ ] **Step 4: 提交**

```bash
git add -A
git diff --cached --stat
git commit -m "feat: 推广分析增强完成——渠道信息、截图辅助、移除清单/预算"
```

---

### Task 6: 更新 CHANGELOG

**Files:**
- Modify: `E:\taobaoTest\CHANGELOG.md`

- [ ] **Step 1: 在 CHANGELOG 顶部追加变更记录**

在 `CHANGELOG.md` 文件开头（标题之后）插入：

```markdown
## 2026-05-31 — 推广分析增强

### 新增
- 每个推广渠道新增「适合谁」「不适合谁」判断指引
- 每个渠道新增分步操作步骤（细化到按钮文字）
- 每个渠道新增精力投入度标注（一键搞定/偶尔维护/持续投入）
- 渠道知识库新增「在千牛打开」按钮（有直达链接时）或「截图辅助定位」按钮
- 新增 OCR 截图粘贴区域：用户截图千牛页面 → 粘贴 → 下载 → 由 Claude 识别界面并给出操作指引

### 移除
- 移除「+ 写入明日清单」/「+ 写入清单」按钮及相关函数
- 移除月推广预算输入框及相关 localStorage 键

### 变更
- 设计文档同步更新，反映新的推广分析设计
- CLAUDE.md 同步更新 localStorage 键名和推广分析函数列表
```

- [ ] **Step 2: 提交**

```bash
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 记录推广分析增强"
```
