"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  CustomerNotification,
  getCustomerNotifications,
} from "@/utils/customerNotificationStorage";

type OrderItem = {
  id?: number | string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
};

type Order = {
  id: string;
  customerEmail?: string;
  customerName?: string;
  customer?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    landmark?: string;
    pincode?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      id?: string;
      label?: string;
    };
    paymentMethod?: string;
  };
  items?: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total?: number;
  paymentStatus?: string;
  paymentReference?: string;
  status?: string;
  createdAt?: string;
  deliveredAt?: string;
};

type LoyaltyLog = {
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderTotal?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  redemptionAmount?: number;
  createdAt?: string;
};

type SupportTicket = {
  id?: string;
  subject?: string;
  customerName?: string;
  customerEmail?: string;
  email?: string;
  customerPhone?: string;
  phone?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LOYALTY_STORAGE_KEY = "pujafresh-loyalty-points";
const SUPPORT_STORAGE_KEY = "pujafresh-support-tickets";

const orderStatusFilters = [
  "All Orders",
  "Pending",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Delivery Failed",
  "Cancelled",
];

const readJsonArray = <T,>(key: string): T[] => {
  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue) as T[];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const normalizeEmail = (email?: string) => {
  return email?.trim().toLowerCase() || "";
};

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

const formatCurrency = (amount?: number) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
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

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getOrderCustomerEmail = (order: Order) => {
  return normalizeEmail(order.customerEmail || order.customer?.email);
};

const getOrderCustomerPhone = (order: Order) => {
  return normalizePhone(order.customer?.phone);
};

const getTicketEmail = (ticket: SupportTicket) => {
  return normalizeEmail(ticket.customerEmail || ticket.email);
};

const getTicketPhone = (ticket: SupportTicket) => {
  return normalizePhone(ticket.customerPhone || ticket.phone);
};

const getStatusBadgeClass = (status?: string) => {
  if (status === "Delivered") return "bg-green-50 text-green-700";
  if (status === "Out for Delivery") return "bg-blue-50 text-blue-700";
  if (status === "Cancelled" || status === "Delivery Failed") {
    return "bg-red-50 text-red-700";
  }
  if (status === "Pending") return "bg-orange-50 text-orange-700";

  return "bg-gray-100 text-gray-700";
};

const getPaymentBadgeClass = (status?: string) => {
  if (status === "Payment Received") return "bg-green-50 text-green-700";
  if (status === "Verification Pending") return "bg-orange-50 text-orange-700";
  if (status === "Payment Failed") return "bg-red-50 text-red-700";
  if (status === "Refunded") return "bg-purple-50 text-purple-700";

  return "bg-gray-100 text-gray-700";
};

export default function ProfilePage() {
  const { user, isLoggedIn } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loyaltyLogs, setLoyaltyLogs] = useState<LoyaltyLog[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState("All Orders");

  const customerEmail = normalizeEmail(user?.email);
  const customerPhone = normalizePhone((user as any)?.phone);

  const loadCustomerData = () => {
    if (!customerEmail && !customerPhone) {
      setOrders([]);
      setLoyaltyLogs([]);
      setNotifications([]);
      setSupportTickets([]);
      return;
    }

    const allOrders = readJsonArray<Order>(ORDERS_STORAGE_KEY);
    const matchedOrders = allOrders.filter((order) => {
      const orderEmail = getOrderCustomerEmail(order);
      const orderPhone = getOrderCustomerPhone(order);

      if (customerEmail && orderEmail && customerEmail === orderEmail) return true;
      if (customerPhone && orderPhone && customerPhone === orderPhone) return true;

      return false;
    });

    const allLoyaltyLogs = readJsonArray<LoyaltyLog>(LOYALTY_STORAGE_KEY);
    const matchedLoyaltyLogs = allLoyaltyLogs.filter((log) => {
      const logEmail = normalizeEmail(log.customerEmail);
      const logPhone = normalizePhone(log.customerPhone);

      if (customerEmail && logEmail && customerEmail === logEmail) return true;
      if (customerPhone && logPhone && customerPhone === logPhone) return true;

      return false;
    });

    const allSupportTickets = readJsonArray<SupportTicket>(SUPPORT_STORAGE_KEY);
    const matchedTickets = allSupportTickets.filter((ticket) => {
      const ticketEmail = getTicketEmail(ticket);
      const ticketPhone = getTicketPhone(ticket);

      if (customerEmail && ticketEmail && customerEmail === ticketEmail) return true;
      if (customerPhone && ticketPhone && customerPhone === ticketPhone) return true;

      return false;
    });

    setOrders(
      matchedOrders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    );
    setLoyaltyLogs(
      matchedLoyaltyLogs.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    );
    setNotifications(getCustomerNotifications(customerEmail, customerPhone));
    setSupportTickets(
      matchedTickets.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
    );
  };

  useEffect(() => {
    loadCustomerData();

    const handleStorageUpdate = () => {
      loadCustomerData();
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener(
      "pujafresh-notifications-updated",
      handleStorageUpdate
    );

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener(
        "pujafresh-notifications-updated",
        handleStorageUpdate
      );
    };
  }, [customerEmail, customerPhone]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return statusFilter === "All Orders" || order.status === statusFilter;
    });
  }, [orders, statusFilter]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => {
      if (order.status === "Cancelled") return sum;
      return sum + Number(order.total || 0);
    }, 0);

    const deliveredOrders = orders.filter((order) => order.status === "Delivered");
    const activeOrders = orders.filter((order) =>
      ["Pending", "Confirmed", "Packed", "Out for Delivery"].includes(
        order.status || ""
      )
    );

    const pointsEarned = loyaltyLogs.reduce(
      (sum, log) => sum + Number(log.pointsEarned || 0),
      0
    );
    const pointsRedeemed = loyaltyLogs.reduce(
      (sum, log) => sum + Number(log.pointsRedeemed || 0),
      0
    );

    return {
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      deliveredOrders: deliveredOrders.length,
      totalSpent,
      loyaltyBalance: Math.max(pointsEarned - pointsRedeemed, 0),
      pointsEarned,
      pointsRedeemed,
      unreadNotifications: notifications.filter(
        (notification) => !notification.isRead
      ).length,
      openTickets: supportTickets.filter(
        (ticket) => !["Closed", "Resolved", "Archived"].includes(ticket.status || "")
      ).length,
    };
  }, [loyaltyLogs, notifications, orders, supportTickets]);

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
              Please login to view your PujaFresh profile dashboard.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]"
              >
                Register
              </Link>
            </div>
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
            PujaFresh Account
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Welcome, {user.fullName?.split(" ")[0] || "Customer"}
              </h1>

              <p className="mt-3 max-w-3xl text-orange-50">
                View your orders, rewards, notifications, support tickets and
                important account shortcuts in one place.
              </p>
            </div>

            <button
              onClick={loadCustomerData}
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Refresh Profile
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-xl bg-white p-5 shadow-sm xl:col-span-2">
            <p className="text-sm font-semibold text-gray-500">Customer</p>
            <h2 className="mt-2 line-clamp-1 text-2xl font-black text-gray-900">
              {user.fullName || "Customer"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {user.email}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.totalOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.activeOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivered</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.deliveredOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm xl:col-span-2">
            <p className="text-sm font-semibold text-gray-500">Total Spent</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {formatCurrency(stats.totalSpent)}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  My Orders
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Track recent order status, invoices and delivery updates.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded border border-gray-300 px-3 py-2 text-sm font-bold outline-none focus:border-[#7a1e13]"
                >
                  {orderStatusFilters.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>

                <Link
                  href="/orders"
                  className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                >
                  View All
                </Link>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-bold text-gray-900">
                  No orders found
                </h3>

                <p className="mt-2 text-gray-600">
                  Your orders will appear here after checkout.
                </p>

                <Link
                  href="/"
                  className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredOrders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-gray-900">{order.id}</p>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          Placed: {formatDateTime(order.createdAt)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {order.status || "N/A"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getPaymentBadgeClass(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus || "N/A"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-gray-600">
                          Delivery: {formatDate(order.customer?.deliveryDate)} •{" "}
                          {order.customer?.deliverySlotDetails?.label ||
                            order.customer?.deliverySlot ||
                            "No slot"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black text-[#7a1e13]">
                          {formatCurrency(order.total)}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {order.items?.length || 0} item(s)
                        </p>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Link
                            href="/track-order"
                            className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                          >
                            Track
                          </Link>

                          <Link
                            href={`/invoice?orderId=${encodeURIComponent(order.id)}`}
                            className="rounded bg-[#7a1e13] px-3 py-2 text-xs font-bold text-white hover:bg-[#64180f]"
                          >
                            Invoice
                          </Link>

                          {order.status === "Delivered" && (
                            <Link
                              href={`/delivery-feedback?orderId=${encodeURIComponent(
                                order.id
                              )}`}
                              className="rounded border border-green-700 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-700 hover:text-white"
                            >
                              Feedback
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Rewards & Alerts
              </h2>

              <div className="mt-5 grid gap-4">
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-700">
                    Loyalty Balance
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-green-800">
                    {stats.loyaltyBalance} pts
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-green-700">
                    Earned {stats.pointsEarned} • Redeemed {stats.pointsRedeemed}
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-4">
                  <p className="text-sm font-semibold text-orange-700">
                    Unread Notifications
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-orange-800">
                    {stats.unreadNotifications}
                  </h3>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-700">
                    Open Support Tickets
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-blue-800">
                    {stats.openTickets}
                  </h3>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  href="/loyalty"
                  className="rounded border border-green-700 px-4 py-3 text-center text-sm font-bold text-green-700 hover:bg-green-700 hover:text-white"
                >
                  Rewards
                </Link>

                <Link
                  href="/notifications"
                  className="rounded border border-orange-700 px-4 py-3 text-center text-sm font-bold text-orange-700 hover:bg-orange-700 hover:text-white"
                >
                  Alerts
                </Link>

                <Link
                  href="/support"
                  className="rounded border border-blue-700 px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-700 hover:text-white"
                >
                  Support
                </Link>

                <Link
                  href="/faq"
                  className="rounded border border-[#7a1e13] px-4 py-3 text-center text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                >
                  FAQ
                </Link>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Recent Notifications
              </h2>

              {notifications.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  No notifications yet.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {notifications.slice(0, 4).map((notification) => (
                    <Link
                      key={notification.id}
                      href="/notifications"
                      className={`rounded-xl border p-3 ${
                        notification.isRead
                          ? "border-gray-200 bg-white"
                          : "border-[#f97316] bg-[#fff7ed]"
                      }`}
                    >
                      <p className="text-sm font-black text-gray-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                        {notification.message}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Quick Actions
              </h2>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Continue Shopping
                </Link>

                <Link
                  href="/addresses"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Saved Addresses
                </Link>

                <Link
                  href="/reorder"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Reorder Essentials
                </Link>

                <Link
                  href="/subscriptions"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  My Subscriptions
                </Link>

                <Link
                  href="/cart"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Open Cart
                </Link>

                <Link
                  href="/track-order"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Track an Order
                </Link>

                <Link
                  href="/invoice"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Download Invoice
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
