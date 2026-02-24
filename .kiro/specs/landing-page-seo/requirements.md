# Requirements Document

## Introduction

OldPhotoLive AI 应用的全面 UI/UX 改版与优化。包括：将视频动画模型切换为性价比更高的 Replicate 模型、重新设计落地页（对标 palette.fm 和 remini.ai）、升级前后对比组件为鼠标悬停自动滑动交互、全站 SEO 优化、以及其他页面的视觉打磨。

## Glossary

- **Landing_Page**: 应用首页，包含 Hero 区域、前后对比展示、功能亮点、使用流程、FAQ 等模块的富内容页面
- **BeforeAfter_Slider**: 前后对比滑动组件，通过鼠标悬停位置自动控制滑块，展示修复前后效果
- **SEO_Module**: 搜索引擎优化模块，包括元数据、结构化数据、语义化 HTML、站点地图等
- **Video_Model_Config**: Replicate 平台上的视频动画模型配置，包括模型标识符和参数
- **Navbar**: 顶部导航栏组件
- **i18n_System**: 基于 next-intl 的国际化系统，支持中英文

## Requirements

### Requirement 1: 视频模型升级

**User Story:** As a product owner, I want to switch to a cost-effective video animation model on Replicate, so that the application produces higher quality animations at lower cost.

#### Acceptance Criteria

1. WHEN the animation pipeline runs, THE Video_Model_Config SHALL use the `minimax/video-01-live` model identifier on Replicate
2. WHEN the animation model is invoked, THE Video_Model_Config SHALL pass the image input using the parameter key required by the `minimax/video-01-live` model
3. THE Video_Model_Config SHALL define animation parameters as readonly constants that cannot be overridden by callers
4. WHEN the animation model returns output, THE Video_Model_Config SHALL extract the video URL from the response in the same manner as existing models (string, array, or FileOutput)

### Requirement 2: 落地页 Hero 区域

**User Story:** As a visitor, I want to see a compelling hero section when I land on the homepage, so that I immediately understand the product value and feel motivated to try it.

#### Acceptance Criteria

1. WHEN a visitor loads the Landing_Page, THE Landing_Page SHALL display a hero section with a gradient headline, descriptive subtitle, and a primary call-to-action button
2. WHEN a visitor clicks the primary CTA button, THE Landing_Page SHALL scroll smoothly to the upload section
3. THE Landing_Page SHALL render all hero text content from the i18n_System in the user's selected locale (en or zh)
4. THE Landing_Page SHALL display the hero section as the first visible content below the Navbar

### Requirement 3: 前后对比展示区

**User Story:** As a visitor, I want to see multiple before/after comparison examples on the landing page, so that I can evaluate the quality of the AI restoration before uploading my own photos.

#### Acceptance Criteria

1. THE Landing_Page SHALL display at least three before/after comparison examples in a showcase section
2. WHEN a visitor views the showcase section, THE Landing_Page SHALL render each example using the BeforeAfter_Slider component
3. THE Landing_Page SHALL render showcase section headings and descriptions from the i18n_System

### Requirement 4: BeforeAfter_Slider 悬停交互升级

**User Story:** As a user, I want the before/after comparison slider to follow my mouse position automatically on hover, so that I can compare images effortlessly without clicking or dragging.

#### Acceptance Criteria

1. WHEN the mouse pointer moves over the BeforeAfter_Slider, THE BeforeAfter_Slider SHALL update the slider position to match the horizontal mouse position relative to the component width
2. WHEN the mouse pointer leaves the BeforeAfter_Slider, THE BeforeAfter_Slider SHALL retain the slider at the last position before the pointer left
3. WHEN the slider position is at 0% (far left), THE BeforeAfter_Slider SHALL display only the "Before" label and hide the "After" label
4. WHEN the slider position is at 100% (far right), THE BeforeAfter_Slider SHALL display only the "After" label and hide the "Before" label
5. WHEN the slider position is between 1% and 99%, THE BeforeAfter_Slider SHALL display both "Before" and "After" labels
6. THE BeforeAfter_Slider SHALL support keyboard navigation using ArrowLeft and ArrowRight keys with a step of 2%
7. THE BeforeAfter_Slider SHALL maintain an accessible slider role with aria-valuenow, aria-valuemin, and aria-valuemax attributes
8. WHEN a touch event occurs on the BeforeAfter_Slider, THE BeforeAfter_Slider SHALL update the slider position based on the touch horizontal position

