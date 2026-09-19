# SEO 进度交接

## 2026-09-19：核心页面关键词与 canonical 收口

### 目标与边界

- 站点：`https://oldphotoliveai.com`
- 主要市场：美国；主要索引语言：英语。
- 本轮不新增页面或场景页，只整理现有 URL、搜索意图、站内链接和索引信号。
- 历史 URL 使用永久重定向保留信号；提交 GSC 请求不等于已收录。
- `repair-damaged-old-photos` 在没有对应 GSC URL 级证据前采用保守处理：页面保留、自指 canonical、`noindex,follow`，不进入 sitemap、主导航或相关文章链接。

### 上线前生产基线

- 首页标题仍为 `Animate Old Photos with AI — Restore, Colorize & Bring Old Photos to Life Online Free`，H1 为 `Bring Old Photos to Life with AI`。
- `/restore` 是 307 到 `/restore-old-photos`；`/animate-old-photos` 是 307 到 `/animate`。
- `/restore-old-photos` 返回 200 且自指 canonical。
- `/en/*` 返回 301；生产 sitemap 只有 5 个 URL：`/`、`/animate`、`/bring-to-life`、`/pricing`、`/about`。

### 关键词归属

| 页面 | 主词 | Semrush US 快照 | 页面职责 |
| --- | --- | --- | --- |
| `/` | `colorize photo` | 4,400 / KD 75 / CPC $0.73 | 泛需求首页，标题 `Colorize Photo Online Free – AI Photo Colorizer`，H1 `Colorize Photos with AI` |
| `/colorize-old-photos` | `colorize old photos` | 320 / KD 49 / CPC $0.86 | 老照片上色；承接 `colorize black and white photos` 等相近意图 |
| `/restore-old-photos` | `restore old photos` | 2,400 / KD 60 / CPC $1.69 | 唯一修复工具 canonical |
| `/animate` | `animate old photos` | 320 / KD 26 / CPC $1.54 | 唯一动画工具 canonical |
| `/bring-to-life` | `bring old photos to life` | 210 / KD 42 / CPC $1.77 | 解释/教程页，主 CTA 指向 `/animate` |
| `/to-video` | `photo to video AI` | 4,400 / KD 56 / CPC $1.17 | 老照片转视频垂直意图 |
| `/animate-free` | `animate photos online free` | 10 / 低量词 | 保留现页，不扩写重叠内容 |
| `/repair-damaged-old-photos` | 暂不抢主词 | exact 词 0；`repair damaged photos` 30；`damaged photo repair` 210 | 200 + 自指 canonical + `noindex,follow`，等待证据再决定合并或重写 |
| `/no-login`、`/pricing`、`/about` | 品牌/产品/信任意图 | 不设非品牌主词 | 不与工具页争抢关键词 |

### 已完成的代码调整

- 永久重定向统一为单跳 301，并保留查询参数：
  - `/colorize`、`/en/colorize` → `/colorize-old-photos`
  - `/restore`、`/en/restore` → `/restore-old-photos`
  - `/animate-old-photos`、所有本地化变体 → `/animate`
  - `/en/*` → 对应无前缀英语 canonical
- `/animate`、`/animate-free`、`/bring-to-life`、`/to-video`、`/no-login` 明确为英语索引页；非英语变体直接 301 到英语最终页，不再生成伪本地化英语页面。
- sitemap 只输出 200、自指 canonical、可索引页面；移除别名、修复页和英语专属页的非英语变体。
- 首页、上色、修复、动画、教程、转视频页面分别锁定 title、H1、描述和内部链接归属。
- 首页 JSON-LD 只保留一组页面级 `WebApplication` + `FAQPage`；根布局只放全站 `Organization` + `WebSite`，避免重复实体。
- 工具页保留 `BreadcrumbList` + `FAQPage` + `SoftwareApplication`；动画页使用唯一且与页面职责一致的 `WebApplication` 或 `WebPage`。
- 工具页与动画页补可见面包屑；schema 与页面可见内容一致。
- 免费额度文案统一为“每日免费额度”，不再暗示无限免费；动画免费结果明确包含水印和 480p 限制。
- 主导航、首页卡片、博客和相关工具链接均改为最终 canonical，不再经过旧 URL。

### 验证记录

