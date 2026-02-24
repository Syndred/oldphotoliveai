# 实现计划：OldPhotoLive AI

## 概述

按 MVP 优先级实现：先搭建核心管线（上传 → AI 处理 → 结果展示），再逐步添加配额、队列、认证和支付功能。使用 TypeScript + Next.js 14 App Router + Tailwind CSS。

## 任务

- [x] 1. 项目初始化与基础配置
  - [x] 1.1 初始化 Next.js 14 项目并安装依赖
    - 使用 `create-next-app` 创建项目，配置 TypeScript + Tailwind CSS + App Router
    - 安装核心依赖：`@aws-sdk/client-s3`、`replicate`、`@upstash/redis`、`sharp`、`uuid`
    - 安装开发依赖：`jest`、`@testing-library/react`、`fast-check`、`ts-jest`
    - 创建 `.env.example` 文件，列出所有环境变量
    - _Requirements: 12.1_

  - [x] 1.2 实现类型定义 (`src/types/index.ts`)
    - 定义 User、Task、TaskStatus、UserTier、QuotaInfo、RateLimitResult 等所有 TypeScript 接口和类型
    - 定义 RESOLUTION_CONFIG、RATE_LIMITS、PRIORITY_WEIGHTS、ANIMATION_PARAMS 常量
    - _Requirements: 16.1, 16.2_

  - [x] 1.3 实现环境变量验证与配置 (`src/lib/config.ts`)
    - 实现 validateEnvVars() 函数，启动时验证所有必需环境变量
    - 缺失变量时抛出错误并在错误信息中列出变量名
    - 导出 config 对象供其他模块使用
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 1.4 编写环境变量验证的属性测试
    - **Property 24: 环境变量验证**
    - **Validates: Requirements 12.2, 12.3**

- [x] 2. 核心存储与数据层（MVP）
  - [x] 2.1 实现 R2 存储操作 (`src/lib/r2.ts`)
    - 实现 uploadToR2、getR2CdnUrl、deleteFromR2、deleteTaskFiles 函数
    - CDN URL 格式：`https://{NEXT_PUBLIC_R2_DOMAIN}/{key}`
    - _Requirements: 2.3, 2.4, 7.6, 13.3_

  - [x] 2.2 实现 Redis 客户端与基础操作 (`src/lib/redis.ts`)
    - 初始化 Upstash Redis 客户端
    - 实现用户 CRUD：createOrGetUser、getUser、updateUserTier
    - 实现任务 CRUD：createTask、updateTaskStatus、getTask、getUserTasks、cancelTask、retryTask
    - 所有数据使用 JSON.stringify/JSON.parse 序列化
    - _Requirements: 1.3, 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 2.3 编写任务数据序列化往返属性测试
    - **Property 28: 任务数据序列化往返一致性**
    - **Validates: Requirements 3.9, 4.1**

  - [ ]* 2.4 编写用户创建幂等性属性测试
    - **Property 2: 用户创建幂等性**
    - **Validates: Requirements 1.3**

  - [ ]* 2.5 编写媒体 URL CDN 域名属性测试
    - **Property 21: 媒体 URL 使用 CDN 域名**
    - **Validates: Requirements 7.3, 7.4, 7.6**

- [x] 3. 文件上传功能（MVP）
  - [x] 3.1 实现文件验证逻辑
    - 验证文件类型（JPEG、PNG、WebP）和文件大小（≤10MB）
    - 生成唯一存储 Key（UUID + 原始扩展名）
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.2 实现上传 API 路由 (`src/app/api/upload/route.ts`)
    - POST 处理：接收 FormData，验证文件，上传到 R2，返回图片 URL
    - 错误处理：文件类型不支持返回 400，文件过大返回 400，上传失败返回 500
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 11.1_

  - [ ]* 3.3 编写文件验证属性测试
    - **Property 4: 文件上传验证**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 3.4 编写上传标识符唯一性属性测试
    - **Property 5: 上传标识符唯一性**
    - **Validates: Requirements 2.4**

