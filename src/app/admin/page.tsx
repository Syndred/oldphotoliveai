import type { Metadata } from "next";
import AdminPageView from "@/components/admin/AdminPageView";

export const metadata: Metadata = {
  title: "管理面板",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminPageView />;
}
