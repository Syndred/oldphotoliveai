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
    lookupMode === "email" ? "owner@example.com" : "user-uuid";

  const quotaSummary = useMemo(() => {
    if (!snapshot) return [];

    return [
      `Tier quota: ${snapshot.quota.tier}`,
      `Free remaining: ${snapshot.quota.remaining}`,
      `Daily limit: ${snapshot.quota.dailyLimit ?? "--"}`,
      `Free reset: ${formatDate(snapshot.quota.resetAt)}`,
      `PAYG credits: ${snapshot.quota.credits}`,
      `Credits expire: ${formatDate(snapshot.quota.creditsExpireAt)}`,
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
          "Failed to load recent users"
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
          setError("ADMIN_API_KEY is not configured.");
          setAuthState("locked");
          return;
        }

        setAuthState(data.authenticated ? "ready" : "locked");
        if (data.authenticated) {
          try {
            await loadRecentUsers();
          } catch {
            if (isMounted) {
              setError("Failed to load recent users.");
            }
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Failed to initialize admin tools.");
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
        (!isAdminUserSnapshot(data) && data.error) || "Failed to refresh user"
      );
    }

    setSnapshot(data);
    await loadRecentUsers();
  }

  async function updateTierRequest(nextTier: UserTier) {
    if (!snapshot) {
      throw new Error("Load a user first.");
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
      throw new Error(data.error ?? "Failed to update tier");
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
        throw new Error(data.error ?? "Admin login failed");
      }

      setAuthState("ready");
      setAdminKey("");
      await loadRecentUsers();
      setSuccess("Admin tools unlocked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed");
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
      setSuccess("Admin tools locked.");
    } catch {
      setError("Failed to lock admin tools.");
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
        throw new Error("Please enter an email or user ID.");
      }

      const params = new URLSearchParams();
      params.set(lookupMode, trimmedValue);
      const res = await fetch(`/api/internal/admin/user?${params.toString()}`);
      const data = await parseJsonResponse<AdminUserSnapshot | ErrorResponse>(res);
      if (!res.ok || !isAdminUserSnapshot(data)) {
        throw new Error(
          (!isAdminUserSnapshot(data) && data.error) || "Failed to load user"
        );
      }

      setSnapshot(data);
      await loadRecentUsers();
      setSuccess(`Loaded ${data.user.email}`);
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : "Failed to load user");
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
          (!isAdminUserSnapshot(data) && data.error) || "Failed to load user"
        );
      }

      setSnapshot(data);
      setSuccess(`Loaded ${data.user.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
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
      setSuccess(`Tier updated to ${nextTier}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tier");
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
        throw new Error("Credits must be a positive integer.");
      }
      if (!Number.isInteger(days) || days <= 0) {
        throw new Error("Expiration days must be a positive integer.");
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
        throw new Error(data.error ?? "Failed to grant credits");
      }

      await refreshCurrentUser();
      setSuccess(`Granted ${credits} credits.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant credits");
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
        throw new Error(data.error ?? "Failed to reset free quota");
      }

      await refreshCurrentUser();
      setSuccess("Free quota reset to 1 daily use.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset free quota");
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
        throw new Error(data.error ?? "Failed to clear credits");
      }

      await refreshCurrentUser();
      setSuccess("PAYG credits cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear credits");
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
      setSuccess(
        "Simulated subscription cancellation by downgrading app access to free."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to simulate subscription cancellation"
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (authState === "checking") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-[var(--color-text-secondary)]">
        Loading admin tools...
      </div>
    );
  }

  if (authState === "locked") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Admin Tools
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Enter your admin key once to unlock user lookup and permission controls.
        </p>
        <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
              Admin key
            </span>
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="Paste ADMIN_API_KEY"
            />
          </label>
          <button
            type="submit"
            disabled={loadingAction !== null}
            className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-60"
          >
            {loadingAction === "login" ? "Unlocking..." : "Unlock Admin Tools"}
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
              Admin Tools
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Look up any user, inspect their quota and Stripe state, and switch
              access levels for testing. Recent task failures include admin-only
              internal error details for debugging.
            </p>
            {signedInEmail && (
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Signed in as {signedInEmail}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdminLogout}
            disabled={loadingAction !== null}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            {loadingAction === "logout" ? "Locking..." : "Lock Admin Tools"}
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
              Lookup mode
            </span>
            <select
              value={lookupMode}
              onChange={(event) => setLookupMode(event.target.value as LookupMode)}
              className="w-full rounded-xl border border-white/10 bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="email">Email</option>
              <option value="userId">User ID</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
              Value
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
              {loadingAction === "lookup" ? "Loading..." : "Load User"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Recent Users
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Quick access to recently active accounts for faster testing.
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
                    : "Failed to load recent users"
                );
              } finally {
                setLoadingAction(null);
              }
            }}
            disabled={loadingAction !== null}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            {loadingAction === "recent-users" ? "Refreshing..." : "Refresh List"}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recentUsers.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No recent users loaded yet.
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
                  {user.tier} | updated {formatDate(user.updatedAt)}
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
              User Snapshot
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-text-secondary)]">Name</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {snapshot.user.name}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">Email</dt>
                <dd className="break-all text-[var(--color-text-primary)]">
                  {snapshot.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">User ID</dt>
                <dd className="break-all font-mono text-[var(--color-text-primary)]">
                  {snapshot.user.id}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">Current tier</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {snapshot.user.tier}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">Created</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {formatDate(snapshot.user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-secondary)]">Updated</dt>
                <dd className="text-[var(--color-text-primary)]">
                  {formatDate(snapshot.user.updatedAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Quota
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
                <li>Customer ID: {snapshot.stripe.customerId ?? "--"}</li>
                <li>
                  Subscription status: {snapshot.stripe.subscriptionStatus ?? "--"}
                </li>
                <li>
                  Cancel at period end:{" "}
                  {snapshot.stripe.cancelAtPeriodEnd ? "Yes" : "No"}
                </li>
                <li>
                  Current period end:{" "}
                  {formatDate(snapshot.stripe.currentPeriodEnd)}
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Recent Tasks
              </h3>
              <div className="mt-3 space-y-3">
                {snapshot.recentTasks.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    No tasks found for this user yet.
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
                        <span>{task.status}</span>
                        <span>{task.priority}</span>
                        <span>{task.progress}%</span>
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                      {task.failureStage && (
                        <p className="mt-2 text-sm text-amber-300">
                          Failed during: {task.failureStage}
                        </p>
                      )}
                      {task.errorMessage && (
                        <p className="mt-2 text-sm text-[var(--color-text-primary)]">
                          User message: {task.errorMessage}
                        </p>
                      )}
                      {task.internalErrorMessage && (
                        <div className="mt-2">
                          <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                            Internal error
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
                Tier Controls
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
                        ? "Updating..."
                        : `Set ${tier}`}
                    </button>
                  )
                )}
              </div>
              <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                Setting a user to free will also reset free quota for testing.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Quick Test Actions
              </h2>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={handleSimulateCancellation}
                  disabled={loadingAction !== null}
                  className="rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-60"
                >
                  {loadingAction === "simulate-cancel"
                    ? "Simulating..."
                    : "Simulate Subscription Cancellation"}
                </button>
                <button
                  type="button"
                  onClick={handleResetFreeQuota}
                  disabled={loadingAction !== null}
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
                >
                  {loadingAction === "reset-free-quota"
                    ? "Resetting..."
                    : "Reset Free Quota"}
                </button>
                <button
                  type="button"
                  onClick={handleClearCredits}
                  disabled={loadingAction !== null}
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
                >
                  {loadingAction === "clear-credits"
                    ? "Clearing..."
                    : "Clear PAYG Credits"}
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                The cancellation shortcut is app-side only. It downgrades access to
                free without changing the real Stripe subscription.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                PAYG Credits
              </h2>
              <form onSubmit={handleGrantCredits} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                      Credits to grant
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
                      Expiration days
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
                  Switch tier to `pay_as_you_go` before granting credits
                </label>
                <button
                  type="submit"
                  disabled={loadingAction !== null}
                  className="w-full rounded-xl bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loadingAction === "credits" ? "Granting..." : "Grant Credits"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
