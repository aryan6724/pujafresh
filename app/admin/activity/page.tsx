"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { getProducts } from "@/utils/productStorage";

type ActivityCategory =
  | "Orders"
  | "Payments"
  | "Inventory"
  | "Coupons"
  | "Loyalty"
  | "Support"
  | "Returns"
  | "Reviews"
  | "Newsletter"
  | "Stock Alerts";

type ActivityItem = {
  id: string;
  category: ActivityCategory;
  title: string;
  description: string;
  status?: string;
  priority: "Low" | "Medium" | "High";
  createdAt: string;
  link?: string;
};

type OrderItem = {
  id?: number;
  name?: string;
  quantity?: number;
  price?: number;
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
  };
  items?: OrderItem[];
  total?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  refundRequest?: {
    id: string;
    type: string;
    reason: string;
    status: string;
    requestedAt: string;
  } | null;
};

type SupportTicket = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  category?: string;
  priority?: "Low" | "Medium" | "High";
  subject?: string;
  status?: string;
  createdAt?: string;
};

type NewsletterSubscriber = {
  id: string;
  email: string;
  status?: string;
  subscribedAt?: string;
  createdAt?: string;
};

const activityCategories: Array<"All" | ActivityCategory> = [
  "All",
  "Orders",
  "Payments",
  "Inventory",
  "Coupons",
  "Loyalty",
  "Support",
  "Returns",
  "Reviews",
  "Newsletter",
  "Stock Alerts",
];

const dateFilters = ["All Time", "Today", "Last 7 Days", "Last 30 Days"];

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const formatDateTime = (date: string) => {
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
    order.customer?.fullName ||
    order.customer?.name ||
    order.customerName ||
    order.customer?.email ||
    order.customerEmail ||
    "Customer"
  );
};

const getActivityAge = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

