"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { AdminUserSnapshot, User, UserTier } from "@/types";

type AuthState = "checking" | "locked" | "ready";
type LookupMode = "email" | "userId";

interface AdminSessionResponse {
  configured: boolean;
  authenticated: boolean;
}

interface ErrorResponse {
  error?: string;
}

interface RecentUsersResponse {
  users: User[];
}

function formatDate(value: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function isAdminUserSnapshot(
  value: AdminUserSnapshot | ErrorResponse
): value is AdminUserSnapshot {
  return (
    "user" in value &&
    "quota" in value &&
    "stripe" in value &&
    "recentTasks" in value &&
    Array.isArray(value.recentTasks)
  );
}

function isRecentUsersResponse(
  value: RecentUsersResponse | ErrorResponse
): value is RecentUsersResponse {
  return "users" in value && Array.isArray(value.users);
}

function formatTierLabel(tier: UserTier): string {
  switch (tier) {
    case "free":
      return "免费版";
    case "pay_as_you_go":
      return "按量付费";
    case "professional":
      return "专业版";
    default:
      return tier;
  }
}

function formatTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "待处理",
    queued: "排队中",
    processing: "处理中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };

  return labels[status] ?? status;
}

function formatTaskPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "低",
    normal: "普通",
    high: "高",
  };

  return labels[priority] ?? priority;
}

