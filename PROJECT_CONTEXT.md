# PROJECT_CONTEXT

## 已完成功能

- 老照片修复 / 上色 / 动画化全流程（Replicate + R2 + Redis 队列 Worker）
- Google 登录、配额/积分、Stripe 支付（含 Professional）
- 单张预付 USD 1.99、多语言（en/zh/ja/es）、法律页（Terms / Privacy）；历史匿名结果仍可访问
- **内容审核**：默认 Replicate `falcons-ai/nsfw_image_detection`（不依赖 OpenAI 绑卡）；可选 `MODERATION_PROVIDER=openai|auto`
- Pipeline 在调用 Replicate 前审查原图，生成后审查 restored/colorized 图；违规标记 `task.violation`，用户友好提示且不退款（TOS）
- **Replicate 月度预算兜底**：Redis `replicate:spend:YYYY-MM` + `REPLICATE_MONTHLY_SPEND_LIMIT_USD`（默认 $50）
- TOS **4A. Content Restrictions**（含 NSFW 禁令与违规不退款）
- 安全指南：`docs/REPLICATE_SECURITY.md`

## 文件结构（关键）

```
src/lib/moderation.ts          # OpenAI Moderation
src/lib/replicate-spend.ts     # 月度花费守卫
src/lib/replicate.ts           # Replicate 客户端（调用前扣预算）
src/lib/pipeline.ts            # 生成流水线 + 审核钩子
src/lib/content-safety.ts      # TOS / 上传页文案
src/app/terms/page.tsx         # Terms 页面
docs/REPLICATE_SECURITY.md     # Replicate 安全配置指南
```

## 技术选择

- Next.js 15 App Router + TypeScript + next-intl
- Upstash Redis（任务/配额，无 SQL）
- Cloudflare R2 存储、Replicate 模型、Stripe 收款
- 内容审核默认走 Replicate NSFW 分类；OpenAI Moderation 为可选平替

## 2026-09-16 试用故障修复与生产验收

### 故障根因

- Replicate 余额不足后，审核请求与修复请求连续触发，恢复充值时会遇到明确的 HTTP 429 限流；原实现没有对这种可确认失败做短暂重试。
- Upstash 会自动反序列化 Redis Lua 返回的 JSON。队列 Worker 把租约 JSON 再执行 `String(...)` 后得到 `[object Object]`，无法在 processing 队列中确认租约，任务刚被领取就抛出 `WorkerOwnershipLostError`，因此大量任务停留在 `pending`。
- 旧任务创建接口使用未纳入 Serverless 生命周期的后台请求，唤醒失败后只能等待补偿任务。

### 已完成修复

- 队列租约改为带 `claim:` 前缀的不透明字符串，避免 Upstash 自动反序列化；过期恢复仍兼容旧版无前缀租约。
- 任务创建、配额扣减、用户历史与入队改为原子提交；Worker 使用可续租 claim/lock、Next.js `after()`、状态观察唤醒和定时补偿恢复任务。
- Replicate prediction 创建保持单次计费围栏；仅对明确 HTTP 429 最多重试两次，网络中断和不确定 5xx 不盲目重试，避免重复计费。
- 匿名用户再次上传会在写入 R2 前返回 403 和原任务 ID，防止孤儿文件；匿名失败结果允许按规则重试。
- 修复 PWA manifest/icon 被中间件误拦截，以及英语、西语价格卡遗漏积分数量的问题。
- Next.js 升级到 15.5.25；生产依赖审计为 0 个漏洞。

### 验收证据

- 自动化：64 个测试套件、633 个测试全部通过；`typecheck`、`lint`、`build` 通过。仅保留 Footer 旧 `<img>` 的非阻断 lint 警告。
- 上线版本：`9323e51`，Vercel Production 部署成功。
- 线上匿名实测任务：`0225ba43-0bc1-444a-a39d-f74d8e28764d`。
- 同一任务从旧租约故障中的 `pending` 被新版本自动恢复，依次进入 `restoring`、`animating`，最终 `completed / 100%`；`attemptCount=1`，没有重复创建或重复扣额度。
- 结果页返回 HTTP 200；原图、修复图、动画资源均返回 HTTP 206，类型分别为 `image/jpeg`、`image/jpeg`、`video/mp4`。
- 同一匿名身份再次上传返回 HTTP 403，并回传上述原任务 ID，证明重复试用在上传前被拦截。
- `/manifest.webmanifest`、`/brand-icon.png`、`/apple-touch-icon.png` 均为 HTTP 200；英语和西语价格卡已显示 10/25/60 积分数量。

### 尚未在本轮真实执行

- 未进行真实 Stripe 扣款；支付页和 webhook 仍保留自动化测试，但生产支付需要单独用测试商品或小额交易验收。
- 未上传违规图片实测 NSFW 拦截，避免向生产服务发送违规素材。

## 下一步计划

- 用明显违规图实测 Replicate NSFW 拦截（无需 OpenAI 卡）
- 使用 Stripe 测试商品或经确认的小额交易完成一次生产支付 / webhook / 积分到账验收
- Replicate 改用 prepaid credit + 双 token 轮换（见安全文档）
- 可选：上传接口在拿到 CDN URL 后提前审核，进一步省生成费用
- 可选：接入 Sentry（当前 moderation/spend 仅 console.error）

## 注意事项

- 用户**不提交自定义 prompt**；动画 prompt 为服务端常量，仍走 `checkText`
- Moderation 失败默认**放行**，避免 API 挂掉拖垮生成
- Replicate 后台「月度消费上限」已弃用；以 prepaid + 本仓库 Redis 守卫为准
- `REPLICATE_API_TOKEN` / `OPENAI_API_KEY` 仅服务端；切勿放进 `NEXT_PUBLIC_*`
- 违规生成按 TOS **不退款**；配额在创建任务时已扣减
- 多端响应式：法律页与上传安全提示需保持可读