### Requirement 5: 功能亮点区

**User Story:** As a visitor, I want to see the key features of the application highlighted on the landing page, so that I understand the full range of AI capabilities offered.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a features section with at least three feature cards (restoration, colorization, animation)
2. WHEN a visitor views the features section, THE Landing_Page SHALL render each feature card with an icon, title, and description
3. THE Landing_Page SHALL render all feature card content from the i18n_System

### Requirement 6: 使用流程区

**User Story:** As a visitor, I want to see a clear step-by-step guide on how the application works, so that I feel confident about the process before uploading.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a "How It Works" section with numbered steps
2. WHEN a visitor views the "How It Works" section, THE Landing_Page SHALL render at least three steps (upload, AI processing, download results)
3. THE Landing_Page SHALL render all step content from the i18n_System

### Requirement 7: FAQ 区

**User Story:** As a visitor, I want to read frequently asked questions on the landing page, so that I can resolve common concerns before signing up.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a FAQ section with at least four question-answer pairs
2. WHEN a visitor clicks on a FAQ question, THE Landing_Page SHALL toggle the visibility of the corresponding answer with a smooth expand/collapse animation
3. THE Landing_Page SHALL render all FAQ content from the i18n_System

### Requirement 8: 页脚

**User Story:** As a visitor, I want a professional footer with navigation links, so that I can easily access other parts of the site.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a footer section with navigation links to key pages (Home, Pricing, History)
2. THE Landing_Page SHALL display the application name and a brief description in the footer
3. THE Landing_Page SHALL render all footer content from the i18n_System

### Requirement 9: SEO 元数据优化

**User Story:** As a product owner, I want each page to have proper SEO metadata, so that search engines can index and rank the application effectively.

#### Acceptance Criteria

1. THE SEO_Module SHALL generate a unique title and meta description for each page (home, pricing, history, login, result)
2. THE SEO_Module SHALL include Open Graph tags (og:title, og:description, og:image, og:url) on each page
3. THE SEO_Module SHALL include Twitter Card meta tags on each page
4. THE SEO_Module SHALL use the Next.js Metadata API (exported `metadata` object or `generateMetadata` function) for all metadata definitions

### Requirement 10: 结构化数据与站点地图

**User Story:** As a product owner, I want structured data and a sitemap for the application, so that search engines can better understand and crawl the site content.

#### Acceptance Criteria

1. THE SEO_Module SHALL include JSON-LD structured data (WebApplication schema) on the Landing_Page
2. THE SEO_Module SHALL generate a sitemap.xml file listing all public pages
3. THE SEO_Module SHALL generate a robots.txt file that allows search engine crawling and references the sitemap

### Requirement 11: 语义化 HTML

**User Story:** As a product owner, I want all pages to use semantic HTML, so that the content is accessible and SEO-friendly.

#### Acceptance Criteria

1. THE Landing_Page SHALL use proper heading hierarchy (single h1, followed by h2 for sections, h3 for subsections)
2. THE Landing_Page SHALL use semantic landmark elements (header, main, section, footer, nav)
3. THE Landing_Page SHALL include descriptive alt text on all images

### Requirement 12: 其他页面优化

**User Story:** As a user, I want all pages (pricing, history, login, result) to have a polished and consistent visual design, so that the entire application feels professional.

#### Acceptance Criteria

1. WHEN a user visits the Pricing page, THE Pricing page SHALL include proper SEO metadata and use semantic HTML structure
2. WHEN a user visits the History page, THE History page SHALL include proper SEO metadata and use semantic HTML structure
3. WHEN a user visits the Login page, THE Login page SHALL include proper SEO metadata and use semantic HTML structure
4. WHEN a user visits the Result page, THE Result page SHALL include proper SEO metadata
5. THE Navbar SHALL include a mobile-responsive hamburger menu for small screens

### Requirement 13: 性能优化

**User Story:** As a user, I want the landing page to load quickly, so that I have a smooth browsing experience.

#### Acceptance Criteria

1. THE Landing_Page SHALL lazy-load images that are below the initial viewport fold
2. THE Landing_Page SHALL use Next.js Image component or native loading="lazy" for off-screen images
3. WHEN the Landing_Page renders showcase images, THE Landing_Page SHALL use appropriate image dimensions to avoid layout shift
