"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  calculateNextDeliveryDate,
  CustomerSubscription,
  getAllSubscriptions,
  SubscriptionStatus,
  updateSubscriptionNextDelivery,
  updateSubscriptionStatus,
} from "@/utils/subscriptionStorage";

type CalendarFilter = "All Dates" | "Today" | "Tomorrow" | "Next 7 Days" | "Custom Date";

const dateFilters: CalendarFilter[] = [
  "All Dates",
  "Today",
  "Tomorrow",
  "Next 7 Days",
  "Custom Date",
];

const statusFilters = [
  "All Status",
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

const getTodayInputDate = () => {
  return new Date().toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const getDateOnlyTime = (dateString?: string) => {
  if (!dateString) return 0;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 0;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const isWithinCalendarFilter = (
  subscription: CustomerSubscription,
  dateFilter: CalendarFilter,
  customDate: string
) => {
  if (dateFilter === "All Dates") return true;

  const deliveryTime = getDateOnlyTime(subscription.nextDeliveryDate);
  const today = new Date();
  const todayTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  if (dateFilter === "Today") return deliveryTime === todayTime;

  if (dateFilter === "Tomorrow") {
    const tomorrowTime = getDateOnlyTime(addDays(today, 1).toISOString());
    return deliveryTime === tomorrowTime;
  }

  if (dateFilter === "Next 7 Days") {
    const sevenDaysTime = getDateOnlyTime(addDays(today, 7).toISOString());
    return deliveryTime >= todayTime && deliveryTime <= sevenDaysTime;
  }

  if (dateFilter === "Custom Date") {
    return deliveryTime === getDateOnlyTime(customDate);
  }

  return true;
};

const getStatusBadgeClass = (status: string) => {
  if (status === "Active") return "bg-green-50 text-green-700";
  if (status === "Pending Approval") return "bg-orange-50 text-orange-700";
  if (status === "Paused") return "bg-blue-50 text-blue-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Completed") return "bg-purple-50 text-purple-700";

  return "bg-gray-100 text-gray-700";
};

const getDeliveryUrgencyClass = (nextDeliveryDate: string) => {
  const todayTime = getDateOnlyTime(new Date().toISOString());
  const deliveryTime = getDateOnlyTime(nextDeliveryDate);

  if (deliveryTime < todayTime) return "border-red-200 bg-red-50/40";
  if (deliveryTime === todayTime) return "border-orange-200 bg-orange-50/40";

  return "border-gray-200 bg-white";
};

const getDeliveryUrgencyText = (nextDeliveryDate: string) => {
  const todayTime = getDateOnlyTime(new Date().toISOString());
  const deliveryTime = getDateOnlyTime(nextDeliveryDate);

  if (deliveryTime < todayTime) return "Overdue";
  if (deliveryTime === todayTime) return "Due Today";

  return "Upcoming";
};

export default function AdminSubscriptionCalendarPage() {
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<CalendarFilter>("Next 7 Days");
  const [customDate, setCustomDate] = useState(getTodayInputDate());
  const [statusFilter, setStatusFilter] = useState("Active");
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

    return subscriptions
      .filter((subscription) => {
        const matchesSearch =
          search.length === 0 ||
          subscription.id.toLowerCase().includes(search) ||
          subscription.customerName.toLowerCase().includes(search) ||
          subscription.customerEmail.toLowerCase().includes(search) ||
          subscription.customerPhone?.includes(search) ||
          subscription.items.some((item) => item.name.toLowerCase().includes(search)) ||
          subscription.pincode.includes(search) ||
          subscription.preferredDeliverySlot.toLowerCase().includes(search);

        const matchesStatus =
          statusFilter === "All Status" || subscription.status === statusFilter;

        const matchesDate = isWithinCalendarFilter(
          subscription,
          dateFilter,
          customDate
        );

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateDifference =
          getDateOnlyTime(a.nextDeliveryDate) - getDateOnlyTime(b.nextDeliveryDate);

        if (dateDifference !== 0) return dateDifference;

        return a.preferredDeliverySlot.localeCompare(b.preferredDeliverySlot);
      });
  }, [customDate, dateFilter, searchQuery, statusFilter, subscriptions]);

  const stats = useMemo(() => {
    const todayTime = getDateOnlyTime(new Date().toISOString());

    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "Active"
    );

    const dueToday = activeSubscriptions.filter(
      (subscription) => getDateOnlyTime(subscription.nextDeliveryDate) === todayTime
    );

    const overdue = activeSubscriptions.filter(
      (subscription) => getDateOnlyTime(subscription.nextDeliveryDate) < todayTime
    );

    const next7Days = activeSubscriptions.filter((subscription) =>
      isWithinCalendarFilter(subscription, "Next 7 Days", customDate)
    );

    return {
      total: subscriptions.length,
      active: activeSubscriptions.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      next7Days: next7Days.length,
      dueTodayValue: dueToday.reduce(
        (sum, subscription) => sum + Number(subscription.totalPerDelivery || 0),
        0
      ),
      filteredValue: filteredSubscriptions.reduce(
        (sum, subscription) => sum + Number(subscription.totalPerDelivery || 0),
        0
      ),
    };
  }, [customDate, filteredSubscriptions, subscriptions]);

  const handleAdvanceNextDelivery = (subscription: CustomerSubscription) => {
    const nextDeliveryDate = calculateNextDeliveryDate(
      subscription.nextDeliveryDate,
      subscription.frequency
    );

    updateSubscriptionNextDelivery(
      subscription.id,
      nextDeliveryDate,
      "Admin Calendar"
    );

    loadSubscriptions();
    toast.success(`Next delivery moved to ${formatDate(nextDeliveryDate)}`);
  };

  const handleMarkDeliveredAndAdvance = (subscription: CustomerSubscription) => {
    const nextDeliveryDate = calculateNextDeliveryDate(
      subscription.nextDeliveryDate,
      subscription.frequency
    );

    updateSubscriptionNextDelivery(
      subscription.id,
      nextDeliveryDate,
      "Admin Calendar"
    );

    loadSubscriptions();
    toast.success(
      `Delivery marked complete. Next delivery: ${formatDate(nextDeliveryDate)}`
    );
  };

  const handleStatusChange = (
    subscriptionId: string,
    status: SubscriptionStatus
  ) => {
    updateSubscriptionStatus(
      subscriptionId,
      status,
      "Admin Calendar",
      `Status updated from subscription calendar to ${status}.`
    );

    loadSubscriptions();
    toast.success(`Subscription marked as ${status}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("Next 7 Days");
    setStatusFilter("Active");
    setCustomDate(getTodayInputDate());
  };

  const exportCsv = () => {
    if (filteredSubscriptions.length === 0) {
      toast.error("No subscription deliveries to export");
      return;
    }

    const headers = [
      "Subscription ID",
      "Customer",
      "Email",
      "Phone",
      "Products",
      "Status",
      "Frequency",
      "Next Delivery",
      "Preferred Slot",
      "Pincode",
      "Address",
      "Payment Mode",
      "Amount",
    ];

    const rows = filteredSubscriptions.map((subscription) => [
      subscription.id,
      subscription.customerName,
      subscription.customerEmail,
      subscription.customerPhone || "",
      subscription.items
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(" | "),
      subscription.status,
      subscription.frequency,
      subscription.nextDeliveryDate,
      subscription.preferredDeliverySlot,
      subscription.pincode,
      subscription.addressSummary,
      subscription.paymentMode,
      subscription.totalPerDelivery,
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
    link.download = `pujafresh-subscription-calendar-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Subscription delivery calendar exported");
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
              Subscription Delivery Calendar
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Plan upcoming repeat deliveries, mark deliveries complete and
              move next delivery dates forward.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <Link
              href="/admin/subscriptions"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Subscriptions
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.active}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Due Today</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.dueToday}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Overdue</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.overdue}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Next 7 Days</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.next7Days}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Today Value</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {formatCurrency(stats.dueTodayValue)}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Filtered Value</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {formatCurrency(stats.filteredValue)}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_190px_180px_180px_120px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Deliveries
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search subscription, customer, product, pincode..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Date</label>

              <select
                value={dateFilter}
                onChange={(event) =>
                  setDateFilter(event.target.value as CalendarFilter)
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {dateFilters.map((filter) => (
                  <option key={filter}>{filter}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Custom Date
              </label>

              <input
                type="date"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
                disabled={dateFilter !== "Custom Date"}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13] disabled:bg-gray-100"
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
                onClick={clearFilters}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredSubscriptions.length} of {subscriptions.length} subscription
            deliver{subscriptions.length === 1 ? "y" : "ies"}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredSubscriptions.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No subscription deliveries found
              </h2>

              <p className="mt-2 text-gray-600">
                Try changing the date or status filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className={`rounded-xl border p-4 ${getDeliveryUrgencyClass(
                    subscription.nextDeliveryDate
                  )}`}
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
                          {getDeliveryUrgencyText(subscription.nextDeliveryDate)}
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
                        Next delivery: {formatDate(subscription.nextDeliveryDate)} •{" "}
                        Slot: {subscription.preferredDeliverySlot}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Address: {subscription.addressSummary} - {subscription.pincode}
                      </p>
                    </div>

                    <div className="min-w-[230px] text-right">
                      <p className="text-2xl font-black text-[#7a1e13]">
                        {formatCurrency(subscription.totalPerDelivery)}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        per delivery
                      </p>

                      <div className="mt-4 grid gap-2">
                        <button
                          onClick={() => handleMarkDeliveredAndAdvance(subscription)}
                          disabled={subscription.status !== "Active"}
                          className="rounded bg-[#15803d] px-4 py-2 text-xs font-bold text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          Delivered & Advance
                        </button>

                        <button
                          onClick={() => handleAdvanceNextDelivery(subscription)}
                          disabled={subscription.status !== "Active"}
                          className="rounded border border-blue-700 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-700 hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                        >
                          Skip / Move Next
                        </button>

                        {subscription.status === "Pending Approval" && (
                          <button
                            onClick={() =>
                              handleStatusChange(subscription.id, "Active")
                            }
                            className="rounded border border-green-700 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-700 hover:text-white"
                          >
                            Approve
                          </button>
                        )}

                        {subscription.status === "Active" && (
                          <button
                            onClick={() =>
                              handleStatusChange(subscription.id, "Paused")
                            }
                            className="rounded border border-orange-700 px-4 py-2 text-xs font-bold text-orange-700 hover:bg-orange-700 hover:text-white"
                          >
                            Pause
                          </button>
                        )}

                        {subscription.status === "Paused" && (
                          <button
                            onClick={() =>
                              handleStatusChange(subscription.id, "Active")
                            }
                            className="rounded border border-green-700 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-700 hover:text-white"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
