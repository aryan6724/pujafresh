"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { addPaymentStatusNotification } from "@/utils/customerNotificationStorage";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

type StatusHistory = {
  status: string;
  message: string;
  updatedAt: string;
  updatedBy: string;
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
    paymentMethod?: string;
  };
  items?: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total?: number;
  coupon?: {
    code?: string;
  } | null;
  loyalty?: {
    pointsRedeemed?: number;
    redemptionAmount?: number;
  };
  paymentStatus?: string;
  paymentReference?: string;
  status?: string;
  createdAt?: string;
  statusHistory?: StatusHistory[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const paymentStatuses = [
  "Payment Pending",
  "Verification Pending",
  "Payment Received",
  "Payment Failed",
  "Refunded",
];

const paymentFilters = ["All Payment", ...paymentStatuses];

const methodFilters = [
  "All Methods",
  "Cash on Delivery",
  "UPI QR Payment",
  "UPI",
  "Bank Transfer",
  "Card Payment",
];

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
    "Customer"
  );
};

const getCustomerEmail = (order: Order) => {
  return order.customerEmail || order.customer?.email || "N/A";
};

const getCustomerPhone = (order: Order) => {
  return order.customer?.phone || "N/A";
};

const getPaymentMethod = (order: Order) => {
  return order.customer?.paymentMethod || "N/A";
};

const getDefaultPaymentStatus = (order: Order) => {
  if (order.paymentStatus) return order.paymentStatus;

  const paymentMethod = getPaymentMethod(order);

  if (paymentMethod === "UPI QR Payment" || paymentMethod === "Bank Transfer") {
    return "Verification Pending";
  }

  return "Payment Pending";
};

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    const parsedOrders = savedOrders
      ? (JSON.parse(savedOrders) as Order[])
      : [];

    const orders = Array.isArray(parsedOrders) ? parsedOrders : [];

    const normalizedOrders = orders.map((order) => ({
      ...order,
      paymentStatus: getDefaultPaymentStatus(order),
    }));

    if (!lastOrder) return normalizedOrders;

    const parsedLastOrder = {
      ...(JSON.parse(lastOrder) as Order),
    };

    parsedLastOrder.paymentStatus = getDefaultPaymentStatus(parsedLastOrder);

    const existsInOrders = normalizedOrders.some(
      (order) => order.id === parsedLastOrder.id
    );

    return existsInOrders ? normalizedOrders : [parsedLastOrder, ...normalizedOrders];
  } catch {
    return [];
  }
};

const saveOrders = (orders: Order[]) => {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));

  const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

  if (!lastOrder) return;

  try {
    const parsedLastOrder = JSON.parse(lastOrder) as Order;
    const updatedLastOrder = orders.find(
      (order) => order.id === parsedLastOrder.id
    );

    if (updatedLastOrder) {
      localStorage.setItem(
        LAST_ORDER_STORAGE_KEY,
        JSON.stringify(updatedLastOrder)
      );
    }
  } catch {
    // Ignore invalid last order data.
  }
};

