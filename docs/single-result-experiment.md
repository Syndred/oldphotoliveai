> 已替代（2026-10-10）：本实验未在生产启用。用户现授权无免费生成的 USD 1.99 单张预付方案，见 [paid-first-release.md](paid-first-release.md)。不得按本文件开启 DOWNLOAD_PREVIEW_ENABLED 或把私有桶配置当作新方案上线前置条件。历史已付款会话仍兼容。

# 单结果付费下载实验交接（2026-10-07）

## 决策

针对“只想处理一张照片，免费结果已够用”的假设，新增免费带水印预览 → 满意后解锁同一成品的路径。单次 USD 1.99 解锁一张原照片的本次完整结果，含该任务生成的图片与视频；不新增生成、不提升已有分辨率、不改变账号等级、不增加积分。原 $4.99/10、$9.99/25、$19.99/60 积分包保留。

免费动画依然为 480p。付费下载获得刚才预览对应的同一母版，不重新调用模型。另行高清重制保留，放在已解锁结果之后的可选项，明确会消耗另一积分且画面可能变化。已有付费任务继续直接下载。

## 隔离与兼容

- 仅 `DOWNLOAD_PREVIEW_ENABLED=true` 时创建的新免费任务写入 `downloadPolicy=preview_v1`。老任务没有该标记，继续原下载权益；不对旧任务补收费、不声称旧水印成品能无损去水印。
- 每日免费预览次数保持原策略；匿名无登录试用也使用同一交付策略。
- 单张买家仍保留 free 等级及其每日免费额度。已有积分用户可扣 1 积分解锁新免费预览，professional 用户按已有权益解锁；重复请求先读持久授权，不重复消费最后一积分。
- 授权绑定登录账号及 task，匿名 Cookie 只允许访问预览。付款后写入买家历史，换设备登录可恢复。其他登录账号即使使用同一匿名 Cookie 也拿不到母版。

## 成品处理与权限

- 新免费任务整个 AI 链路使用干净的原图/阶段母版；下一阶段通过 15 分钟 R2 S3 签名 URL 读取私有阶段母版。
- 干净生成结果只存独立私有桶。公开桶只放带水印预览，不依靠随机文件名或前端隐藏按钮保护付费文件。
- 图片用已有 sharp，视频使用主流 ffmpeg-static + Node spawn。视频水印真实烙进文件，4 秒视频 45 秒编码超时、单线程、AbortSignal 中止及临时文件清理。
- 标识为半透明 `OldPhotoLive AI · PREVIEW` 横条，约画幅 75% 处。使用已有 Geist 字体离线转 SVG 路径，生产不依赖系统字体。可由 `scripts/generate-preview-watermark.cjs` 重建。
- 各阶段先持久化母版再派生预览。编码失败重试复用母版，不重新花费 AI 生成次数。
- task status/stream 不返回 masterAssets、签名 URL 或 provider URL。asset 接口同时约束下载、inline 播放和 Range 请求。未解锁只能看预览；下载请求 403；解锁后从私有桶流式返回原母版，Cache-Control 为 private/no-store。
- 删除任务同时清理公开和私有文件；待支付时阻止删除。删除一半失败保留 deleting 标记，防止继续出售缺失文件；重试删除可继续清理。失败任务清理 worker 同时清理私有文件。

## 支付

- `single_photo` 使用服务端固定 USD 199 cents 的 inline price_data，不接受客户端价格。
- 创建 Checkout 前检查任务归属、completed、政策版本、母版 HEAD 可读。任务全局 pending、固定订单 ID/Stripe 幂等参数，防止多个账号或多个标签重复付款。
- 从待支付切换积分方式前，服务端确认本人 Checkout 已 expired/unpaid；如已经 paid，先履约并返回授权，不再扣积分。
- single 授权、receipt、买家历史和统计由 Lua 一次提交。积分、专业版与单张是显式分支，单张零积分不会错误升级专业版。
- 已付款但无法交付时记录 refund_required，页面明确交付异常并联系支持，不假装已解锁或已退款。没有自动退款。
- 无法安全恢复的未知 Stripe 创建结果返回 CHECKOUT_REVIEW_REQUIRED。恢复与证据边界见 [恢复手册](SINGLE_RESULT_CHECKOUT_RECOVERY.md)。

## 客户界面

