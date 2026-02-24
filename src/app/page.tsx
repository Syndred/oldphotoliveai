"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(imageUrl: string) {
    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to create task (${res.status})`);
      }

      const { taskId } = await res.json();
      router.push(`/result/${taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary-bg)]">
      <Navbar />

      <main className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm sm:p-10">
          {/* Title */}
          <h1 className="mb-2 bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text text-center text-3xl font-bold text-transparent sm:text-4xl">
            Restore Your Old Photos
          </h1>
          <p className="mb-8 text-center text-sm text-[var(--color-text-secondary)]">
            AI-powered restoration, colorization, and animation in one click
          </p>

          {/* Upload */}
          <UploadZone onUpload={handleUpload} disabled={isCreating} />

          {/* Creating task state */}
          {isCreating && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Creating task…
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
