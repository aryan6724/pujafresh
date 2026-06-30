"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Package,
  ShoppingCart,
  TrendingUp,
  User,
} from "lucide-react";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled"
  | "Archived";

type Order = {
  id: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount?: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  customer?: {
    paymentMethod?: string;
    phone?: string;
    pincode?: string;
  };
};

type UserAccount = {
  fullName: string;
  email: string;
  phone: string;
};

type NewsletterSubscriber = {
  id: string;
  email: string;
  createdAt: string;
};

type SupportMessage = {
  id: string;
  status: "Open" | "In Progress" | "Resolved";
};

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLast7Days = () => {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    const dateKey = date.toISOString().slice(0, 10);

    return {
      dateKey,
      label: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
    };
  });
};

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn =
      localStorage.getItem("pujafresh-admin-auth") === "true";

    if (!isAdminLoggedIn) {
      router.push("/admin/login");
      return;
    }

    loadAnalyticsData();
    setIsCheckingAuth(false);
  }, [router]);

  const loadAnalyticsData = () => {
    try {
      const savedOrders = JSON.parse(
        localStorage.getItem("pujafresh-orders") || "[]"
      ) as Order[];

      const savedUsers = JSON.parse(
        localStorage.getItem("pujafresh-users") || "[]"
      ) as UserAccount[];

      const savedSubscribers = JSON.parse(
        localStorage.getItem("pujafresh-newsletter-subscribers") || "[]"
      ) as NewsletterSubscriber[];

      const savedSupportMessages = JSON.parse(
        localStorage.getItem("pujafresh-support-messages") || "[]"
      ) as SupportMessage[];

      setOrders(Array.isArray(savedOrders) ? savedOrders : []);
      setUsers(Array.isArray(savedUsers) ? savedUsers : []);
      setSubscribers(Array.isArray(savedSubscribers) ? savedSubscribers : []);
      setSupportMessages(
        Array.isArray(savedSupportMessages) ? savedSupportMessages : []
      );
    } catch {
      setOrders([]);
      setUsers([]);
      setSubscribers([]);
      setSupportMessages([]);
    }
  };

  const validRevenueOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status !== "Cancelled" && order.status !== "Archived"
    );
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((order) => order.status === "Delivered");
  }, [orders]);

  const analytics = useMemo(() => {
    const totalRevenue = validRevenueOrders.reduce(
      (total, order) => total + Number(order.total || 0),
      0
    );

    const deliveredRevenue = deliveredOrders.reduce(
      (total, order) => total + Number(order.total || 0),
      0
    );

    const totalDiscount = validRevenueOrders.reduce(
      (total, order) => total + Number(order.discountAmount || 0),
      0
    );

    const pendingOrders = orders.filter(
      (order) => order.status === "Pending"
    ).length;

    const cancelledOrders = orders.filter(
      (order) => order.status === "Cancelled"
    ).length;

    const activeSupportMessages = supportMessages.filter(
      (message) => message.status !== "Resolved"
    ).length;

    return {
      totalOrders: orders.length,
      totalRevenue,
      deliveredRevenue,
      totalDiscount,
      deliveredOrders: deliveredOrders.length,
      pendingOrders,
      cancelledOrders,
      totalCustomers: users.length,
      subscribers: subscribers.length,
      activeSupportMessages,
    };
  }, [orders, validRevenueOrders, deliveredOrders, users, subscribers, supportMessages]);

  const bestSellingProducts = useMemo(() => {
    const productMap = new Map<
      string,
      {
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    validRevenueOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const existing = productMap.get(item.name);

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          productMap.set(item.name, {
            name: item.name,
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [validRevenueOrders]);

  const paymentReport = useMemo(() => {
    const paymentMap = new Map<string, number>();

    validRevenueOrders.forEach((order) => {
      const paymentMethod =
        order.customer?.paymentMethod || "Cash on Delivery";

      paymentMap.set(paymentMethod, (paymentMap.get(paymentMethod) || 0) + 1);
    });

    return Array.from(paymentMap.entries()).map(([method, count]) => ({
      method,
      count,
    }));
  }, [validRevenueOrders]);

  const last7DaysSales = useMemo(() => {
    const days = getLast7Days();

    return days.map((day) => {
      const dayOrders = validRevenueOrders.filter((order) => {
        return order.createdAt?.slice(0, 10) === day.dateKey;
      });

      const revenue = dayOrders.reduce(
        (total, order) => total + Number(order.total || 0),
        0
      );

      return {
        ...day,
        orders: dayOrders.length,
        revenue,
      };
    });
  }, [validRevenueOrders]);

  const maxDailyRevenue = Math.max(
    ...last7DaysSales.map((day) => day.revenue),
    1
  );

  const recentOrders = useMemo(() => {
    return orders.slice(0, 6);
  }, [orders]);

  const copyReport = () => {
    const report = `
PujaFresh Analytics Report

Total Orders: ${analytics.totalOrders}
Total Revenue: ${formatCurrency(analytics.totalRevenue)}
Delivered Revenue: ${formatCurrency(analytics.deliveredRevenue)}
Delivered Orders: ${analytics.deliveredOrders}
Pending Orders: ${analytics.pendingOrders}
Cancelled Orders: ${analytics.cancelledOrders}
Total Customers: ${analytics.totalCustomers}
Newsletter Subscribers: ${analytics.subscribers}
Active Support Messages: ${analytics.activeSupportMessages}
Total Discount Given: ${formatCurrency(analytics.totalDiscount)}
`;

    navigator.clipboard.writeText(report.trim());
    toast.success("Analytics report copied");
  };

  const handleLogout = () => {
    localStorage.removeItem("pujafresh-admin-auth");
    toast.success("Admin logged out");
    router.push("/admin/login");
  };

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-gray-700">
              Checking admin access...
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f97316]">
              Admin Analytics
            </p>

            <h1 className="mt-2 text-2xl font-black text-gray-900">
              Business Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Track orders, revenue, customers, coupons, products and support
              activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Admin
            </Link>

            <button
              onClick={copyReport}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Copy Report
            </button>

            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">
                Total Revenue
              </p>
              <TrendingUp className="text-[#15803d]" size={22} />
            </div>

            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {formatCurrency(analytics.totalRevenue)}
            </h2>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Excluding cancelled & archived orders
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">
                Total Orders
              </p>
              <ShoppingCart className="text-[#f97316]" size={22} />
            </div>

            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {analytics.totalOrders}
            </h2>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              All order statuses included
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">
                Total Customers
              </p>
              <User className="text-blue-600" size={22} />
            </div>

            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {analytics.totalCustomers}
            </h2>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Registered customer accounts
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">
                Subscribers
              </p>
              <Mail className="text-purple-600" size={22} />
            </div>

            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {analytics.subscribers}
            </h2>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Newsletter emails collected
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Delivered Orders
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#15803d]">
              {analytics.deliveredOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Pending Orders
            </p>
            <h2 className="mt-2 text-3xl font-black text-orange-600">
              {analytics.pendingOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Cancelled Orders
            </p>
            <h2 className="mt-2 text-3xl font-black text-red-600">
              {analytics.cancelledOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Discount Given
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#7a1e13]">
              {formatCurrency(analytics.totalDiscount)}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-4">
              <CalendarDays className="text-[#7a1e13]" size={20} />
              <h2 className="text-xl font-black text-gray-900">
                Last 7 Days Sales
              </h2>
            </div>

            <div className="mt-5 grid gap-4">
              {last7DaysSales.map((day) => {
                const width = `${Math.max(
                  (day.revenue / maxDailyRevenue) * 100,
                  day.revenue > 0 ? 8 : 0
                )}%`;

                return (
                  <div key={day.dateKey}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold text-gray-700">
                        {day.label}
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(day.revenue)} • {day.orders} orders
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#f97316]"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="border-b pb-4 text-xl font-black text-gray-900">
              Payment Method Report
            </h2>

            {paymentReport.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No payment data yet.</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {paymentReport.map((item) => (
                  <div
                    key={item.method}
                    className="flex justify-between rounded-lg bg-[#fff7ed] p-3 text-sm"
                  >
                    <span className="font-bold text-gray-800">
                      {item.method}
                    </span>
                    <span className="font-black text-[#7a1e13]">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-4">
              <Package className="text-[#7a1e13]" size={20} />
              <h2 className="text-xl font-black text-gray-900">
                Best Selling Products
              </h2>
            </div>

            {bestSellingProducts.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">
                Product sales will appear after orders are placed.
              </p>
            ) : (
              <div className="mt-5 grid gap-3">
                {bestSellingProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7a1e13] text-sm font-black text-white">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-black text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Sold qty: {product.quantity}
                        </p>
                      </div>
                    </div>

                    <p className="font-black text-[#15803d]">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="border-b pb-4 text-xl font-black text-gray-900">
              Recent Orders
            </h2>

            {recentOrders.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">
                Recent orders will appear here.
              </p>
            ) : (
              <div className="mt-5 grid gap-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-black text-gray-900">{order.id}</p>
                        <p className="text-xs text-gray-500">
                          {order.customerName} • {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          order.status === "Delivered"
                            ? "bg-green-100 text-green-700"
                            : order.status === "Cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-gray-600">
                        {order.items?.length || 0} item type
                      </span>
                      <span className="font-black text-[#7a1e13]">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}