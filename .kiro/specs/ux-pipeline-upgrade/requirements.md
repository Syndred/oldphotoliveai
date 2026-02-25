# 需求文档

## 简介

本次升级包含三个相关改进：(1) 落地页增加视频展示区域并优化整体布局样式，使其更紧凑专业；(2) 处理过程中实时预览每一步的中间结果（修复图、上色图、动画视频）；(3) 将当前昂贵的 minimax/video-01-live 动画模型替换为 Replicate 上更经济的替代方案（预算 ≤$0.1/次）。

## 术语表

- **Landing_Page**: 应用首页（`src/app/page.tsx`），包含 Hero、Showcase、Features、HowItWorks、Upload、FAQ、Footer 等区块
- **Video_Showcase**: 落地页新增的视频展示区域，播放 R2 存储桶中已有的动画示例视频
- **R2_CDN**: Cloudflare R2 公共 CDN，域名为 `https://pub-1d53303d843e4e19a071284a6933ffb6.r2.dev`
- **SSE_Stream**: Server-Sent Events 流式接口（`/api/tasks/[taskId]/stream`），用于向客户端推送任务状态和中间结果
- **ProgressIndicator**: 进度指示器组件（`src/components/ProgressIndicator.tsx`），显示处理步骤和进度
- **Pipeline**: AI 处理流水线（`src/lib/pipeline.ts`），依次执行修复→上色→动画
- **Animation_Model**: Replicate 上用于生成照片动画的视频模型
- **Result_Page**: 结果页面（`src/app/result/[taskId]/page.tsx`），展示处理结果

## 需求

### 需求 1：落地页视频展示

**用户故事：** 作为访客，我希望在落地页看到动画效果的视频演示，以便直观了解产品能力。

#### 验收标准

1. WHEN Landing_Page 加载完成, THE Video_Showcase SHALL 在 Showcase 区块下方展示一个视频播放区域，播放 R2_CDN 上任务 `acbfdf8a-19a1-47a9-a7ed-f1ee883ef013` 的 `animation.mp4` 文件
2. THE Video_Showcase SHALL 使用已有的 VideoPlayer 组件渲染视频，视频源 URL 为 `https://pub-1d53303d843e4e19a071284a6933ffb6.r2.dev/tasks/acbfdf8a-19a1-47a9-a7ed-f1ee883ef013/animation.mp4`
3. THE Video_Showcase SHALL 不对 video 元素设置 `crossOrigin="anonymous"` 属性（R2 公共桶无 CORS 头）
4. THE Video_Showcase SHALL 包含中英文标题和描述文字，使用 next-intl 国际化

### 需求 2：落地页样式优化

**用户故事：** 作为访客，我希望落地页布局更紧凑、更专业，以获得更好的浏览体验。

#### 验收标准

1. THE Landing_Page SHALL 将各区块（Hero、Showcase、Features、HowItWorks、Upload、FAQ）的上下内边距从当前的 `py-16 sm:py-24` / `py-20 sm:py-32` 缩减为更紧凑的值（`py-10 sm:py-14` 或类似）
2. THE Landing_Page SHALL 将各区块之间的视觉间距缩减，使整体布局更紧凑，参照 palette.fm、remini.ai 等主流 AI 工具站的设计风格
3. THE Landing_Page SHALL 保持所有现有功能和交互不变，仅调整间距和布局样式

### 需求 3：处理过程中间结果实时预览

**用户故事：** 作为用户，我希望在照片处理过程中实时看到每一步的结果预览，以便了解处理进展。

#### 验收标准

1. WHEN SSE_Stream 推送的状态包含 `restoredImageKey`, THE ProgressIndicator SHALL 在修复步骤完成后显示修复后的图片缩略图预览
2. WHEN SSE_Stream 推送的状态包含 `colorizedImageKey`, THE ProgressIndicator SHALL 在上色步骤完成后显示上色后的图片缩略图预览
3. WHEN SSE_Stream 推送的状态包含 `animationVideoKey`, THE ProgressIndicator SHALL 在动画步骤完成后显示动画视频预览
4. THE ProgressIndicator SHALL 将 SSE_Stream 推送的 R2 存储键（key）转换为完整的 CDN URL 用于预览展示
5. THE ProgressIndicator SHALL 不对预览图片和视频元素设置 `crossOrigin="anonymous"` 属性
6. IF SSE_Stream 推送的中间结果键为空或缺失, THEN THE ProgressIndicator SHALL 不显示对应步骤的预览，仅保持原有的步骤指示器

### 需求 4：替换动画视频模型

**用户故事：** 作为运营者，我希望将动画模型替换为更经济的方案，以便将单次处理成本控制在 $0.1 以内。

#### 验收标准

1. THE Animation_Model SHALL 替换为 Replicate 上的 `stability-ai/stable-video-diffusion`（稳定视频扩散模型），单次运行成本低于 $0.1
2. WHEN Pipeline 执行动画步骤, THE Pipeline SHALL 使用新模型要求的输入参数格式（`input_image` 键而非 `first_frame_image`）
3. THE Animation_Model 的配置 SHALL 更新 `src/lib/replicate.ts` 中的 `MODELS.animation` 为新模型的完整版本标识符
4. THE Animation_Model 的参数 SHALL 更新 `ANIMATION_PARAMS` 以匹配新模型的参数规范（如 `video_length`、`fps` 等）
5. WHEN 新模型返回输出结果, THE Pipeline SHALL 正确解析输出 URL 并上传到 R2（兼容新模型的输出格式）
