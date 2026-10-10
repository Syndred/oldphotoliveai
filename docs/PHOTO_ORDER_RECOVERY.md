# 单张预付订单交接（2026-10-10）

本轮为先支付 USD 1.99、再处理选定原图与 workflow 的 `single_run`。不充值积分、不变更用户会员。历史 `single_photo` 的已创建付款仍可履约，但新建此类 Checkout 返回 410。

## 数据与恢复边界

- `photo:order:<orderId>` 永久保存购买账号、任务 ID、workflow、独立原图 `tasks/<orderId>/original.ext`、原上传引用、固定金额、Checkout 尝试与退款状态。`photo:order:source:<sha256>` 将同一账号/上传/工作流绑定同一订单，避免刷新产生复购。
- Checkout 创建前先永久保存完整参数与 `attemptId`。Stripe 幂等键为 `photo-order:<orderId>:<attemptId>`；网络结果未知时只能用同参数、同键恢复。未拿到 sessionId 且已达 23 小时，停止自动创建，返回 `CHECKOUT_REVIEW_REQUIRED`；不要删订单或 checkout 字段强行重试。
- 核对 Stripe 的 metadata `product=oldphotoliveai, plan=single_run, orderId, taskId, userId, attemptId` 及实付 199 USD 分、payment_intent、session ID。只有 Stripe 明确 `expired` 且 `unpaid` 才能轮换尝试。已付旧 session 与当前尝试不匹配时不再创建任务，记录交付异常并人工核对，不自动二次收费或退款。
- 正常付款由同一 Redis Lua 写入任务、高优先级队列、历史、订单 paid 和永久 receipt。Webhook 和返回页都可重试；若 Redis 队列类型或数据损坏，先修复数据问题，再重放原 session，不能新建订单。`stripe:checkout:refund_required:<sessionId>` 与每日 `fulfillment_issues` 记录首次异常；该历史标记不会因后续恢复而抹掉。
- 已履约的 session 重放不会覆盖退款状态，不会重新生成已删除任务。处理失败和退款由 `photo-order-refund.ts` 管理。退款未确定时保留原支付、任务与订单证据。

## 未付原图清理

`cleanupUnpaidPhotoOrders(3)` 从 `photo:order:cleanup` 有界读取到期项。只有超过 7 天、且没有 checkout，或 Stripe 已证明过期未付，才在 Lua 内标记订单 expired，随后删除原图。并发付款预订会阻止清理。删除失败保留 expired 状态并重试；未知支付保留全部数据，延后检查。保留订单 tombstone 与来源去重索引，用户重新上传获得新的 imageKey 后才能创建新订单。

Stripe 请求上限 6 秒、关闭 SDK 自动传输重试；后台每轮最多 3 项。无法获取 session 的订单不得以 TTL 推断未付款。

## 验证

`__tests__/unit/photo-order.test.ts` 通过真实 Lua 执行验证草稿竞争、原图独立副本、丢失 Stripe 响应恢复、重复付款通知、履约失败恢复、旧 session 围栏、权限与数据隐藏、退款重放及安全清理。测试只使用模拟 Stripe/R2，不产生真实收款、退款或邮件。

参考：[Stripe Checkout 履约](https://docs.stripe.com/checkout/fulfillment)、[Stripe 幂等请求](https://docs.stripe.com/api/idempotent_requests)。
