"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

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
  items?: OrderItem[];
  total?: number;
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const statusFilters = [
  "All Status",
  "Pending",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Delivery Failed",
  "Cancelled",
];

const paymentFilters = [
  "All Payment",
  "Payment Pending",
  "Verification Pending",
  "Payment Received",
  "Payment Failed",
  "Refunded",
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

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const getCustomerPhone = (order: Order) => {
  return order.customer?.phone || "N/A";
};

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    const parsedOrders = savedOrders
      ? (JSON.parse(savedOrders) as Order[])
      : [];

    const orders = Array.isArray(parsedOrders) ? parsedOrders : [];

    if (!lastOrder) return orders;

    const parsedLastOrder = JSON.parse(lastOrder) as Order;

    const existsInOrders = orders.some((order) => order.id === parsedLastOrder.id);

    return existsInOrders ? orders : [parsedLastOrder, ...orders];
  } catch {
    return [];
  }
};

export default function AdminInvoicesPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [paymentFilter, setPaymentFilter] = useState("All Payment");
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
      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        getCustomerName(order).toLowerCase().includes(search) ||
        order.customerEmail?.toLowerCase().includes(search) ||
        order.customer?.email?.toLowerCase().includes(search) ||
        order.customer?.phone?.includes(search);

      const matchesStatus =
        statusFilter === "All Status" || order.status === statusFilter;

      const matchesPayment =
        paymentFilter === "All Payment" ||
        order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, paymentFilter, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const paidRevenue = orders
      .filter((order) => order.paymentStatus === "Payment Received")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      totalOrders: orders.length,
      invoices: orders.length,
      delivered: orders.filter((order) => order.status === "Delivered").length,
      paymentReceived: orders.filter(
        (order) => order.paymentStatus === "Payment Received"
      ).length,
      pendingPayment: orders.filter(
        (order) =>
          order.paymentStatus === "Payment Pending" ||
          order.paymentStatus === "Verification Pending"
      ).length,
      revenue,
      paidRevenue,
    };
  }, [orders]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Status");
    setPaymentFilter("All Payment");
  };

  const exportInvoiceCsv = () => {
    if (filteredOrders.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    const headers = [
      "Invoice No",
      "Order ID",
      "Customer",
      "Phone",
      "Email",
      "Order Status",
      "Payment Status",
      "Subtotal",
      "Delivery Charge",
      "Discount",
      "Total",
      "Order Date",
      "Delivery Date",
      "Delivery Slot",
    ];

    const rows = filteredOrders.map((order) => [
      `INV-${order.id.replace(/[^A-Za-z0-9]/g, "")}`,
      order.id,
      getCustomerName(order),
      getCustomerPhone(order),
      order.customerEmail || order.customer?.email || "",
      order.status || "",
      order.paymentStatus || "",
      order.subtotal || 0,
      order.deliveryCharge || 0,
      order.discountAmount || 0,
      order.total || 0,
      formatDateTime(order.createdAt),
      formatDate(order.customer?.deliveryDate),
      order.customer?.deliverySlotDetails?.label || order.customer?.deliverySlot || "",
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
    link.download = `pujafresh-invoices-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Invoices CSV exported");
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
              Invoices & Bills
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Generate customer invoices, print bills and export invoice
              records for PujaFresh orders.
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
              href="/invoice"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Customer Invoice Page
            </Link>

            <button
              onClick={loadOrders}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={exportInvoiceCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-7">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Invoices</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.invoices}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivered</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.delivered}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Paid</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.paymentReceived}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending Pay</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.pendingPayment}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
            <p className="text-sm font-semibold text-gray-500">
              Total Invoice Value
            </p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {formatCurrency(stats.revenue)}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Paid Value</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {formatCurrency(stats.paidRevenue)}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_190px_190px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Invoices
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order ID, customer, email or phone..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
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

            <div>
              <label className="text-sm font-bold text-gray-700">
                Payment
              </label>

              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {paymentFilters.map((payment) => (
                  <option key={payment}>{payment}</option>
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
            Showing {filteredOrders.length} of {orders.length} invoice
            {orders.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No invoices found
              </h2>

              <p className="mt-2 text-gray-600">
                Orders will appear here after customer checkout or demo data
                seeding.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#fff7ed] text-[#7a1e13]">
                    <th className="border-b px-4 py-3">Invoice</th>
                    <th className="border-b px-4 py-3">Customer</th>
                    <th className="border-b px-4 py-3">Order Status</th>
                    <th className="border-b px-4 py-3">Payment</th>
                    <th className="border-b px-4 py-3">Order Date</th>
                    <th className="border-b px-4 py-3">Delivery</th>
                    <th className="border-b px-4 py-3 text-right">Total</th>
                    <th className="border-b px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <p className="font-black text-gray-900">
                          INV-{order.id.replace(/[^A-Za-z0-9]/g, "")}
                        </p>
                        <p className="text-xs font-semibold text-gray-500">
                          {order.id}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900">
                          {getCustomerName(order)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getCustomerPhone(order)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {order.status || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {order.paymentStatus || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {formatDateTime(order.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        <p>{formatDate(order.customer?.deliveryDate)}</p>
                        <p className="text-xs text-gray-500">
                          {order.customer?.deliverySlotDetails?.label ||
                            order.customer?.deliverySlot ||
                            "N/A"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right font-black text-[#7a1e13]">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/invoice?orderId=${encodeURIComponent(order.id)}`}
                          className="rounded bg-[#7a1e13] px-4 py-2 text-xs font-bold text-white hover:bg-[#64180f]"
                        >
                          Open Invoice
                        </Link>
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
