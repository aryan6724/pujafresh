"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type CheckStatus = "Done" | "Pending" | "Warning";

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  category:
    | "Core"
    | "Store"
    | "Products"
    | "Checkout"
    | "Payments"
    | "Delivery"
    | "Customer"
    | "Admin"
    | "SEO"
    | "Testing"
    | "Subscriptions";
  type: "Auto" | "Manual";
  status: CheckStatus;
  actionHref?: string;
  actionLabel?: string;
};

const MANUAL_CHECKLIST_STORAGE_KEY = "pujafresh-deployment-checklist";

const manualChecklistTemplate: ChecklistItem[] = [
  {
    id: "responsive-test",
    title: "Responsive design checked",
    description:
      "Test home, product, cart, checkout, admin and invoice pages on mobile and desktop.",
    category: "Testing",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "all-main-routes-open",
    title: "All important routes open without 404",
    description:
      "Open customer routes and admin routes once after final file replacement.",
    category: "Testing",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "checkout-flow-tested",
    title: "Full checkout flow tested",
    description:
      "Add product to cart, checkout, create order, verify order in admin.",
    category: "Checkout",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "delivery-flow-tested",
    title: "Delivery partner flow tested",
    description:
      "Assign partner, mark Out for Delivery, mark Delivered and verify Track Order.",
    category: "Delivery",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "invoice-tested",
    title: "Invoice print tested",
    description:
      "Open an invoice and check Print / Save as PDF layout.",
    category: "Payments",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "subscription-flow-tested",
    title: "Subscription flow tested",
    description:
      "Create subscription, approve it, open calendar and generate subscription order.",
    category: "Subscriptions",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "notification-flow-tested",
    title: "Notification flow tested",
    description:
      "Check order, payment, delivery and broadcast notifications on customer side.",
    category: "Customer",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "backup-downloaded",
    title: "Backup downloaded before demo",
    description:
      "Download JSON backup from Backup & Restore page before risky testing or presentation.",
    category: "Admin",
    type: "Manual",
    status: "Pending",
  },
  {
    id: "portfolio-screenshots-ready",
    title: "Portfolio screenshots captured",
    description:
      "Capture screenshots of home page, admin dashboard, checkout, delivery and invoice modules.",
    category: "Testing",
    type: "Manual",
    status: "Pending",
  },
];

const importantRoutes = [
  { label: "Home", href: "/" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout", href: "/checkout" },
  { label: "Orders", href: "/orders" },
  { label: "Track Order", href: "/track-order" },
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Notifications", href: "/notifications" },
  { label: "Invoice", href: "/invoice" },
  { label: "Support", href: "/support" },
  { label: "FAQ", href: "/faq" },
  { label: "Admin Dashboard", href: "/admin" },
  { label: "Products Admin", href: "/admin/products" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Invoices", href: "/admin/invoices" },
  { label: "Delivery Assignments", href: "/admin/delivery-assignments" },
  { label: "Delivery Partner Portal", href: "/delivery-partner" },
  { label: "Action Center", href: "/admin/action-center" },
  { label: "System Health", href: "/admin/system-health" },
  { label: "Admin Subscriptions", href: "/admin/subscriptions" },
  { label: "Subscription Calendar", href: "/admin/subscription-calendar" },
  { label: "Subscription Order Generator", href: "/admin/subscription-order-generator" },
  { label: "Backup & Restore", href: "/admin/backup" },
];

const readStorageValue = (key: string) => {
  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) return null;

    try {
      return JSON.parse(savedValue);
    } catch {
      return savedValue;
    }
  } catch {
    return null;
  }
};

const getCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return 1;
  if (typeof value === "string" && value.trim().length > 0) return 1;

  return 0;
};

const getManualChecklist = () => {
  try {
    const savedChecklist = localStorage.getItem(MANUAL_CHECKLIST_STORAGE_KEY);

    if (!savedChecklist) return manualChecklistTemplate;

    const parsedChecklist = JSON.parse(savedChecklist) as ChecklistItem[];

    if (!Array.isArray(parsedChecklist)) return manualChecklistTemplate;

    const savedMap = new Map(parsedChecklist.map((item) => [item.id, item]));

    return manualChecklistTemplate.map((item) => ({
      ...item,
      status: savedMap.get(item.id)?.status || item.status,
    }));
  } catch {
    return manualChecklistTemplate;
  }
};

const saveManualChecklist = (items: ChecklistItem[]) => {
  localStorage.setItem(MANUAL_CHECKLIST_STORAGE_KEY, JSON.stringify(items));
};

const getStatusBadgeClass = (status: CheckStatus) => {
  if (status === "Done") return "bg-green-50 text-green-700";
  if (status === "Warning") return "bg-orange-50 text-orange-700";

  return "bg-red-50 text-red-700";
};