- [x] 4. AI 处理管线（MVP）
  - [x] 4.1 实现 Replicate API 调用 (`src/lib/replicate.ts`)
    - 定义固定模型版本常量（GFPGAN、DDColor、Animate Diffusion）
    - 定义固定动画参数常量（motion_bucket_id=1, fps=24, duration=4, mp4）
    - 实现 runModel 函数，模型版本和参数为只读，不接受外部覆盖
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 4.2 实现水印处理 (`src/lib/watermark.ts`)
    - 使用 sharp 实现图片水印：右下角，透明度 30%，文字 "OldPhotoLive AI"
    - 实现 resizeImage：免费版 800×600，付费版 1920×1080
    - _Requirements: 3.6, 3.7, 3.8_

  - [x] 4.3 实现 AI 处理管线 (`src/lib/pipeline.ts`)
    - 实现 executePipeline：按顺序执行修复→上色→动画
    - 每步完成后更新 Redis 任务状态和进度
    - 根据用户层级应用水印和分辨率设置
    - 任何步骤失败时标记任务为 failed，记录错误信息，不执行后续步骤
    - 所有中间结果和最终输出存储到 R2
    - _Requirements: 3.1-3.10, 4.2_

  - [ ]* 4.4 编写管线执行顺序属性测试
    - **Property 6: 管线执行顺序**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 4.5 编写任务失败处理属性测试
    - **Property 7: 任务失败处理**
    - **Validates: Requirements 3.4, 4.5**

  - [ ]* 4.6 编写任务完成处理属性测试
    - **Property 8: 任务完成处理**
    - **Validates: Requirements 3.5, 4.4**

  - [ ]* 4.7 编写套餐层级输出设置属性测试
    - **Property 9: 套餐层级决定输出设置**
    - **Validates: Requirements 3.6, 3.7, 3.8**

  - [ ]* 4.8 编写状态转换一致性属性测试
    - **Property 10: 管线状态转换一致性**
    - **Validates: Requirements 3.10, 4.2**

  - [ ]* 4.9 编写状态-进度映射属性测试
    - **Property 11: 任务状态与进度百分比一致性**
    - **Validates: Requirements 4.3**

  - [ ]* 4.10 编写固定模型配置属性测试
    - **Property 27: 固定模型配置不可变**
    - **Validates: Requirements 16.1, 16.2, 16.3**

- [x] 5. Checkpoint - MVP 核心管线验证
  - 确保所有测试通过，如有问题请咨询用户。
  - 验证：文件上传 → R2 存储 → AI 管线执行 → 结果存储的完整流程。

- [x] 6. 任务管理 API
  - [x] 6.1 实现创建任务 API (`src/app/api/tasks/route.ts`)
    - POST 处理：接收图片 URL，创建任务记录（status: pending），入队优先级队列
    - 配额检查（暂时跳过认证，使用硬编码用户 ID 测试）
    - 返回任务 ID
    - _Requirements: 4.1, 4.6, 4.7_

  - [x] 6.2 实现任务状态查询 API (`src/app/api/tasks/[taskId]/status/route.ts`)
    - GET 处理：从 Redis 获取任务，返回状态和进度百分比
    - _Requirements: 4.3_

  - [x] 6.3 实现 SSE 状态推送 (`src/app/api/tasks/[taskId]/stream/route.ts`)
    - GET 处理：建立 SSE 连接，轮询 Redis 任务状态，推送更新
    - 任务完成或失败时关闭连接
    - _Requirements: 4.2, 4.3_

  - [x] 6.4 实现任务取消 API (`src/app/api/tasks/[taskId]/cancel/route.ts`)
    - POST 处理：仅允许取消 pending/queued 状态的任务
    - 从优先级队列中移除，更新状态为 cancelled
    - _Requirements: 4.2_

  - [x] 6.5 实现任务重试 API (`src/app/api/tasks/[taskId]/retry/route.ts`)
    - POST 处理：仅允许重试 failed 状态的任务
    - 重置状态为 queued，重新入队
    - _Requirements: 4.2_

  - [ ]* 6.6 编写任务用户关联属性测试
    - **Property 12: 任务用户关联**
    - **Validates: Requirements 4.6**

  - [ ]* 6.7 编写任务时间戳属性测试
    - **Property 13: 任务时间戳有效性**
    - **Validates: Requirements 4.7**

