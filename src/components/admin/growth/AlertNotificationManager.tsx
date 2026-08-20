"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCheck,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Smartphone,
  Tag
} from "lucide-react";
import { adminFetch } from "@/components/admin/adminFetch";
import { cn } from "@/lib/utils";

type AlertStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "PAUSED"
  | "MATCHED"
  | "UNSUBSCRIBED";
type AlertType = "PRICE_DROP" | "NEW_STOCK" | "BOTH";
type AlertChannel = "EMAIL" | "SMS" | "WHATSAPP";

type StockAlertItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  channel: AlertChannel;
  type: AlertType;
  status: AlertStatus;
  brand: string | null;
  model: string | null;
  fuelType: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  lastMatchedAt: string | null;
  verifiedAt: string | null;
  createdAt: string | null;
  car: { slug: string | null; label: string } | null;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  entityType: string | null;
  readAt: string | null;
  createdAt: string | null;
};

const alertStatuses: AlertStatus[] = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "PAUSED",
  "MATCHED",
  "UNSUBSCRIBED"
];
const controlClassName =
  "h-11 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  const text = asText(value).trim();
  return text || null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Never"
    : new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
}

function formatPrice(value: number | null) {
  return value === null
    ? null
    : new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
        maximumFractionDigits: 0
      }).format(value);
}

function normalizeAlert(value: unknown): StockAlertItem | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") return null;
  const car = asRecord(record.car);
  const status = alertStatuses.includes(record.status as AlertStatus)
    ? (record.status as AlertStatus)
    : "ACTIVE";
  const type = ["PRICE_DROP", "NEW_STOCK", "BOTH"].includes(asText(record.type))
    ? (record.type as AlertType)
    : "BOTH";
  const channel = ["EMAIL", "SMS", "WHATSAPP"].includes(asText(record.channel))
    ? (record.channel as AlertChannel)
    : "EMAIL";
  const carParts = car
    ? [car.year, car.brand, car.model].filter(
        (part) => typeof part === "string" || typeof part === "number"
      )
    : [];

  return {
    id: record.id,
    name: asText(record.name) || asText(record.email) || "Subscriber",
    email: asText(record.email),
    phone: nullableText(record.phone),
    channel,
    type,
    status,
    brand: nullableText(record.brand),
    model: nullableText(record.model),
    fuelType: nullableText(record.fuelType),
    minPrice: asNumber(record.minPrice),
    maxPrice: asNumber(record.maxPrice),
    lastMatchedAt: nullableText(record.lastMatchedAt),
    verifiedAt: nullableText(record.verifiedAt),
    createdAt: nullableText(record.createdAt),
    car:
      car
        ? {
            slug: nullableText(car.slug),
            label: carParts.length > 0 ? carParts.join(" ") : "Matched vehicle"
          }
        : null
  };
}

function normalizeNotification(value: unknown): NotificationItem | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") return null;
  return {
    id: record.id,
    type: asText(record.type, "SYSTEM"),
    title: asText(record.title, "Notification"),
    message: asText(record.message),
    actionUrl: nullableText(record.actionUrl),
    entityType: nullableText(record.entityType),
    readAt: nullableText(record.readAt),
    createdAt: nullableText(record.createdAt)
  };
}

function unwrapItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  return record && Array.isArray(record.items) ? record.items : [];
}

function statusClassName(status: AlertStatus) {
  if (status === "PENDING_VERIFICATION") return "bg-violet-100 text-violet-800";
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  if (status === "MATCHED") return "bg-blue-100 text-blue-800";
  if (status === "PAUSED") return "bg-amber-100 text-amber-900";
  return "bg-zinc-200 text-zinc-700";
}