- 上传之前、四语言套餐、相关 SEO/FAQ 明确免费指带水印预览，完整同结果下载付费。
- 新结果主操作为 USD 1.99 或 1 积分解锁；历史结果保留原下载。
- 带任务上下文的价格页使用紧凑标题与首张单结果卡，手机购买按钮优先；无任务上下文时只提供“先免费预览”，不盲卖无归属结果。
- 登录保留套餐、任务和语言；到账后返回同一结果。解锁后刷新服务端状态和媒体 URL，避免继续播放浏览器缓存的旧水印预览。
- 付款状态不明、已付款交付异常分开表述；提供支持联系入口，不诱导再次付款。

## 实验统计与成本

后台近 14 天新增实验预览完成、单张付款订单、积分解锁结果、已解锁结果首次下载请求、付款交付异常。订单/金额标签明确为已履约口径；异常计数是历史发生数，不是当前待办工单数。下载按任务首次授权请求计，不代表文件完整传输。所有日期按 UTC。

先看预览完成 → 解锁点击 → 结账 → 已履约订单 → 下载请求。订单/任务不等于独立用户数；刚上线不能声称收入已提升。保留原月度模型支出保护。

成本使用项目保守估计：免费动画流程约 $0.02 修复 + $0.15 动画；完整流程再加约 $0.03 上色。不是实际供应商账单。Stripe 当前账号香港、USD 结算；官方标准在线卡费率页面为 3.4% + HK$2.35，具体支付方式、跨境/换汇及实际账户费率以订单费用为准。单张解锁本身不新增 AI 成本，但须把未付款预览的成本计入整体利润，不能只看单笔 $1.99。

参考：[Stripe 香港定价](https://stripe.com/en-hk/pricing)、[R2 私有桶](https://developers.cloudflare.com/r2/buckets/public-buckets/)、[R2 签名 URL](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)。

## 验收与启用状态

代码验收完成，功能提交 `ed3ff66`，保存在 `codex/single-result-unlock` 分支，未合并生产分支。

- 全量自动化：92 套 / 839 条通过；typecheck、production build、lint 通过（仅 Footer 原有 img 提示）。构建 trace 确认包含 FFmpeg 可执行文件，但还需验证 Vercel Linux 环境。
- 最终生产构建在 390×844 手机和 1440×1000 桌面浏览器检查。手机单张购买按钮位于 y=386–434，首屏可见；卡片与下载按钮间距无重叠。
- 本地隔离 API 验收免费预览 → 单张模拟支付 → 返回同一结果，以及中文 1 积分解锁 → 状态刷新 → 下载、刷新保留授权。上述浏览器支付是模拟，不是生产实付。
- 图片、视频预览使用真实 sharp / FFmpeg 水印文件；浏览器下载的视频与无水印母版 SHA-256 一致。未真实扣款或调用 AI 模型。
- 子代理交叉 review 覆盖支付幂等、授权、删除/付款竞态、私有文件输出及移动端布局；父代理复核集成与最终构建。

生产仍为上轮版本 `eaf5162`（功能提交 `8794e80`），本实验尚未启用。

当前生产实验尚未开启。已通过现有 Wrangler 授权创建 `oldphotoliveai-private-results` 私有桶；现有网站 S3 密钥仅能操作原桶，新桶访问返回 403。Cloudflare 浏览器停在登录页，已请求用户完成登录并批准仅限该新桶的专用读写密钥。没有修改原桶权限、没有公开母版桶。

上线前必须完成：

1. 创建仅限 `oldphotoliveai-private-results` 的 Object Read & Write 凭据，保存为 Vercel Production 的 `R2_PRIVATE_ACCESS_KEY_ID` / `R2_PRIVATE_SECRET_ACCESS_KEY`；不得写入 Git、日志或聊天。
2. 设置 `R2_PRIVATE_BUCKET_NAME=oldphotoliveai-private-results`；验证桶无 public domain/r2.dev，合成文件 Put/Head/Get/签名读/未签名拒绝/Delete。
3. 功能代码部署成功并验明 Linux FFmpeg 可执行后，启用 `DOWNLOAD_PREVIEW_ENABLED=true`；检查新免费任务 policy、真实水印、母版未授权拒绝。
4. 使用已批准的低额真实付款才可标记 LIVE_PAYMENT_VERIFIED。本轮自动化及模拟付款不替代此证据。

回退：关闭创建开关只影响后来新任务。已创建 preview_v1 任务继续遵守其下载规则，因此不要删除私有桶凭据或回滚到不理解 policy 的旧代码。需保留已有买家的下载权益。
