"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type StatusHistory = {
  status: string;
  message?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type Order = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customer?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  status?: string;
  paymentStatus?: string;
  total?: number;
  createdAt?: string;
  statusHistory?: StatusHistory[];
};

type InventoryLog = {
  id?: string;
  productName?: string;
  productSlug?: string;
  changeType?: string;
  quantityChange?: number;
  previousStock?: number;
  updatedStock?: number;
  reason?: string;
  orderId?: string;
  createdAt?: string;
  updatedBy?: string;
};

type NotificationLog = {
  id: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  type?: string;
  priority?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
};

type CouponUsageLog = {
  id?: string;
  orderId?: string;
  couponCode?: string;
  customerName?: string;
  customerEmail?: string;
  discountAmount?: number;
  totalSavings?: number;
  usedAt?: string;
};

type DeliveryFeedback = {
  id?: string;
  orderId?: string;
  customerName?: string;
  deliveryPartnerName?: string;
  orderRating?: number;
  deliveryRating?: number;
  packagingRating?: number;
  issueType?: string;
  comment?: string;
  createdAt?: string;
};

type SupportTicket = {
  id?: string;
  subject?: string;
  customerName?: string;
  name?: string;
  customerEmail?: string;
  email?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CustomerSubscription = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: {
    name: string;
    quantity: number;
  }[];
  frequency: string;
  preferredDeliverySlot: string;
  nextDeliveryDate: string;
  status: string;
  totalPerDelivery: number;
  createdAt: string;
  updatedAt: string;
  history?: {
    status: string;
    message: string;
    updatedAt: string;
    updatedBy: string;
  }[];
};

type AuditEvent = {
  id: string;
  category:
    | "Order"
    | "Payment"
    | "Delivery"
    | "Inventory"
    | "Notification"
    | "Coupon"
    | "Feedback"
    | "Support"
    | "Subscription";
  title: string;
  description: string;
  actor: string;
  relatedId: string;
  customer: string;
  amount?: number;
  createdAt: string;
  source: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const INVENTORY_STORAGE_KEY = "pujafresh-inventory-history";
const NOTIFICATIONS_STORAGE_KEY = "pujafresh-customer-notifications";
const COUPON_USAGE_STORAGE_KEY = "pujafresh-coupon-usage";
const FEEDBACK_STORAGE_KEY = "pujafresh-delivery-feedback";
const SUPPORT_STORAGE_KEY = "pujafresh-support-tickets";
const SUBSCRIPTIONS_STORAGE_KEY = "pujafresh-subscriptions";

const categoryFilters = [
  "All Categories",
  "Order",
  "Payment",
  "Delivery",
  "Inventory",
  "Notification",
  "Coupon",
  "Feedback",
  "Support",
  "Subscription",
];

const dateFilters = [
  "All Time",
  "Today",
  "Last 7 Days",
  "Last 30 Days",
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

const getCustomerName = (order: Order) => {
  return (
    order.customerName ||
    order.customer?.fullName ||
    order.customer?.name ||
    order.customerEmail ||
    order.customer?.email ||
    "Customer"
  );
};

const getEventCategoryFromStatus = (status: string): AuditEvent["category"] => {
  if (status.toLowerCase().includes("payment")) return "Payment";

  if (
    status === "Out for Delivery" ||
    status === "Delivered" ||
    status === "Delivery Failed"
  ) {
    return "Delivery";
  }

  return "Order";
};

const getCategoryBadgeClass = (category: string) => {
  if (category === "Payment") return "bg-orange-50 text-orange-700";
  if (category === "Delivery") return "bg-blue-50 text-blue-700";
  if (category === "Inventory") return "bg-purple-50 text-purple-700";
  if (category === "Notification") return "bg-red-50 text-red-700";
  if (category === "Coupon") return "bg-[#fff7ed] text-[#7a1e13]";
  if (category === "Feedback") return "bg-green-50 text-green-700";
  if (category === "Support") return "bg-indigo-50 text-indigo-700";
  if (category === "Subscription") return "bg-orange-50 text-orange-700";

  return "bg-gray-100 text-gray-700";
};

const isWithinDateFilter = (createdAt: string, dateFilter: string) => {
  if (dateFilter === "All Time") return true;

  const eventTime = new Date(createdAt).getTime();

  if (Number.isNaN(eventTime)) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateFilter === "Today") {
    return eventTime >= todayStart.getTime();
  }

  if (dateFilter === "Last 7 Days") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    return eventTime >= sevenDaysAgo.getTime();
  }

  if (dateFilter === "Last 30 Days") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return eventTime >= thirtyDaysAgo.getTime();
  }

  return true;
};

