# Starter Pack 线上结账复测（2026-10-08，北京时间）

## 结论边界

从正式网站价格页复刻 Starter Pack（USD 4.99 / 10 积分）购买，可正常生成 live Checkout 并加载 Stripe 付款表单。未发现截至付款前的稳定阻断。真实扣款、Stripe 回调投递、积分到账仍需用户亲自实付，不可写成已证明整个支付通道正常，也不能把 10 月 6 日那笔会话定性为用户主动放弃。

## 现场验收

- 使用已有登录账号，从 `https://oldphotoliveai.com/pricing` 的 Starter Pack 按钮开始，进入真实 `checkout.stripe.com` 会话，金额 499 cents、USD、一次性 payment，商品正确。
- 服务端 metadata 为 starter_pack / credits=10 / product=oldphotoliveai；成功返回 URL 携带 session_id，取消返回保留套餐。
- Stripe 关键页面脚本与样式成功加载，银行卡表单可见；本轮浏览器错误日志未发现错误。未填入卡号、未提交正式付款，也未在 live 模式使用测试卡。
- Apple Pay 与 Link 可见。当前环境默认人民币 ¥34.79，切换美元后变为 US$4.99，Google Pay 选项可见。货币切换是异步操作，不能用点击瞬间的 checked 状态判断故障。
- “保存我的信息以便更快结账”默认勾选，会显示手机号。取消勾选后手机号区域消失；它属于可选保存信息，不应误判为所有付款都强制提供手机号码。
- 点击 Stripe 的返回商户链接，网站显示 Checkout cancelled；余额仍为 8 积分，无误加积分。随后通过浏览器返回恢复同一待付款会话，没有重复创建第二笔。
- Stripe 账号 charges_enabled / payouts_enabled 为 true，card_payments 为 active。生产 webhook 启用，指向本网站 `/api/stripe/webhook`，监听 completed、async_payment_succeeded、async_payment_failed 等现有处理事件。这仅验证配置，尚不等于实际成功投递。
- 此会话启用 Adaptive Pricing；automatic_tax 和 invoice_creation 均关闭。账户配置显示银行卡、Apple Pay、Google Pay、Link 开启；支付宝和微信支付不可用。本轮未修改任何 Stripe 账户设置。

## 10 月 6 日会话与本轮的区别

原会话 10 月 6 日 22:28:10 创建，10 月 7 日 22:28:10 过期，unpaid、payment_intent=null。关联客户在该次创建之后没有 PaymentIntent、Charge 或第二次 Checkout。原会话也启用了 Adaptive Pricing，支付方式为 card / link。

原会话成功返回使用 `?success=true`，当前生产版本使用服务端核验的 `?session_id=...`；10 月 7 日已做过支付回跳改造。因此本轮只能证明当前链路的观测结果，不能完整还原当时客户端、网络、地区或银行行为。

## 实付接续

已向用户请求亲自完成本次 USD 4.99 Starter Pack 付款；付款前余额 8，成功履约应为 18。保留同一浏览器页面，美元已选中、可选 Link 保存信息已取消勾选。不得自动点击最终支付，不得要求用户把卡号发到聊天。

实付后需核对：Stripe payment_status=paid / PaymentIntent succeeded、真实 webhook 投递、持久履约回执、积分恰好 +10、页面成功返回。若暂不付款，结论继续保持“付款前流程通过，真实支付及交付未验证”。

## 可改进点（本轮未改设置）

- 是否保留自动换币应根据实际客群决定；网站美元标价与 Checkout 本币价格可能造成疑虑，不能当作这笔流失的已证实原因。
- Link 默认保存信息增加可见字段；可在后续优化中评估简化。
- 没有原用户的支付页行为回放或客户端错误，不能判断其是否真正打开页面、是否填卡或为何离开。
