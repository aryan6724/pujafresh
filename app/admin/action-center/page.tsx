"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { getProducts } from "@/utils/productStorage";
import { getDeliveryFeedbacks } from "@/utils/deliveryFeedbackStorage";
import { getAllCustomerNotifications } from "@/utils/customerNotificationStorage";
import { getCoupons } from "@/utils/couponStorage";

type Order = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customer?: {
    fullName?: string;
    name?: string;
    phone?: string;
    email?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      label?: string;
    };
  };
  items?: {
    name: string;
    quantity: number;
  }[];
  total?: number;
  status?: string;
  paymentStatus?: string;
  deliveryPartner?: {
    id?: string;
    name?: string;
  };
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
  pincode: string;
  status: string;
  totalPerDelivery: number;
  createdAt: string;
  updatedAt: string;
};

type ReturnRequest = {
  id?: string;
  orderId?: string;
  customerName?: string;
  status?: string;
  reason?: string;
  createdAt?: string;
};

type ActionItem = {
  id: string;
  title: string;
  description: string;
  category:
    | "Payment"
    | "Order"
    | "Delivery"
    | "Inventory"
    | "Support"
    | "Returns"
    | "Feedback"
    | "Notifications"
    | "Coupons"
    | "Subscription";
  priority: "High" | "Medium" | "Low";
  status: string;
  relatedId: string;
  actionHref: string;
  actionLabel: string;
  createdAt: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const SUPPORT_STORAGE_KEY = "pujafresh-support-tickets";
const RETURNS_STORAGE_KEYS = ["pujafresh-returns", "pujafresh-return-requests"];
const SUBSCRIPTIONS_STORAGE_KEY = "pujafresh-subscriptions";

const categoryFilters = [
  "All Categories",
  "Payment",
  "Order",
  "Delivery",
  "Inventory",
  "Support",
  "Returns",
  "Feedback",
  "Notifications",
  "Coupons",
  "Subscription",
];

const priorityFilters = ["All Priority", "High", "Medium", "Low"];

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

const getProductStockQuantity = (product: any) => {
  return Number(
    product.stockQuantity ??
      (product.stock === "Out of Stock" || product.stock === "Coming Soon"
        ? 0
        : 50)
  );
};

const isOrderOpenForDelivery = (order: Order) => {
  if (!order.status) return false;

  return !["Delivered", "Cancelled", "Archived", "Delivery Failed"].includes(
    order.status
  );
};

const isSupportOpen = (status?: string) => {
  if (!status) return true;

  return !["Closed", "Resolved", "Archived"].includes(status);
};

const getDateOnlyTime = (dateString?: string) => {
  if (!dateString) return 0;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 0;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const isReturnOpen = (status?: string) => {
  if (!status) return true;

  return !["Approved", "Rejected", "Refunded", "Closed", "Archived"].includes(
    status
  );
};

const getPriorityBadgeClass = (priority: string) => {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";

  return "bg-green-50 text-green-700";
};

const getCategoryBadgeClass = (category: string) => {
  if (category === "Payment") return "bg-orange-50 text-orange-700";
  if (category === "Delivery") return "bg-blue-50 text-blue-700";
  if (category === "Inventory") return "bg-purple-50 text-purple-700";
  if (category === "Support") return "bg-indigo-50 text-indigo-700";
  if (category === "Returns") return "bg-red-50 text-red-700";
  if (category === "Feedback") return "bg-green-50 text-green-700";
  if (category === "Notifications") return "bg-pink-50 text-pink-700";
  if (category === "Coupons") return "bg-[#fff7ed] text-[#7a1e13]";
  if (category === "Subscription") return "bg-orange-50 text-orange-700";

  return "bg-gray-100 text-gray-700";
};

export default function AdminActionCenterPage() {
  const router = useRouter();

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadActionItems();
    setIsCheckingAuth(false);
  }, [router]);

  const buildActionItems = () => {
    const items: ActionItem[] = [];
    const orders = readJsonArray<Order>(ORDERS_STORAGE_KEY);

    orders.forEach((order) => {
      if (
        order.paymentStatus === "Verification Pending" ||
        order.paymentStatus === "Payment Pending"
      ) {
        items.push({
          id: `payment-${order.id}`,
          title:
            order.paymentStatus === "Verification Pending"
              ? "Payment verification required"
              : "Payment pending",
          description: `${getCustomerName(order)} has ${order.paymentStatus} for order ${
            order.id
          }. Total: ${formatCurrency(order.total)}.`,
          category: "Payment",
          priority:
            order.paymentStatus === "Verification Pending" ? "High" : "Medium",
          status: order.paymentStatus || "Payment Pending",
          relatedId: order.id,
          actionHref: "/admin/payments",
          actionLabel: "Verify Payment",
          createdAt: order.createdAt || new Date().toISOString(),
        });
      }

      if (order.status === "Pending") {
        items.push({
          id: `order-${order.id}`,
          title: "New order needs confirmation",
          description: `${getCustomerName(order)} placed a pending order ${
            order.id
          }. Total: ${formatCurrency(order.total)}.`,
          category: "Order",
          priority: "High",
          status: order.status,
          relatedId: order.id,
          actionHref: "/admin",
          actionLabel: "Open Orders",
          createdAt: order.createdAt || new Date().toISOString(),
        });
      }

      if (isOrderOpenForDelivery(order) && !order.deliveryPartner) {
        items.push({
          id: `delivery-${order.id}`,
          title: "Delivery partner not assigned",
          description: `Order ${order.id} for ${getCustomerName(
            order
          )} is not assigned to any delivery partner.`,
          category: "Delivery",
          priority: "High",
          status: order.status || "Open",
          relatedId: order.id,
          actionHref: "/admin/delivery-assignments",
          actionLabel: "Assign Partner",
          createdAt: order.createdAt || new Date().toISOString(),
        });
      }
    });

    getProducts().forEach((product: any) => {
      const stockQuantity = getProductStockQuantity(product);

      if (
        stockQuantity <= 5 ||
        product.stock === "Out of Stock" ||
        product.stock === "Limited Stock"
      ) {
        items.push({
          id: `inventory-${product.id}`,
          title:
            stockQuantity <= 0 || product.stock === "Out of Stock"
              ? "Product out of stock"
              : "Product stock is low",
          description: `${product.name} has ${stockQuantity} unit(s) available.`,
          category: "Inventory",
          priority: stockQuantity <= 0 ? "High" : "Medium",
          status: product.stock || "Low Stock",
          relatedId: String(product.id),
          actionHref: "/admin/restock-planning",
          actionLabel: "Plan Restock",
          createdAt: new Date().toISOString(),
        });
      }
    });

    const supportTickets = readJsonArray<SupportTicket>(SUPPORT_STORAGE_KEY);
    supportTickets.forEach((ticket, index) => {
      if (!isSupportOpen(ticket.status)) return;

      items.push({
        id: `support-${ticket.id || index}`,
        title: "Open support ticket",
        description: `${ticket.subject || "Support issue"} from ${
          ticket.customerName || ticket.name || ticket.customerEmail || ticket.email || "Customer"
        }.`,
        category: "Support",
        priority:
          ticket.priority === "High" || ticket.priority === "Urgent"
            ? "High"
            : "Medium",
        status: ticket.status || "Open",
        relatedId: ticket.id || "Support",
        actionHref: "/admin/support",
        actionLabel: "Reply Ticket",
        createdAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
      });
    });

    RETURNS_STORAGE_KEYS.forEach((key) => {
      const returns = readJsonArray<ReturnRequest>(key);

      returns.forEach((returnRequest, index) => {
        if (!isReturnOpen(returnRequest.status)) return;

        items.push({
          id: `return-${key}-${returnRequest.id || index}`,
          title: "Return/refund request pending",
          description: `Return request for order ${
            returnRequest.orderId || "N/A"
          }. Reason: ${returnRequest.reason || "N/A"}.`,
          category: "Returns",
          priority: "High",
          status: returnRequest.status || "Pending",
          relatedId: returnRequest.orderId || returnRequest.id || "Return",
          actionHref: "/admin/returns",
          actionLabel: "Review Return",
          createdAt: returnRequest.createdAt || new Date().toISOString(),
        });
      });
    });

    getDeliveryFeedbacks().forEach((feedback) => {
      const averageRating =
        (Number(feedback.orderRating || 0) +
          Number(feedback.deliveryRating || 0) +
          Number(feedback.packagingRating || 0)) /
        3;

      if (averageRating > 2.5 && feedback.issueType === "None") return;

      items.push({
        id: `feedback-${feedback.id}`,
        title: "Delivery feedback needs attention",
        description: `${feedback.customerName} gave delivery rating ${
          feedback.deliveryRating
        }/5. Issue: ${feedback.issueType || "None"}.`,
        category: "Feedback",
        priority: averageRating <= 2 ? "High" : "Medium",
        status: `${averageRating.toFixed(1)}/5 average`,
        relatedId: feedback.orderId,
        actionHref: "/admin/delivery-feedback",
        actionLabel: "View Feedback",
        createdAt: feedback.createdAt,
      });
    });

    getAllCustomerNotifications().forEach((notification) => {
      if (notification.isRead) return;

      items.push({
        id: `notification-${notification.id}`,
        title: "Customer has unread notification",
        description: `${notification.customerEmail || notification.customerPhone || "Customer"} has unread alert: ${
          notification.title
        }.`,
        category: "Notifications",
        priority: notification.priority === "High" ? "Medium" : "Low",
        status: "Unread",
        relatedId: notification.orderId || notification.id,
        actionHref: "/admin/notification-logs",
        actionLabel: "Open Logs",
        createdAt: notification.createdAt,
      });
    });

    getCoupons().forEach((coupon: any) => {
      if (!coupon.isActive || !coupon.expiryDate) return;

      const expiryTime = new Date(coupon.expiryDate).getTime();
      const now = Date.now();
      const daysLeft = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0 || daysLeft > 7) return;

      items.push({
        id: `coupon-${coupon.id}`,
        title: daysLeft <= 0 ? "Coupon expires today" : "Coupon expiring soon",
        description: `${coupon.code} expires in ${Math.max(daysLeft, 0)} day(s).`,
        category: "Coupons",
        priority: daysLeft <= 2 ? "Medium" : "Low",
        status: "Expiring",
        relatedId: coupon.code,
        actionHref: "/admin/coupons",
        actionLabel: "Manage Coupon",
        createdAt: new Date().toISOString(),
      });
    });

    const todayTime = getDateOnlyTime(new Date().toISOString());
    const subscriptions = readJsonArray<CustomerSubscription>(
      SUBSCRIPTIONS_STORAGE_KEY
    );

    subscriptions.forEach((subscription) => {
      const nextDeliveryTime = getDateOnlyTime(subscription.nextDeliveryDate);

      if (subscription.status === "Pending Approval") {
        items.push({
          id: `subscription-approval-${subscription.id}`,
          title: "Subscription approval pending",
          description: `${subscription.customerName} requested ${subscription.frequency} delivery for ${subscription.items
            .map((item) => `${item.name} x ${item.quantity}`)
            .join(", ")}.`,
          category: "Subscription",
          priority: "High",
          status: subscription.status,
          relatedId: subscription.id,
          actionHref: "/admin/subscriptions",
          actionLabel: "Review Subscription",
          createdAt: subscription.createdAt || new Date().toISOString(),
        });
      }

      if (subscription.status === "Active" && nextDeliveryTime <= todayTime) {
        items.push({
          id: `subscription-due-${subscription.id}`,
          title:
            nextDeliveryTime < todayTime
              ? "Subscription delivery overdue"
              : "Subscription delivery due today",
          description: `${subscription.customerName} has a ${subscription.frequency} subscription delivery due on ${subscription.nextDeliveryDate}.`,
          category: "Subscription",
          priority: nextDeliveryTime < todayTime ? "High" : "Medium",
          status: nextDeliveryTime < todayTime ? "Overdue" : "Due Today",
          relatedId: subscription.id,
          actionHref: "/admin/subscription-order-generator",
          actionLabel: "Generate Order",
          createdAt: subscription.updatedAt || subscription.createdAt,
        });
      }
    });

    return items.sort((a, b) => {
      const priorityRank = { High: 3, Medium: 2, Low: 1 };

      const priorityDifference =
        priorityRank[b.priority] - priorityRank[a.priority];

      if (priorityDifference !== 0) return priorityDifference;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const loadActionItems = () => {
    setActionItems(buildActionItems());
  };

  const filteredActionItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return actionItems.filter((item) => {
      const matchesSearch =
        search.length === 0 ||
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.relatedId.toLowerCase().includes(search) ||
        item.status.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" || item.category === categoryFilter;

      const matchesPriority =
        priorityFilter === "All Priority" || item.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [actionItems, categoryFilter, priorityFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: actionItems.length,
      high: actionItems.filter((item) => item.priority === "High").length,
      medium: actionItems.filter((item) => item.priority === "Medium").length,
      low: actionItems.filter((item) => item.priority === "Low").length,
      payment: actionItems.filter((item) => item.category === "Payment").length,
      delivery: actionItems.filter((item) => item.category === "Delivery").length,
      inventory: actionItems.filter((item) => item.category === "Inventory").length,
      support: actionItems.filter((item) => item.category === "Support").length,
    };
  }, [actionItems]);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setPriorityFilter("All Priority");
  };

  const exportCsv = () => {
    if (filteredActionItems.length === 0) {
      toast.error("No action items to export");
      return;
    }

    const headers = [
      "Action ID",
      "Category",
      "Priority",
      "Title",
      "Description",
      "Status",
      "Related ID",
      "Action Link",
      "Created At",
    ];

    const rows = filteredActionItems.map((item) => [
      item.id,
      item.category,
      item.priority,
      item.title,
      item.description,
      item.status,
      item.relatedId,
      item.actionHref,
      formatDateTime(item.createdAt),
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
    link.download = `pujafresh-action-center-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Action center CSV exported");
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
              Admin Action Center
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              See all pending work in one place: payments, orders, delivery
              assignments, stock, support, returns, feedback and notifications.
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
              onClick={loadActionItems}
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
            <p className="text-sm font-semibold text-gray-500">Total Tasks</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">High</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.high}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Medium</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.medium}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Low</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.low}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Payments</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
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
            <p className="text-sm font-semibold text-gray-500">Stock</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.inventory}
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
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_180px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Tasks
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order ID, customer, status, category..."
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
            Showing {filteredActionItems.length} of {actionItems.length} task
            {actionItems.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredActionItems.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No pending actions found
              </h2>

              <p className="mt-2 text-gray-600">
                Great! Payments, delivery, inventory and support items look
                clear right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredActionItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.priority === "High"
                      ? "border-red-200 bg-red-50/40"
                      : item.priority === "Medium"
                      ? "border-orange-200 bg-orange-50/30"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryBadgeClass(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityBadgeClass(
                            item.priority
                          )}`}
                        >
                          {item.priority} Priority
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {item.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-gray-900">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {item.description}
                      </p>

                      <div className="mt-3 grid gap-2 text-xs font-semibold text-gray-500 md:grid-cols-2">
                        <p>Related ID: {item.relatedId}</p>
                        <p>Created: {formatDateTime(item.createdAt)}</p>
                      </div>
                    </div>

                    <Link
                      href={item.actionHref}
                      className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
                    >
                      {item.actionLabel}
                    </Link>
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
