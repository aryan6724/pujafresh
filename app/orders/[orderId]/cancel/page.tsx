"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

type OrderItem = {
  id?: number | string;
  name?: string;
  price?: number;
  quantity?: number;
  category?: string;
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
  customer?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    pincode?: string;
    paymentMethod?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      label?: string;
      timeRange?: string;
    };
  };
  items?: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total?: number;
  status?: string;
  paymentStatus?: string;
  paymentReference?: string;
  createdAt?: string;
  refundRequest?: RefundRequest | null;
  statusHistory?: StatusHistory[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const requestTypes = ["Return", "Refund", "Replacement"] as const;

const returnReasons = [
  "Wrong product delivered",
  "Damaged product",
  "Product quality issue",
  "Missing item",
  "Late delivery",
  "Changed my mind",
  "Other",
];

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() || "";
const normalizePhone = (phone?: string) => phone?.replace(/\D/g, "") || "";

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

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    const savedLastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];
    const orders = Array.isArray(parsedOrders) ? parsedOrders : [];

    if (!savedLastOrder) return orders;

    const lastOrder = JSON.parse(savedLastOrder) as Order;
    const existsInOrders = orders.some((order) => order.id === lastOrder.id);

    return existsInOrders ? orders : [lastOrder, ...orders];
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
    const updatedLastOrder = orders.find((order) => order.id === parsedLastOrder.id);

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

const getOrderCustomerEmail = (order: Order) => {
  return normalizeEmail(order.customerEmail || order.customer?.email);
};

const getOrderCustomerPhone = (order: Order) => {
  return normalizePhone(order.customer?.phone);
};

const getCustomerName = (order: Order) => {
  return (
    order.customerName ||
    order.customer?.fullName ||
    order.customer?.name ||
    "Customer"
  );
};

const getStatusClass = (status?: string) => {
  if (status === "Requested") return "bg-orange-50 text-orange-700";
  if (status === "Approved") return "bg-blue-50 text-blue-700";
  if (status === "Rejected") return "bg-red-50 text-red-700";
  if (status === "Refunded") return "bg-green-50 text-green-700";
  if (status === "Completed") return "bg-purple-50 text-purple-700";

  return "bg-gray-100 text-gray-700";
};

