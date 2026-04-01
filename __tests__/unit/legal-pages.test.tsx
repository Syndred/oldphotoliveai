/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockLocale = "en";

const translations = {
  en: {
    "landing.footer.description": "AI-powered photo restoration",
    "landing.footer.links.about": "About",
    "landing.footer.links.home": "Home",
    "landing.footer.links.guides": "Guides",
    "landing.footer.links.pricing": "Pricing",
    "landing.footer.links.history": "History",
    "landing.footer.links.privacy": "Privacy",
    "landing.footer.links.terms": "Terms",
    "landing.footer.copyright": "Copyright",
    "legal.shared.lastUpdated": "Last updated",
    "legal.about.eyebrow": "About",
    "legal.about.title": "About OldPhotoLive AI",
    "legal.about.description":
      "Learn who operates OldPhotoLive AI and how to contact the business.",
    "legal.about.intro": "About intro",
    "legal.about.operatorTitle": "Operator",
    "legal.about.operatorBody": "Operator body",
    "legal.about.contactTitle": "Business Contact",
    "legal.about.contactBody":
      "For business, customer support, or compliance inquiries, please use the official email below.",
    "legal.about.adsTitle": "Internal Advertising Operations",
    "legal.about.adsBody":
      "We use an internal-only Google Ads workflow for keyword research, campaign setup support, and performance reporting for OldPhotoLive AI. This workflow is not offered to third parties.",
    "legal.about.privacyLink": "View Privacy Policy",
    "legal.privacy.eyebrow": "Privacy",
    "legal.privacy.title": "Privacy Policy",
    "legal.privacy.description":
      "How OldPhotoLive AI collects, uses, and protects your information.",
    "legal.privacy.intro": "Privacy intro",
    "legal.privacy.contactTitle": "Contact",
    "legal.privacy.contactBody":
      "Questions about this policy or privacy requests can be sent to the email below.",
    "legal.privacy.relatedLink": "View Terms of Service",
    "legal.privacy.sections.informationCollected.title":
      "1. Information We Collect",
    "legal.privacy.sections.informationCollected.body": "Information body",
    "legal.privacy.sections.usage.title": "2. How We Use Information",
    "legal.privacy.sections.usage.body": "Usage body",
    "legal.privacy.sections.cookies.title":
      "3. Cookies, Local Storage, and Analytics",
    "legal.privacy.sections.cookies.body": "Cookies body",
    "legal.privacy.sections.sharing.title": "4. How We Share Information",
    "legal.privacy.sections.sharing.body": "Sharing body",
    "legal.privacy.sections.storage.title": "5. Storage and Retention",
    "legal.privacy.sections.storage.body": "Storage body",
    "legal.privacy.sections.security.title": "6. Security",
    "legal.privacy.sections.security.body": "Security body",
    "legal.privacy.sections.internationalTransfers.title":
      "7. International Transfers",
    "legal.privacy.sections.internationalTransfers.body": "Transfer body",
    "legal.privacy.sections.rights.title": "8. Your Rights and Choices",
    "legal.privacy.sections.rights.body": "Rights body",
    "legal.privacy.sections.children.title": "9. Children",
    "legal.privacy.sections.children.body": "Children body",
    "legal.privacy.sections.changes.title": "10. Changes to This Policy",
    "legal.privacy.sections.changes.body": "Changes body",
    "legal.terms.eyebrow": "Terms",
    "legal.terms.title": "Terms of Service",
    "legal.terms.description":
      "The rules and conditions for using OldPhotoLive AI.",
    "legal.terms.intro": "Terms intro",
    "legal.terms.contactTitle": "Contact",
    "legal.terms.contactBody":
      "For legal or terms-related inquiries, please use the email below.",
    "legal.terms.relatedLink": "View Privacy Policy",
    "legal.terms.sections.eligibility.title": "1. Eligibility",
    "legal.terms.sections.eligibility.body": "Eligibility body",
    "legal.terms.sections.serviceDescription.title": "2. Service Description",
    "legal.terms.sections.serviceDescription.body": "Service body",
    "legal.terms.sections.accounts.title": "3. Accounts and Access",
    "legal.terms.sections.accounts.body": "Accounts body",
    "legal.terms.sections.acceptableUse.title": "4. Acceptable Use",
    "legal.terms.sections.acceptableUse.body": "Acceptable use body",
    "legal.terms.sections.contentPermissions.title":
      "5. Uploaded Content and Permissions",
    "legal.terms.sections.contentPermissions.body": "Permissions body",
    "legal.terms.sections.aiOutputs.title": "6. AI Outputs",
    "legal.terms.sections.aiOutputs.body": "AI outputs body",
    "legal.terms.sections.payments.title":
      "7. Payments, Credits, and Subscriptions",
    "legal.terms.sections.payments.body": "Payments body",
    "legal.terms.sections.termination.title":
      "8. Suspension and Termination",
    "legal.terms.sections.termination.body": "Termination body",
    "legal.terms.sections.changes.title": "9. Service and Terms Changes",
    "legal.terms.sections.changes.body": "Terms changes body",
    "legal.terms.sections.disclaimers.title": "10. Disclaimers",
    "legal.terms.sections.disclaimers.body": "Disclaimers body",
    "legal.terms.sections.liability.title": "11. Limitation of Liability",
    "legal.terms.sections.liability.body": "Liability body",
  },
} as const;

