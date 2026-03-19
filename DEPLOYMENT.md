# 生产环境部署配置

## 环境变量配置清单

### ✅ 可以从 .env.local 直接复用
```bash
# Upstash Redis（开发和生产共用）
UPSTASH_REDIS_REST_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Cloudflare R2 凭证（可复用）
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key

# Replicate API（可复用）
REPLICATE_API_TOKEN=your_replicate_api_token
```

### ⚠️ 需要修改但可基于现有配置
```bash
# Google OAuth - 在现有客户端添加生产回调 URL
# https://console.cloud.google.com/apis/credentials
# 添加 Authorized redirect URI: https://oldphotoliveai.com/api/auth/callback/google
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth - 修改 URL 为生产域名
NEXTAUTH_URL=https://oldphotoliveai.com

# NextAuth Secret - 建议重新生成（可选）
# 运行: openssl rand -base64 32
NEXTAUTH_SECRET=（建议重新生成）

# Worker Secret - 建议重新生成（可选）
WORKER_SECRET=（建议重新生成）
```

### ❌ 必须新建的配置
```bash
# R2 Bucket - 创建生产专用 bucket
# 在 Cloudflare R2 创建新 bucket: oldphotolive-prod
R2_BUCKET_NAME=oldphotolive-prod

# R2 CDN 域名 - 配置自定义域名（推荐）
# 在 Cloudflare R2 bucket 设置中绑定 cdn.oldphotoliveai.com
NEXT_PUBLIC_R2_DOMAIN=https://cdn.oldphotoliveai.com
# 或暂时复用开发域名:
# NEXT_PUBLIC_R2_DOMAIN=https://pub-1d53303d843e4e19a071284a6933ffb6.r2.dev

# Stripe - 暂时使用占位符（功能已禁用，后续配置）
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_PAY_AS_YOU_GO=price_placeholder_payg
STRIPE_PRICE_PROFESSIONAL=price_placeholder_pro
```

## 详细配置步骤

### 1. Google OAuth 配置
1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 选择现有的 OAuth 2.0 客户端 ID
3. 在 "Authorized redirect URIs" 添加：
   ```
   https://oldphotoliveai.com/api/auth/callback/google
   ```
4. 保存后，Client ID 和 Secret 保持不变

### 2. Cloudflare R2 配置
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. 创建新 bucket: `oldphotolive-prod`
3. 设置 → Public Access → Allow Access
4. （可选）绑定自定义域名 `cdn.oldphotoliveai.com`

### 3. Stripe 配置（暂时跳过，使用占位符）
Stripe 支付功能已禁用，可以先部署上线。后续需要时再配置：
1. 访问 [Stripe Dashboard](https://dashboard.stripe.com)
2. 创建产品：
   - Pay As You Go: $2.99 一次性付款
   - Professional: $19.99/月 订阅
3. 获取 Price IDs（格式：`price_xxx`）
4. 创建 Webhook endpoint:
   - URL: `https://oldphotoliveai.com/api/stripe/webhook`
   - 监听事件: `checkout.session.completed`, `invoice.payment_failed`
5. 获取 Webhook signing secret（格式：`whsec_xxx`）
6. 获取 Secret key（格式：`sk_live_xxx`）

### 4. Vercel 部署
1. 在 Vercel 项目 Settings → Environment Variables 中逐个添加上述变量
2. 确保所有变量都设置为 Production 环境
3. 重新部署项目

### 5. 域名配置
1. 在 Vercel 项目 Settings → Domains 添加 `oldphotoliveai.com`
2. 在域名 DNS 添加 Vercel 提供的 CNAME 记录
3. 等待 DNS 生效（通常 5-30 分钟）

## 注意事项

- ⚠️ Vercel Cron Jobs 需要 Pro 计划（$20/月）
- ⚠️ 如果使用 Hobby 计划，需要用外部 cron 服务调用 worker endpoints
- ⚠️ Stripe 测试模式和生产模式的 keys 不同，确保使用 `sk_live_` 开头的 key
- ⚠️ R2 bucket 开发和生产分开，避免数据混淆
- ⚠️ 首次部署后测试 Google 登录、文件上传、支付流程

## 环境隔离建议

如果希望开发和生产完全隔离：

1. **Redis**: 在 Upstash 创建新的 production database
2. **R2**: 使用不同的 bucket（已建议）
3. **Google OAuth**: 创建新的 OAuth 客户端（可选）
4. **Stripe**: 使用 live mode keys（必须）

## 快速检查清单

部署前确认：
- [ ] 所有环境变量已在 Vercel 配置
- [ ] Google OAuth 回调 URL 已添加生产域名
- [ ] R2 生产 bucket 已创建并设置公开访问
- [ ] Stripe webhook endpoint 已创建
- [ ] 域名 DNS 已配置
- [ ] NEXTAUTH_URL 已改为生产域名
- [ ] NEXT_PUBLIC_R2_DOMAIN 已更新

部署后测试：
- [ ] 访问首页正常加载
- [ ] Google 登录流程正常
- [ ] 上传图片到 R2 成功
- [ ] 图片处理 pipeline 正常
- [ ] SSE 实时进度更新正常
- [ ] 支付流程正常（如已配置 Stripe）