- [x] 7. 优先级队列与 Worker
  - [x] 7.1 实现优先级队列操作 (`src/lib/queue.ts`)
    - 实现 enqueueTask：score = priorityWeight + timestamp
    - 实现 dequeueTask：ZPOPMIN 出队
    - 实现 getQueueLength、removeFromQueue
    - high 权重 = 0，normal 权重 = 1_000_000_000_000_000
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 7.2 实现分布式锁 (`src/lib/lock.ts`)
    - 使用 Redis SET NX EX 实现 acquireLock、releaseLock
    - TTL = 300 秒
    - _Requirements: 14.3_

  - [x] 7.3 实现管线执行 Worker (`src/app/api/worker/pipeline/route.ts`)
    - POST 处理：验证 Worker Secret，ZPOPMIN 出队，获取分布式锁，执行管线
    - 每次最多处理 1 个任务
    - 执行完成后释放锁
    - _Requirements: 3.1-3.10, 14.3_

  - [x] 7.4 配置 Vercel Cron (`vercel.json`)
    - 管线 Worker：每分钟执行
    - 清理 Worker：每小时执行
    - 配额重置 Worker：每天 UTC 00:00 执行
    - _Requirements: 5.4_

  - [ ]* 7.5 编写优先级分配属性测试
    - **Property 25: 优先级分配**
    - **Validates: Requirements 14.1, 14.2**

  - [ ]* 7.6 编写优先级队列排序属性测试
    - **Property 26: 优先级队列排序**
    - **Validates: Requirements 14.3, 14.4**

  - [ ]* 7.7 编写分布式锁互斥性属性测试
    - **Property 29: 分布式锁互斥性**
    - **Validates: Requirements 14.3**

- [x] 8. 配额管理
  - [x] 8.1 实现配额管理 (`src/lib/quota.ts`)
    - 实现 initializeFreeQuota：免费用户配额初始化为 1
    - 实现 checkAndDecrementQuota：检查并扣减配额
    - 实现 getQuotaInfo：返回剩余数量和重置时间
    - 实现 addCredits：添加积分（5 个，30 天过期）
    - 实现 cleanExpiredCredits：清理过期积分
    - 实现 resetAllDailyQuotas：重置所有免费用户每日配额
    - _Requirements: 5.1-5.8_

  - [x] 8.2 实现配额查询 API (`src/app/api/quota/route.ts`)
    - GET 处理：返回用户配额信息
    - _Requirements: 5.7_

  - [x] 8.3 实现配额重置 Worker (`src/app/api/worker/quota-reset/route.ts`)
    - POST 处理：验证 Worker Secret，重置所有免费用户配额
    - _Requirements: 5.4_

  - [x] 8.4 实现清理 Worker (`src/app/api/worker/cleanup/route.ts`)
    - POST 处理：验证 Worker Secret，清理超过 7 天的失败任务 R2 文件
    - _Requirements: 11.6_

  - [ ]* 8.5 编写免费用户配额初始化属性测试
    - **Property 14: 免费用户配额初始化**
    - **Validates: Requirements 5.1**

  - [ ]* 8.6 编写免费用户配额执行属性测试
    - **Property 15: 免费用户配额执行**
    - **Validates: Requirements 5.2, 5.3, 5.8**

  - [ ]* 8.7 编写每日配额重置属性测试
    - **Property 16: 每日配额重置**
    - **Validates: Requirements 5.4**

  - [ ]* 8.8 编写付费用户配额行为属性测试
    - **Property 17: 付费用户配额行为**
    - **Validates: Requirements 5.5, 5.6**

  - [ ]* 8.9 编写积分过期清理属性测试
    - **Property 30: 积分过期清理**
    - **Validates: Requirements 5.5**

