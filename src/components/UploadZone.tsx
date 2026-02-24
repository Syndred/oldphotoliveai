"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validation";

interface UploadZoneProps {
  onUpload: (imageUrl: string) => void;
  disabled?: boolean;
}

type UploadState = "idle" | "dragging" | "uploading" | "error";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateClientFile(file: File, tErrors: (key: string) => string): string | null {
  if (
    !SUPPORTED_MIME_TYPES.includes(
      file.type as (typeof SUPPORTED_MIME_TYPES)[number]
    )
  ) {
    return tErrors("fileTypeNotSupported");
  }
  if (file.size > MAX_FILE_SIZE) {
    return tErrors("fileTooLarge");
  }
  return null;
}

export default function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("upload");
  const tErrors = useTranslations("errors");

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      // Client-side pre-validation
      const validationError = validateClientFile(file, tErrors);
      if (validationError) {
        setState("error");
        setErrorMsg(validationError);
        return;
      }

      setState("uploading");
      setProgress(0);
      setErrorMsg("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const url = await uploadWithProgress(formData, setProgress);
        setState("idle");
        setProgress(0);
        onUpload(url);
      } catch (err) {
        setState("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      }
    },
    [disabled, onUpload, tErrors]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setState("dragging");
    },
    [disabled]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => (s === "dragging" ? "idle" : s));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onBrowse = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const isUploading = state === "uploading";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload photo"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onBrowse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onBrowse();
      }}
      className={`
        relative flex flex-col items-center justify-center gap-4
        rounded-2xl border-2 border-dashed p-8 sm:p-12
        transition-all duration-300 ease-out cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50
        ${
          disabled
            ? "pointer-events-none opacity-50 border-white/10"
            : state === "dragging"
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 scale-[1.02]"
            : state === "error"
            ? "border-red-400/60 bg-red-400/5 hover:border-red-400/80"
            : "border-white/20 bg-white/5 hover:border-[var(--color-gradient-from)]/60 hover:bg-white/[0.07]"
        }
      `}
    >
      {/* Cloud upload icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-12 w-12 transition-transform duration-300 ${
          state === "dragging" ? "scale-110 text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
        />
      </svg>

      {isUploading ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("uploading", { progress })}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {t("dragDrop")}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              or{" "}
              <span className="text-[var(--color-accent)] underline underline-offset-2">
                {t("browse")}
              </span>
            </p>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t("supportedFormats")}
          </p>
        </>
      )}

      {state === "error" && errorMsg && (
        <p className="text-xs text-red-400" role="alert">
          {errorMsg}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
        disabled={disabled || isUploading}
        aria-hidden="true"
      />
    </div>
  );
}

// ── Upload helper with progress tracking ────────────────────────────────────

function uploadWithProgress(
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error. Please check your connection."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}