export default function AdminAuditLogPage() {
  const router = useRouter();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadAuditEvents();
    setIsCheckingAuth(false);
  }, [router]);

  const buildAuditEvents = () => {
    const auditEvents: AuditEvent[] = [];

    const orders = readJsonArray<Order>(ORDERS_STORAGE_KEY);
    orders.forEach((order) => {
      auditEvents.push({
        id: `order-created-${order.id}`,
        category: "Order",
        title: "Order created",
        description: `${getCustomerName(order)} placed order ${order.id}.`,
        actor: "Customer",
        relatedId: order.id,
        customer: getCustomerName(order),
        amount: order.total,
        createdAt: order.createdAt || new Date().toISOString(),
        source: "Orders",
      });

      (order.statusHistory || []).forEach((history, index) => {
        const status = history.status || "Status Updated";

        auditEvents.push({
          id: `order-history-${order.id}-${index}`,
          category: getEventCategoryFromStatus(status),
          title: status,
          description:
            history.message ||
            `${status} update recorded for order ${order.id}.`,
          actor: history.updatedBy || "System",
          relatedId: order.id,
          customer: getCustomerName(order),
          amount: order.total,
          createdAt:
            history.updatedAt || order.createdAt || new Date().toISOString(),
          source: "Order Status History",
        });
      });
    });

    const inventoryLogs = readJsonArray<InventoryLog>(INVENTORY_STORAGE_KEY);
    inventoryLogs.forEach((log, index) => {
      auditEvents.push({
        id: `inventory-${log.id || index}`,
        category: "Inventory",
        title: log.changeType || "Inventory updated",
        description: `${log.productName || "Product"} stock changed by ${
          log.quantityChange ?? 0
        }. ${log.reason || ""}`.trim(),
        actor: log.updatedBy || "Admin/System",
        relatedId: log.orderId || log.productSlug || log.id || "Inventory",
        customer: "N/A",
        createdAt: log.createdAt || new Date().toISOString(),
        source: "Inventory History",
      });
    });

    const notifications = readJsonArray<NotificationLog>(
      NOTIFICATIONS_STORAGE_KEY
    );
    notifications.forEach((notification) => {
      auditEvents.push({
        id: `notification-${notification.id}`,
        category: "Notification",
        title: notification.title || "Customer notification",
        description: notification.message || "Notification sent to customer.",
        actor: "System/Admin",
        relatedId: notification.orderId || notification.id,
        customer:
          notification.customerEmail ||
          notification.customerPhone ||
          "Customer",
        createdAt: notification.createdAt || new Date().toISOString(),
        source: "Customer Notifications",
      });
    });

    const couponUsageLogs = readJsonArray<CouponUsageLog>(
      COUPON_USAGE_STORAGE_KEY
    );
    couponUsageLogs.forEach((usage, index) => {
      auditEvents.push({
        id: `coupon-${usage.id || index}`,
        category: "Coupon",
        title: `Coupon used: ${usage.couponCode || "N/A"}`,
        description: `${usage.customerName || "Customer"} saved ${formatCurrency(
          usage.totalSavings || usage.discountAmount || 0
        )} using coupon ${usage.couponCode || "N/A"}.`,
        actor: usage.customerName || "Customer",
        relatedId: usage.orderId || usage.id || "Coupon",
        customer: usage.customerEmail || usage.customerName || "Customer",
        amount: usage.totalSavings || usage.discountAmount || 0,
        createdAt: usage.usedAt || new Date().toISOString(),
        source: "Coupon Usage",
      });
    });

    const feedbacks = readJsonArray<DeliveryFeedback>(FEEDBACK_STORAGE_KEY);
    feedbacks.forEach((feedback, index) => {
      auditEvents.push({
        id: `feedback-${feedback.id || index}`,
        category: "Feedback",
        title: "Delivery feedback submitted",
        description: `${feedback.customerName || "Customer"} rated delivery ${
          feedback.deliveryRating || "N/A"
        }/5. Issue: ${feedback.issueType || "None"}. ${
          feedback.comment || ""
        }`.trim(),
        actor: feedback.customerName || "Customer",
        relatedId: feedback.orderId || feedback.id || "Feedback",
        customer: feedback.customerName || "Customer",
        createdAt: feedback.createdAt || new Date().toISOString(),
        source: "Delivery Feedback",
      });
    });

    const subscriptions = readJsonArray<CustomerSubscription>(
      SUBSCRIPTIONS_STORAGE_KEY
    );

    subscriptions.forEach((subscription) => {
      auditEvents.push({
        id: `subscription-created-${subscription.id}`,
        category: "Subscription",
        title: "Subscription created",
        description: `${subscription.customerName} created a ${subscription.frequency} subscription worth ${formatCurrency(
          subscription.totalPerDelivery
        )} per delivery.`,
        actor: subscription.customerName || "Customer",
        relatedId: subscription.id,
        customer: subscription.customerEmail || subscription.customerName,
        amount: subscription.totalPerDelivery,
        createdAt: subscription.createdAt || new Date().toISOString(),
        source: "Subscriptions",
      });

      (subscription.history || []).forEach((history, index) => {
        auditEvents.push({
          id: `subscription-history-${subscription.id}-${index}`,
          category: "Subscription",
          title: `Subscription: ${history.status}`,
          description:
            history.message ||
            `Subscription ${subscription.id} updated to ${history.status}.`,
          actor: history.updatedBy || "System",
          relatedId: subscription.id,
          customer: subscription.customerEmail || subscription.customerName,
          amount: subscription.totalPerDelivery,
          createdAt:
            history.updatedAt ||
            subscription.updatedAt ||
            subscription.createdAt ||
            new Date().toISOString(),
          source: "Subscription History",
        });
      });
    });

    const supportTickets = readJsonArray<SupportTicket>(SUPPORT_STORAGE_KEY);
    supportTickets.forEach((ticket, index) => {
      auditEvents.push({
        id: `support-${ticket.id || index}`,
        category: "Support",
        title: ticket.subject || "Support ticket created",
        description: `Support ticket status: ${ticket.status || "Open"}. Priority: ${
          ticket.priority || "Normal"
        }.`,
        actor: ticket.customerName || ticket.name || "Customer",
        relatedId: ticket.id || "Support",
        customer:
          ticket.customerEmail ||
          ticket.email ||
          ticket.customerName ||
          ticket.name ||
          "Customer",
        createdAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
        source: "Support Tickets",
      });
    });

    return auditEvents.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const loadAuditEvents = () => {
    setEvents(buildAuditEvents());
  };

  const filteredEvents = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        search.length === 0 ||
        event.title.toLowerCase().includes(search) ||
        event.description.toLowerCase().includes(search) ||
        event.actor.toLowerCase().includes(search) ||
        event.relatedId.toLowerCase().includes(search) ||
        event.customer.toLowerCase().includes(search) ||
        event.source.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" || event.category === categoryFilter;

      const matchesDate = isWithinDateFilter(event.createdAt, dateFilter);

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [categoryFilter, dateFilter, events, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: events.length,
      order: events.filter((event) => event.category === "Order").length,
      payment: events.filter((event) => event.category === "Payment").length,
      delivery: events.filter((event) => event.category === "Delivery").length,
      inventory: events.filter((event) => event.category === "Inventory").length,
      notification: events.filter((event) => event.category === "Notification")
        .length,
      support: events.filter((event) => event.category === "Support").length,
      feedback: events.filter((event) => event.category === "Feedback").length,
    };
  }, [events]);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setDateFilter("All Time");
  };

  const exportCsv = () => {
    if (filteredEvents.length === 0) {
      toast.error("No audit events to export");
      return;
    }

    const headers = [
      "Event ID",
      "Category",
      "Title",
      "Description",
      "Actor",
      "Related ID",
      "Customer",
      "Amount",
      "Source",
      "Created At",
    ];

    const rows = filteredEvents.map((event) => [
      event.id,
      event.category,
      event.title,
      event.description,
      event.actor,
      event.relatedId,
      event.customer,
      event.amount || "",
      event.source,
      formatDateTime(event.createdAt),
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
    link.download = `pujafresh-audit-log-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
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
              Audit Trail
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              View complete system activity from orders, payments, delivery,
              inventory, notifications, coupons, feedback and support.
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
              onClick={loadAuditEvents}
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Order</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.order}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Payment</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.payment}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivery</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.delivery}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Inventory</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.inventory}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Notifications
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.notification}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Support</p>
            <h2 className="mt-2 text-3xl font-bold text-indigo-700">
              {stats.support}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Feedback</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.feedback}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_180px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Audit Events
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, order ID, customer, actor, source..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
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
                {categoryFilters.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Date</label>

              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {dateFilters.map((date) => (
                  <option key={date}>{date}</option>
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
            Showing {filteredEvents.length} of {events.length} audit event
            {events.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No audit events found
              </h2>

              <p className="mt-2 text-gray-600">
                Activity will appear here after orders, payments, delivery
                updates, notifications, feedback or support activity.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#f97316]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryBadgeClass(
                            event.category
                          )}`}
                        >
                          {event.category}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {event.source}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-gray-900">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {event.description}
                      </p>

                      <div className="mt-3 grid gap-2 text-xs font-semibold text-gray-500 md:grid-cols-4">
                        <p>Actor: {event.actor}</p>
                        <p>Related ID: {event.relatedId}</p>
                        <p>Customer: {event.customer}</p>
                        <p>Time: {formatDateTime(event.createdAt)}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {event.amount !== undefined && (
                        <p className="text-sm font-black text-[#7a1e13]">
                          {formatCurrency(event.amount)}
                        </p>
                      )}

                      {event.relatedId !== "N/A" && (
                        <Link
                          href={
                            event.category === "Notification"
                              ? "/admin/notification-logs"
                              : event.category === "Inventory"
                              ? "/admin/inventory-history"
                              : event.category === "Feedback"
                              ? "/admin/delivery-feedback"
                              : event.category === "Support"
                              ? "/admin/support"
                              : `/invoice?orderId=${encodeURIComponent(
                                  event.relatedId
                                )}`
                          }
                          className="mt-3 inline-block rounded border border-[#7a1e13] px-4 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                        >
                          Open
                        </Link>
                      )}
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
