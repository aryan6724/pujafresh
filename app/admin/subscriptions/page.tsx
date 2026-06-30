"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  CustomerSubscription,
  getAllSubscriptions,
  saveAllSubscriptions,
  SubscriptionStatus,
  updateSubscriptionNextDelivery,
  updateSubscriptionStatus,
} from "@/utils/subscriptionStorage";

const statusFilters = [
  "All Status",
  "Pending Approval",
  "Active",
  "Paused",
  "Cancelled",
  "Completed",
];

const statusOptions: SubscriptionStatus[] = [
  "Pending Approval",
  "Active",
  "Paused",
  "Cancelled",
  "Completed",
];

const formatCurrency = (amount?: number) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadgeClass = (status: string) => {
  if (status === "Active") return "bg-green-50 text-green-700";
  if (status === "Pending Approval") return "bg-orange-50 text-orange-700";
  if (status === "Paused") return "bg-blue-50 text-blue-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Completed") return "bg-purple-50 text-purple-700";

  return "bg-gray-100 text-gray-700";
};

export default function AdminSubscriptionsPage() {
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadSubscriptions();
    setIsCheckingAuth(false);
  }, [router]);

  const loadSubscriptions = () => {
    setSubscriptions(getAllSubscriptions());
  };

  const filteredSubscriptions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      const matchesSearch =
        search.length === 0 ||
        subscription.id.toLowerCase().includes(search) ||
        subscription.customerName.toLowerCase().includes(search) ||
        subscription.customerEmail.toLowerCase().includes(search) ||
        subscription.customerPhone?.includes(search) ||
        subscription.items.some((item) => item.name.toLowerCase().includes(search)) ||
        subscription.pincode.includes(search);

      const matchesStatus =
        statusFilter === "All Status" || subscription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, subscriptions]);

  const stats = useMemo(() => {
    const active = subscriptions.filter(
      (subscription) => subscription.status === "Active"
    );
    const pending = subscriptions.filter(
      (subscription) => subscription.status === "Pending Approval"
    );

    return {
      total: subscriptions.length,
      active: active.length,
      pending: pending.length,
      paused: subscriptions.filter((subscription) => subscription.status === "Paused")
        .length,
      cancelled: subscriptions.filter(
        (subscription) => subscription.status === "Cancelled"
      ).length,
      activeValue: active.reduce(
        (sum, subscription) => sum + Number(subscription.totalPerDelivery || 0),
        0
      ),
    };
  }, [subscriptions]);

  const handleStatusChange = (
    subscriptionId: string,
    status: SubscriptionStatus
  ) => {
    updateSubscriptionStatus(
      subscriptionId,
      status,
      "Admin",
      `Admin changed subscription status to ${status}.`
    );
    loadSubscriptions();
    toast.success(`Subscription marked as ${status}`);
  };

  const handleNextDeliveryChange = (
    subscriptionId: string,
    nextDeliveryDate: string
  ) => {
    updateSubscriptionNextDelivery(subscriptionId, nextDeliveryDate, "Admin");
    loadSubscriptions();
    toast.success("Next delivery date updated");
  };

  const handleDelete = (subscriptionId: string) => {
    const confirmDelete = window.confirm("Delete this subscription record?");

    if (!confirmDelete) return;

    saveAllSubscriptions(
      subscriptions.filter((subscription) => subscription.id !== subscriptionId)
    );
    loadSubscriptions();
    toast.success("Subscription deleted");
  };

  const exportCsv = () => {
    if (filteredSubscriptions.length === 0) {
      toast.error("No subscriptions to export");
      return;
    }

    const headers = [
      "Subscription ID",
      "Customer",
      "Email",
      "Phone",
      "Products",
      "Frequency",
      "Status",
      "Next Delivery",
      "Slot",
      "Pincode",
      "Payment Mode",
      "Total Per Delivery",
      "Created At",
    ];

    const rows = filteredSubscriptions.map((subscription) => [
      subscription.id,
      subscription.customerName,
      subscription.customerEmail,
      subscription.customerPhone || "",
      subscription.items
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(" | "),
      subscription.frequency,
      subscription.status,
      subscription.nextDeliveryDate,
      subscription.preferredDeliverySlot,
      subscription.pincode,
      subscription.paymentMode,
      subscription.totalPerDelivery,
      formatDateTime(subscription.createdAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-subscriptions-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Subscriptions exported");
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
              Subscription Orders
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Approve, pause, cancel and manage repeat delivery subscriptions.
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
              onClick={loadSubscriptions}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={exportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">{stats.active}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">{stats.pending}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Paused</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">{stats.paused}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Cancelled</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">{stats.cancelled}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active Value</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {formatCurrency(stats.activeValue)}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Subscriptions
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search subscription ID, customer, product, pincode..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Status</label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {statusFilters.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All Status");
                }}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredSubscriptions.length} of {subscriptions.length} subscription
            {subscriptions.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredSubscriptions.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No subscriptions found
              </h2>

              <p className="mt-2 text-gray-600">
                Customer subscription requests will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                            subscription.status
                          )}`}
                        >
                          {subscription.status}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {subscription.frequency}
                        </span>

                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {subscription.paymentMode}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black text-gray-900">
                        {subscription.id}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        {subscription.customerName} • {subscription.customerEmail} •{" "}
                        {subscription.customerPhone || "No phone"}
                      </p>

                      <p className="mt-3 text-sm font-semibold text-gray-700">
                        {subscription.items
                          .map((item) => `${item.name} x ${item.quantity}`)
                          .join(", ")}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Address: {subscription.addressSummary} - {subscription.pincode}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Start: {formatDate(subscription.startDate)} • Next:{" "}
                        {formatDate(subscription.nextDeliveryDate)} • Slot:{" "}
                        {subscription.preferredDeliverySlot}
                      </p>

                      {subscription.notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          Notes: {subscription.notes}
                        </p>
                      )}
                    </div>

                    <div className="min-w-[220px] text-right">
                      <p className="text-2xl font-black text-[#7a1e13]">
                        {formatCurrency(subscription.totalPerDelivery)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        per delivery
                      </p>

                      <div className="mt-4 grid gap-2">
                        <select
                          value={subscription.status}
                          onChange={(event) =>
                            handleStatusChange(
                              subscription.id,
                              event.target.value as SubscriptionStatus
                            )
                          }
                          className="rounded border border-gray-300 px-3 py-2 text-sm font-bold outline-none focus:border-[#7a1e13]"
                        >
                          {statusOptions.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>

                        <input
                          type="date"
                          value={subscription.nextDeliveryDate}
                          onChange={(event) =>
                            handleNextDeliveryChange(
                              subscription.id,
                              event.target.value
                            )
                          }
                          className="rounded border border-gray-300 px-3 py-2 text-sm font-bold outline-none focus:border-[#7a1e13]"
                        />

                        <button
                          onClick={() => handleDelete(subscription.id)}
                          className="rounded border border-red-600 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {subscription.history.length > 0 && (
                    <details className="mt-4 rounded-lg bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gray-800">
                        Status History
                      </summary>

                      <div className="mt-3 grid gap-2">
                        {subscription.history.slice(0, 5).map((history, index) => (
                          <div
                            key={`${subscription.id}-${history.updatedAt}-${index}`}
                            className="rounded bg-white p-3 text-xs text-gray-600"
                          >
                            <p className="font-bold text-gray-900">
                              {history.status} by {history.updatedBy}
                            </p>
                            <p className="mt-1">{history.message}</p>
                            <p className="mt-1 text-gray-500">
                              {formatDateTime(history.updatedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
