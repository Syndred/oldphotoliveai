import type { Metadata } from "next";
import AdminPageView from "@/components/admin/AdminPageView";

export const metadata: Metadata = {
  title: "Admin Tools",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LocalizedAdminPage() {
  return <AdminPageView />;
}
