# 单结果付款异常恢复手册

适用范围：`single_photo`（$1.99，解锁同一次任务的图片和视频）。仅提供核对顺序，不自动退款或清理生产数据。

## 用户看到 CHECKOUT_REVIEW_REQUIRED

结账与积分解锁接口返回 HTTP 409，附四语言支持提示及 `support@oldphotoliveai.com`。原因包括：待支付记录没有 sessionId 且已超过 23 小时；Stripe 拒绝固定旧参数的 `expires_at`；Stripe 幂等参数冲突。此时保留 `download:pending:{taskId}`，不扣积分、不换幂等键、不新建订单。

支持人员按以下顺序核对：

1. 用用户的结果页面定位 taskId；读取 `download:pending:{taskId}`、`download:grant:{taskId}`、任务状态及 `download:deleting:{taskId}`。记录 pending 的 orderId、userId、创建时间、原始参数。不要把邮箱、原始 sessionId、照片 key 放进分析平台或公开日志。
2. 在 Stripe 的请求日志和 Checkout Sessions 中按 `single-result:{orderId}` 幂等键、metadata.orderId/taskId/userId 精确核对，确认当前使用的 Stripe 账号及 live/test 模式。没有 sessionId 不代表没有创建或没有扣款。
3. 若找到 **paid** session：确认金额 USD 1.99、product=oldphotoliveai、plan=single_photo、scope=result 和用户归属；确认私有母版仍存在。走现有 `fulfillPaidCheckout(session)` 幂等履约，再读取 grant、持久 receipt 和购买账号 history。不要手工加积分代替单结果授权。
4. 若找到 **open** session：先核对用户意图。继续购买应复用该 session；选择积分或取消应先向 Stripe 终止 session。只有 Stripe 返回 **expired 且 unpaid** 后，才能使用 `releaseExpiredTaskDownloadCheckout(pending)` 按 orderId 比较释放。不能直接 DEL 待支付键。
5. 若无法在 Stripe 证明订单状态：保持锁并升级人工处理。不得仅依据时间、没有本地 receipt、没有 sessionId 或用户没收到邮件判定“未付款”。只有核对请求日志、支付与会话记录证明原请求未执行且不存在付款后，才可按受控变更流程释放该 orderId；本轮没有提供自动运维入口。

Stripe 幂等记录可能在 24 小时后被清除，因此程序在缺少 sessionId 时提前于 23 小时停止自动重建。普通已知 sessionId 的 expired/unpaid 订单会在重试结账或删除任务时自动确认、清理，不属于人工核对分支。

## 已付款但不能履约

`stripe:checkout:refund_required:{sessionId}` 保存原因、用户、任务、金额和币种，不保存邮箱。每个 session 首次异常仅记一次当天 `conversion:YYYY-MM-DD.fulfillment_issues`；异常不计入“已履约付款订单/已履约收款”。状态接口返回 `refund_required`，不能向用户显示已解锁。

先核对 task/master、用户归属、pending.orderId 和 sessionId。删除或部分文件清理失败时，不释放 `download:deleting:{taskId}`；恢复或继续删除前先确认付费订单。若不能交付，支持人员按实际订单办理退款或其他补偿并留记录；本功能不会自动退款。异常计数记录曾发生的问题，并非未解决工单数；后续成功履约不回减历史计数。

## 邮件与证据

付款邮件显示 `Single Result Unlock`，含义是本次结果解锁，不是新增积分或专业版。发送时机沿用原流程；到账页先完成履约时，之后 webhook 可能不再发送邮件。因此不能用邮件缺失证明未付款，应以 Stripe、持久 receipt 和 grant 为准。