const getCategoryBadgeClass = (category: string) => {
  if (category === "Delivery") return "bg-blue-50 text-blue-700";
  if (category === "Payments") return "bg-orange-50 text-orange-700";
  if (category === "Products") return "bg-purple-50 text-purple-700";
  if (category === "Customer") return "bg-green-50 text-green-700";
  if (category === "Admin") return "bg-indigo-50 text-indigo-700";
  if (category === "SEO") return "bg-pink-50 text-pink-700";
  if (category === "Subscriptions") return "bg-orange-50 text-orange-700";

  return "bg-gray-100 text-gray-700";
};

const buildAutoChecks = (): ChecklistItem[] => {
  const productCount = getCount(readStorageValue("pujafresh-products"));
  const orderCount = getCount(readStorageValue("pujafresh-orders"));
  const storeSettingsCount = getCount(readStorageValue("pujafresh-store-settings"));
  const deliveryAreasCount = getCount(readStorageValue("pujafresh-delivery-areas"));
  const deliverySlotsCount = getCount(readStorageValue("pujafresh-delivery-slots"));
  const deliveryPartnersCount = getCount(
    readStorageValue("pujafresh-delivery-partners")
  );
  const notificationsCount = getCount(
    readStorageValue("pujafresh-customer-notifications")
  );
  const couponsCount = getCount(readStorageValue("pujafresh-coupons"));
  const supportCount = getCount(readStorageValue("pujafresh-support-tickets"));
  const subscriptionCount = getCount(readStorageValue("pujafresh-subscriptions"));
  const backupRelevantModules = [
    productCount,
    orderCount,
    storeSettingsCount,
    deliveryAreasCount,
    deliverySlotsCount,
    deliveryPartnersCount,
    subscriptionCount,
  ].filter((count) => count > 0).length;

  return [
    {
      id: "auto-products",
      title: "Product catalog available",
      description: `${productCount} product record(s) found. Add products before demo if this is empty.`,
      category: "Products",
      type: "Auto",
      status: productCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/products",
      actionLabel: "Manage Products",
    },
    {
      id: "auto-store-settings",
      title: "Store settings configured",
      description:
        storeSettingsCount > 0
          ? "Store settings are available."
          : "Store settings are missing. Open Store Settings once and save details.",
      category: "Store",
      type: "Auto",
      status: storeSettingsCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/store-settings",
      actionLabel: "Store Settings",
    },
    {
      id: "auto-orders",
      title: "Orders available for demo",
      description: `${orderCount} order record(s) found. Use Demo Data Seeder if you need sample orders.`,
      category: "Checkout",
      type: "Auto",
      status: orderCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/demo-data",
      actionLabel: "Seed Demo Data",
    },
    {
      id: "auto-delivery-areas",
      title: "Delivery areas available",
      description: `${deliveryAreasCount} delivery area record(s) found.`,
      category: "Delivery",
      type: "Auto",
      status: deliveryAreasCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/delivery-areas",
      actionLabel: "Delivery Areas",
    },
    {
      id: "auto-delivery-slots",
      title: "Delivery slots available",
      description: `${deliverySlotsCount} delivery slot record(s) found.`,
      category: "Delivery",
      type: "Auto",
      status: deliverySlotsCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/delivery-slots",
      actionLabel: "Delivery Slots",
    },
    {
      id: "auto-delivery-partners",
      title: "Delivery partners available",
      description: `${deliveryPartnersCount} delivery partner record(s) found.`,
      category: "Delivery",
      type: "Auto",
      status: deliveryPartnersCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/delivery-partners",
      actionLabel: "Delivery Partners",
    },
    {
      id: "auto-notifications",
      title: "Notification system has data",
      description: `${notificationsCount} customer notification record(s) found.`,
      category: "Customer",
      type: "Auto",
      status: notificationsCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/notification-logs",
      actionLabel: "Notification Logs",
    },
    {
      id: "auto-coupons",
      title: "Marketing coupons checked",
      description: `${couponsCount} coupon record(s) found. Coupons are optional but useful for demo.`,
      category: "Store",
      type: "Auto",
      status: couponsCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/coupons",
      actionLabel: "Coupons",
    },
    {
      id: "auto-support",
      title: "Support module checked",
      description: `${supportCount} support ticket record(s) found. This can be empty if not used.`,
      category: "Customer",
      type: "Auto",
      status: supportCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/support",
      actionLabel: "Support",
    },
    {
      id: "auto-subscriptions",
      title: "Subscription module checked",
      description: `${subscriptionCount} subscription record(s) found. Create at least one subscription for repeat delivery demo.`,
      category: "Subscriptions",
      type: "Auto",
      status: subscriptionCount > 0 ? "Done" : "Warning",
      actionHref: "/admin/subscriptions",
      actionLabel: "Subscriptions",
    },
    {
      id: "auto-core-data",
      title: "Core demo data readiness",
      description: `${backupRelevantModules}/7 core localStorage modules have data.`,
      category: "Core",
      type: "Auto",
      status: backupRelevantModules >= 6 ? "Done" : "Warning",
      actionHref: "/admin/system-health",
      actionLabel: "System Health",
    },
  ];
};

