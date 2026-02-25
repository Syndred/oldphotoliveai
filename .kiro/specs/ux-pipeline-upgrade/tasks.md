# 实现计划：UX & Pipeline 升级

## 概述

基于已批准的需求和设计文档，将改动分为三个主要部分：落地页视频展示+样式优化、处理过程中间结果预览、动画模型替换。使用 TypeScript/React，测试框架为 Jest + fast-check。

## 任务

- [x] 1. 替换动画模型配置
  - [x] 1.1 更新 `src/lib/replicate.ts` 中的 `MODELS.animation` 为 `stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438`，更新 `ANIMATION_PARAMS` 为 SVD 参数（`video_length`、`sizing_strategy`、`frames_per_second`、`motion_bucket_id`、`cond_aug`）
    - _Requirements: 4.1, 4.3, 4.4_
  - [x] 1.2 更新 `src/lib/pipeline.ts` 动画步骤的输入参数键，从 `first_frame_image` 改为 `input_image`
    - _Requirements: 4.2_
  - [x] 1.3 更新 `__tests__/unit/replicate.test.ts`，修正 MODELS.animation 和 ANIMATION_PARAMS 的断言值，修正动画模型参数合并测试
    - _Requirements: 4.3, 4.4_
  - [x] 1.4 更新 `__tests__/unit/pipeline.test.ts`，修正动画步骤使用 `input_image` 键的断言
    - _Requirements: 4.2_
  - [ ]* 1.5 编写属性测试：Pipeline 使用正确的输入参数键
    - **Property 4: Pipeline input key**
    - **Validates: Requirements 4.2**
  - [ ]* 1.6 编写属性测试：Pipeline 正确处理新模型输出
    - **Property 5: Pipeline output handling**
    - **Validates: Requirements 4.5**

- [x] 2. Checkpoint - 确保模型替换相关测试全部通过
  - 运行所有测试，确认无回归。如有问题请告知。

- [x] 3. 落地页视频展示区域
  - [x] 3.1 在 `messages/en.json` 和 `messages/zh.json` 中添加 `landing.videoShowcase` 的 i18n 键（title、subtitle）
    - _Requirements: 1.4_
  - [x] 3.2 创建 `src/app/sections/VideoShowcaseSection.tsx`，使用 VideoPlayer 组件播放 R2 CDN 上的示例动画视频，使用 next-intl 国际化文案
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 3.3 在 `src/app/page.tsx` 中导入 VideoShowcaseSection 并插入到 ShowcaseSection 之后
    - _Requirements: 1.1_
  - [ ]* 3.4 编写 `__tests__/unit/video-showcase-section.test.tsx` 单元测试，验证视频 URL 正确、无 crossOrigin 属性、i18n 文案渲染
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. 落地页样式优化
  - [x] 4.1 调整所有 `src/app/sections/*.tsx` 的间距类名：将 `py-20 sm:py-32` / `py-16 sm:py-24` 缩减为 `py-12 sm:py-16` / `py-10 sm:py-14`，内部 `mt-12` 缩减为 `mt-8`
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. 处理过程中间结果实时预览
  - [x] 5.1 提取 `buildCdnUrl` 为共享工具函数（从 `src/app/result/[taskId]/page.tsx` 提取到 `src/lib/url.ts` 或类似位置），供 ProgressIndicator 和 ResultPage 共用
    - _Requirements: 3.4_
  - [x] 5.2 在 `messages/en.json` 和 `messages/zh.json` 中添加 `processing.previewRestored`、`processing.previewColorized`、`processing.previewAnimation` 的 i18n 键
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 5.3 扩展 `src/components/ProgressIndicator.tsx`：新增 `intermediateResults` state，在 SSE onmessage 中提取中间结果键，在已完成步骤下方渲染缩略图预览（img/video），不设置 crossOrigin
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 5.4 更新 `__tests__/unit/progress-indicator.test.tsx`，添加中间结果预览的单元测试（SSE 推送键后显示预览、无键时不显示）
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  - [ ]* 5.5 编写属性测试：CDN URL 构建正确性
    - **Property 1: CDN URL construction**
    - **Validates: Requirements 3.4**
  - [ ]* 5.6 编写属性测试：中间结果预览渲染
    - **Property 2: Intermediate preview rendering**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ]* 5.7 编写属性测试：缺失键不渲染预览
    - **Property 3: Missing keys no preview**
    - **Validates: Requirements 3.6**

- [x] 6. Final Checkpoint - 确保所有测试通过
  - 运行全部测试套件，确认无回归。如有问题请告知。

## 备注

- 标记 `*` 的任务为可选，可跳过以加速 MVP
- 每个任务引用了具体的需求编号以便追溯
- SSE stream route 无需修改，已推送所有中间结果键
- 属性测试使用 fast-check，每个测试至少 100 次迭代