function getTranslation(
  locale: keyof typeof translations,
  namespace: string,
  key: string
) {
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

jest.mock("@/components/Navbar", () => ({
  __esModule: true,
  default: () => <div data-testid="navbar">Navbar</div>,
}));

import FooterSection from "@/app/sections/FooterSection";
import AboutPage from "@/app/about/page";
import PrivacyPolicyPage from "@/app/privacy/page";
import TermsOfServicePage from "@/app/terms/page";
import {
  __resetI18nNavigationMocks,
  __setMockLocale,
} from "../helpers/i18n-navigation";

beforeEach(() => {
  __resetI18nNavigationMocks();
  mockLocale = "en";
  __setMockLocale("en");
});

describe("FooterSection", () => {
  it("renders locale-prefixed about, privacy, and terms links", () => {
    render(<FooterSection />);

    expect(screen.getByText("About").closest("a")).toHaveAttribute(
      "href",
      "/en/about"
    );
    expect(screen.getByText("Privacy").closest("a")).toHaveAttribute(
      "href",
      "/en/privacy"
    );
    expect(screen.getByText("Terms").closest("a")).toHaveAttribute(
      "href",
      "/en/terms"
    );
  });
});

describe("legal pages", () => {
  it("renders the about page with operator, support email, and business address", async () => {
    render((await AboutPage()) as React.ReactElement);

    expect(
      screen.getByRole("heading", { name: "About OldPhotoLive AI" })
    ).toBeInTheDocument();
    expect(screen.getByText("Syndred Young")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "support@oldphotoliveai.com" })
    ).toHaveAttribute("href", "mailto:support@oldphotoliveai.com");
    expect(
      screen.getByText(
        "Yifu Building, Area 45, Bao'an District, Shenzhen, Guangdong Province, China"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/internal-only Google Ads workflow/i)
    ).toBeInTheDocument();
  });

  it("renders the privacy page with translated content and support email", async () => {
    render((await PrivacyPolicyPage()) as React.ReactElement);

    expect(
      screen.getByRole("heading", { name: "Privacy Policy" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Questions about this policy or privacy requests can be sent to the email below."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Terms of Service" })
    ).toHaveAttribute("href", "/en/terms");
    expect(
      screen.getByRole("link", { name: "support@oldphotoliveai.com" })
    ).toHaveAttribute("href", "mailto:support@oldphotoliveai.com");
  });

  it("renders the terms page with translated content and support email", async () => {
    render((await TermsOfServicePage()) as React.ReactElement);

    expect(
      screen.getByRole("heading", { name: "Terms of Service" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "For legal or terms-related inquiries, please use the email below."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Privacy Policy" })
    ).toHaveAttribute("href", "/en/privacy");
    expect(
      screen.getByRole("link", { name: "support@oldphotoliveai.com" })
    ).toHaveAttribute("href", "mailto:support@oldphotoliveai.com");
  });

  it("renders an explicit NSFW prohibition on the terms page", async () => {
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
