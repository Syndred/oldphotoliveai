# 需求文档：OldPhotoLive AI

## 简介

OldPhotoLive AI 是一款基于 AI 的 Web 应用，提供全自动的老照片修复、上色和动画三合一服务。用户上传一张照片，即可获得修复上色后的图片以及动画视频。技术栈采用 Next.js 14 App Router + TypeScript + Tailwind CSS，使用 Cloudflare R2 存储、Upstash Redis 数据管理、Replicate API 进行 AI 处理、NextAuth.js 认证、Stripe 支付。

## 术语表

- **System（系统）**: OldPhotoLive AI Web 应用程序
- **User（用户）**: 访问应用的人（已认证或未认证）
- **Free_User（免费用户）**: 拥有免费套餐的已认证用户
- **Paid_User（付费用户）**: 拥有有效付费订阅或积分的已认证用户
- **Task（任务）**: 一个完整的处理作业，包含修复、上色和动画三个步骤
- **Quota（配额）**: 用户剩余的可用处理任务数量
- **R2**: Cloudflare R2 对象存储服务
- **Redis**: Upstash Redis 数据库
- **Replicate**: AI 模型执行平台
- **Processing_Pipeline（处理管线）**: 修复 → 上色 → 动画的顺序执行流程
- **Watermark（水印）**: 应用于免费用户输出的视觉叠加标记
- **Resolution（分辨率）**: 输出质量级别（免费为低分辨率，付费为高分辨率）
- **Stripe_Webhook**: Stripe 支付回调端点
- **Locale（语言区域）**: 用户界面语言标识，支持 "en"（英文）和 "zh"（中文）

## 需求

### 需求 1：用户认证

**用户故事：** 作为访客，我希望通过 Google 账号进行认证，以便访问照片处理功能。

#### 验收标准

1. WHEN 未认证用户尝试访问处理功能, THE System SHALL 将其重定向到登录页面
2. WHEN 用户点击 Google 登录按钮, THE System SHALL 通过 NextAuth.js 发起 OAuth 认证
3. WHEN Google 认证成功, THE System SHALL 在 Redis 中创建或检索用户记录
4. WHEN 用户会话建立, THE System SHALL 存储用户身份和套餐层级信息
5. WHEN 用户登出, THE System SHALL 终止会话并清除认证状态

### 需求 2：图片上传与存储

**用户故事：** 作为已认证用户，我希望上传老照片，以便使用 AI 进行处理。

#### 验收标准

1. WHEN 用户上传图片文件, THE System SHALL 验证文件类型为支持的图片格式（JPEG、PNG、WebP）
2. WHEN 用户上传图片文件, THE System SHALL 验证文件大小不超过 10MB
3. WHEN 图片通过验证, THE System SHALL 将其上传到 Cloudflare R2 存储
4. WHEN 图片上传到 R2, THE System SHALL 为该图片生成唯一标识符
5. IF 图片上传失败, THEN THE System SHALL 向用户返回描述性错误信息
6. THE System SHALL 支持拖拽上传文件
7. THE System SHALL 支持点击浏览上传文件

### 需求 3：AI 处理管线

**用户故事：** 作为已认证用户，我希望上传的照片能自动完成修复、上色和动画处理，以便让老照片焕发新生。

#### 验收标准

1. WHEN 任务创建, THE System SHALL 首先执行修复模型（GFPGAN）
2. WHEN 修复成功完成, THE System SHALL 使用修复后的图片执行上色模型（DDColor）
3. WHEN 上色成功完成, THE System SHALL 使用上色后的图片执行动画模型（Animate Diffusion）
4. IF 任何模型执行失败, THEN THE System SHALL 将任务标记为失败并存储错误信息
5. WHEN 三个模型全部成功完成, THE System SHALL 将任务标记为已完成
6. WHEN 处理 Free_User 的任务, THE System SHALL 对输出图片和视频添加水印
7. WHEN 处理 Free_User 的任务, THE System SHALL 使用低分辨率设置
8. WHEN 处理 Paid_User 的任务, THE System SHALL 使用高分辨率设置且不添加水印
9. THE System SHALL 将所有中间结果和最终输出存储到 R2 存储
10. THE System SHALL 在每个处理阶段完成后更新 Redis 中的任务状态

### 需求 4：任务管理与状态追踪

**用户故事：** 作为用户，我希望追踪照片处理进度，以便知道结果何时就绪。

#### 验收标准

1. WHEN 任务创建, THE System SHALL 在 Redis 中存储任务元数据，状态为 "pending"
2. WHEN 处理阶段开始, THE System SHALL 更新任务状态以反映当前阶段
3. WHEN 用户查询任务状态, THE System SHALL 返回当前处理阶段和进度百分比
4. WHEN 任务完成, THE System SHALL 更新状态为 "completed" 并存储结果 URL
5. IF 任务失败, THEN THE System SHALL 更新状态为 "failed" 并存储错误信息
6. THE System SHALL 将每个任务与创建它的用户关联
7. THE System SHALL 存储任务创建时间戳和完成时间戳

### 需求 5：用户配额管理