- [x] 9. Checkpoint - 后端核心功能验证
  - 确保所有测试通过，如有问题请咨询用户。
  - 验证：任务创建 → 队列入队 → Worker 消费 → 管线执行 → 配额扣减的完整流程。

- [x] 10. 速率限制
  - [x] 10.1 实现速率限制 (`src/lib/rateLimit.ts`)
    - 滑动窗口算法：windowId = Math.floor(Date.now() / windowMs)
    - Redis Key: ratelimit:{type}:{userId}:{windowId}，EXPIRE = windowMs/1000 + 1
    - api: 100/小时，upload: 10/小时
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 10.2 实现中间件 (`src/middleware.ts`)
    - 认证检查：未认证用户重定向到登录页（受保护路由）
    - 速率限制检查：超限返回 429 + Retry-After 头
    - _Requirements: 1.1, 9.1-9.5_

  - [ ]* 10.3 编写速率限制属性测试
    - **Property 23: 速率限制执行**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5**

  - [ ]* 10.4 编写未认证重定向属性测试
    - **Property 1: 未认证用户重定向**
    - **Validates: Requirements 1.1**

- [x] 11. 用户认证
  - [x] 11.1 实现 NextAuth 配置 (`src/lib/auth.ts`)
    - 配置 Google OAuth Provider
    - signIn 回调：调用 createOrGetUser 创建/检索用户
    - session 回调：注入用户 ID 和 tier 信息
    - 会话策略：JWT，maxAge=30 天，secure httpOnly cookies
    - _Requirements: 1.2, 1.3, 1.4, 15.1, 15.4_

  - [x] 11.2 实现 NextAuth API 路由 (`src/app/api/auth/[...nextauth]/route.ts`)
    - 导出 GET/POST handler
    - _Requirements: 1.2_

  - [ ]* 11.3 编写会话信息属性测试
    - **Property 3: 会话包含必要信息**
    - **Validates: Requirements 1.4**

- [x] 12. 支付处理
  - [x] 12.1 实现 Stripe 配置 (`src/lib/stripe.ts`)
    - 初始化 Stripe 客户端
    - _Requirements: 6.1_

  - [x] 12.2 实现 Stripe Checkout API (`src/app/api/stripe/checkout/route.ts`)
    - POST 处理：根据选择的方案创建 Checkout 会话，返回重定向 URL
    - _Requirements: 6.1, 6.2_

  - [x] 12.3 实现 Stripe Webhook (`src/app/api/stripe/webhook/route.ts`)
    - POST 处理：验证签名，处理 checkout.session.completed 事件
    - 按次付费：添加 5 积分，30 天过期
    - 专业订阅：设置 tier 为 professional
    - 续费失败：降级为 free
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 12.4 编写 Webhook 签名验证属性测试
    - **Property 19: Webhook 签名验证**
    - **Validates: Requirements 6.8**

  - [ ]* 12.5 编写 Webhook 支付更新属性测试
    - **Property 18: Webhook 支付更新用户层级**
    - **Validates: Requirements 6.4**

  - [ ]* 12.6 编写订阅失败降级属性测试
    - **Property 20: 订阅失败降级**
    - **Validates: Requirements 6.7**

- [x] 13. Checkpoint - 后端全功能验证
  - 确保所有测试通过，如有问题请咨询用户。
  - 验证：认证 → 配额 → 上传 → 任务创建 → 队列 → Worker → 管线 → 支付的完整后端流程。

