import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AdminPanel from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Admin Tools",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <AdminPanel />
      </main>
    </div>
  );
}
