"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  addPaymentStatusNotification,
  addReturnRefundStatusNotification,
} from "@/utils/customerNotificationStorage";

type Product = {
  id?: number | string;
  name: string;
  slug?: string;
  price: number;
  image?: string;
  category?: string;
  badge?: string;
  description?: string;
};

type OrderItem = Product & {
  quantity: number;
};

type RefundRequest = {
  id: string;
  type: "Return" | "Refund" | "Replacement";
  reason: string;
  description?: string;
  status: "Requested" | "Approved" | "Rejected" | "Refunded" | "Completed";
  requestedAt: string;
  updatedAt?: string;
  updatedBy?: string;
  adminNote?: string;
  refundAmount?: number;
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
  customer: {
    fullName?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    pincode?: string;
    paymentMethod?: string;
  };
  items: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total: number;
  status: string;
  paymentStatus?: string;
  paymentReference?: string;
  createdAt: string;
  refundRequest?: RefundRequest | null;
  statusHistory?: StatusHistory[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const statusOptions = [
  "All Requests",
  "Requested",
  "Approved",
  "Rejected",
  "Refunded",
  "Completed",
];

const typeOptions = ["All Types", "Return", "Refund", "Replacement"];

export default function AdminReturnRefundPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Requests");
  const [typeFilter, setTypeFilter] = useState("All Types");

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
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

      const parsedOrders = savedOrders
        ? (JSON.parse(savedOrders) as Order[])
        : [];

      const orders = Array.isArray(parsedOrders) ? parsedOrders : [];

      if (!lastOrder) {
        setOrders(orders);
        return;
      }

      const parsedLastOrder = JSON.parse(lastOrder) as Order;

      const existsInOrders = orders.some(
        (order) => order.id === parsedLastOrder.id
      );

      setOrders(existsInOrders ? orders : [parsedLastOrder, ...orders]);
    } catch {
      setOrders([]);
    }
  };

  const requestOrders = useMemo(() => {
    return orders
      .filter((order) => order.refundRequest)
      .sort(
        (a, b) =>
          new Date(b.refundRequest?.requestedAt || b.createdAt).getTime() -
          new Date(a.refundRequest?.requestedAt || a.createdAt).getTime()
      );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return requestOrders.filter((order) => {
      const request = order.refundRequest;
      if (!request) return false;

      const customerName =
        order.customer?.fullName ||
        order.customer?.name ||
        order.customerName ||
        "";

      const customerEmail =
        order.customer?.email || order.customerEmail || "";

      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        request.id.toLowerCase().includes(search) ||
        request.reason.toLowerCase().includes(search) ||
        request.description?.toLowerCase().includes(search) ||
        customerName.toLowerCase().includes(search) ||
        customerEmail.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Requests" || request.status === statusFilter;

      const matchesType =
        typeFilter === "All Types" || request.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requestOrders, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const requested = requestOrders.filter(
      (order) => order.refundRequest?.status === "Requested"
    ).length;

    const approved = requestOrders.filter(
      (order) => order.refundRequest?.status === "Approved"
    ).length;

    const rejected = requestOrders.filter(
      (order) => order.refundRequest?.status === "Rejected"
    ).length;

    const refunded = requestOrders.filter(
      (order) => order.refundRequest?.status === "Refunded"
    ).length;

    const totalRefundAmount = requestOrders
      .filter((order) => order.refundRequest?.status === "Refunded")
      .reduce(
        (sum, order) => sum + Number(order.refundRequest?.refundAmount || 0),
        0
      );

    return {
      total: requestOrders.length,
      requested,
      approved,
      rejected,
      refunded,
      totalRefundAmount,
    };
  }, [requestOrders]);

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
      "Customer"
    );
  };

  const getCustomerEmail = (order: Order) => {
    return order.customer?.email || order.customerEmail || "Not provided";
  };

  const saveUpdatedOrder = (updatedOrder: Order) => {
    const updatedOrders = orders.map((order) =>
      order.id === updatedOrder.id ? updatedOrder : order
    );

    setOrders(updatedOrders);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));

    const lastOrder = localStorage.getItem("pujafresh-last-order");

    if (lastOrder) {
      try {
        const parsedLastOrder = JSON.parse(lastOrder) as Order;

        if (parsedLastOrder.id === updatedOrder.id) {
          localStorage.setItem(
            "pujafresh-last-order",
            JSON.stringify(updatedOrder)
          );
        }
      } catch {
        // Ignore invalid last order data.
      }
    }
  };

  const updateRequestStatus = (
    order: Order,
    status: RefundRequest["status"]
  ) => {
    if (!order.refundRequest) return;

    const adminNote =
      window.prompt(`Add admin note for ${status} status`) ||
      order.refundRequest.adminNote ||
      "";

    const refundAmountInput =
      status === "Refunded"
        ? window.prompt(
            "Enter refunded amount",
            String(order.refundRequest.refundAmount || order.total)
          )
        : String(order.refundRequest.refundAmount || order.total);

    const refundAmount = Number(refundAmountInput || order.total);

    if (status === "Refunded" && (!Number.isFinite(refundAmount) || refundAmount < 0)) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    const now = new Date().toISOString();

    const updatedRequest: RefundRequest = {
      ...order.refundRequest,
      status,
      adminNote,
      refundAmount,
      updatedAt: now,
      updatedBy: "Admin",
    };

    const updatedOrder: Order = {
      ...order,
      refundRequest: updatedRequest,
      paymentStatus: status === "Refunded" ? "Refunded" : order.paymentStatus,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: `Return/Refund ${status}`,
          message: `${updatedRequest.type} request marked as ${status} by admin.${
            adminNote ? ` Note: ${adminNote}` : ""
          }`,
          updatedAt: now,
          updatedBy: "Admin",
        },
      ],
    };

    saveUpdatedOrder(updatedOrder);

    addReturnRefundStatusNotification(updatedOrder, status);

    if (status === "Refunded") {
      addPaymentStatusNotification(
        {
          ...updatedOrder,
          paymentStatus: "Refunded",
        },
        "Refunded"
      );
    }

    toast.success(`Request marked as ${status}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Requests");
    setTypeFilter("All Types");
  };

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      toast.error("No requests to export");
      return;
    }

    const headers = [
      "Request ID",
      "Order ID",
      "Type",
      "Status",
      "Customer",
      "Email",
      "Reason",
      "Description",
      "Order Total",
      "Refund Amount",
      "Requested At",
      "Updated At",
      "Admin Note",
    ];

    const rows = filteredOrders.map((order) => [
      order.refundRequest?.id || "",
      order.id,
      order.refundRequest?.type || "",
      order.refundRequest?.status || "",
      getCustomerName(order),
      getCustomerEmail(order),
      order.refundRequest?.reason || "",
      order.refundRequest?.description || "",
      order.total,
      order.refundRequest?.refundAmount || "",
      order.refundRequest?.requestedAt
        ? formatDateTime(order.refundRequest.requestedAt)
        : "",
      order.refundRequest?.updatedAt
        ? formatDateTime(order.refundRequest.updatedAt)
        : "",
      order.refundRequest?.adminNote || "",
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
    link.download = `pujafresh-return-refund-requests-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Return/refund CSV exported");
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusClass = (status?: string) => {
    if (status === "Requested") return "bg-orange-50 text-orange-700";
    if (status === "Approved") return "bg-blue-50 text-blue-700";
    if (status === "Rejected") return "bg-red-50 text-red-700";
    if (status === "Refunded") return "bg-green-50 text-green-700";
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
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Return & Refund Requests
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage customer return, refund and replacement requests.
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
              onClick={handlePrint}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Print
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-gray-900">
            PujaFresh Return & Refund Requests
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Printed on {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Requests
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Requested</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.requested}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Approved</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-600">
              {stats.approved}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Rejected</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.rejected}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Refunded</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.refunded}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Refund Amount
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              ₹{stats.totalRefundAmount}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Requests
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by request ID, order ID, customer or reason..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Status Filter
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Type Filter
              </label>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {typeOptions.map((type) => (
                  <option key={type}>{type}</option>
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
            Showing {filteredOrders.length} of {requestOrders.length} request
            {requestOrders.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No return/refund requests found
              </h2>

              <p className="mt-2 text-gray-600">
                Requests will appear here when customers submit them from My
                Orders.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order) => {
                const request = order.refundRequest;

                if (!request) return null;

                return (
                  <div
                    key={request.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                            {request.id}
                          </span>

                          <span className="rounded bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                            {request.type}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-gray-900">
                          Order {order.id}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          {getCustomerName(order)} • {getCustomerEmail(order)}
                        </p>

                        <p className="mt-3 text-sm text-gray-700">
                          <span className="font-bold">Reason:</span>{" "}
                          {request.reason}
                        </p>

                        {request.description && (
                          <p className="mt-2 text-sm text-gray-700">
                            <span className="font-bold">Details:</span>{" "}
                            {request.description}
                          </p>
                        )}

                        {request.adminNote && (
                          <p className="mt-2 rounded bg-[#fff7ed] p-2 text-sm text-gray-700">
                            <span className="font-bold">Admin Note:</span>{" "}
                            {request.adminNote}
                          </p>
                        )}

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                          <div>
                            <p className="text-gray-500">Order Total</p>
                            <p className="font-bold text-gray-900">
                              ₹{order.total}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">Refund Amount</p>
                            <p className="font-bold text-gray-900">
                              ₹{request.refundAmount || order.total}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">Payment Status</p>
                            <p className="font-bold text-gray-900">
                              {order.paymentStatus || "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">Requested</p>
                            <p className="font-bold text-gray-900">
                              {formatDateTime(request.requestedAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap content-start gap-2 print:hidden">
                        <button
                          onClick={() => updateRequestStatus(order, "Approved")}
                          disabled={request.status === "Approved"}
                          className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => updateRequestStatus(order, "Rejected")}
                          disabled={request.status === "Rejected"}
                          className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => updateRequestStatus(order, "Refunded")}
                          disabled={request.status === "Refunded"}
                          className="rounded bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          Mark Refunded
                        </button>

                        <button
                          onClick={() => updateRequestStatus(order, "Completed")}
                          disabled={request.status === "Completed"}
                          className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          Complete
                        </button>

                        <Link
                          href={`/invoice/${order.id}`}
                          className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                        >
                          Invoice
                        </Link>
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
