"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  CustomerNotification,
  deleteCustomerNotification,
  getAllCustomerNotifications,
  saveAllCustomerNotifications,
} from "@/utils/customerNotificationStorage";

const typeFilters = [
  "All Types",
  "Order",
  "Payment",
  "Delivery",
  "Support",
  "Loyalty",
  "Coupon",
  "Refund",
  "System",
];

const priorityFilters = ["All Priority", "Low", "Normal", "High"];
const readFilters = ["All Status", "Unread", "Read"];

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTypeBadgeClass = (type: string) => {
  if (type === "Delivery") return "bg-blue-50 text-blue-700";
  if (type === "Payment") return "bg-orange-50 text-orange-700";
  if (type === "Support") return "bg-purple-50 text-purple-700";
  if (type === "Loyalty") return "bg-green-50 text-green-700";
  if (type === "Coupon") return "bg-[#fff7ed] text-[#7a1e13]";
  if (type === "Refund") return "bg-red-50 text-red-700";

  return "bg-gray-100 text-gray-700";
};

export default function AdminNotificationLogsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [readFilter, setReadFilter] = useState("All Status");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadNotifications();
    setIsCheckingAuth(false);
  }, [router]);

  const loadNotifications = () => {
    setNotifications(getAllCustomerNotifications());
  };

  const filteredNotifications = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        search.length === 0 ||
        notification.id.toLowerCase().includes(search) ||
        notification.title.toLowerCase().includes(search) ||
        notification.message.toLowerCase().includes(search) ||
        notification.customerEmail?.toLowerCase().includes(search) ||
        notification.customerPhone?.includes(search) ||
        notification.orderId?.toLowerCase().includes(search);

      const matchesType =
        typeFilter === "All Types" || notification.type === typeFilter;

      const matchesPriority =
        priorityFilter === "All Priority" ||
        notification.priority === priorityFilter;

      const matchesRead =
        readFilter === "All Status" ||
        (readFilter === "Unread" && !notification.isRead) ||
        (readFilter === "Read" && notification.isRead);

      return matchesSearch && matchesType && matchesPriority && matchesRead;
    });
  }, [notifications, priorityFilter, readFilter, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.isRead)
        .length,
      read: notifications.filter((notification) => notification.isRead).length,
      highPriority: notifications.filter(
        (notification) => notification.priority === "High"
      ).length,
      order: notifications.filter((notification) => notification.type === "Order")
        .length,
      delivery: notifications.filter(
        (notification) => notification.type === "Delivery"
      ).length,
      payment: notifications.filter(
        (notification) => notification.type === "Payment"
      ).length,
      support: notifications.filter(
        (notification) => notification.type === "Support"
      ).length,
    };
  }, [notifications]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("All Types");
    setPriorityFilter("All Priority");
    setReadFilter("All Status");
  };

  const handleDeleteNotification = (notificationId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmDelete) return;

    deleteCustomerNotification(notificationId);
    loadNotifications();
    toast.success("Notification deleted successfully");
  };

  const handleMarkAllRead = () => {
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));

    saveAllCustomerNotifications(updatedNotifications);
    loadNotifications();
    toast.success("All notifications marked as read");
  };

  const handleDeleteReadNotifications = () => {
    const confirmDelete = window.confirm(
      "Delete all read notifications permanently?"
    );

    if (!confirmDelete) return;

    const updatedNotifications = notifications.filter(
      (notification) => !notification.isRead
    );

    saveAllCustomerNotifications(updatedNotifications);
    loadNotifications();
    toast.success("Read notifications deleted");
  };

  const handleClearAllNotifications = () => {
    const confirmDelete = window.confirm(
      "Delete all customer notifications permanently?"
    );

    if (!confirmDelete) return;

    saveAllCustomerNotifications([]);
    loadNotifications();
    toast.success("All notifications cleared");
  };

  const handleExportCsv = () => {
    if (filteredNotifications.length === 0) {
      toast.error("No notifications to export");
      return;
    }

    const headers = [
      "Notification ID",
      "Customer Email",
      "Customer Phone",
      "Order ID",
      "Type",
      "Priority",
      "Title",
      "Message",
      "Action Link",
      "Read",
      "Created At",
    ];

    const rows = filteredNotifications.map((notification) => [
      notification.id,
      notification.customerEmail || "",
      notification.customerPhone || "",
      notification.orderId || "",
      notification.type,
      notification.priority,
      notification.title,
      notification.message,
      notification.actionHref || "",
      notification.isRead ? "Yes" : "No",
      formatDateTime(notification.createdAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-notification-logs-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Notification logs CSV exported");
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
              Notification Logs
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              View, filter, export and manage all customer notifications created
              by checkout, admin updates, delivery partner updates and broadcast
              messages.
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
              href="/admin/notification-broadcast"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Broadcast
            </Link>

            <button
              onClick={loadNotifications}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Unread</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.unread}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Read</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.read}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Important</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.highPriority}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Order</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.order}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivery</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.delivery}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Payment</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.payment}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Support</p>
            <h2 className="mt-2 text-3xl font-bold text-indigo-700">
              {stats.support}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_180px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Notifications
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search customer, order, title or message..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Type</label>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {typeFilters.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Priority
              </label>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {priorityFilters.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Status</label>

              <select
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {readFilters.map((status) => (
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

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleMarkAllRead}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Mark All Read
            </button>

            <button
              onClick={handleDeleteReadNotifications}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Delete Read
            </button>

            <button
              onClick={handleClearAllNotifications}
              className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Clear All
            </button>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredNotifications.length} of {notifications.length} notification
            {notifications.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No notifications found
              </h2>

              <p className="mt-2 text-gray-600">
                Customer notifications will appear here after checkout, status
                updates, delivery updates or broadcasts.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 ${
                    notification.isRead
                      ? "border-gray-200 bg-white"
                      : "border-[#f97316] bg-[#fff7ed]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeBadgeClass(
                            notification.type
                          )}`}
                        >
                          {notification.type}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            notification.priority === "High"
                              ? "bg-red-50 text-red-700"
                              : notification.priority === "Normal"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {notification.priority}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            notification.isRead
                              ? "bg-green-50 text-green-700"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {notification.isRead ? "Read" : "Unread"}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-gray-900">
                        {notification.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {notification.message}
                      </p>

                      <div className="mt-3 grid gap-2 text-xs font-semibold text-gray-500 md:grid-cols-3">
                        <p>Email: {notification.customerEmail || "N/A"}</p>
                        <p>Phone: {notification.customerPhone || "N/A"}</p>
                        <p>Order: {notification.orderId || "N/A"}</p>
                      </div>

                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        Created: {formatDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {notification.actionHref && (
                        <Link
                          href={notification.actionHref}
                          className="rounded bg-[#7a1e13] px-4 py-2 text-xs font-bold text-white hover:bg-[#64180f]"
                        >
                          Open
                        </Link>
                      )}

                      <button
                        onClick={() =>
                          handleDeleteNotification(notification.id)
                        }
                        className="rounded border border-red-600 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        Delete
                      </button>
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