const getPaymentBadgeClass = (paymentStatus?: string) => {
  if (paymentStatus === "Payment Received") return "bg-green-50 text-green-700";
  if (paymentStatus === "Verification Pending") return "bg-orange-50 text-orange-700";
  if (paymentStatus === "Payment Failed") return "bg-red-50 text-red-700";
  if (paymentStatus === "Refunded") return "bg-purple-50 text-purple-700";

  return "bg-gray-100 text-gray-700";
};

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All Payment");
  const [methodFilter, setMethodFilter] = useState("All Methods");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadOrders();
    setIsCheckingAuth(false);
  }, [router]);

  const loadOrders = () => {
    setOrders(readOrders());
  };

  const filteredOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const paymentMethod = getPaymentMethod(order);

      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        getCustomerName(order).toLowerCase().includes(search) ||
        getCustomerEmail(order).toLowerCase().includes(search) ||
        getCustomerPhone(order).includes(search) ||
        String(order.paymentReference || "").toLowerCase().includes(search);

      const matchesPayment =
        paymentFilter === "All Payment" ||
        order.paymentStatus === paymentFilter;

      const matchesMethod =
        methodFilter === "All Methods" || paymentMethod === methodFilter;

      return matchesSearch && matchesPayment && matchesMethod;
    });
  }, [methodFilter, orders, paymentFilter, searchQuery]);

  const stats = useMemo(() => {
    const paymentReceivedOrders = orders.filter(
      (order) => order.paymentStatus === "Payment Received"
    );

    const pendingOrders = orders.filter(
      (order) =>
        order.paymentStatus === "Payment Pending" ||
        order.paymentStatus === "Verification Pending"
    );

    const failedOrders = orders.filter(
      (order) => order.paymentStatus === "Payment Failed"
    );

    const refundedOrders = orders.filter(
      (order) => order.paymentStatus === "Refunded"
    );

    return {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      receivedCount: paymentReceivedOrders.length,
      receivedValue: paymentReceivedOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
      pendingCount: pendingOrders.length,
      pendingValue: pendingOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
      failedCount: failedOrders.length,
      refundedCount: refundedOrders.length,
      refundedValue: refundedOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
    };
  }, [orders]);

  const clearFilters = () => {
    setSearchQuery("");
    setPaymentFilter("All Payment");
    setMethodFilter("All Methods");
  };

  const updatePaymentStatus = (orderId: string, newPaymentStatus: string) => {
    const now = new Date().toISOString();

    const updatedOrders = orders.map((order) => {
      if (order.id !== orderId) return order;

      const updatedHistory: StatusHistory[] = [
        ...(order.statusHistory || []),
        {
          status: `Payment: ${newPaymentStatus}`,
          message: `Payment status updated to ${newPaymentStatus}.`,
          updatedAt: now,
          updatedBy: "Admin",
        },
      ];

      return {
        ...order,
        paymentStatus: newPaymentStatus,
        statusHistory: updatedHistory,
      };
    });

    saveOrders(updatedOrders);
    setOrders(updatedOrders);

    const updatedOrder = updatedOrders.find((order) => order.id === orderId);

    if (updatedOrder) {
      addPaymentStatusNotification(updatedOrder, newPaymentStatus);
    }

    toast.success(`Payment status updated to ${newPaymentStatus}`);
  };

  const verifyPayment = (orderId: string) => {
    updatePaymentStatus(orderId, "Payment Received");
  };

  const rejectPayment = (orderId: string) => {
    const confirmReject = window.confirm(
      "Mark this payment as failed? Customer will receive a payment failed notification."
    );

    if (!confirmReject) return;

    updatePaymentStatus(orderId, "Payment Failed");
  };

  const refundPayment = (orderId: string) => {
    const confirmRefund = window.confirm(
      "Mark this order payment as refunded?"
    );

    if (!confirmRefund) return;

    updatePaymentStatus(orderId, "Refunded");
  };

  const exportCsv = () => {
    if (filteredOrders.length === 0) {
      toast.error("No payment records to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer",
      "Email",
      "Phone",
      "Payment Method",
      "Payment Status",
      "Payment Reference",
      "Order Status",
      "Subtotal",
      "Delivery Charge",
      "Discount",
      "Total",
      "Created At",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      getCustomerName(order),
      getCustomerEmail(order),
      getCustomerPhone(order),
      getPaymentMethod(order),
      order.paymentStatus || "",
      order.paymentReference || "",
      order.status || "",
      order.subtotal || 0,
      order.deliveryCharge || 0,
      order.discountAmount || 0,
      order.total || 0,
      formatDateTime(order.createdAt),
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
    link.download = `pujafresh-payment-records-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Payment records exported");
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
              Payment Verification
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Verify UPI/manual payments, track pending payments, mark failed
              payments and update refunds.
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
              href="/admin/invoices"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Invoices
            </Link>

            <button
              onClick={loadOrders}
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm xl:col-span-2">
            <p className="text-sm font-semibold text-gray-500">Total Value</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {formatCurrency(stats.totalValue)}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Received</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.receivedCount}
            </h2>
            <p className="mt-1 text-xs font-bold text-green-700">
              {formatCurrency(stats.receivedValue)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.pendingCount}
            </h2>
            <p className="mt-1 text-xs font-bold text-orange-600">
              {formatCurrency(stats.pendingValue)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Failed</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.failedCount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Refunded</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.refundedCount}
            </h2>
            <p className="mt-1 text-xs font-bold text-purple-700">
              {formatCurrency(stats.refundedValue)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Payments
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order ID, customer, email, phone or UTR..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Payment Status
              </label>

              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {paymentFilters.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Payment Method
              </label>

              <select
                value={methodFilter}
                onChange={(event) => setMethodFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {methodFilters.map((method) => (
                  <option key={method}>{method}</option>
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
            Showing {filteredOrders.length} of {orders.length} payment record
            {orders.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No payment records found
              </h2>

              <p className="mt-2 text-gray-600">
                Customer orders will appear here after checkout or demo data
                seeding.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#fff7ed] text-[#7a1e13]">
                    <th className="border-b px-4 py-3">Order</th>
                    <th className="border-b px-4 py-3">Customer</th>
                    <th className="border-b px-4 py-3">Method</th>
                    <th className="border-b px-4 py-3">Reference / UTR</th>
                    <th className="border-b px-4 py-3">Payment</th>
                    <th className="border-b px-4 py-3">Order Status</th>
                    <th className="border-b px-4 py-3 text-right">Total</th>
                    <th className="border-b px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b align-top hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <p className="font-black text-gray-900">{order.id}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900">
                          {getCustomerName(order)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {getCustomerPhone(order)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {getCustomerEmail(order)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {getPaymentMethod(order)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[180px] break-words font-bold text-gray-800">
                          {order.paymentReference || "N/A"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={order.paymentStatus || "Payment Pending"}
                          onChange={(event) =>
                            updatePaymentStatus(order.id, event.target.value)
                          }
                          className={`rounded border px-3 py-2 text-xs font-bold outline-none ${getPaymentBadgeClass(
                            order.paymentStatus
                          )}`}
                        >
                          {paymentStatuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {order.status || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-black text-[#7a1e13]">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => verifyPayment(order.id)}
                            className="rounded bg-[#15803d] px-3 py-2 text-xs font-bold text-white hover:bg-[#166534]"
                          >
                            Verify
                          </button>

                          <button
                            onClick={() => rejectPayment(order.id)}
                            className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            Fail
                          </button>

                          <button
                            onClick={() => refundPayment(order.id)}
                            className="rounded border border-purple-600 px-3 py-2 text-xs font-bold text-purple-600 hover:bg-purple-600 hover:text-white"
                          >
                            Refund
                          </button>

                          <Link
                            href={`/invoice?orderId=${encodeURIComponent(order.id)}`}
                            className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                          >
                            Invoice
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