export default function AdminDeploymentChecklistPage() {
  const router = useRouter();

  const [autoChecks, setAutoChecks] = useState<ChecklistItem[]>([]);
  const [manualChecks, setManualChecks] = useState<ChecklistItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    runChecks();
    setManualChecks(getManualChecklist());
    setIsCheckingAuth(false);
  }, [router]);

  const allChecks = useMemo(() => {
    return [...autoChecks, ...manualChecks];
  }, [autoChecks, manualChecks]);

  const categories = useMemo(() => {
    return [
      "All Categories",
      ...Array.from(new Set(allChecks.map((item) => item.category))),
    ];
  }, [allChecks]);

  const filteredChecks = useMemo(() => {
    return allChecks.filter((item) => {
      const matchesCategory =
        categoryFilter === "All Categories" || item.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All Status" || item.status === statusFilter;

      return matchesCategory && matchesStatus;
    });
  }, [allChecks, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const done = allChecks.filter((item) => item.status === "Done").length;
    const warning = allChecks.filter((item) => item.status === "Warning").length;
    const pending = allChecks.filter((item) => item.status === "Pending").length;
    const progress =
      allChecks.length === 0
        ? 0
        : Math.round((done / allChecks.length) * 100);

    return {
      total: allChecks.length,
      done,
      warning,
      pending,
      progress,
      auto: autoChecks.length,
      manual: manualChecks.length,
    };
  }, [allChecks, autoChecks.length, manualChecks.length]);

  const runChecks = () => {
    setAutoChecks(buildAutoChecks());
  };

  const toggleManualCheck = (id: string) => {
    const updatedChecks = manualChecks.map((item) =>
      item.id === id
        ? {
            ...item,
            status: item.status === "Done" ? ("Pending" as CheckStatus) : "Done",
          }
        : item
    );

    setManualChecks(updatedChecks);
    saveManualChecklist(updatedChecks);
  };

  const resetManualChecklist = () => {
    const confirmReset = window.confirm("Reset all manual checklist items?");

    if (!confirmReset) return;

    setManualChecks(manualChecklistTemplate);
    saveManualChecklist(manualChecklistTemplate);
    toast.success("Manual checklist reset");
  };

  const markAllManualDone = () => {
    const updatedChecks = manualChecks.map((item) => ({
      ...item,
      status: "Done" as CheckStatus,
    }));

    setManualChecks(updatedChecks);
    saveManualChecklist(updatedChecks);
    toast.success("All manual checks marked as done");
  };

  const clearFilters = () => {
    setCategoryFilter("All Categories");
    setStatusFilter("All Status");
  };

  const exportJson = () => {
    const payload = {
      appName: "PujaFresh",
      reportName: "Deployment Readiness Checklist",
      generatedAt: new Date().toISOString(),
      stats,
      checks: allChecks,
      importantRoutes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-deployment-checklist-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Deployment checklist exported");
  };

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Checking admin access...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Deployment Checklist
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Final readiness checklist before demo, portfolio screenshots or
              Vercel deployment preparation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <button
              onClick={runChecks}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Run Auto Checks
            </button>

            <button
              onClick={exportJson}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-100">
            Readiness Score
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-6xl font-black">{stats.progress}%</h2>

              <p className="mt-2 text-orange-50">
                {stats.done} done, {stats.warning} warning, {stats.pending} pending
              </p>
            </div>

            <div className="w-full max-w-xl">
              <div className="h-4 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              <p className="mt-2 text-sm text-orange-50">
                Complete all manual checks and fix warnings before final demo.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Done</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.done}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Warning</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.warning}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.pending}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Auto</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.auto}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Manual</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.manual}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_300px]">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Final Checklist
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Auto checks are based on localStorage data. Manual checks are
                saved in your browser.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Category
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Status</label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Status</option>
                <option>Done</option>
                <option>Warning</option>
                <option>Pending</option>
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <button
                onClick={clearFilters}
                className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>

              <button
                onClick={markAllManualDone}
                className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
              >
                Manual Done
              </button>

              <button
                onClick={resetManualChecklist}
                className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredChecks.length} of {allChecks.length} checklist item
            {allChecks.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredChecks.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${
                item.status === "Done"
                  ? "border-green-200 bg-green-50/30"
                  : item.status === "Warning"
                  ? "border-orange-200 bg-orange-50/30"
                  : "border-red-200 bg-red-50/30"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                      {item.type}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-black text-gray-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {item.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.type === "Manual" && (
                    <button
                      onClick={() => toggleManualCheck(item.id)}
                      className={`rounded px-5 py-3 text-sm font-bold ${
                        item.status === "Done"
                          ? "bg-gray-900 text-white hover:bg-gray-700"
                          : "bg-[#15803d] text-white hover:bg-[#166534]"
                      }`}
                    >
                      {item.status === "Done" ? "Mark Pending" : "Mark Done"}
                    </button>
                  )}

                  {item.actionHref && (
                    <Link
                      href={item.actionHref}
                      className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                    >
                      {item.actionLabel || "Open"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Important Routes to Test
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {importantRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
              >
                {route.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
