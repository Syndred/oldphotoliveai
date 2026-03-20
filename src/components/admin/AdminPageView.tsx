import Navbar from "@/components/Navbar";
import AdminPanel from "@/components/admin/AdminPanel";

export default function AdminPageView() {
  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <AdminPanel />
      </main>
    </div>
  );
}
