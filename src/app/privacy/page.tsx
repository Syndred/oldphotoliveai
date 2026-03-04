import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";

const LAST_UPDATED = "March 4, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 shadow-xl sm:p-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Last updated: {LAST_UPDATED}
          </p>

          <section className="mt-8 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            <p>
              This Privacy Policy explains how OldPhotoLive AI collects, uses,
              and protects your information when you use our website and
              services.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              1. Information We Collect
            </h2>
            <p>
              We may collect account information (such as your email and name
              from Google Sign-In), uploaded photos, generated outputs, payment
              transaction metadata from Stripe, and technical usage logs for
              reliability and abuse prevention.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              2. How We Use Information
            </h2>
            <p>
              We use collected information to provide photo processing services,
              manage subscriptions/credits, improve product quality, secure the
              platform, and provide support.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              3. Storage and Retention
            </h2>
            <p>
              Uploaded and generated media are stored in cloud object storage.
              Failed and expired items are periodically cleaned up. We retain
              billing records and minimal operational logs as required for
              service and compliance.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              4. Third-Party Services
            </h2>
            <p>
              We use third-party providers including Google (authentication),
              Stripe (payments), and cloud infrastructure providers (storage,
              queueing, and compute). Their handling of your data is governed by
              their own policies.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              5. Your Rights
            </h2>
            <p>
              You may request account-related support and data handling
              assistance. For legal requests, contact us using the support email
              listed below.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              6. Contact
            </h2>
            <p>
              Questions about this policy can be sent to{" "}
              <a
                className="text-[var(--color-accent)] underline underline-offset-2"
                href="mailto:support@oldphotoliveai.com"
              >
                support@oldphotoliveai.com
              </a>
              .
            </p>
          </section>

          <div className="mt-8 border-t border-[var(--color-border)] pt-5 text-sm">
            <Link
              href="/terms"
              className="text-[var(--color-accent)] underline underline-offset-2"
            >
              View Terms of Service
            </Link>
          </div>
        </article>
      </main>
      <FooterSection />
    </div>
  );
}
