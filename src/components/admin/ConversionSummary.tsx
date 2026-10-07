"use client";

import { useEffect, useState } from "react";

type MetricKey = "purchases" | "revenueMinorUsd" | "generationsCompleted" | "paidGenerationsCompleted" | "hdRemakesCompleted" | "previewsCompleted" | "singlePhotoPurchases" | "creditUnlocks" | "resultDownloadRequests" | "fulfillmentIssues";
type Counts = Record<MetricKey, number>;
interface ConversionResponse {
  timezone: "UTC";
  scope: "since_instrumentation";
  daily: Array<Counts & { date: string }>;
}
const metrics: Array<{ key: MetricKey; label: string }> = [
  { key: "purchases", label: "已履约付款订单" },
  { key: "revenueMinorUsd", label: "已履约收款（美元）" },
  { key: "generationsCompleted", label: "生成完成" },
  { key: "paidGenerationsCompleted", label: "付费生成完成" },
  { key: "hdRemakesCompleted", label: "高清重制完成" },
  { key: "previewsCompleted", label: "实验预览完成" },
  { key: "singlePhotoPurchases", label: "单张付款订单" },
  { key: "creditUnlocks", label: "积分解锁结果" },
  { key: "resultDownloadRequests", label: "已解锁结果下载请求" },
  { key: "fulfillmentIssues", label: "付款交付异常" },
];

function isConversionResponse(value: unknown): value is ConversionResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ConversionResponse>;
  return data.timezone === "UTC" && data.scope === "since_instrumentation" &&
    Array.isArray(data.daily) && data.daily.length > 0 && data.daily.every(day =>
      day && typeof day.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
      metrics.every(({ key }) => Number.isSafeInteger(day[key]) && day[key] >= 0)
    );
}

export default function ConversionSummary() {
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Counts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setTotals(null);
    setError(false);
    fetch("/api/internal/admin/conversions?days=14", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("CONVERSION_COUNTS_UNAVAILABLE");
        const data: unknown = await response.json();
        if (!isConversionResponse(data)) throw new Error("INVALID_CONVERSION_COUNTS");
        const summary: Counts = { purchases: 0, revenueMinorUsd: 0, generationsCompleted: 0, paidGenerationsCompleted: 0, hdRemakesCompleted: 0, previewsCompleted: 0, singlePhotoPurchases: 0, creditUnlocks: 0, resultDownloadRequests: 0, fulfillmentIssues: 0 };
        for (const day of data.daily) {
          for (const { key } of metrics) summary[key] += day[key];
        }
        if (!controller.signal.aborted) setTotals(summary);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  return (
    <section aria-labelledby="conversion-summary-title" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="conversion-summary-title" className="text-lg font-semibold text-[var(--color-text-primary)]">近 14 天付费与交付</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">从本次统计功能上线开始记录，按 UTC 自然日汇总，包含今天。</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="min-h-[44px] shrink-0 rounded-xl border border-white/15 px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60">
          {loading ? "加载中…" : "刷新统计"}
        </button>
      </div>
      {loading && <p role="status" className="mt-5 text-sm text-[var(--color-text-secondary)]">正在加载统计数据…</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-300">暂时无法加载统计数据，请点击刷新重试。</p>}
      {totals && (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(({ key, label }) => (
            <div key={key} className="min-w-0 rounded-2xl border border-white/10 bg-[var(--color-primary-bg)]/70 p-4">
              <dt className="text-sm leading-6 text-[var(--color-text-secondary)]">{label}</dt>
              <dd className="mt-3 break-words text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
                {key === "revenueMinorUsd"
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totals[key] / 100)
                  : totals[key].toLocaleString("zh-CN")}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-5 text-xs leading-6 text-[var(--color-text-secondary)]">金额未扣除退款，不含订阅续费或尚未履约的异常付款。付款交付异常需核对订单并人工处理。完成数按任务计数，并非独立用户数或付费转化率；高清重制包含在付费生成完成数内。实验预览、解锁和下载分别计数，下载按结果首次请求去重，不代表文件已完整传输。</p>
    </section>
  );
}