## 2026-10-07 付费转化改造（已上线）

- 保持现有 $4.99/10、$9.99/25、$19.99/60 一次性积分包和免费每日一次。
- 已实现购买登录续接、携带原照片/上传页面上下文、服务端确认付款与到账回执后继续。
- 免费结果支持从原图重新制作高清版，明确一次 1 积分；独立复制原图，持久去重，最后一积分断网后可找回任务，不再扣费。
- Stripe 积分、等级、持久回执单 Lua 事务；每日重置和过期清理已消除与充值交错覆盖余额的竞态。
- 新任务固定生成品质，买包不会把旧低清预览误标为高清。匿名旧结果保留 cookie 归属校验。
- 已增加升级/登录续购/可信 purchase/付费结果浏览事件和服务端付款、交付汇总；详情和最终上线证据见 `docs/conversion-progress.md`。
- 最终全量回归 85 套 / 762 条通过，typecheck、production build 通过；手机/桌面生产构建模拟流程验收完成。代码 `8794e80` 已在 Vercel Production READY，正式域名游客购买登录跳转、API 权限和管理员统计已核验；未进行真实扣款，不等同于已证明转化率提升。


## 2026-10-07 单结果下载实验（未上线，已由 10-10 预付方案替代）

- 分支 `codex/single-result-unlock`：新免费任务改为带水印预览；USD 1.99 / 1 积分解锁本次同一成品，不重新生成。旧任务与既有付费权益保留。
- 无水印母版使用独立私有 R2 桶，图片/视频预览真实写入水印。新增单张 Checkout、永久下载授权、恢复/删除竞态保护及转化统计。
- 最终 92 套 / 839 条测试、typecheck、生产构建通过；最终构建手机/桌面模拟流程已验收。没有真实扣款、没有生产开启。
- 已创建 `oldphotoliveai-private-results`，但原 S3 密钥访问新桶 403。等待用户登录 Cloudflare，并确认创建仅限新桶的专用读写密钥及保存到 Vercel。不得直接开启实验或发布不匹配的价格文案。
- 完整启用清单、回退边界与交接见 `docs/single-result-experiment.md`；不确定支付恢复见 `docs/SINGLE_RESULT_CHECKOUT_RECOVERY.md`。


## 2026-10-10 单张预付方案（已部署，真实付款交付待验收）

- 取消新增匿名/登录免费生成；后端返回 `402 PAYMENT_REQUIRED`，旧免费额度记录不再代表可生成权益。
- 上传照片并登录后，USD 1.99 购买本张照片的当前功能（修复/上色/动态化/完整流程）；付款确认后生成，完整无水印结果，不订阅。
- `single_run` 独立订单：固定原图与功能，付款时原子写入唯一 paid task / 队列 / 历史 / 回执，不增加积分或会员；原积分与 Professional 权益保留。
- 客户端跨登录保存上传意图，使用最新服务端 quota 判断旧积分权益；重复订单/付款未知响应恢复原 Stripe 幂等键，避免重复扣款。
- 确证技术失败可免费重试一次；第二次确证失败后登记退款，明确区分处理中、已发出、需支持核对。违规内容不自动退款，provider 创建不明不盲目再次调用。
- 已付款单张任务不能取消或在交付/退款未解决时删除；弃付订单及临时原图超过7天后按原子围栏安全清理，保留支付未决证据及已引用原图。
- 新方案走现有付费存储，不需要新私有桶；`DOWNLOAD_PREVIEW_ENABLED` 未启用，旧单结果试验被替代，不再销售新 `single_photo`。
- 四语种页面、FAQ、条款与结构化价格同步；Chinese handoff见 `docs/paid-first-release.md`，恢复手册见 `docs/PHOTO_ORDER_RECOVERY.md`。
- 最终 99 套 / 930 项测试全部通过，typecheck、lint、production build 通过，仅保留 Footer 既有 img 警告。最终构建的 1440×960 桌面和 390×844 手机 UI 验收通过；模拟付款回执与退款状态使用本地 API fixture，不代表真实 Stripe 收退款。
- 代码 `a4cb96ea5de60c1472e0cecea8612ef99420d171` 已部署到 Vercel Production，部署 `dpl_EurP17d6FEk3tPXpuypwxqMqYLAK` 为 READY；正式 `/zh/pricing` 已显示单张 USD 1.99、先付款后处理、无水印、一次技术重试及确认无法交付退款政策。
- 生产预付款边界已检查：合成 free 用户 quota `remaining=0`，真实 R2 上传成功，直接生成返回 `402 PAYMENT_REQUIRED`；草稿重放保持同一 `orderId`，两次 Checkout 返回同一 Stripe Session URL。会话为 USD 199 cents、`unpaid`、`payment_intent=null`，付款前 Redis 不存在生成任务且用户仍为 free。
- Chrome 已打开正式 Live mode Stripe，美元价格与产品确认是 `Process One Photo / US$1.99`，银行卡、Apple Pay、Link 表单正常。未填写卡号或点击支付，无真实扣款或 AI 调用；该验收只证明结账创建与付款前边界，不代表完整支付交付链路通过。验收会话已过期，合成用户、订单、quota、receipt、索引及两张 R2 图片已清理；正式页面手机无横向溢出、错误日志为空。
- 真实付款后的 webhook、生成成品、下载及生产退款须独立证明；Checkout 创建本身不是成交。