export default function AdminActivityPage() {
  const router = useRouter();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<"All" | ActivityCategory>("All");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [dateFilter, setDateFilter] = useState("All Time");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadActivities();
    setIsCheckingAuth(false);
  }, [router]);

  const loadActivities = () => {
    const allActivities: ActivityItem[] = [];
    const now = new Date().toISOString();

    const orders = safeJsonParse<Order[]>(
      localStorage.getItem("pujafresh-orders"),
      []
    );

    orders.forEach((order) => {
      const orderDate = order.createdAt || now;
      const itemCount = order.items?.length || 0;

      allActivities.push({
        id: `order-${order.id}`,
        category: "Orders",
        title: `New order ${order.id}`,
        description: `${getCustomerName(order)} placed an order worth ₹${
          order.total || 0
        } with ${itemCount} item${itemCount !== 1 ? "s" : ""}.`,
        status: order.status || "Pending",
        priority:
          order.status === "Cancelled" || order.status === "Payment Failed"
            ? "High"
            : "Medium",
        createdAt: orderDate,
        link: `/invoice/${order.id}`,
      });

      if (order.paymentStatus === "Verification Pending") {
        allActivities.push({
          id: `payment-${order.id}`,
          category: "Payments",
          title: `Payment verification pending`,
          description: `Order ${order.id} needs UPI/bank transfer verification.`,
          status: order.paymentStatus,
          priority: "High",
          createdAt: orderDate,
          link: "/admin",
        });
      }

      if (order.refundRequest) {
        allActivities.push({
          id: `return-${order.refundRequest.id}`,
          category: "Returns",
          title: `${order.refundRequest.type} request ${order.refundRequest.id}`,
          description: `Order ${order.id}: ${order.refundRequest.reason}`,
          status: order.refundRequest.status,
          priority:
            order.refundRequest.status === "Requested" ? "High" : "Medium",
          createdAt: order.refundRequest.requestedAt || orderDate,
          link: "/admin/returns",
        });
      }
    });

    const inventoryLogs = safeJsonParse<any[]>(
      localStorage.getItem("pujafresh-inventory-history"),
      []
    );

    inventoryLogs.forEach((log, index) => {
      allActivities.push({
        id: `inventory-${log.id || index}`,
        category: "Inventory",
        title: log.changeType || log.type || "Stock activity",
        description: `${log.productName || "Product"} stock changed by ${
          log.quantityChange || log.quantity || 0
        }. ${log.reason || ""}`.trim(),
        status: log.updatedStockQuantity
          ? `Stock: ${log.updatedStockQuantity}`
          : "Updated",
        priority: Number(log.updatedStockQuantity || 99) <= 5 ? "High" : "Low",
        createdAt: log.createdAt || log.updatedAt || now,
        link: "/admin/inventory-history",
      });
    });

    const products = getProducts();

    products.forEach((product) => {
      const stockQuantity = Number(product.stockQuantity || 0);
      const stockStatus = product.stock || "In Stock";

      if (stockStatus === "Out of Stock" || stockQuantity <= 0) {
        allActivities.push({
          id: `stock-out-${product.id}`,
          category: "Stock Alerts",
          title: `${product.name} is out of stock`,
          description: `Immediate restock required for ${product.category}.`,
          status: "Out of Stock",
          priority: "High",
          createdAt: now,
          link: "/admin/products",
        });
      } else if (stockQuantity <= 5 || stockStatus === "Limited Stock") {
        allActivities.push({
          id: `stock-low-${product.id}`,
          category: "Stock Alerts",
          title: `${product.name} has low stock`,
          description: `Only ${stockQuantity} unit${
            stockQuantity !== 1 ? "s" : ""
          } left in ${product.category}.`,
          status: "Low Stock",
          priority: "High",
          createdAt: now,
          link: "/admin/restock-planning",
        });
      }
    });

    const couponUsage = safeJsonParse<any[]>(
      localStorage.getItem("pujafresh-coupon-usage"),
      []
    );

    couponUsage.forEach((usage, index) => {
      allActivities.push({
        id: `coupon-${usage.id || index}`,
        category: "Coupons",
        title: `Coupon ${usage.couponCode || usage.code || "used"}`,
        description: `Discount ₹${
          usage.discountAmount || 0
        } applied on order ${usage.orderId || "N/A"}.`,
        status: "Used",
        priority: "Low",
        createdAt: usage.usedAt || usage.createdAt || now,
        link: "/admin/coupon-usage",
      });
    });

    const loyaltyLogs = safeJsonParse<any[]>(
      localStorage.getItem("pujafresh-loyalty-points"),
      []
    );

    loyaltyLogs.forEach((log, index) => {
      const points = Number(log.points || log.pointsEarned || 0);

      allActivities.push({
        id: `loyalty-${log.id || index}`,
        category: "Loyalty",
        title: `${points < 0 ? "Points redeemed" : "Points earned"}`,
        description: `${Math.abs(points)} point${
          Math.abs(points) !== 1 ? "s" : ""
        } ${points < 0 ? "redeemed" : "earned"} by ${
          log.customerEmail || log.email || "customer"
        }.`,
        status: log.type || "Loyalty",
        priority: "Low",
        createdAt: log.createdAt || log.date || now,
        link: "/admin/loyalty",
      });
    });

    const supportTickets = safeJsonParse<SupportTicket[]>(
      localStorage.getItem("pujafresh-support-tickets"),
      []
    );

    supportTickets.forEach((ticket) => {
      allActivities.push({
        id: `support-${ticket.id}`,
        category: "Support",
        title: ticket.subject || `Support ticket ${ticket.id}`,
        description: `${ticket.customerName || ticket.customerEmail || "Customer"} raised ${
          ticket.category || "support"
        } ticket.`,
        status: ticket.status || "Open",
        priority: ticket.priority || "Medium",
        createdAt: ticket.createdAt || now,
        link: "/admin/support",
      });
    });

    const subscribers = safeJsonParse<NewsletterSubscriber[]>(
      localStorage.getItem("pujafresh-newsletter-subscribers"),
      []
    );

    subscribers.forEach((subscriber) => {
      allActivities.push({
        id: `newsletter-${subscriber.id}`,
        category: "Newsletter",
        title: `Newsletter ${subscriber.status || "Subscribed"}`,
        description: `${subscriber.email} subscribed from footer newsletter.`,
        status: subscriber.status || "Subscribed",
        priority: "Low",
        createdAt: subscriber.subscribedAt || subscriber.createdAt || now,
        link: "/admin/newsletter",
      });
    });

    const reviewStorageKeys = Array.from({ length: localStorage.length })
      .map((_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith("pujafresh-reviews-")));

    reviewStorageKeys.forEach((key) => {
      const productSlug = key.replace("pujafresh-reviews-", "");
      const reviews = safeJsonParse<any[]>(localStorage.getItem(key), []);

      reviews.forEach((review, index) => {
        allActivities.push({
          id: `review-${review.id || productSlug}-${index}`,
          category: "Reviews",
          title: `${review.status || "Approved"} product review`,
          description: `${review.name || "Customer"} rated ${
            review.rating || 0
          } star for ${productSlug.replace(/-/g, " ")}.`,
          status: review.status || "Approved",
          priority: review.status === "Pending" ? "High" : "Low",
          createdAt: review.createdAt || review.date || now,
          link: "/admin/reviews",
        });
      });
    });

    const sortedActivities = allActivities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setActivities(sortedActivities);
  };

  const filteredActivities = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesSearch =
        search.length === 0 ||
        activity.title.toLowerCase().includes(search) ||
        activity.description.toLowerCase().includes(search) ||
        activity.category.toLowerCase().includes(search) ||
        activity.status?.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All" || activity.category === categoryFilter;

      const matchesPriority =
        priorityFilter === "All Priorities" ||
        activity.priority === priorityFilter;

      const activityTime = new Date(activity.createdAt).getTime();
      const nowTime = Date.now();
      const oneDay = 1000 * 60 * 60 * 24;

      const matchesDate =
        dateFilter === "All Time" ||
        (dateFilter === "Today" && nowTime - activityTime <= oneDay) ||
        (dateFilter === "Last 7 Days" && nowTime - activityTime <= oneDay * 7) ||
        (dateFilter === "Last 30 Days" && nowTime - activityTime <= oneDay * 30);

      return matchesSearch && matchesCategory && matchesPriority && matchesDate;
    });
  }, [activities, searchQuery, categoryFilter, priorityFilter, dateFilter]);

  const stats = useMemo(() => {
    return {
      total: activities.length,
      highPriority: activities.filter((activity) => activity.priority === "High")
        .length,
      orders: activities.filter((activity) => activity.category === "Orders")
        .length,
      support: activities.filter((activity) => activity.category === "Support")
        .length,
      stockAlerts: activities.filter(
        (activity) => activity.category === "Stock Alerts"
      ).length,
      pendingReviews: activities.filter(
        (activity) =>
          activity.category === "Reviews" && activity.status === "Pending"
      ).length,
    };
  }, [activities]);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All");
    setPriorityFilter("All Priorities");
    setDateFilter("All Time");
  };

  const handleExportCsv = () => {
    if (filteredActivities.length === 0) {
      toast.error("No activities to export");
      return;
    }

    const headers = [
      "Category",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Date",
      "Link",
    ];

    const rows = filteredActivities.map((activity) => [
      activity.category,
      activity.title,
      activity.description,
      activity.status || "",
      activity.priority,
      formatDateTime(activity.createdAt),
      activity.link || "",
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
    link.download = `pujafresh-activity-center-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Activity CSV exported");
  };

  const getPriorityClass = (priority: string) => {
    if (priority === "High") return "bg-red-50 text-red-700";
    if (priority === "Medium") return "bg-orange-50 text-orange-700";
    return "bg-green-50 text-green-700";
  };

  const getCategoryClass = (category: ActivityCategory) => {
    if (category === "Orders") return "bg-blue-50 text-blue-700";
    if (category === "Payments") return "bg-purple-50 text-purple-700";
    if (category === "Inventory" || category === "Stock Alerts") {
      return "bg-red-50 text-red-700";
    }
    if (category === "Coupons") return "bg-orange-50 text-orange-700";
    if (category === "Loyalty") return "bg-green-50 text-green-700";
    if (category === "Support") return "bg-indigo-50 text-indigo-700";
    if (category === "Returns") return "bg-yellow-50 text-yellow-700";
    if (category === "Reviews") return "bg-pink-50 text-pink-700";
    return "bg-gray-100 text-gray-700";
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
              Activity Center
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              One place to monitor orders, payments, stock alerts, support,
              reviews, coupons, loyalty and newsletter activity.
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
              onClick={loadActivities}
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Activities
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              High Priority
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.highPriority}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-600">
              {stats.orders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Support</p>
            <h2 className="mt-2 text-3xl font-bold text-indigo-600">
              {stats.support}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Stock Alerts
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.stockAlerts}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Pending Reviews
            </p>
            <h2 className="mt-2 text-3xl font-bold text-pink-600">
              {stats.pendingReviews}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_180px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Activity
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, description, category or status..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Category
              </label>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as "All" | ActivityCategory)
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {activityCategories.map((category) => (
                  <option key={category}>{category}</option>
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
                <option>All Priorities</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Date</label>

              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {dateFilters.map((filter) => (
                  <option key={filter}>{filter}</option>
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
            Showing {filteredActivities.length} of {activities.length} activity
            {activities.length !== 1 ? "ies" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No activities found
              </h2>

              <p className="mt-2 text-gray-600">
                Activities will appear here when orders, stock, coupons,
                support tickets, reviews or subscriptions are created.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryClass(
                            activity.category
                          )}`}
                        >
                          {activity.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(
                            activity.priority
                          )}`}
                        >
                          {activity.priority}
                        </span>

                        {activity.status && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                            {activity.status}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {activity.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {activity.description}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-gray-500">
                        {formatDateTime(activity.createdAt)} •{" "}
                        {getActivityAge(activity.createdAt)}
                      </p>
                    </div>

                    {activity.link && (
                      <Link
                        href={activity.link}
                        className="rounded border border-[#7a1e13] px-4 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                      >
                        Open
                      </Link>
                    )}
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