- [x] 14. 前端 UI 组件
  - [x] 14.1 实现根布局和全局样式 (`src/app/layout.tsx`)
    - 配置 Inter 字体、Tailwind 全局样式
    - 主背景色 #0F172A，渐变色 #3b82f6→#1d4ed8，强调色 #06b6d4
    - 配置 SessionProvider
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 14.2 实现导航栏和认证按钮 (`src/components/Navbar.tsx`, `src/components/AuthButton.tsx`)
    - 显示 Logo、导航链接、登录/登出按钮
    - 显示用户头像和配额信息
    - _Requirements: 1.5, 5.7_

  - [x] 14.3 实现上传组件 (`src/components/UploadZone.tsx`)
    - 拖拽上传区域，带微妙动画效果
    - 点击浏览上传
    - 文件类型和大小的客户端预验证
    - 上传进度显示
    - _Requirements: 2.6, 2.7, 17.5_

  - [x] 14.4 实现首页 (`src/app/page.tsx`)
    - 居中卡片式布局，包含 UploadZone 组件
    - 上传后自动创建任务并跳转到结果页
    - _Requirements: 17.4_

  - [x] 14.5 实现进度指示器 (`src/components/ProgressIndicator.tsx`)
    - 分步进度：1.上传 → 2.修复 → 3.上色 → 4.动画
    - 使用 SSE 实时更新进度
    - _Requirements: 17.6_

  - [x] 14.6 实现前后对比组件 (`src/components/BeforeAfterCompare.tsx`)
    - 原始图片与修复上色图片的并排对比视图
    - _Requirements: 7.1, 7.5, 17.7_

  - [x] 14.7 实现视频播放器 (`src/components/VideoPlayer.tsx`)
    - 原生视频播放器展示动画结果
    - _Requirements: 7.2, 17.8_

  - [x] 14.8 实现结果展示页 (`src/app/result/[taskId]/page.tsx`)
    - 集成 ProgressIndicator、BeforeAfterCompare、VideoPlayer
    - 下载按钮（图片和视频），通过 CDN URL 下载
    - 失败时显示错误信息和重试按钮
    - _Requirements: 7.1-7.5, 11.2_

- [x] 15. 历史记录与定价页面
  - [x] 15.1 实现历史记录 API (`src/app/api/history/route.ts`)
    - GET 处理：获取用户所有任务，按创建日期降序排列
    - 返回任务日期、状态、缩略图
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x] 15.2 实现历史列表组件和页面 (`src/components/TaskHistoryList.tsx`, `src/app/history/page.tsx`)
    - 显示任务列表：日期、状态、缩略图
    - 点击跳转到结果页
    - 处理中的任务显示当前阶段
    - _Requirements: 8.1-8.5_

  - [ ]* 15.3 编写任务历史正确性属性测试
    - **Property 22: 任务历史正确性**
    - **Validates: Requirements 8.1, 8.4**

  - [x] 15.4 实现定价卡片和页面 (`src/components/PricingCards.tsx`, `src/app/pricing/page.tsx`)
    - 三列定价卡片：免费版、按次付费、专业版（高亮推荐）
    - 点击购买跳转到 Stripe Checkout
    - _Requirements: 17.9, 6.1, 6.2_

  - [x] 15.5 实现登录页 (`src/app/login/page.tsx`)
    - Google 登录按钮
    - 简洁设计，与整体风格一致
    - _Requirements: 1.2_

- [x] 16. 响应式设计与错误处理
  - [x] 16.1 实现响应式布局
    - 桌面端：完整布局，最佳间距
    - 移动端：单列格式
    - 平板端：优化触摸目标
    - 响应式图片和视频
    - _Requirements: 10.1-10.5_

  - [x] 16.2 实现全局错误处理
    - 重试机制（withRetry 函数）：指数退避，最多 2 次
    - API 错误日志记录
    - 用户友好的错误提示组件
    - _Requirements: 11.1-11.6_

  - [x] 16.3 实现 Next.js 配置 (`next.config.js`)
    - 配置图片域名白名单
    - 配置 API 路由缓存策略（状态查询接口禁用缓存）
    - _Requirements: 13.1_

