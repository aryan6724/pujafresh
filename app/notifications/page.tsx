"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  clearReadCustomerNotifications,
  CustomerNotification,
  deleteCustomerNotification,
  getCustomerNotifications,
  markAllCustomerNotificationsAsRead,
  markCustomerNotificationAsRead,
} from "@/utils/customerNotificationStorage";

const notificationTypeFilters = [
  "All",
  "Order",
  "Payment",
  "Delivery",
  "Support",
  "Loyalty",
  "Coupon",
  "Refund",
  "System",
];

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getNotificationBadgeClass = (type: string) => {
  if (type === "Delivery") return "bg-blue-50 text-blue-700";
  if (type === "Payment") return "bg-orange-50 text-orange-700";
  if (type === "Support") return "bg-purple-50 text-purple-700";
  if (type === "Loyalty") return "bg-green-50 text-green-700";
  if (type === "Coupon") return "bg-[#fff7ed] text-[#7a1e13]";
  if (type === "Refund") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-700";
};

export default function NotificationsPage() {
  const { user, isLoggedIn } = useAuth();

  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [readFilter, setReadFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const customerEmail = user?.email;
  const customerPhone = (user as any)?.phone;

  const loadNotifications = () => {
    if (!customerEmail && !customerPhone) {
      setNotifications([]);
      return;
    }

    setNotifications(getCustomerNotifications(customerEmail, customerPhone));
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("pujafresh-notifications-updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("pujafresh-notifications-updated", handleUpdate);
    };
  }, [customerEmail, customerPhone]);

  const filteredNotifications = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesType =
        typeFilter === "All" || notification.type === typeFilter;

      const matchesRead =
        readFilter === "All" ||
        (readFilter === "Unread" && !notification.isRead) ||
        (readFilter === "Read" && notification.isRead);

      const matchesSearch =
        search.length === 0 ||
        notification.title.toLowerCase().includes(search) ||
        notification.message.toLowerCase().includes(search) ||
        notification.orderId?.toLowerCase().includes(search);

      return matchesType && matchesRead && matchesSearch;
    });
  }, [notifications, readFilter, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.isRead)
        .length,
      order: notifications.filter((notification) => notification.type === "Order")
        .length,
      delivery: notifications.filter(
        (notification) => notification.type === "Delivery"
      ).length,
      support: notifications.filter(
        (notification) => notification.type === "Support"
      ).length,
    };
  }, [notifications]);

  const handleMarkAsRead = (notificationId: string) => {
    markCustomerNotificationAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    markAllCustomerNotificationsAsRead(customerEmail, customerPhone);
    loadNotifications();
    toast.success("All notifications marked as read");
  };

  const handleDelete = (notificationId: string) => {
    deleteCustomerNotification(notificationId);
    loadNotifications();
    toast.success("Notification deleted");
  };

  const handleClearRead = () => {
    clearReadCustomerNotifications(customerEmail, customerPhone);
    loadNotifications();
    toast.success("Read notifications cleared");
  };

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-gray-600">
              Please login to view your notifications.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Alerts
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            My Notifications
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Track order updates, payment verification, delivery alerts, support
            replies, coupon benefits and loyalty points in one place.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
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
            <p className="text-sm font-semibold text-gray-500">Support</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.support}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Notifications
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, message or order ID..."
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
                {notificationTypeFilters.map((type) => (
                  <option key={type}>{type}</option>
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
                <option>All</option>
                <option>Unread</option>
                <option>Read</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                  setReadFilter("All");
                }}
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
              onClick={handleClearRead}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Clear Read
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-black text-gray-900">
                No notifications found
              </h2>

              <p className="mt-2 text-gray-600">
                Order and delivery updates will appear here automatically.
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
                          className={`rounded-full px-3 py-1 text-xs font-black ${getNotificationBadgeClass(
                            notification.type
                          )}`}
                        >
                          {notification.type}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            notification.isRead
                              ? "bg-gray-100 text-gray-600"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {notification.isRead ? "Read" : "Unread"}
                        </span>

                        {notification.priority === "High" && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                            Important
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-black text-gray-900">
                        {notification.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {notification.message}
                      </p>

                      {notification.orderId && (
                        <p className="mt-2 text-xs font-bold text-gray-500">
                          Order ID: {notification.orderId}
                        </p>
                      )}

                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {notification.actionHref && (
                        <Link
                          href={notification.actionHref}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="rounded bg-[#7a1e13] px-4 py-2 text-xs font-bold text-white hover:bg-[#64180f]"
                        >
                          Open
                        </Link>
                      )}

                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="rounded border border-[#15803d] px-4 py-2 text-xs font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
                        >
                          Mark Read
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(notification.id)}
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
