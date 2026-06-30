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
  saveAllSubscriptions,
} from "@/utils/subscriptionStorage";

type SubscriptionOrderItem = {
  id?: number | string;
  slug?: string;
  name: string;
  image?: string;
  category?: string;
  price: number;
  quantity: number;
};

type GeneratedOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  customer: {
    fullName: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    landmark: string;
    pincode: string;
    deliveryDate: string;
    deliverySlot: string;
    deliverySlotDetails: {
      id: string;
      label: string;
    };
    paymentMethod: string;
  };
  items: SubscriptionOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  total: number;
  paymentStatus: string;
  paymentReference: string;
  status: string;
  source: "Subscription";
  subscriptionId: string;
  createdAt: string;
  statusHistory: {
    status: string;
    message: string;
    updatedAt: string;
    updatedBy: string;
  }[];
};

type DateFilter = "Due Today" | "Overdue" | "Next 7 Days" | "All Active";

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const dateFilters: DateFilter[] = [
  "Due Today",
  "Overdue",
  "Next 7 Days",
  "All Active",
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

const getDateOnlyTime = (dateString?: string) => {
  if (!dateString) return 0;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 0;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (!savedOrders) return [];

    const parsedOrders = JSON.parse(savedOrders) as GeneratedOrder[];

    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
};

const saveOrders = (orders: GeneratedOrder[]) => {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
};

const isWithinDateFilter = (
  subscription: CustomerSubscription,
  dateFilter: DateFilter
) => {
  const today = new Date();
  const todayTime = getDateOnlyTime(today.toISOString());
  const deliveryTime = getDateOnlyTime(subscription.nextDeliveryDate);

  if (dateFilter === "Due Today") return deliveryTime === todayTime;
  if (dateFilter === "Overdue") return deliveryTime < todayTime;

  if (dateFilter === "Next 7 Days") {
    const next7DaysTime = getDateOnlyTime(addDays(today, 7).toISOString());

    return deliveryTime >= todayTime && deliveryTime <= next7DaysTime;
  }

  return true;
};

const getPaymentStatus = (paymentMode: string) => {
  if (paymentMode === "Cash on Delivery") return "Payment Pending";
  if (paymentMode === "UPI") return "Verification Pending";
  if (paymentMode === "Monthly Billing") return "Payment Pending";

  return "Payment Pending";
};

const createSubscriptionOrderId = (subscriptionId: string, deliveryDate: string) => {
  const cleanSubscriptionId = subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(-8);
  const cleanDate = deliveryDate.replace(/-/g, "");

  return `PF-SUB-${cleanDate}-${cleanSubscriptionId}`;
};

const getGeneratedOrderKey = (subscription: CustomerSubscription) => {
  return `${subscription.id}-${subscription.nextDeliveryDate}`;
};

const getOrderKey = (order: GeneratedOrder) => {
  return `${order.subscriptionId}-${order.customer.deliveryDate}`;
};

const buildOrderFromSubscription = (
  subscription: CustomerSubscription
): GeneratedOrder => {
  const now = new Date().toISOString();
  const subtotal = Number(subscription.totalPerDelivery || 0);
  const deliveryCharge = 0;
  const discountAmount = 0;
  const total = subtotal + deliveryCharge - discountAmount;

  return {
    id: createSubscriptionOrderId(subscription.id, subscription.nextDeliveryDate),
    customerName: subscription.customerName,
    customerEmail: subscription.customerEmail,
    customer: {
      fullName: subscription.customerName,
      name: subscription.customerName,
      email: subscription.customerEmail,
      phone: subscription.customerPhone || "",
      address: subscription.addressSummary,
      landmark: "",
      pincode: subscription.pincode,
      deliveryDate: subscription.nextDeliveryDate,
      deliverySlot: subscription.preferredDeliverySlot,
      deliverySlotDetails: {
        id: subscription.preferredDeliverySlot,
        label: subscription.preferredDeliverySlot,
      },
      paymentMethod: subscription.paymentMode,
    },
    items: subscription.items.map((item) => ({
      id: item.productId,
      slug: item.slug,
      name: item.name,
      image: item.image,
      category: item.category,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
    })),
    subtotal,
    deliveryCharge,
    discountAmount,
    total,
    paymentStatus: getPaymentStatus(subscription.paymentMode),
    paymentReference: "",
    status: "Confirmed",
    source: "Subscription",
    subscriptionId: subscription.id,
    createdAt: now,
    statusHistory: [
      {
        status: "Confirmed",
        message: `Order generated from subscription ${subscription.id}.`,
        updatedAt: now,
        updatedBy: "Subscription Order Generator",
      },
    ],
  };
};

const getStatusBadgeClass = (nextDeliveryDate: string) => {
  const todayTime = getDateOnlyTime(new Date().toISOString());
  const deliveryTime = getDateOnlyTime(nextDeliveryDate);

  if (deliveryTime < todayTime) return "bg-red-50 text-red-700";
  if (deliveryTime === todayTime) return "bg-orange-50 text-orange-700";

  return "bg-blue-50 text-blue-700";
};

const getStatusText = (nextDeliveryDate: string) => {
  const todayTime = getDateOnlyTime(new Date().toISOString());
  const deliveryTime = getDateOnlyTime(nextDeliveryDate);

  if (deliveryTime < todayTime) return "Overdue";
  if (deliveryTime === todayTime) return "Due Today";

  return "Upcoming";
};

export default function AdminSubscriptionOrderGeneratorPage() {
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [orders, setOrders] = useState<GeneratedOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("Due Today");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadData();
    setIsCheckingAuth(false);
  }, [router]);

  const loadData = () => {
    setSubscriptions(getAllSubscriptions());
    setOrders(readOrders());
  };

  const activeSubscriptions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return subscriptions
      .filter((subscription) => subscription.status === "Active")
      .filter((subscription) => {
        const matchesSearch =
          search.length === 0 ||
          subscription.id.toLowerCase().includes(search) ||
          subscription.customerName.toLowerCase().includes(search) ||
          subscription.customerEmail.toLowerCase().includes(search) ||
          subscription.customerPhone?.includes(search) ||
          subscription.pincode.includes(search) ||
          subscription.items.some((item) => item.name.toLowerCase().includes(search));

        return matchesSearch && isWithinDateFilter(subscription, dateFilter);
      })
      .sort(
        (a, b) =>
          getDateOnlyTime(a.nextDeliveryDate) -
          getDateOnlyTime(b.nextDeliveryDate)
      );
  }, [dateFilter, searchQuery, subscriptions]);

  const alreadyGeneratedKeys = useMemo(() => {
    return new Set(
      orders
        .filter((order) => order.source === "Subscription" && order.subscriptionId)
        .map(getOrderKey)
    );
  }, [orders]);

  const eligibleSubscriptions = useMemo(() => {
    return activeSubscriptions.filter((subscription) => {
      return !alreadyGeneratedKeys.has(getGeneratedOrderKey(subscription));
    });
  }, [activeSubscriptions, alreadyGeneratedKeys]);

  const stats = useMemo(() => {
    const todayTime = getDateOnlyTime(new Date().toISOString());

    const active = subscriptions.filter(
      (subscription) => subscription.status === "Active"
    );

    const dueToday = active.filter(
      (subscription) => getDateOnlyTime(subscription.nextDeliveryDate) === todayTime
    );

    const overdue = active.filter(
      (subscription) => getDateOnlyTime(subscription.nextDeliveryDate) < todayTime
    );

    return {
      active: active.length,
      filtered: activeSubscriptions.length,
      eligible: eligibleSubscriptions.length,
      alreadyGenerated: activeSubscriptions.length - eligibleSubscriptions.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      possibleValue: eligibleSubscriptions.reduce(
        (sum, subscription) => sum + Number(subscription.totalPerDelivery || 0),
        0
      ),
    };
  }, [activeSubscriptions, eligibleSubscriptions, subscriptions]);

  const advanceSubscriptions = (generatedSubscriptions: CustomerSubscription[]) => {
    const now = new Date().toISOString();

    const generatedSubscriptionIds = new Set(
      generatedSubscriptions.map((subscription) => subscription.id)
    );

    const updatedSubscriptions = getAllSubscriptions().map((subscription) => {
      if (!generatedSubscriptionIds.has(subscription.id)) return subscription;

      const nextDeliveryDate = calculateNextDeliveryDate(
        subscription.nextDeliveryDate,
        subscription.frequency
      );

      return {
        ...subscription,
        nextDeliveryDate,
        updatedAt: now,
        history: [
          {
            status: subscription.status,
            message: `Subscription order generated. Next delivery moved to ${nextDeliveryDate}.`,
            updatedAt: now,
            updatedBy: "Subscription Order Generator",
          },
          ...(subscription.history || []),
        ],
      };
    });

    saveAllSubscriptions(updatedSubscriptions);
  };

  const generateOrders = (subscriptionsToGenerate: CustomerSubscription[]) => {
    if (subscriptionsToGenerate.length === 0) {
      toast.error("No eligible subscription deliveries to generate");
      return;
    }

    const existingOrders = readOrders();
    const existingKeys = new Set(
      existingOrders
        .filter((order) => order.source === "Subscription" && order.subscriptionId)
        .map(getOrderKey)
    );

    const newOrders = subscriptionsToGenerate
      .filter((subscription) => !existingKeys.has(getGeneratedOrderKey(subscription)))
      .map(buildOrderFromSubscription);

    if (newOrders.length === 0) {
      toast.error("Orders are already generated for selected subscriptions");
      return;
    }

    saveOrders([...newOrders, ...existingOrders]);
    advanceSubscriptions(subscriptionsToGenerate);

    loadData();
    toast.success(`${newOrders.length} subscription order(s) generated`);
  };

  const generateSingleOrder = (subscription: CustomerSubscription) => {
    generateOrders([subscription]);
  };

  const generateAllFilteredOrders = () => {
    const confirmGenerate = window.confirm(
      `Generate ${eligibleSubscriptions.length} subscription order(s)?`
    );

    if (!confirmGenerate) return;

    generateOrders(eligibleSubscriptions);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("Due Today");
  };

  const exportCsv = () => {
    if (activeSubscriptions.length === 0) {
      toast.error("No subscription deliveries to export");
      return;
    }

    const headers = [
      "Subscription ID",
      "Customer",
      "Email",
      "Phone",
      "Products",
      "Next Delivery",
      "Slot",
      "Pincode",
      "Value",
      "Order Generated",
    ];

    const rows = activeSubscriptions.map((subscription) => [
      subscription.id,
      subscription.customerName,
      subscription.customerEmail,
      subscription.customerPhone || "",
      subscription.items
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(" | "),
      subscription.nextDeliveryDate,
      subscription.preferredDeliverySlot,
      subscription.pincode,
      subscription.totalPerDelivery,
      alreadyGeneratedKeys.has(getGeneratedOrderKey(subscription)) ? "Yes" : "No",
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
    link.download = `pujafresh-subscription-order-generator-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Subscription generator CSV exported");
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
              Subscription Order Generator
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Convert due active subscriptions into normal customer orders for
              delivery, invoice and admin order processing.
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
              href="/admin/subscription-calendar"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Calendar
            </Link>

            <button
              onClick={loadData}
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
            <p className="text-sm font-semibold text-gray-500">Filtered</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.filtered}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Eligible</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.eligible}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Generated</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.alreadyGenerated}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Value</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-700">
              {formatCurrency(stats.possibleValue)}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_200px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Subscriptions
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
                onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {dateFilters.map((filter) => (
                  <option key={filter}>{filter}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateAllFilteredOrders}
                disabled={eligibleSubscriptions.length === 0}
                className="w-full rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white hover:bg-[#64180f] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Generate All
              </button>
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
            Showing {activeSubscriptions.length} active subscription delivery
            {activeSubscriptions.length !== 1 ? "ies" : "y"}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {activeSubscriptions.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No active subscription deliveries found
              </h2>

              <p className="mt-2 text-gray-600">
                Approve customer subscriptions first, then generate delivery
                orders from this page.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeSubscriptions.map((subscription) => {
                const isAlreadyGenerated = alreadyGeneratedKeys.has(
                  getGeneratedOrderKey(subscription)
                );

                return (
                  <div
                    key={subscription.id}
                    className={`rounded-xl border p-4 ${
                      isAlreadyGenerated
                        ? "border-green-200 bg-green-50/40"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-4xl">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                              subscription.nextDeliveryDate
                            )}`}
                          >
                            {getStatusText(subscription.nextDeliveryDate)}
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                            {subscription.frequency}
                          </span>

                          {isAlreadyGenerated && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                              Order Generated
                            </span>
                          )}
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
                          Delivery: {formatDate(subscription.nextDeliveryDate)} •{" "}
                          {subscription.preferredDeliverySlot}
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          Address: {subscription.addressSummary} - {subscription.pincode}
                        </p>
                      </div>

                      <div className="min-w-[220px] text-right">
                        <p className="text-2xl font-black text-[#7a1e13]">
                          {formatCurrency(subscription.totalPerDelivery)}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          per delivery
                        </p>

                        <div className="mt-4 grid gap-2">
                          <button
                            onClick={() => generateSingleOrder(subscription)}
                            disabled={isAlreadyGenerated}
                            className="rounded bg-[#7a1e13] px-4 py-2 text-xs font-bold text-white hover:bg-[#64180f] disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            Generate Order
                          </button>

                          <Link
                            href="/admin"
                            className="rounded border border-gray-300 px-4 py-2 text-center text-xs font-bold text-gray-700 hover:bg-gray-900 hover:text-white"
                          >
                            Open Orders
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
