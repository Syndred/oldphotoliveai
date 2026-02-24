# Implementation Plan: Landing Page & SEO Overhaul

## Overview

将 OldPhotoLive AI 从极简上传页改造为专业落地页，升级视频模型、BeforeAfter 交互、全站 SEO，并统一深棕/黑色高级色调。每个任务增量构建，确保无孤立代码。

## Tasks

- [x] 1. 更新全局色调和 CSS 变量
  - [x] 1.1 修改 `src/app/globals.css` 中的 CSS 变量为深棕/黑色调方案
    - 将 `--color-primary-bg` 改为 `#0C0A09`
    - 将 `--color-gradient-from` 改为 `#D4A574`
    - 将 `--color-gradient-to` 改为 `#B8860B`
    - 将 `--color-accent` 改为 `#E8B86D`
    - 将 `--color-text-primary` 改为 `#FAF5F0`
    - 将 `--color-text-secondary` 改为 `#A8A29E`
    - 新增 `--color-card-bg` 和 `--color-border` 变量
    - _Requirements: Visual Design_

- [x] 2. 升级 BeforeAfterCompare 组件
  - [x] 2.1 重写 `src/components/BeforeAfterCompare.tsx` 交互逻辑
    - 移除 `onPointerDown`/`isDragging` 逻辑
    - 添加 `onMouseMove` 直接更新 slider 位置（悬停即跟随）
    - 添加 `onTouchMove` 支持触摸设备
    - `onMouseLeave` 保持最后位置不变
    - 标签显示逻辑：position ≤ 0 只显示 Before，position ≥ 100 只显示 After，其他两个都显示
    - 保留键盘 ArrowLeft/ArrowRight（step=2）和 aria-slider 属性
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 2.2 编写 BeforeAfterCompare 属性测试
    - **Property 1: calcPosition correctness**
    - **Validates: Requirements 4.1, 4.8**
    - **Property 2: Label visibility rules**
    - **Validates: Requirements 4.3, 4.4, 4.5**
    - **Property 3: Keyboard navigation step**
    - **Validates: Requirements 4.6**

  - [ ]* 2.3 更新 BeforeAfterCompare 单元测试
    - 更新 `__tests__/unit/before-after-compare.test.tsx` 适配新的悬停交互
    - 测试 mouseMove、mouseLeave、touchMove 事件
    - 测试标签显示/隐藏逻辑
    - 测试无障碍属性
    - _Requirements: 4.1-4.8_

- [x] 3. Checkpoint - 确保 BeforeAfterCompare 测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 升级视频动画模型配置
  - [x] 4.1 修改 `src/lib/replicate.ts` 中的 MODELS 和 ANIMATION_PARAMS
    - 将 `MODELS.animation` 改为 `minimax/video-01-live`
    - 更新 `ANIMATION_PARAMS` 为 minimax/video-01-live 所需参数
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 修改 `src/lib/pipeline.ts` 中的 animation 调用
    - 将 `input_image` 参数键改为 `image_url`（minimax/video-01-live 的输入键）
    - _Requirements: 1.2_

  - [ ]* 4.3 编写视频模型配置属性测试
    - **Property 4: Animation params immutability**
    - **Validates: Requirements 1.3**

  - [ ]* 4.4 更新 replicate 单元测试
    - 更新 `__tests__/unit/replicate.test.ts` 中的模型常量断言
    - 验证 MODELS.animation 为 `minimax/video-01-live`
    - _Requirements: 1.1, 1.4_

- [x] 5. 添加 i18n 落地页文案
  - [x] 5.1 更新 `messages/en.json` 添加 landing 相关键
    - 添加 hero、showcase、features、howItWorks、faq、footer 所有文案
    - _Requirements: 2.3, 3.3, 5.3, 6.3, 7.3, 8.3_

  - [x] 5.2 更新 `messages/zh.json` 添加 landing 相关键
    - 添加对应的中文翻译
    - _Requirements: 2.3, 3.3, 5.3, 6.3, 7.3, 8.3_

