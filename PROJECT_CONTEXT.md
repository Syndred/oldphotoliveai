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

- Next.js 14 App Router + TypeScript + next-intl
- Upstash Redis（任务/配额，无 SQL）
- Cloudflare R2 存储、Replicate 模型、Stripe 收款
- 内容审核默认走 Replicate NSFW 分类；OpenAI Moderation 为可选平替

## 下一步计划

- 用明显违规图实测 Replicate NSFW 拦截（无需 OpenAI 卡）
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
