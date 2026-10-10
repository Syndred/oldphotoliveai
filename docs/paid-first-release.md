# 单张预付上线交接（2026-10-10）

## 最终产品政策

- 新用户不提供免费生成；先上传并登录，再按当前功能支付 USD 1.99。修复、上色、动画或完整流程均绑定这一张原图。
- 完整无水印付费品质结果；不承诺无限次重做、AI 颜色一定真实、所有原图均可提高到固定分辨率。已有积分包和会员可继续使用。
- 首次确证技术失败可免费重试一次，确认无法交付时退款；违规按条款处理，provider 创建不明进入人工核对。
- 原先“免费水印预览→下载解锁”方案未上线，现已替代。新售 `single_photo` 关闭，旧支付与结果保留兼容；不启用 DOWNLOAD_PREVIEW_ENABLED。

## 服务端和恢复

- 上传 receipt 绑定 user/visitor，访客上传可以在同浏览器登录后恢复，认证用户照片不被其他账户复用。
- POST /api/photo-orders 原图 HEAD 和独立复制成功后建草稿；同用户/原图/功能幂等，不启动 AI。GET摘要仅所有者可读。
- single_run Checkout 固定 USD 199 cents，先持久保存参数再使用原 Stripe 幂等键创建。取消返回同订单；只对确证 expired + unpaid 会话重新开尝试，未知状态不盲目新建。
- paid 履约把 task、queue、history、order、receipt 一次原子提交。新任务 paid/high，无新增积分、无会员升级。回执和 webhook 可互相补偿，状态观察可唤醒 worker。
- 单张任务最多2次尝试；退款预约先撤销执行 token、禁重试、移出生成队列，再向 Stripe 发退款。已知 refund ID 读取恢复，未知响应重放原幂等键；超过23小时只读取核对或转人工。
- 防止已付款任务取消为 cancelled 后挂单。未交付且退款未解决的任务不可删除；confirmed refund 后才允许清理失败任务。
- 超过7天的弃付订单副本/未引用临时上传按有界队列清理。临时原图被积分任务使用时，在创建任务事务中移出清理队列，清理抢先则不扣积分、不建任务。
- Vercel Production 原来缺 CRON_SECRET，本轮已配置为 Secret，确保 cron 请求有可验证授权。未改变模型与现有 R2 权限；新方案无需新私有桶。

## 验收

- 最终自动化回归 99 个套件 / 930 项全部通过；typecheck、lint、production build 通过，仅保留 Footer 既有 img 警告。
- 最终构建浏览器验收：1440×960桌面、390×844手机，上传→订单、本地模拟付款回执→结果下载、退款 pending→succeeded重新查询均通过；手机无横向溢出，按钮与卡片间距已自查。
- 上述付款与退款 UI 使用明确隔离的本地 API fixture，没有调用真实 Stripe 或模型，不能用它宣称生产收款/退款成功。
- 已发布代码 `a4cb96ea5de60c1472e0cecea8612ef99420d171`，Vercel Production 部署 `dpl_EurP17d6FEk3tPXpuypwxqMqYLAK` 状态为 READY。
- 正式域名 `/zh/pricing` 已确认展示单张 USD 1.99、先付款后处理、无水印，以及一次技术重试/确认无法交付退款政策。
- 生产预付款边界和 Checkout 创建检查通过：合成 free 用户的 `/api/quota` 返回 `remaining=0`；真实 R2 上传成功；直接调用 `/api/tasks` 返回 `402 PAYMENT_REQUIRED`；创建草稿与重放返回同一 `orderId`。
- 同一订单两次 `single_run` Checkout 返回同一 Stripe Session URL；读取 Stripe 会话确认 `amount_total=199`、`currency=usd`、`payment_status=unpaid`、`payment_intent=null`。付款前 Redis 中没有生成任务，用户等级仍为 `free`。
- Chrome 已打开正式 Live mode Stripe Checkout，选择美元后确认产品为 `Process One Photo`、金额 `US$1.99`，银行卡、Apple Pay 和 Link 表单正常显示。仅验收结账页可达与定价、幂等和付款前不生成边界，没有填写卡号、点击支付、真实扣款或调用 AI。
- 合成验收清理完成：Stripe 会话已确认为 `expired / unpaid`，未发生扣款；合成用户、quota、订单、receipt 与清理索引已移除，两张 R2 验收图片 HEAD 确认 404；没有创建生成任务或调用 provider。
- 正式域名 HTTP 200 与部署 aliases 对应，已加载新价格页资源 `pricing/page-6ec0ae7120f63e94.js`；生产手机宽度与内容宽度均为390，无横向溢出，浏览器错误日志为空。
- 未执行真实付款，因而不宣称新单成交、生产退款成功或完整付费交付链路验收；付款后 webhook/生成成品/下载与真实退款仍需独立生产证据。

## 运维

- 付款结果不明不要建议再次上传购买；先核对已有orderId/sessionId。退款不明不要再次用新幂等键创建。
- 查看人工核对订单/保留原有证据；详细恢复规则见 PHOTO_ORDER_RECOVERY.md。
- 不能通过只回滚页面恢复旧免费政策；任何旧免费版本回退都会改变收费政策，先检查已付 single_run 订单兼容。
