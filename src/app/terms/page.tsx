import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterSection from "@/app/sections/FooterSection";

const LAST_UPDATED = "March 4, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 shadow-xl sm:p-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Last updated: {LAST_UPDATED}
          </p>

          <section className="mt-8 space-y-4 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            <p>
              These Terms govern your access to and use of OldPhotoLive AI. By
              using the service, you agree to these terms.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              1. Service Description
            </h2>
            <p>
              OldPhotoLive AI provides AI-assisted photo restoration,
              colorization, and animation features. Service availability and
              output quality may vary.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              2. Accounts and Access
            </h2>
            <p>
              You are responsible for maintaining the security of your account.
              You must use the service in compliance with applicable laws and
              platform policies.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              3. Payments, Credits, and Subscriptions
            </h2>
            <p>
              Paid plans and credits are processed via Stripe. Credits may have
              expiration windows. Subscription renewals and payment failures are
              handled according to your selected plan.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              4. User Content
            </h2>
            <p>
              You retain rights to your uploads and generated outputs. You grant
              us a limited license to process content solely to provide the
              service.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              5. Prohibited Use
            </h2>
            <p>
              You may not use the service for illegal, infringing, abusive, or
              harmful activity, including attempts to bypass security, exploit
              quotas, or abuse payment workflows.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              6. Limitation of Liability
            </h2>
            <p>
              The service is provided on an &quot;as is&quot; basis. To the extent
              permitted by law, we disclaim warranties and limit liability for
              indirect or consequential damages.
            </p>

            <h2 className="pt-2 text-xl font-semibold text-[var(--color-text-primary)]">
              7. Contact
            </h2>
            <p>
              For legal or terms-related inquiries, contact{" "}
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
              href="/privacy"
              className="text-[var(--color-accent)] underline underline-offset-2"
            >
              View Privacy Policy
            </Link>
          </div>
        </article>
      </main>
      <FooterSection />
    </div>
  );
}