export function AlertNotificationManager() {
  const [tab, setTab] = useState<"alerts" | "notifications">("alerts");
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState({ alerts: "", notifications: "" });
  const [statusFilter, setStatusFilter] = useState<"ALL" | AlertStatus>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [liveMessage, setLiveMessage] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadErrors({ alerts: "", notifications: "" });

    const [alertResult, notificationResult] = await Promise.allSettled([
      adminFetch<unknown>(
        "/api/admin/alerts?limit=100",
        { method: "GET" },
        "Stock alerts could not be loaded."
      ),
      adminFetch<unknown>(
        "/api/admin/notifications?limit=100",
        { method: "GET" },
        "Notifications could not be loaded."
      )
    ]);

    if (alertResult.status === "fulfilled") {
      setAlerts(
        unwrapItems(alertResult.value).flatMap((value) => {
          const alert = normalizeAlert(value);
          return alert ? [alert] : [];
        })
      );
    } else {
      setLoadErrors((current) => ({
        ...current,
        alerts:
          alertResult.reason instanceof Error
            ? alertResult.reason.message
            : "Stock alerts could not be loaded."
      }));
    }

    if (notificationResult.status === "fulfilled") {
      setNotifications(
        unwrapItems(notificationResult.value).flatMap((value) => {
          const notification = normalizeNotification(value);
          return notification ? [notification] : [];
        })
      );
    } else {
      setLoadErrors((current) => ({
        ...current,
        notifications:
          notificationResult.reason instanceof Error
            ? notificationResult.reason.message
            : "Notifications could not be loaded."
      }));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredAlerts = useMemo(
    () =>
      statusFilter === "ALL"
        ? alerts
        : alerts.filter((alert) => alert.status === statusFilter),
    [alerts, statusFilter]
  );
  const filteredNotifications = useMemo(
    () =>
      unreadOnly
        ? notifications.filter((notification) => !notification.readAt)
        : notifications,
    [notifications, unreadOnly]
  );
  const unreadCount = notifications.reduce(
    (count, notification) => count + (notification.readAt ? 0 : 1),
    0
  );

  function setPending(id: string, pending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function updateAlertStatus(alert: StockAlertItem, status: AlertStatus) {
    if (status === alert.status || pendingIds.has(alert.id)) return;
    setPending(alert.id, true);
    setItemErrors((current) => ({ ...current, [alert.id]: "" }));
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/alerts/${alert.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        },
        "Stock alert could not be updated."
      );
      const updated = normalizeAlert(payload);
      setAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? updated ?? { ...item, status } : item
        )
      );
      setLiveMessage(`${alert.name}'s alert is now ${titleCase(status)}.`);
    } catch (error) {
      setItemErrors((current) => ({
        ...current,
        [alert.id]: error instanceof Error ? error.message : "Alert update failed."
      }));
    } finally {
      setPending(alert.id, false);
    }
  }

  async function toggleRead(notification: NotificationItem) {
    if (pendingIds.has(notification.id)) return;
    const read = !notification.readAt;
    setPending(notification.id, true);
    setItemErrors((current) => ({ ...current, [notification.id]: "" }));
    try {
      const payload = await adminFetch<unknown>(
        `/api/admin/notifications/${notification.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read })
        },
        "Notification could not be updated."
      );
      const updated = normalizeNotification(payload);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? updated ?? { ...item, readAt: read ? new Date().toISOString() : null }
            : item
        )
      );
      setLiveMessage(`Notification marked ${read ? "read" : "unread"}.`);
    } catch (error) {
      setItemErrors((current) => ({
        ...current,
        [notification.id]:
          error instanceof Error ? error.message : "Notification update failed."
      }));
    } finally {
      setPending(notification.id, false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-ink">Alerts and notifications</h3>
          <p className="mt-1 text-sm text-ink/65">
            Manage customer subscriptions and sales activity updates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-b border-ink/10">
        <div role="tablist" aria-label="Alert workspace" className="flex gap-1">
          <button
            id="stock-alerts-tab"
            type="button"
            role="tab"
            aria-selected={tab === "alerts"}
            aria-controls="stock-alerts-panel"
            onClick={() => setTab("alerts")}
            className={cn(
              "min-h-11 border-b-2 px-3 text-sm font-black outline-none focus:ring-2 focus:ring-ink/20",
              tab === "alerts" ? "border-copper text-ink" : "border-transparent text-ink/55"
            )}
          >
            Stock alerts <span className="ml-1 text-xs">{alerts.length}</span>
          </button>
          <button
            id="notifications-tab"
            type="button"
            role="tab"
            aria-selected={tab === "notifications"}
            aria-controls="notifications-panel"
            onClick={() => setTab("notifications")}
            className={cn(
              "min-h-11 border-b-2 px-3 text-sm font-black outline-none focus:ring-2 focus:ring-ink/20",
              tab === "notifications" ? "border-copper text-ink" : "border-transparent text-ink/55"
            )}
          >
            Notifications
            {unreadCount > 0 ? (
              <span className="ml-2 rounded-full bg-copper px-2 py-0.5 text-[11px] text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">{liveMessage}</div>

      {tab === "alerts" ? (
        <section id="stock-alerts-panel" role="tabpanel" aria-labelledby="stock-alerts-tab" className="pt-4">
          <div className="flex justify-end">
            <label>
              <span className="sr-only">Filter stock alerts by status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | AlertStatus)} className={`${controlClassName} w-44`}>
                <option value="ALL">All statuses</option>
                {alertStatuses.map((status) => (
                  <option key={status} value={status}>{titleCase(status)}</option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <LoadingState label="Loading stock alerts" />
          ) : loadErrors.alerts ? (
            <ErrorState title="Stock alerts unavailable" message={loadErrors.alerts} onRetry={loadData} />
          ) : filteredAlerts.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {filteredAlerts.map((alert) => {
                const priceRange = [formatPrice(alert.minPrice), formatPrice(alert.maxPrice)]
                  .filter(Boolean)
                  .join(" – ");
                const availableStatuses =
                  alert.status === "UNSUBSCRIBED"
                    ? (["UNSUBSCRIBED"] as AlertStatus[])
                    : alert.verifiedAt
                      ? alertStatuses.filter((status) => status !== "PENDING_VERIFICATION")
                      : (["PENDING_VERIFICATION", "UNSUBSCRIBED"] as AlertStatus[]);
                return (
                  <article key={alert.id} aria-busy={pendingIds.has(alert.id)} className="rounded-md border border-ink/10 p-4 hover:border-ink/25">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-ink">{alert.name}</h4>
                          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black uppercase", statusClassName(alert.status))}>{titleCase(alert.status)}</span>
                          <span className="rounded-full bg-smoke px-2.5 py-1 text-[11px] font-black uppercase text-ink/65">{titleCase(alert.type)}</span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-ink/75">
                          {[alert.brand, alert.model, alert.fuelType ? titleCase(alert.fuelType) : null].filter(Boolean).join(" · ") || "Any matching vehicle"}
                        </p>
                        {priceRange ? <p className="mt-1 text-sm text-ink/60">Budget {priceRange}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink/55">
                          <span className="inline-flex items-center gap-1.5">
                            {alert.channel === "EMAIL" ? <Mail className="h-4 w-4" aria-hidden="true" /> : <Smartphone className="h-4 w-4" aria-hidden="true" />}
                            {titleCase(alert.channel)} · {alert.email || alert.phone}
                          </span>
                          <span>Last match: {formatDate(alert.lastMatchedAt)}</span>
                          <span>{alert.verifiedAt ? `Verified: ${formatDate(alert.verifiedAt)}` : "Email not verified"}</span>
                        </div>
                        {alert.car?.slug ? (
                          <Link href={`/cars/${alert.car.slug}`} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-bold text-copper outline-none hover:underline focus:ring-2 focus:ring-ink/20">
                            {alert.car.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : null}
                        {itemErrors[alert.id] ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{itemErrors[alert.id]}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingIds.has(alert.id) ? <Loader2 className="h-4 w-4 animate-spin text-ink/50" aria-label="Saving" /> : null}
                        <label>
                          <span className="sr-only">Status for {alert.name}&apos;s stock alert</span>
                          <select value={alert.status} disabled={pendingIds.has(alert.id)} onChange={(event) => void updateAlertStatus(alert, event.target.value as AlertStatus)} className={`${controlClassName} min-w-36`}>
                            {availableStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Tag className="h-8 w-8" aria-hidden="true" />} title="No stock alerts" message="Customer price-drop and new-stock subscriptions will appear here." />
          )}
        </section>
      ) : (
        <section id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab" className="pt-4">
          <div className="flex justify-end">
            <label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink/70">
              <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} className="h-4 w-4 rounded border-ink/20 text-ink focus:ring-ink/20" />
              Unread only
            </label>
          </div>
          {isLoading ? (
            <LoadingState label="Loading notifications" />
          ) : loadErrors.notifications ? (
            <ErrorState title="Notifications unavailable" message={loadErrors.notifications} onRetry={loadData} />
          ) : filteredNotifications.length > 0 ? (
            <div className="mt-3 divide-y divide-ink/10 overflow-hidden rounded-md border border-ink/10">
              {filteredNotifications.map((notification) => (
                <article key={notification.id} aria-busy={pendingIds.has(notification.id)} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-start", notification.readAt ? "bg-white" : "bg-champagne/10")}>
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", notification.readAt ? "bg-smoke text-ink/45" : "bg-copper text-white")}>
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-ink">{notification.title}</h4>
                      <span className="text-[11px] font-black uppercase tracking-wide text-ink/45">{titleCase(notification.type)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-ink/70">{notification.message}</p>
                    <p className="mt-1 text-xs font-semibold text-ink/45">{formatDate(notification.createdAt)}</p>
                    {itemErrors[notification.id] ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{itemErrors[notification.id]}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {notification.actionUrl ? (
                      <Link href={notification.actionUrl} className="inline-flex h-10 items-center gap-1.5 rounded-md border border-ink/15 px-3 text-sm font-bold text-ink outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20">
                        Open<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : null}
                    <button type="button" onClick={() => void toggleRead(notification)} disabled={pendingIds.has(notification.id)} className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-ink/70 outline-none hover:bg-smoke focus:ring-2 focus:ring-ink/20 disabled:opacity-50">
                      {pendingIds.has(notification.id) ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
                      Mark {notification.readAt ? "unread" : "read"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={<BellRing className="h-8 w-8" aria-hidden="true" />} title="No notifications" message={unreadOnly ? "Everything has been read." : "Sales activity notifications will appear here."} />
          )}
        </section>
      )}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div role="status" className="mt-3 grid min-h-64 place-items-center rounded-md border border-dashed border-ink/15 bg-smoke/30 text-center"><div><Loader2 className="mx-auto h-7 w-7 animate-spin text-copper" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-ink/60">{label}</p></div></div>;
}

function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <div role="alert" className="mt-3 grid min-h-64 place-items-center rounded-md border border-red-200 bg-red-50/50 px-5 text-center"><div><h4 className="font-black text-red-900">{title}</h4><p className="mt-1 text-sm text-red-800">{message}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-300"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button></div></div>;
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return <div className="mt-3 grid min-h-64 place-items-center rounded-md border border-dashed border-ink/20 bg-smoke/25 px-5 text-center"><div className="text-ink/30">{icon}<h4 className="mt-3 font-black text-ink">{title}</h4><p className="mt-1 text-sm text-ink/60">{message}</p></div></div>;
}
