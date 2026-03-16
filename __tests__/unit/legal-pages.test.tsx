/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockLocale = "en";

const translations = {
  en: {
    "landing.footer.links.home": "Home",
    "landing.footer.links.pricing": "Pricing",
    "landing.footer.links.history": "History",
    "landing.footer.links.privacy": "Privacy",
    "landing.footer.links.terms": "Terms",
    "landing.footer.description": "AI-powered photo restoration",
    "landing.footer.copyright": "Copyright",
    "legal.shared.lastUpdated": "Last updated",
    "legal.privacy.eyebrow": "Privacy",
    "legal.privacy.title": "Privacy Policy",
    "legal.privacy.description": "How OldPhotoLive AI collects, uses, and protects your information.",
    "legal.privacy.intro": "Privacy intro",
    "legal.privacy.contactTitle": "Contact",
    "legal.privacy.contactBody": "Questions about this policy or privacy requests can be sent to the email below.",
    "legal.privacy.relatedLink": "View Terms of Service",
    "legal.privacy.sections.informationCollected.title": "1. Information We Collect",
    "legal.privacy.sections.informationCollected.body": "Information body",
    "legal.privacy.sections.usage.title": "2. How We Use Information",
    "legal.privacy.sections.usage.body": "Usage body",
    "legal.privacy.sections.cookies.title": "3. Cookies, Local Storage, and Analytics",
    "legal.privacy.sections.cookies.body": "Cookies body",
    "legal.privacy.sections.sharing.title": "4. How We Share Information",
    "legal.privacy.sections.sharing.body": "Sharing body",
    "legal.privacy.sections.storage.title": "5. Storage and Retention",
    "legal.privacy.sections.storage.body": "Storage body",
    "legal.privacy.sections.security.title": "6. Security",
    "legal.privacy.sections.security.body": "Security body",
    "legal.privacy.sections.internationalTransfers.title": "7. International Transfers",
    "legal.privacy.sections.internationalTransfers.body": "Transfer body",
    "legal.privacy.sections.rights.title": "8. Your Rights and Choices",
    "legal.privacy.sections.rights.body": "Rights body",
    "legal.privacy.sections.children.title": "9. Children",
    "legal.privacy.sections.children.body": "Children body",
    "legal.privacy.sections.changes.title": "10. Changes to This Policy",
    "legal.privacy.sections.changes.body": "Changes body",
    "legal.terms.eyebrow": "Terms",
    "legal.terms.title": "Terms of Service",
    "legal.terms.description": "The rules and conditions for using OldPhotoLive AI.",
    "legal.terms.intro": "Terms intro",
    "legal.terms.contactTitle": "Contact",
    "legal.terms.contactBody": "For legal or terms-related inquiries, please use the email below.",
    "legal.terms.relatedLink": "View Privacy Policy",
    "legal.terms.sections.eligibility.title": "1. Eligibility",
    "legal.terms.sections.eligibility.body": "Eligibility body",
    "legal.terms.sections.serviceDescription.title": "2. Service Description",
    "legal.terms.sections.serviceDescription.body": "Service body",
    "legal.terms.sections.accounts.title": "3. Accounts and Access",
    "legal.terms.sections.accounts.body": "Accounts body",
    "legal.terms.sections.acceptableUse.title": "4. Acceptable Use",
    "legal.terms.sections.acceptableUse.body": "Acceptable use body",
    "legal.terms.sections.contentPermissions.title": "5. Uploaded Content and Permissions",
    "legal.terms.sections.contentPermissions.body": "Permissions body",
    "legal.terms.sections.aiOutputs.title": "6. AI Outputs",
    "legal.terms.sections.aiOutputs.body": "AI outputs body",
    "legal.terms.sections.payments.title": "7. Payments, Credits, and Subscriptions",
    "legal.terms.sections.payments.body": "Payments body",
    "legal.terms.sections.termination.title": "8. Suspension and Termination",
    "legal.terms.sections.termination.body": "Termination body",
    "legal.terms.sections.changes.title": "9. Service and Terms Changes",
    "legal.terms.sections.changes.body": "Terms changes body",
    "legal.terms.sections.disclaimers.title": "10. Disclaimers",
    "legal.terms.sections.disclaimers.body": "Disclaimers body",
    "legal.terms.sections.liability.title": "11. Limitation of Liability",
    "legal.terms.sections.liability.body": "Liability body",
  },
  zh: {
    "landing.footer.links.home": "首页",
    "landing.footer.links.pricing": "定价",
    "landing.footer.links.history": "历史",
    "landing.footer.links.privacy": "隐私政策",
    "landing.footer.links.terms": "服务条款",
    "landing.footer.description": "AI 驱动的照片修复",
    "landing.footer.copyright": "版权",
    "legal.shared.lastUpdated": "最后更新",
    "legal.privacy.eyebrow": "隐私",
    "legal.privacy.title": "隐私政策",
    "legal.privacy.description": "了解 OldPhotoLive AI 如何收集、使用并保护您的信息。",
    "legal.privacy.intro": "隐私说明",
    "legal.privacy.contactTitle": "联系方式",
    "legal.privacy.contactBody": "如果您对本政策或隐私请求有任何疑问，请使用下方邮箱联系我们。",
    "legal.privacy.relatedLink": "查看服务条款",
    "legal.privacy.sections.informationCollected.title": "1. 我们收集的信息",
    "legal.privacy.sections.informationCollected.body": "信息说明",
    "legal.privacy.sections.usage.title": "2. 信息的使用方式",
    "legal.privacy.sections.usage.body": "用途说明",
    "legal.privacy.sections.cookies.title": "3. Cookie、本地存储与分析",
    "legal.privacy.sections.cookies.body": "Cookie 说明",
    "legal.privacy.sections.sharing.title": "4. 我们如何共享信息",
    "legal.privacy.sections.sharing.body": "共享说明",
    "legal.privacy.sections.storage.title": "5. 存储与保留",
    "legal.privacy.sections.storage.body": "存储说明",
    "legal.privacy.sections.security.title": "6. 安全措施",
    "legal.privacy.sections.security.body": "安全说明",
    "legal.privacy.sections.internationalTransfers.title": "7. 跨境传输",
    "legal.privacy.sections.internationalTransfers.body": "跨境说明",
    "legal.privacy.sections.rights.title": "8. 您的权利与选择",
    "legal.privacy.sections.rights.body": "权利说明",
    "legal.privacy.sections.children.title": "9. 未成年人",
    "legal.privacy.sections.children.body": "未成年人说明",
    "legal.privacy.sections.changes.title": "10. 本政策的变更",
    "legal.privacy.sections.changes.body": "政策变更说明",
  },
  ja: {
    "landing.footer.links.home": "ホーム",
    "landing.footer.links.pricing": "料金",
    "landing.footer.links.history": "履歴",
    "landing.footer.links.privacy": "プライバシー",
    "landing.footer.links.terms": "利用規約",
    "landing.footer.description": "AIによる写真修復",
    "landing.footer.copyright": "Copyright",
    "legal.shared.lastUpdated": "最終更新",
    "legal.terms.eyebrow": "規約",
    "legal.terms.title": "利用規約",
    "legal.terms.description": "OldPhotoLive AI を利用する際のルールと条件です。",
    "legal.terms.intro": "規約説明",
    "legal.terms.contactTitle": "お問い合わせ",
    "legal.terms.contactBody": "法務または規約に関するお問い合わせは、以下のメールアドレスをご利用ください。",
    "legal.terms.relatedLink": "プライバシーポリシーを見る",
    "legal.terms.sections.serviceDescription.title": "1. サービス内容",
    "legal.terms.sections.serviceDescription.body": "サービス説明",
    "legal.terms.sections.accounts.title": "2. アカウントとアクセス",
    "legal.terms.sections.accounts.body": "アカウント説明",
    "legal.terms.sections.payments.title": "3. 支払い、クレジット、サブスクリプション",
    "legal.terms.sections.payments.body": "支払い説明",
    "legal.terms.sections.content.title": "4. ユーザーコンテンツ",
    "legal.terms.sections.content.body": "コンテンツ説明",
    "legal.terms.sections.prohibitedUse.title": "5. 禁止事項",
    "legal.terms.sections.prohibitedUse.body": "禁止事項説明",
    "legal.terms.sections.liability.title": "6. 責任の制限",
    "legal.terms.sections.liability.body": "責任説明",
  },
} as const;

