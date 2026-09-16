# PROJECT_CONTEXT

## 已完成功能

- 老照片修复 / 上色 / 动画化全流程（Replicate + R2 + Redis 队列 Worker）
- Google 登录、配额/积分、Stripe 支付（含 Professional）
- 匿名试用、多语言（en/zh/ja/es）、法律页（Terms / Privacy）
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