**用户故事：** 作为用户，我希望了解剩余处理配额，以便管理使用量。

#### 验收标准

1. WHEN Free_User 账户创建, THE System SHALL 将其每日配额初始化为 1
2. WHEN Free_User 创建任务, THE System SHALL 将其每日配额减 1
3. WHEN Free_User 剩余配额为零, THE System SHALL 阻止任务创建直到配额重置
4. WHEN 每日重置时间（UTC 00:00）到达, THE System SHALL 将所有 Free_User 的每日配额重置为 1
5. WHEN 按次付费的 Paid_User 创建任务, THE System SHALL 将其积分数减 1
6. WHEN 无限订阅的 Paid_User 创建任务, THE System SHALL 不修改任何配额
7. WHEN 用户查询配额, THE System SHALL 返回剩余数量和重置时间（如适用）
8. THE System SHALL 在创建任务前执行配额检查

### 需求 6：支付处理

**用户故事：** 作为用户，我希望购买处理积分或订阅，以便访问高级功能。

#### 验收标准

1. WHEN 用户选择定价方案, THE System SHALL 创建 Stripe Checkout 会话
2. WHEN Stripe Checkout 会话创建, THE System SHALL 将用户重定向到 Stripe 支付页面
3. WHEN 支付成功, THE Stripe_Webhook SHALL 接收 checkout.session.completed 事件
4. WHEN Webhook 接收到成功支付事件, THE System SHALL 在 Redis 中更新用户的套餐层级和配额
5. WHEN 按次付费购买完成, THE System SHALL 添加 5 个积分，有效期 30 天
6. WHEN 专业订阅购买完成, THE System SHALL 将用户套餐设置为无限制
7. IF 订阅续费失败, THEN THE System SHALL 将用户降级为免费套餐
8. THE System SHALL 验证 Webhook 签名以确保真实性

### 需求 7：结果展示与下载

**用户故事：** 作为用户，我希望查看和下载处理后的照片和视频，以便使用它们。

#### 验收标准

1. WHEN 任务完成, THE System SHALL 将原始图片与修复上色后的图片并排展示
2. WHEN 任务完成, THE System SHALL 展示带有动画结果的视频播放器
3. WHEN 用户点击图片下载按钮, THE System SHALL 通过 CDN 从 R2 发起下载
4. WHEN 用户点击视频下载按钮, THE System SHALL 通过 CDN 从 R2 发起下载
5. THE System SHALL 生成前后对比视图用于可视化比较
6. THE System SHALL 通过 Cloudflare CDN 提供所有媒体文件以获得最佳性能

### 需求 8：任务历史

**用户故事：** 作为用户，我希望查看处理历史，以便访问之前的结果。

#### 验收标准

1. WHEN 用户访问历史页面, THE System SHALL 检索与其用户 ID 关联的所有任务
2. WHEN 展示任务历史, THE System SHALL 显示任务创建日期、状态和缩略图
3. WHEN 用户点击历史任务, THE System SHALL 导航到该任务的结果页面
4. THE System SHALL 按创建日期降序排列任务历史
5. WHEN 任务正在处理中, THE System SHALL 在历史列表中显示当前处理阶段

### 需求 9：速率限制

**用户故事：** 作为系统管理员，我希望通过速率限制防止滥用，以便服务对所有用户保持可用。

#### 验收标准

1. WHEN 用户发起 API 请求, THE System SHALL 在 Redis 中追踪请求计数
2. WHEN 用户每小时超过 100 次请求, THE System SHALL 返回 429 Too Many Requests 错误
3. WHEN 用户每小时超过 10 次上传请求, THE System SHALL 返回 429 Too Many Requests 错误
4. THE System SHALL 使用滑动窗口速率限制以实现精确执行
5. WHEN 速率限制重置, THE System SHALL 允许请求正常进行

### 需求 10：响应式设计

**用户故事：** 作为任何设备上的用户，我希望应用能无缝运行，以便从桌面或移动端处理照片。

#### 验收标准

1. WHEN 应用在桌面端查看, THE System SHALL 展示完整布局并具有最佳间距
2. WHEN 应用在移动端查看, THE System SHALL 将布局适配为单列格式
3. WHEN 应用在平板端查看, THE System SHALL 优化触摸目标和间距
4. THE System SHALL 在所有视口尺寸下保持功能完整
5. THE System SHALL 使用响应式图片和视频以适配屏幕尺寸

### 需求 11：错误处理

**用户故事：** 作为用户，我希望在出错时获得清晰的错误信息，以便了解发生了什么。

#### 验收标准

1. WHEN 上传失败, THE System SHALL 显示用户友好的错误信息并说明原因
2. WHEN 处理任务失败, THE System SHALL 在结果页面显示失败原因
3. WHEN 支付失败, THE System SHALL 显示支付错误并建议后续步骤
4. WHEN API 错误发生, THE System SHALL 记录错误详情用于调试
5. THE System SHALL 通过重试机制优雅地处理网络超时
6. IF Replicate API 不可用, THEN THE System SHALL 将任务排队等待重试

### 需求 12：配置管理