- [x] 17. 最终 Checkpoint
  - 确保所有测试通过，如有问题请咨询用户。
  - 验证完整的端到端流程：登录 → 上传 → 处理 → 查看结果 → 下载 → 历史记录 → 支付升级。
  - 验证响应式布局在桌面、平板、移动端的表现。
  - 验证中英文语言切换功能正常。

- [x] 18. 国际化（i18n）多语言支持
  - [x] 18.1 安装 next-intl 并配置 i18n 基础设施
    - 安装 `next-intl` 依赖
    - 创建 `src/i18n/routing.ts`：定义支持的 locale 列表（en、zh）和默认 locale（en）
    - 创建 `src/i18n/request.ts`：配置 next-intl 的请求级 i18n 加载
    - 更新 `next.config.js`：集成 next-intl 插件
    - 更新 `src/middleware.ts`：集成 next-intl 中间件进行 locale 检测（Cookie > Accept-Language > 默认 en）
    - 更新 `src/app/layout.tsx`：包裹 NextIntlClientProvider
    - _Requirements: 18.1, 18.2_

  - [x] 18.2 创建英文翻译文件 (`messages/en.json`)
    - 按命名空间组织：common、nav、upload、processing、result、pricing、history、errors、auth、quota
    - 英文文本遵循自然英语表达习惯
    - _Requirements: 18.4, 18.6_

  - [x] 18.3 创建中文翻译文件 (`messages/zh.json`)
    - 与 en.json 保持完全相同的键结构
    - 使用自然中文表达
    - _Requirements: 18.1, 18.4_

  - [ ]* 18.4 编写翻译文件键完整性属性测试
    - **Property 32: 语言切换完整性**
    - **Validates: Requirements 18.4**

  - [x] 18.5 实现语言切换器组件 (`src/components/LanguageSwitcher.tsx`)
    - 下拉式切换器，显示当前语言（EN / 中文）
    - 切换时设置 Cookie 并刷新页面
    - 集成到 Navbar 组件中
    - _Requirements: 18.3, 18.7, 18.8_

  - [x] 18.6 更新所有现有 UI 组件使用翻译键
    - 更新 UploadZone、ProgressIndicator、BeforeAfterCompare、VideoPlayer 组件
    - 更新 PricingCards、TaskHistoryList、Navbar、AuthButton 组件
    - 更新所有页面组件（首页、登录页、结果页、历史页、定价页）
    - 将所有硬编码文本替换为 `useTranslations()` 调用
    - _Requirements: 18.4_

  - [x] 18.7 更新 API 错误消息支持 locale
    - 实现 `getRequestLocale()` 函数：从 Cookie 或 Accept-Language 头获取 locale
    - 实现 `getErrorMessage()` 函数：根据 locale 返回翻译后的错误消息
    - 更新所有 API 路由的错误响应使用国际化消息
    - _Requirements: 18.5_

  - [ ]* 18.8 编写 API 错误消息国际化属性测试
    - **Property 33: API 错误消息国际化**
    - **Validates: Requirements 18.5**

  - [ ]* 18.9 编写语言偏好持久化属性测试
    - **Property 34: 语言偏好持久化往返一致性**
    - **Validates: Requirements 18.7**

- [x] 19. 最终 Checkpoint - i18n 验证
  - 确保所有 i18n 相关测试通过，如有问题请咨询用户。
  - 验证中英文切换后所有页面文本正确显示。
  - 验证 API 错误消息根据 locale 正确返回。

## 备注

- 标记 `*` 的任务为可选，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 实现顺序：核心管线 → 队列/配额 → 认证 → 支付 → 前端 → 响应式/错误处理 → 国际化