function getTranslation(locale: keyof typeof translations, namespace: string, key: string) {
  const dictionary = translations[locale] as Record<string, string>;
  return dictionary[`${namespace}.${key}`] ?? key;
}

jest.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string) =>
      getTranslation(mockLocale as keyof typeof translations, namespace, key),
}));

jest.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    getTranslation(mockLocale as keyof typeof translations, namespace, key),
  getLocale: async () => mockLocale,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/Navbar", () => ({
  __esModule: true,
  default: () => <div data-testid="navbar">Navbar</div>,
}));

import FooterSection from "@/app/sections/FooterSection";
import PrivacyPolicyPage from "@/app/privacy/page";
import TermsOfServicePage from "@/app/terms/page";

describe("FooterSection", () => {
  it("renders localized privacy and terms links", () => {
    mockLocale = "zh";
    render(<FooterSection />);

    expect(screen.getByText("隐私政策").closest("a")).toHaveAttribute("href", "/privacy");
    expect(screen.getByText("服务条款").closest("a")).toHaveAttribute("href", "/terms");
  });
});

describe("legal pages", () => {
  it("renders privacy page with translated content and support email", async () => {
    mockLocale = "zh";
    render((await PrivacyPolicyPage()) as React.ReactElement);

    expect(screen.getByRole("heading", { name: "隐私政策" })).toBeInTheDocument();
    expect(screen.getByText("如果您对本政策或隐私请求有任何疑问，请使用下方邮箱联系我们。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看服务条款" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "support@oldphotoliveai.com" })).toHaveAttribute(
      "href",
      "mailto:support@oldphotoliveai.com"
    );
  });

  it("renders terms page with translated content and support email", async () => {
    mockLocale = "ja";
    render((await TermsOfServicePage()) as React.ReactElement);

    expect(screen.getByRole("heading", { name: "利用規約" })).toBeInTheDocument();
    expect(screen.getByText("法務または規約に関するお問い合わせは、以下のメールアドレスをご利用ください。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "プライバシーポリシーを見る" })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: "support@oldphotoliveai.com" })).toHaveAttribute(
      "href",
      "mailto:support@oldphotoliveai.com"
    );
  });

  it("renders an explicit NSFW prohibition on the terms page", async () => {
    mockLocale = "en";
    render((await TermsOfServicePage()) as React.ReactElement);

    expect(
      screen.getByRole("heading", {
        name: "4A. Content Safety and Moderation",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /You may not use OldPhotoLive AI to upload, generate, restore, animate, edit, transform, or distribute NSFW/
      )
    ).toBeInTheDocument();
  });
});