**用户故事：** 作为开发者，我希望所有外部服务凭证通过环境变量管理，以便安全部署应用。

#### 验收标准

1. THE System SHALL 从环境变量加载所有 API 密钥和密钥
2. THE System SHALL 在应用启动时验证必需的环境变量
3. IF 必需的环境变量缺失, THEN THE System SHALL 启动失败并记录缺失的变量名
4. THE System SHALL 不在客户端代码中暴露敏感凭证
5. THE System SHALL 仅对非敏感的客户端变量使用 NEXT_PUBLIC_ 前缀

### 需求 13：域名与 CDN 配置

**用户故事：** 作为系统管理员，我希望应用通过自定义域名和 CDN 访问，以便用户获得快速可靠的访问体验。

#### 验收标准

1. THE System SHALL 支持部署到 Vercel 并配置自定义域名
2. THE System SHALL 通过 Cloudflare CDN 提供静态资源
3. THE System SHALL 通过 Cloudflare CDN 使用 NEXT_PUBLIC_R2_DOMAIN 提供 R2 媒体文件
4. THE System SHALL 对所有连接支持 HTTPS
5. THE System SHALL 为 R2 存储桶配置正确的 CORS 头

### 需求 14：处理优先级

**用户故事：** 作为付费用户，我希望任务能优先处理，以便更快获得结果。

#### 验收标准

1. WHEN Paid_User 创建任务, THE System SHALL 将其标记为高优先级
2. WHEN Free_User 创建任务, THE System SHALL 将其标记为普通优先级
3. WHEN 多个任务排队, THE System SHALL 优先处理高优先级任务
4. THE System SHALL 在同一优先级内保持公平排序

### 需求 15：会话管理

**用户故事：** 作为用户，我希望会话在页面刷新后保持，以便不需要反复登录。

#### 验收标准

1. WHEN 用户认证, THE System SHALL 创建有效期为 30 天的会话
2. WHEN 用户刷新页面, THE System SHALL 从 Cookie 恢复会话
3. WHEN 会话过期, THE System SHALL 将用户重定向到登录页面
4. THE System SHALL 使用安全的 httpOnly Cookie 存储会话
5. WHEN 用户明确登出, THE System SHALL 立即使会话失效

### 需求 16：固定 AI 模型配置

**用户故事：** 作为系统管理员，我希望 AI 模型版本固定不变，以便确保处理结果的一致性。

#### 验收标准

1. THE System SHALL 使用固定的 Replicate 模型版本：修复模型为 `tencentarc/gfpgan:9283608cc6b7`，上色模型为 `piddnad/ddcolor:8ca1066c7138`，动画模型为 `anotherframe/animate-diffusion:26d6c9f70b69`
2. THE System SHALL 使用以下固定动画参数：视频时长 3-5 秒，运动强度 motion_bucket_id=1，帧率 24fps，输出格式 MP4
3. THE System SHALL 不允许用户修改模型版本或动画参数

### 需求 17：UI/UX 设计规范

**用户故事：** 作为用户，我希望应用具有简洁高端的设计风格，以便获得良好的使用体验。

#### 验收标准

1. THE System SHALL 遵循 palette.fm、hotpot.ai 和 remini.ai 的极简高端 AI 工具设计风格
2. THE System SHALL 使用以下配色方案：主背景色 `#0F172A`，主渐变色 `#3b82f6` 到 `#1d4ed8`，强调色 `#06b6d4`
3. THE System SHALL 使用 Inter 字体族，具有清晰的层级和充足的留白
4. THE System SHALL 使用居中卡片式布局，完全响应式适配桌面、平板和移动端
5. THE System SHALL 提供拖拽上传区域并带有微妙动画效果
6. THE System SHALL 展示分步进度指示器：1.上传 → 2.修复 → 3.上色 → 4.动画
7. THE System SHALL 提供修复/上色图片的前后对比视图
8. THE System SHALL 提供原生视频播放器展示动画结果
9. THE System SHALL 使用三列定价卡片布局，专业版方案高亮为推荐
10. THE System SHALL 使用柔和微妙的悬停过渡效果，所有操作具有清晰的加载状态

### 需求 18：国际化（i18n）多语言支持

**用户故事：** 作为用户，我希望能够在中文和英文之间切换界面语言，以便使用我熟悉的语言操作应用。

#### 验收标准

1. THE System SHALL 支持英文（en）和中文（zh）两种界面语言
2. THE System SHALL 将英文设置为默认界面语言
3. WHEN 用户点击语言切换器, THE System SHALL 立即将所有用户可见文本切换为所选语言
4. THE System SHALL 对所有用户可见文本进行国际化处理，包括 UI 标签、按钮文本、提示信息和页面标题
5. WHEN API 返回错误信息, THE System SHALL 根据请求的 locale 返回对应语言的错误消息
6. THE System SHALL 确保英文文本遵循自然英语表达习惯，而非中文直译
7. WHEN 用户切换语言, THE System SHALL 将语言偏好持久化，以便后续访问时保持所选语言
8. THE System SHALL 在导航栏中提供语言切换器组件，方便用户随时切换语言