export default function AdminPanel() {
  const { data: session } = useSession();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [adminKey, setAdminKey] = useState("");
  const [lookupMode, setLookupMode] = useState<LookupMode>("email");
  const [lookupValue, setLookupValue] = useState("");
  const [snapshot, setSnapshot] = useState<AdminUserSnapshot | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [creditsToGrant, setCreditsToGrant] = useState("10");
  const [expirationDays, setExpirationDays] = useState("30");
  const [switchToPaygFirst, setSwitchToPaygFirst] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const signedInEmail =
    typeof session?.user?.email === "string" ? session.user.email : "";
  const currentTier = snapshot?.user.tier ?? null;
  const lookupPlaceholder =
    lookupMode === "email" ? "owner@example.com" : "输入用户 ID";

  const quotaSummary = useMemo(() => {
    if (!snapshot) return [];

    return [
      `套餐额度: ${formatTierLabel(snapshot.quota.tier)}`,
      `免费剩余额度: ${snapshot.quota.remaining}`,
      `每日上限: ${snapshot.quota.dailyLimit ?? "--"}`,
      `免费额度重置时间: ${formatDate(snapshot.quota.resetAt)}`,
      `按量付费积分: ${snapshot.quota.credits}`,
      `积分到期时间: ${formatDate(snapshot.quota.creditsExpireAt)}`,
    ];
  }, [snapshot]);

  useEffect(() => {
    if (!lookupValue && signedInEmail) {
      setLookupValue(signedInEmail);
    }
  }, [lookupValue, signedInEmail]);

  async function loadRecentUsers() {
    const res = await fetch("/api/internal/admin/users?limit=8");
    const data = await parseJsonResponse<RecentUsersResponse | ErrorResponse>(res);
    if (!res.ok || !isRecentUsersResponse(data)) {
      throw new Error(
        (!isRecentUsersResponse(data) && data.error) ||
          "加载最近用户失败"
      );
    }

    setRecentUsers(data.users);
  }

  useEffect(() => {
    let isMounted = true;

    fetch("/api/internal/admin/session")
      .then(parseJsonResponse<AdminSessionResponse>)
      .then(async (data) => {
        if (!isMounted) return;
        if (!data.configured) {
          setError("未配置 ADMIN_API_KEY。");
          setAuthState("locked");
          return;
        }

        setAuthState(data.authenticated ? "ready" : "locked");
        if (data.authenticated) {
          try {
            await loadRecentUsers();
          } catch {
            if (isMounted) {
              setError("加载最近用户失败。");
            }
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError("初始化管理面板失败。");
        setAuthState("locked");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshCurrentUser() {
    if (!snapshot) return;

    const params = new URLSearchParams();
    params.set("userId", snapshot.user.id);
    const res = await fetch(`/api/internal/admin/user?${params.toString()}`);
    const data = await parseJsonResponse<AdminUserSnapshot | ErrorResponse>(res);
    if (!res.ok || !isAdminUserSnapshot(data)) {
      throw new Error(
        (!isAdminUserSnapshot(data) && data.error) || "刷新用户数据失败"
      );
    }

    setSnapshot(data);
    await loadRecentUsers();
  }

  async function updateTierRequest(nextTier: UserTier) {
    if (!snapshot) {
      throw new Error("请先加载一个用户。");
    }

    const res = await fetch("/api/internal/admin/tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: snapshot.user.id,
        tier: nextTier,
      }),
    });
    const data = await parseJsonResponse<ErrorResponse>(res);
    if (!res.ok) {
      throw new Error(data.error ?? "更新套餐失败");
    }
  }

  async function handleAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("login");
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/internal/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await parseJsonResponse<ErrorResponse>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "管理员登录失败");
      }

      setAuthState("ready");
      setAdminKey("");
      await loadRecentUsers();
      setSuccess("管理面板已解锁。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "管理员登录失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAdminLogout() {
    setLoadingAction("logout");
    setError(null);
    setSuccess(null);

    try {
      await fetch("/api/internal/admin/session", { method: "DELETE" });
      setAuthState("locked");
      setSnapshot(null);
      setRecentUsers([]);
      setSuccess("管理面板已锁定。");
    } catch {
      setError("锁定管理面板失败。");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("lookup");
    setError(null);
    setSuccess(null);

    try {
      const trimmedValue = lookupValue.trim();
      if (!trimmedValue) {
        throw new Error("请输入邮箱或用户 ID。");
      }

      const params = new URLSearchParams();
      params.set(lookupMode, trimmedValue);
      const res = await fetch(`/api/internal/admin/user?${params.toString()}`);
      const data = await parseJsonResponse<AdminUserSnapshot | ErrorResponse>(res);
      if (!res.ok || !isAdminUserSnapshot(data)) {
        throw new Error(
          (!isAdminUserSnapshot(data) && data.error) || "加载用户失败"
        );
      }

      setSnapshot(data);
      await loadRecentUsers();
      setSuccess(`已加载用户：${data.user.email}`);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : "加载用户失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSelectRecentUser(user: User) {
    setLookupMode("userId");
    setLookupValue(user.id);
    setLoadingAction("lookup");
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      params.set("userId", user.id);
      const res = await fetch(`/api/internal/admin/user?${params.toString()}`);
      const data = await parseJsonResponse<AdminUserSnapshot | ErrorResponse>(res);
      if (!res.ok || !isAdminUserSnapshot(data)) {
        throw new Error(
          (!isAdminUserSnapshot(data) && data.error) || "加载用户失败"
        );
      }

      setSnapshot(data);
      setSuccess(`已加载用户：${data.user.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载用户失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleTierChange(nextTier: UserTier) {
    if (!snapshot) return;

    setLoadingAction(`tier:${nextTier}`);
    setError(null);
    setSuccess(null);

    try {
      await updateTierRequest(nextTier);
      await refreshCurrentUser();
      setSuccess(`套餐已更新为：${formatTierLabel(nextTier)}。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新套餐失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGrantCredits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;

    setLoadingAction("credits");
    setError(null);
    setSuccess(null);

    try {
      const credits = Number.parseInt(creditsToGrant, 10);
      const days = Number.parseInt(expirationDays, 10);

      if (!Number.isInteger(credits) || credits <= 0) {
        throw new Error("积分必须是正整数。");
      }
      if (!Number.isInteger(days) || days <= 0) {
        throw new Error("有效天数必须是正整数。");
      }

      if (switchToPaygFirst && snapshot.user.tier !== "pay_as_you_go") {
        await updateTierRequest("pay_as_you_go");
      }

      const res = await fetch("/api/internal/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: snapshot.user.id,
          credits,
          expirationDays: days,
        }),
      });
      const data = await parseJsonResponse<ErrorResponse>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "发放积分失败");
      }

      await refreshCurrentUser();
      setSuccess(`已发放 ${credits} 积分。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发放积分失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleResetFreeQuota() {
    if (!snapshot) return;

    setLoadingAction("reset-free-quota");
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/internal/admin/quota/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: snapshot.user.id }),
      });
      const data = await parseJsonResponse<ErrorResponse>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "重置免费额度失败");
      }

      await refreshCurrentUser();
      setSuccess("免费额度已重置为每日 1 次。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置免费额度失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleClearCredits() {
    if (!snapshot) return;

    setLoadingAction("clear-credits");
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/internal/admin/credits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: snapshot.user.id }),
      });
      const data = await parseJsonResponse<ErrorResponse>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "清空按量付费积分失败");
      }

      await refreshCurrentUser();
      setSuccess("按量付费积分已清空。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "清空按量付费积分失败");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSimulateCancellation() {
    if (!snapshot) return;

    setLoadingAction("simulate-cancel");
    setError(null);
    setSuccess(null);

    try {
      await updateTierRequest("free");
      await refreshCurrentUser();
      setSuccess("已模拟订阅取消，并将站内权限降级为免费版。");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "模拟订阅取消失败"
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (authState === "checking") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-[var(--color-text-secondary)]">
        正在加载管理面板...
      </div>
    );
  }

  if (authState === "locked") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          管理面板
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          输入管理员密钥后即可解锁用户查询与权限控制功能。
        </p>
        <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
              管理员密钥
            </span>
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="请输入 ADMIN_API_KEY"
            />
          </label>
          <button
            type="submit"
            disabled={loadingAction !== null}
            className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-60"
          >
            {loadingAction === "login" ? "解锁中..." : "解锁管理面板"}
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-400">{success}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              管理面板
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              这里可以查询任意用户、查看额度与 Stripe 状态，并在测试时切换权限层级。
              最近任务失败会展示仅管理员可见的内部报错，方便排查问题。
            </p>
            {signedInEmail && (
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                当前登录账号：{signedInEmail}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdminLogout}
            disabled={loadingAction !== null}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            {loadingAction === "logout" ? "锁定中..." : "锁定管理面板"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <form
          onSubmit={handleLookup}
          className="grid gap-4 md:grid-cols-[180px_1fr_auto]"
        >
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
              查询方式
            </span>
            <select
              value={lookupMode}
              onChange={(event) => setLookupMode(event.target.value as LookupMode)}
              className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="email">邮箱</option>
              <option value="userId">用户 ID</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
              查询值
            </span>
            <input
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder={lookupPlaceholder}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loadingAction !== null}
              className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-60 md:w-auto"
            >
              {loadingAction === "lookup" ? "加载中..." : "加载用户"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              最近用户
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              快速查看最近活跃账号，便于测试和排查。
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setLoadingAction("recent-users");
              setError(null);
              try {
                await loadRecentUsers();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "加载最近用户失败"
                );
              } finally {
                setLoadingAction(null);
              }
            }}
            disabled={loadingAction !== null}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            {loadingAction === "recent-users" ? "刷新中..." : "刷新列表"}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recentUsers.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              暂无最近用户数据。
            </p>
          ) : (
            recentUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectRecentUser(user)}
                disabled={loadingAction !== null}
                className="rounded-2xl border border-white/10 bg-[var(--color-primary-bg)]/70 px-4 py-4 text-left transition-colors hover:border-[var(--color-accent)]/40 disabled:opacity-60"
              >
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {user.name}
                </div>
                <div className="mt-1 break-all text-xs text-[var(--color-text-secondary)]">
                  {user.email}
                </div>
                <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
                  {formatTierLabel(user.tier)} | 更新于 {formatDate(user.updatedAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {(error || success) && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
        </section>
      )}

      {snapshot && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              用户概览
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-text-secondary)]">名称</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {snapshot.user.name}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">邮箱</dt>
                <dd className="break-all text-[var(--color-text-primary)]">
                  {snapshot.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">用户 ID</dt>
                <dd className="break-all font-mono text-[var(--color-text-primary)]">
                  {snapshot.user.id}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">当前套餐</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {formatTierLabel(snapshot.user.tier)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">创建时间</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {formatDate(snapshot.user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">更新时间</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {formatDate(snapshot.user.updatedAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                额度信息
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {quotaSummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Stripe
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li>客户 ID：{snapshot.stripe.customerId ?? "--"}</li>
                <li>
                  订阅状态：{snapshot.stripe.subscriptionStatus ?? "--"}
                </li>
                <li>
                  到期后取消：{snapshot.stripe.cancelAtPeriodEnd ? "是" : "否"}
                </li>
                <li>
                  当前周期结束时间：{formatDate(snapshot.stripe.currentPeriodEnd)}
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                最近任务
              </h3>
              <div className="mt-3 space-y-3">
                {snapshot.recentTasks.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    该用户暂时没有任务记录。
                  </p>
                ) : (
                  snapshot.recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/10 bg-[var(--color-primary-bg)]/70 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span className="font-mono text-[var(--color-text-primary)]">
                          {task.id}
                        </span>
                        <span>{formatTaskStatusLabel(task.status)}</span>
                        <span>{formatTaskPriorityLabel(task.priority)}</span>
                        <span>{task.progress}%</span>
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                      {task.failureStage && (
                        <p className="mt-2 text-sm text-amber-300">
                          失败阶段：{task.failureStage}
                        </p>
                      )}
                      {task.errorMessage && (
                        <p className="mt-2 text-sm text-[var(--color-text-primary)]">
                          用户可见错误：{task.errorMessage}
                        </p>
                      )}
                      {task.internalErrorMessage && (
                        <div className="mt-2">
                          <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                            内部错误
                          </p>
                          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-red-500/20 bg-red-500/5 p-3 font-mono text-xs text-red-300">
                            {task.internalErrorMessage}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                套餐控制
              </h2>
              <div className="mt-4 grid gap-3">
                {(["free", "pay_as_you_go", "professional"] as UserTier[]).map(
                  (tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleTierChange(tier)}
                      disabled={loadingAction !== null || currentTier === tier}
                      className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                        currentTier === tier
                          ? "bg-white/10 text-[var(--color-text-secondary)]"
                          : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
                      }`}
                    >
                      {loadingAction === `tier:${tier}`
                        ? "更新中..."
                        : `切换到${formatTierLabel(tier)}`}
                    </button>
                  )
                )}
              </div>
              <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                将用户切换到免费版时，也会同步重置免费额度，方便测试。
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                快速测试操作
              </h2>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={handleSimulateCancellation}
                  disabled={loadingAction !== null}
                  className="rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-60"
                >
                  {loadingAction === "simulate-cancel"
                    ? "模拟中..."
                    : "模拟订阅取消"}
                </button>
                <button
                  type="button"
                  onClick={handleResetFreeQuota}
                  disabled={loadingAction !== null}
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
                >
                  {loadingAction === "reset-free-quota"
                    ? "重置中..."
                    : "重置免费额度"}
                </button>
                <button
                  type="button"
                  onClick={handleClearCredits}
                  disabled={loadingAction !== null}
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
                >
                  {loadingAction === "clear-credits"
                    ? "清空中..."
                    : "清空按量付费积分"}
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                这个“模拟取消”只会修改站内权限，不会变更 Stripe 里的真实订阅状态。
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                按量付费积分
              </h2>
              <form onSubmit={handleGrantCredits} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                      发放积分数
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={creditsToGrant}
                      onChange={(event) => setCreditsToGrant(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                      有效天数
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={expirationDays}
                      onChange={(event) => setExpirationDays(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={switchToPaygFirst}
                    onChange={(event) => setSwitchToPaygFirst(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[var(--color-primary-bg)]"
                  />
                  发放积分前先切换到“按量付费”套餐
                </label>
                <button
                  type="submit"
                  disabled={loadingAction !== null}
                  className="w-full rounded-xl bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loadingAction === "credits" ? "发放中..." : "发放积分"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