- `npm test -- --runInBand`：69 个测试套件、648 项测试全部通过。
- `npm run typecheck`：通过。
- `npm run build`：通过；生成 118 个静态页面。仅保留既有的 `FooterSection.tsx` `<img>` 性能警告。
- `scripts/check-colorizer-seo.mjs` 会检查：单跳 301、查询参数、最终 200、title/H1/description、canonical、hreflang、robots、JSON-LD 唯一性，以及 sitemap 内每个 URL 的 200/自指 canonical/可索引状态。
- 本地普通 Node `next start` 会让 next-intl 的无前缀英语内部 rewrite 再次经过仓库既有 `/en` 301 规则，出现自跳转；Vercel 当前生产运行时没有该现象。因此本地内容契约由单测覆盖，完整 URL smoke 必须在真实 Vercel 部署后执行。

### 生产部署与回读

- 2026-09-19 已推送到 `master`，Vercel/Cloudflare 生产环境已切换到新版本。
- `https://oldphotoliveai.com/` 实际返回标题 `Colorize Photo Online Free – AI Photo Colorizer` 和 H1 `Colorize Photos with AI`，上传区、工具入口与下方内容正常显示。
- `/colorize-old-photos` 实际返回目标标题/H1，可见面包屑、上传区、说明、FAQ 和指向修复/动画最终 URL 的相关链接均正常显示。
- 13 组代表性旧 URL/语言变体已验证为单跳 301，查询参数保留，最终 URL 直接返回 200。
- 生产脚本验证首页、上色、修复、动画、教程、转视频 6 个重点页面的 title、H1、description、canonical、hreflang 与 JSON-LD 通过。
- 生产 sitemap 共 41 个唯一 URL；逐条抓取均为 200、自指 canonical、允许索引，无旧别名或重复 URL。最终输出：`All SEO production smoke checks passed.`

### GSC 证据与操作结果

- 正确资源是 URL 前缀属性 `https://oldphotoliveai.com/`；`sc-domain:oldphotoliveai.com` 是未验证的域名属性。账号 `syndredyoung@gmail.com` 可访问前缀属性。
- GSC 网页索引快照最后更新于 2026-09-14：23 个已编入索引、29 个未编入索引；其中 13 个“网页会自动重定向”、6 个 `noindex`、1 个 404、9 个“已抓取 - 尚未编入索引”。
- 2026-09-19 已重新提交 `/sitemap.xml`，GSC 回读“已成功提交站点地图”。提交日期已更新；上次读取日期仍显示 2026-04-03、已发现 36 个网页，等待 Google 异步重新读取当前 41-URL sitemap。

| GSC 的 9 条示例 URL | 当前线上状态 | 动作 |
| --- | --- | --- |
| `/ja/repair-damaged-old-photos` | 200、自指 canonical、`noindex,follow` | 不请求收录 |
| `/en/repair-damaged-old-photos` | 301 → `/repair-damaged-old-photos` | 不请求收录 |
| `/es/repair-damaged-old-photos` | 200、自指 canonical、`noindex,follow` | 不请求收录 |
| `/restore-old-photos` | 200、自指 canonical、可索引、在 sitemap | 已请求编入索引；GSC 回读“已将网址添加到优先抓取队列中” |
| `/_next/static/media/e4af272ccee01ff0-s.p.woff2` | 200 字体资源 | 不请求收录 |
| `/en/colorize-old-photos` | 301 → `/colorize-old-photos` | 不请求收录 |
| `/es/colorize-old-photos` | 200、自指 canonical、可索引、在 sitemap | 已请求编入索引；GSC 回读“已将网址添加到优先抓取队列中” |
| `/favicon.ico` | 200 图标资源 | 不请求收录 |
| `/es` | 200、自指 canonical、可索引、在 sitemap | 已请求编入索引；GSC 回读“已将网址添加到优先抓取队列中” |

- `/restore-old-photos` 的旧抓取记录（2026-07-26）仍显示历史声明 canonical `/en/restore`；当前生产 canonical 已修正为 `/restore-old-photos`，因此本次重新请求抓取是必要的。
- 请求进入抓取队列不代表已经收录；后续应在 GSC 数据刷新后复查 Google 选择的 canonical 和索引状态。

### 提交记录

- `e64600c fix: lock canonical seo ownership`
- `9154756 docs: record seo canonical rollout`
- `4c1c887 fix: reconcile seo indexing contracts`
- `1929a76 docs: record production seo verification`
- 本记录之后的文档提交不改变生产页面行为。
