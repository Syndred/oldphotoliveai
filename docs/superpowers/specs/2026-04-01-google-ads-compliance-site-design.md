# Google Ads Compliance Site Update Design

## Goal

Align the public website at `https://oldphotoliveai.com` with the Google Ads API Basic Access application submitted on April 1, 2026, while keeping sensitive business details in low-exposure locations instead of the main marketing flow.

## Scope

This design covers:

- A new public `About` page that exposes the operator identity, contact email, business address, and internal-only advertising workflow language used in the application.
- Footer navigation updates so Google reviewers can find the transparency page from any route.
- Small additions to the existing Privacy Policy and Terms of Service pages so the legal pages repeat the same operator, email, and address details.
- Supporting SEO, sitemap, i18n copy, and tests needed to keep the new route consistent with the current app structure.

This design does not change the product positioning of OldPhotoLive AI as an AI old photo restoration service, and it does not create any public-facing Google Ads management product.

## Product Intent

OldPhotoLive AI remains a consumer-facing AI photo restoration website for overseas users. The compliance update should not push address details into hero sections, pricing, or other high-traffic marketing surfaces. Instead, the site will present required transparency information in dedicated low-exposure pages that are still easy for Google reviewers to verify.

## Recommended Approach

Use a single `About` page as the primary transparency surface, then reinforce the same information inside the existing legal pages.

Why this approach:

- It matches the submitted Google Ads application language closely.
- It keeps operator and address details publicly accessible without overexposing them in the main product experience.
- It is smaller and safer than adding separate `Contact` and `Compliance` pages.

Alternatives considered:

1. Add only a footer address block.
   This is too weak because it does not explain who operates the service or how the internal tool is used.

2. Add separate `About`, `Contact`, and `Compliance` pages.
   This is more complete, but it adds unnecessary surface area for a low-traffic test site and makes the site feel more like an ad-tech product than a restoration service.

## Public Content Requirements

The public site must present the following exact business facts consistently:

- Operator: `Syndred Young`
- Brand: `OldPhotoLive AI`
- Contact email: `support@oldphotoliveai.com`
- Business address: `Yifu Building, Area 45, Bao'an District, Shenzhen, Guangdong Province, China`
- Market positioning: overseas users interested in old photo restoration services
- Internal tool positioning: internal-only workflow for Google Ads campaign preparation, campaign management support, keyword research, and reporting for `oldphotoliveai.com`; not offered to third parties

## Page Design

### About Page

Route: `/about` plus localized routes through the existing locale wrapper.

Sections:

1. Intro
   Explain that OldPhotoLive AI is an AI-powered old photo restoration service for overseas users.

2. Operator and ownership
   State that the service is operated by Syndred Young as the sole owner and operator.

3. Contact and business address
   Show the official email address and physical business address clearly in body content, not hidden in metadata only.

4. Internal advertising operations
   Explain that the site uses an internal-only Google Ads workflow for keyword research, campaign setup support, and performance reporting for its own business only.

5. Legal links
   Link to Privacy Policy and Terms of Service.

The visual style should reuse the existing legal page shell so the new page feels native to the site and can be implemented with minimal UI risk.

### Footer

Add an `About` link to the existing footer link group. Do not place the physical address directly in the footer.

### Privacy Policy

Add a small business information section near the contact area that includes:

- Operator name
- Support email
- Business address

Keep the existing privacy text intact aside from this addition.

### Terms of Service

Add a matching business information section near the contact area that includes:

- Operator name
- Support email
- Business address

Keep the existing terms content and content-safety block intact.

## Architecture

The implementation should follow the current App Router and `next-intl` pattern already used by `privacy` and `terms`.

Expected structure:

- New top-level server page at `src/app/about/page.tsx`
- New localized wrapper at `src/app/[locale]/about/page.tsx`
- New metadata layout if needed to match current legal page SEO structure
- Copy additions in `messages/en.json`, `messages/zh.json`, `messages/es.json`, and `messages/ja.json`
- SEO additions in `src/content/page-seo.ts`
- Footer update in `src/app/sections/FooterSection.tsx`
- Sitemap update in `src/app/sitemap.ts`

If the `About` page shell is nearly identical to the legal pages, it is acceptable to reuse the same visual structure rather than introducing a new component abstraction.

## Data Flow

All displayed business details are static constants embedded in site copy. No new API route, form, database table, or admin setting is needed.

## Error Handling

This change is primarily static content, so risk is concentrated in routing and missing translations.

Mitigations:

- Add tests that verify footer links include the localized `About` route.
- Add tests that verify the About page renders the operator name, support email, and address.
- Extend legal page tests to verify business information is visible there as well.

## Testing Strategy

Minimum verification:

- Existing legal page tests continue to pass.
- New About page tests cover localized routing and required business information.
- Typecheck passes.

Optional but useful:

- Run a focused test file for legal/about pages.

## Privacy and Exposure Decision

The business address will be publicly visible on the About page and legal pages because it was supplied as part of the Google Ads API application. To reduce casual exposure, it will not be promoted in the homepage, navbar, pricing page, or footer body text.

## Out of Scope

- Any change to the homepage marketing copy
- Any public dashboard for Google Ads tooling
- Any removal or future hiding of the business address after approval
- Any changes to Google Ads API backend integration

## Success Criteria

The update is successful when:

- Google reviewers can navigate from the footer to an About page that clearly identifies the operator, email, and business address.
- The About page and legal pages match the April 1, 2026 application narrative.
- The main product experience still reads as an AI old photo restoration site rather than an ad-tech product.
