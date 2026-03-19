# 部署清单 - oldphotoliveai.com

## 最小可部署配置（MVP）

### ✅ 必需配置（13 个变量）

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://oldphotoliveai.com  # ⚠️ 必须修改

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Cloudflare R2
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=oldphotolive-dev  # ⚠️ 建议改为 oldphotolive-prod
NEXT_PUBLIC_R2_DOMAIN=https://pub-1d53303d843e4e19a071284a6933ffb6.r2.dev

# Replicate
REPLICATE_API_TOKEN=your_replicate_api_token

# Worker Secret
WORKER_SECRET=your_worker_secret
```

### ⚠️ Stripe 配置（暂时使用占位符）

```bash
# Stripe - 支付功能已禁用，使用占位符即可
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_PRICE_PAY_AS_YOU_GO=price_placeholder_payg
STRIPE_PRICE_PROFESSIONAL=price_placeholder_pro
```

## 部署前准备

### 1. Google OAuth 回调 URL
访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)，在现有 OAuth 客户端添加：
```
https://oldphotoliveai.com/api/auth/callback/google
```

### 2. （可选）创建生产 R2 Bucket
如果想隔离开发和生产数据：
1. 在 Cloudflare R2 创建 `oldphotolive-prod` bucket
2. 设置 Public Access → Allow Access
3. 更新 `R2_BUCKET_NAME=oldphotolive-prod`

## Vercel 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **在 Vercel 导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - Import Repository
   - 选择你的 GitHub repo

3. **配置环境变量**
   - 进入 Settings → Environment Variables
   - 逐个添加上面的 13 个必需变量 + 4 个 Stripe 占位符
   - 确保 `NEXTAUTH_URL=https://oldphotoliveai.com`

4. **部署**
   - 点击 Deploy
   - 等待构建完成（约 2-3 分钟）

5. **绑定域名**
   - Settings → Domains
   - 添加 `oldphotoliveai.com`
   - 在域名 DNS 添加 Vercel 提供的 CNAME 记录
   - 等待 DNS 生效（5-30 分钟）

## 部署后测试

- [ ] 访问 `https://oldphotoliveai.com` 首页正常加载
- [ ] Google 登录流程正常
- [ ] 上传图片成功
- [ ] 图片处理 pipeline 正常运行
- [ ] SSE 实时进度更新正常
- [ ] 结果页面显示正常
- [ ] 点击 Pricing 页面的付费按钮显示 "Payment feature is coming soon"

## 注意事项

1. **Vercel Cron Jobs（Hobby 计划兼容）**
   - Hobby 计划只支持每日 cron（`0 0 * * *`）
   - `quota-reset` 和 `cleanup` 已配置为每日运行（通过 GET handler）
   - Pipeline worker 不需要 cron — 任务创建时自动触发，处理完后自动链式处理队列中的下一个任务
   - 如需配置 `CRON_SECRET` 环境变量来保护 cron endpoints（可选）

2. **Stripe 支付功能已禁用**
   - 用户点击付费按钮会看到 "Payment feature is coming soon"
   - 后续配置 Stripe 后自动启用，无需修改代码

3. **R2 Bucket 建议分开**
   - 开发用 `oldphotolive-dev`
   - 生产用 `oldphotolive-prod`
   - 避免数据混淆

4. **首次部署可能需要等待**
   - DNS 生效：5-30 分钟
   - SSL 证书签发：自动，约 1-2 分钟
   - Vercel 全球 CDN 同步：约 5 分钟

## 后续配置 Stripe（可选）

当需要启用支付功能时：

1. 在 [Stripe Dashboard](https://dashboard.stripe.com) 创建产品和价格
2. 创建 Webhook endpoint: `https://oldphotoliveai.com/api/stripe/webhook`
3. 获取真实的 API keys 和 price IDs
4. 在 Vercel 更新 4 个 Stripe 环境变量
5. 重新部署（Vercel 会自动触发）

支付功能会自动启用，无需修改代码。