- [x] 6. 重建落地页
  - [x] 6.1 重写 `src/app/page.tsx` 为富内容落地页
    - 改为混合 Server/Client Component 架构
    - 包含 Hero 区域（渐变标题、副标题、CTA 按钮）
    - 包含 Showcase 区域（3 个 BeforeAfterCompare 实例）
    - 包含 Features 区域（3 个功能卡片：修复、上色、动画）
    - 包含 HowItWorks 区域（3 个步骤）
    - 包含 Upload 区域（现有 UploadZone）
    - 包含 FAQ 区域（4 个可折叠问答）
    - 使用语义化 HTML（header, main, section, footer）
    - 使用正确的标题层级（单个 h1，section 用 h2）
    - 所有图片包含 alt 文本
    - 展示图片使用 loading="lazy"
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 11.1, 11.2, 11.3, 13.1, 13.2, 13.3_

  - [x] 6.2 创建 `src/components/Footer.tsx` 页脚组件
    - 包含应用名称、简介、导航链接
    - 所有文案从 i18n 读取
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 6.3 编写落地页图片 alt 文本属性测试
    - **Property 5: All images have alt text**
    - **Validates: Requirements 11.3**

  - [ ]* 6.4 编写落地页渲染单元测试
    - 验证各区域正确渲染（Hero、Showcase、Features、HowItWorks、FAQ、Footer）
    - 验证 FAQ 折叠交互
    - 验证语义化 HTML 结构
    - _Requirements: 2.1, 3.1, 5.1, 6.1, 7.1, 7.2, 8.1, 11.1, 11.2_

- [x] 7. Checkpoint - 确保落地页测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. SEO 优化
  - [x] 8.1 更新 `src/app/layout.tsx` 全局 metadata
    - 使用 Next.js Metadata API 定义 title template、description、openGraph、twitter
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 8.2 为各页面添加 SEO metadata
    - `src/app/page.tsx` — 首页 metadata
    - `src/app/pricing/page.tsx` — 定价页 metadata
    - `src/app/history/page.tsx` — 历史页 metadata
    - `src/app/login/page.tsx` — 登录页 metadata
    - `src/app/result/[taskId]/page.tsx` — 结果页 metadata
    - 每个页面包含 title、description、openGraph、twitter
    - _Requirements: 9.1, 9.2, 9.3, 12.1, 12.2, 12.3, 12.4_

  - [x] 8.3 添加 JSON-LD 结构化数据到首页
    - 在 `src/app/page.tsx` 中添加 WebApplication schema 的 JSON-LD script 标签
    - _Requirements: 10.1_

  - [x] 8.4 创建 `src/app/sitemap.ts`
    - 使用 Next.js MetadataRoute.Sitemap 生成站点地图
    - 列出所有公开页面（/, /pricing, /login）
    - _Requirements: 10.2_

  - [x] 8.5 创建 `src/app/robots.ts`
    - 使用 Next.js MetadataRoute.Robots 生成 robots.txt
    - 允许搜索引擎爬取，引用 sitemap
    - _Requirements: 10.3_

  - [ ]* 8.6 编写 SEO 单元测试
    - 验证 sitemap 输出包含所有公开页面
    - 验证 robots 输出允许爬取并引用 sitemap
    - 验证首页包含 JSON-LD 结构化数据
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 9. 其他页面优化
  - [x] 9.1 优化 Pricing 页面
    - 添加语义化 HTML 结构
    - 确保标题层级正确
    - _Requirements: 12.1_

  - [x] 9.2 优化 History 页面
    - 添加语义化 HTML 结构
    - _Requirements: 12.2_

  - [x] 9.3 优化 Login 页面
    - 添加语义化 HTML 结构和 Navbar
    - _Requirements: 12.3_

  - [x] 9.4 升级 Navbar 添加移动端汉堡菜单
    - 在小屏幕下显示汉堡按钮，点击展开/折叠导航链接
    - _Requirements: 12.5_

  - [ ]* 9.5 更新 Navbar 单元测试
    - 测试汉堡菜单展开/折叠
    - _Requirements: 12.5_

- [x] 10. Final checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- R2 公共桶没有 CORS 头，展示图片不要使用 crossOrigin="anonymous"
- 所有新增文案必须同时更新 en.json 和 zh.json