export default function ReturnRefundPage() {
  const { user, isLoggedIn } = useAuth();
  const searchParams = useSearchParams();

  const selectedOrderId = searchParams.get("orderId") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [formData, setFormData] = useState({
    orderId: selectedOrderId,
    type: "Return" as RefundRequest["type"],
    reason: "",
    description: "",
  });

  const customerEmail = normalizeEmail(user?.email);
  const customerPhone = normalizePhone((user as any)?.phone);

  const loadOrders = () => {
    if (!customerEmail && !customerPhone) {
      setOrders([]);
      return;
    }

    const allOrders = readOrders();

    const matchedOrders = allOrders.filter((order) => {
      const orderEmail = getOrderCustomerEmail(order);
      const orderPhone = getOrderCustomerPhone(order);

      if (customerEmail && orderEmail && customerEmail === orderEmail) return true;
      if (customerPhone && orderPhone && customerPhone === orderPhone) return true;

      return false;
    });

    setOrders(
      matchedOrders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    );
  };

  useEffect(() => {
    loadOrders();
  }, [customerEmail, customerPhone]);

  useEffect(() => {
    if (!selectedOrderId) return;

    setFormData((prev) => ({
      ...prev,
      orderId: selectedOrderId,
    }));
  }, [selectedOrderId]);

  const eligibleOrders = useMemo(() => {
    return orders.filter((order) =>
      ["Delivered", "Delivery Failed"].includes(order.status || "")
    );
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === formData.orderId) || null;
  }, [formData.orderId, orders]);

  const existingRequestOrders = useMemo(() => {
    return orders.filter((order) => order.refundRequest);
  }, [orders]);

  const handleChange = (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!selectedOrder) {
      toast.error("Please select an order");
      return;
    }

    if (!["Delivered", "Delivery Failed"].includes(selectedOrder.status || "")) {
      toast.error("Return/refund can be requested only after delivery");
      return;
    }

    if (selectedOrder.refundRequest) {
      toast.error("Request already exists for this order");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please select a reason");
      return;
    }

    const now = new Date().toISOString();

    const refundRequest: RefundRequest = {
      id: `RF-${Date.now()}`,
      type: formData.type,
      reason: formData.reason.trim(),
      description: formData.description.trim(),
      status: "Requested",
      requestedAt: now,
      refundAmount: Number(selectedOrder.total || 0),
    };

    const allOrders = readOrders();

    const updatedOrders = allOrders.map((order) => {
      if (order.id !== selectedOrder.id) return order;

      return {
        ...order,
        refundRequest,
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: `${refundRequest.type} Requested`,
            message: `${refundRequest.type} request created by customer. Reason: ${refundRequest.reason}`,
            updatedAt: now,
            updatedBy: "Customer",
          },
        ],
      };
    });

    saveOrders(updatedOrders);
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === selectedOrder.id
          ? {
              ...order,
              refundRequest,
              statusHistory: [
                ...(order.statusHistory || []),
                {
                  status: `${refundRequest.type} Requested`,
                  message: `${refundRequest.type} request created by customer. Reason: ${refundRequest.reason}`,
                  updatedAt: now,
                  updatedBy: "Customer",
                },
              ],
            }
          : order
      )
    );

    setFormData({
      orderId: selectedOrder.id,
      type: "Return",
      reason: "",
      description: "",
    });

    toast.success("Return/refund request submitted");
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
              Please login to request return, refund or replacement.
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

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Support
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Return / Refund / Replacement
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Raise a request for delivered orders. Admin can review it from the
            Return & Refund Requests panel.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-black text-gray-900">
              Create Request
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Select Order *
                </label>

                <select
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                >
                  <option value="">Choose delivered order</option>
                  {eligibleOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.id} - {formatCurrency(order.total)}
                    </option>
                  ))}
                </select>

                {eligibleOrders.length === 0 && (
                  <p className="mt-2 text-xs font-semibold text-orange-700">
                    No delivered order found. Requests are available only after
                    order delivery.
                  </p>
                )}
              </div>

              {selectedOrder && (
                <div className="rounded-xl bg-[#fff7ed] p-4 text-sm">
                  <p className="font-black text-gray-900">
                    {selectedOrder.id}
                  </p>
                  <p className="mt-1 text-gray-600">
                    Customer: {getCustomerName(selectedOrder)}
                  </p>
                  <p className="mt-1 text-gray-600">
                    Status: {selectedOrder.status} • Total:{" "}
                    {formatCurrency(selectedOrder.total)}
                  </p>
                  <p className="mt-1 text-gray-600">
                    Items:{" "}
                    {(selectedOrder.items || [])
                      .map((item) => `${item.name} × ${item.quantity}`)
                      .join(", ") || "N/A"}
                  </p>

                  {selectedOrder.refundRequest && (
                    <p className="mt-3 rounded bg-orange-50 p-2 text-xs font-bold text-orange-700">
                      Request already submitted:{" "}
                      {selectedOrder.refundRequest.status}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Request Type *
                </label>

                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                >
                  {requestTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Reason *
                </label>

                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                >
                  <option value="">Choose reason</option>
                  {returnReasons.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Explain the issue clearly..."
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <button
                type="submit"
                disabled={
                  !selectedOrder ||
                  Boolean(selectedOrder.refundRequest) ||
                  !formData.reason.trim()
                }
                className={`rounded px-5 py-3 text-sm font-black text-white ${
                  !selectedOrder ||
                  Boolean(selectedOrder.refundRequest) ||
                  !formData.reason.trim()
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#7a1e13] hover:bg-[#5f160e]"
                }`}
              >
                Submit Request
              </button>
            </div>
          </form>

          <div className="grid gap-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                My Requests
              </h2>

              {existingRequestOrders.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  No return/refund request yet.
                </p>
              ) : (
                <div className="mt-5 grid gap-3">
                  {existingRequestOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-gray-900">
                            {order.refundRequest?.id}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            Order: {order.id}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            order.refundRequest?.status
                          )}`}
                        >
                          {order.refundRequest?.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-bold text-gray-900">
                        {order.refundRequest?.type}:{" "}
                        {order.refundRequest?.reason}
                      </p>

                      {order.refundRequest?.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {order.refundRequest.description}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-gray-500">
                        Requested:{" "}
                        {formatDateTime(order.refundRequest?.requestedAt)}
                      </p>

                      {order.refundRequest?.adminNote && (
                        <p className="mt-3 rounded bg-blue-50 p-2 text-xs font-semibold text-blue-700">
                          Admin note: {order.refundRequest.adminNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Need More Help?
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                For payment, address, delivery or urgent issues, create a
                support ticket.
              </p>

              <Link
                href="/support"
                className="mt-5 inline-block rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
              >
                Open Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
