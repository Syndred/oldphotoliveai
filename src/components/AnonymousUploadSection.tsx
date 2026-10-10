"use client";
import UploadSection from "@/app/sections/UploadSection";
export default function AnonymousUploadSection({ analyticsSource = "no_login_page" }: { analyticsSource?: string }) {
  return <UploadSection workflow="animate" variant="embedded" showHeader={false} analyticsSource={analyticsSource} />;
}
