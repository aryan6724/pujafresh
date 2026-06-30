"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { addOrderStatusNotification } from "@/utils/customerNotificationStorage";
import {
  DeliveryPartner,
  getDeliveryPartners,
} from "@/utils/deliveryPartnerStorage";

type AssignedPartner = {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  assignedAt: string;
};

type OrderStatusHistory = {
  status: string;
  note: string;
  updatedAt: string;
  updatedBy: string;
};

type Order = {
  id: string;
  total?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  deliveryPartner?: AssignedPartner | null;
  statusHistory?: OrderStatusHistory[];
  deliveryFailureReason?: string;
  deliveredAt?: string;
  outForDeliveryAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customer?: {
    fullName?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    landmark?: string;
    pincode?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      label?: string;
      timeRange?: string;
    };
  };
  items?: {
    name?: string;
    quantity?: number;
    price?: number;
  }[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

const getOrderDeliveryDate = (order: Order) => {
  return order.customer?.deliveryDate || order.deliveryDate || "";
};

const getOrderDeliverySlot = (order: Order) => {
  return (
    order.customer?.deliverySlotDetails?.label ||
    order.customer?.deliverySlot ||
    order.deliverySlot ||
    "Not selected"
  );
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

const getCustomerPhone = (order: Order) => {
  return order.customer?.phone || order.customerPhone || "N/A";
};

const getCustomerAddress = (order: Order) => {
  const address = order.customer?.address || "";
  const landmark = order.customer?.landmark || "";
  const pincode = order.customer?.pincode || "";

  return [address, landmark, pincode].filter(Boolean).join(", ") || "N/A";
};

const getOrderQuantity = (order: Order) => {
  return (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
};

const getOrderItemsText = (order: Order) => {
  if (!order.items || order.items.length === 0) return "No items";

  return order.items
    .map((item) => `${item.name || "Item"} x ${item.quantity || 0}`)
    .join(", ");
};

export default function DeliveryPartnerPortalPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<DeliveryPartner | null>(
    null
  );
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [statusFilter, setStatusFilter] = useState("All Orders");
  const [failureReason, setFailureReason] = useState("");
  const [activeFailureOrderId, setActiveFailureOrderId] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = () => {
    try {
      setPartners(getDeliveryPartners());

      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];

      setOrders(Array.isArray(parsedOrders) ? parsedOrders : []);
    } catch {
      setPartners(getDeliveryPartners());
      setOrders([]);
    }
  };

  const saveOrders = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
  };

  const handlePartnerLogin = (event: FormEvent) => {
    event.preventDefault();

    const cleanPhone = phoneInput.trim();

    if (cleanPhone.length !== 10) {
      toast.error("Enter your 10-digit registered phone number");
      return;
    }

    const partner = partners.find(
      (item) => item.phone === cleanPhone && item.status === "Active"
    );

    if (!partner) {
      toast.error("No active delivery partner found with this phone");
      return;
    }

    setSelectedPartner(partner);
    toast.success(`Welcome ${partner.name}`);
  };

  const handleLogout = () => {
    setSelectedPartner(null);
    setPhoneInput("");
    toast.success("Logged out");
  };

  const assignedOrders = useMemo(() => {
    if (!selectedPartner) return [];

    return orders.filter((order) => {
      const matchesPartner = order.deliveryPartner?.id === selectedPartner.id;
      const matchesDate = getOrderDeliveryDate(order) === selectedDate;

      const matchesStatus =
        statusFilter === "All Orders" || order.status === statusFilter;

      const isDeliveryOrder =
        order.status !== "Cancelled" && order.status !== "Refunded";

      return matchesPartner && matchesDate && matchesStatus && isDeliveryOrder;
    });
  }, [orders, selectedDate, selectedPartner, statusFilter]);

  const partnerDateOrders = useMemo(() => {
    if (!selectedPartner) return [];

    return orders.filter(
      (order) =>
        order.deliveryPartner?.id === selectedPartner.id &&
        getOrderDeliveryDate(order) === selectedDate &&
        order.status !== "Cancelled" &&
        order.status !== "Refunded"
    );
  }, [orders, selectedDate, selectedPartner]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(partnerDateOrders.map((order) => order.status).filter(Boolean))
    ) as string[];

    return ["All Orders", ...statuses];
  }, [partnerDateOrders]);

  const stats = useMemo(() => {
    return {
      total: partnerDateOrders.length,
      pending: partnerDateOrders.filter(
        (order) =>
          order.status !== "Out for Delivery" &&
          order.status !== "Delivered" &&
          order.status !== "Delivery Failed"
      ).length,
      outForDelivery: partnerDateOrders.filter(
        (order) => order.status === "Out for Delivery"
      ).length,
      delivered: partnerDateOrders.filter((order) => order.status === "Delivered")
        .length,
      failed: partnerDateOrders.filter(
        (order) => order.status === "Delivery Failed"
      ).length,
      items: partnerDateOrders.reduce(
        (sum, order) => sum + getOrderQuantity(order),
        0
      ),
    };
  }, [partnerDateOrders]);

  const updateOrderStatus = (orderId: string, status: string, note: string) => {
    if (!selectedPartner) return;

    const now = new Date().toISOString();

    const updatedOrders = orders.map((order) => {
      if (order.id !== orderId) return order;

      const nextHistory: OrderStatusHistory[] = [
        ...(order.statusHistory || []),
        {
          status,
          note,
          updatedAt: now,
          updatedBy: selectedPartner.name,
        },
      ];

      return {
        ...order,
        status,
        statusHistory: nextHistory,
        outForDeliveryAt:
          status === "Out for Delivery" ? now : order.outForDeliveryAt,
        deliveredAt: status === "Delivered" ? now : order.deliveredAt,
        deliveryFailureReason:
          status === "Delivery Failed" ? note : order.deliveryFailureReason,
      };
    });

    saveOrders(updatedOrders);

    const updatedOrderForNotification = updatedOrders.find(
      (order) => order.id === orderId
    );

    if (updatedOrderForNotification) {
      addOrderStatusNotification(
        updatedOrderForNotification,
        status,
        selectedPartner.name
      );
    }

    toast.success(`Order marked as ${status}`);
  };

  const markOutForDelivery = (orderId: string) => {
    updateOrderStatus(
      orderId,
      "Out for Delivery",
      "Order picked by delivery partner and moved out for delivery."
    );
  };

  const markDelivered = (orderId: string) => {
    const confirmDelivered = window.confirm(
      "Mark this order as delivered?"
    );

    if (!confirmDelivered) return;

    updateOrderStatus(
      orderId,
      "Delivered",
      "Order delivered successfully by delivery partner."
    );
  };

  const markDeliveryFailed = (orderId: string) => {
    const reason = failureReason.trim();

    if (!reason) {
      toast.error("Please enter delivery failure reason");
      return;
    }

    updateOrderStatus(orderId, "Delivery Failed", reason);
    setActiveFailureOrderId(null);
    setFailureReason("");
  };

  const handleExportCsv = () => {
    if (assignedOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer",
      "Phone",
      "Address",
      "Delivery Date",
      "Delivery Slot",
      "Items",
      "Status",
      "Payment Status",
      "Total",
    ];

    const rows = assignedOrders.map((order) => [
      order.id,
      getCustomerName(order),
      getCustomerPhone(order),
      getCustomerAddress(order),
      getOrderDeliveryDate(order),
      getOrderDeliverySlot(order),
      getOrderItemsText(order),
      order.status || "Pending",
      order.paymentStatus || "Payment Pending",
      order.total || 0,
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
    link.download = `pujafresh-partner-orders-${selectedDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Partner orders CSV exported");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Delivery
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Delivery Partner Portal
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Delivery partners can view assigned orders, update delivery status,
            mark successful deliveries and report failed delivery attempts.
          </p>
        </div>

        {!selectedPartner ? (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-gray-900">
              Partner Login
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Enter registered phone number to view assigned delivery orders.
            </p>

            <form onSubmit={handlePartnerLogin} className="mt-6">
              <label className="text-sm font-bold text-gray-700">
                Registered Phone Number
              </label>

              <input
                value={phoneInput}
                onChange={(event) =>
                  setPhoneInput(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="9876543210"
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
              />

              <button
                type="submit"
                className="mt-5 w-full rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
              >
                Login
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-[#fff7ed] p-4">
              <p className="text-sm font-bold text-gray-900">
                Demo partner phones
              </p>

              <div className="mt-3 grid gap-2">
                {partners
                  .filter((partner) => partner.status === "Active")
                  .map((partner) => (
                    <button
                      key={partner.id}
                      onClick={() => setPhoneInput(partner.phone)}
                      className="rounded bg-white px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:text-[#7a1e13]"
                    >
                      {partner.name} — {partner.phone}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-500">
                  Logged in as
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  {selectedPartner.name}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {selectedPartner.phone} • {selectedPartner.vehicleType} •{" "}
                  {selectedPartner.vehicleNumber}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadPortalData}
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

                <button
                  onClick={() => window.print()}
                  className="rounded bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-black"
                >
                  Print
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded border border-red-600 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Delivery Date
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Order Status
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
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">
                  Total Orders
                </p>
                <h2 className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.total}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">Pending</p>
                <h2 className="mt-2 text-3xl font-bold text-orange-600">
                  {stats.pending}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">
                  Out for Delivery
                </p>
                <h2 className="mt-2 text-3xl font-bold text-blue-700">
                  {stats.outForDelivery}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">
                  Delivered
                </p>
                <h2 className="mt-2 text-3xl font-bold text-green-700">
                  {stats.delivered}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">Failed</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {stats.failed}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">Items</p>
                <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
                  {stats.items}
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Assigned Orders
              </h2>

              {assignedOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-bold text-gray-900">
                    No assigned orders found
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Orders assigned by admin for this date will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {assignedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-gray-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                              {order.id}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                              {order.status || "Pending"}
                            </span>

                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                              {getOrderDeliverySlot(order)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-black text-gray-900">
                            {getCustomerName(order)}
                          </h3>

                          <p className="mt-1 text-sm text-gray-600">
                            Phone: {getCustomerPhone(order)}
                          </p>

                          <p className="mt-1 max-w-3xl text-sm text-gray-600">
                            Address: {getCustomerAddress(order)}
                          </p>

                          <p className="mt-3 text-sm font-semibold text-gray-700">
                            Items: {getOrderItemsText(order)}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-gray-700">
                            Total: ₹{order.total || 0} • Payment:{" "}
                            {order.paymentStatus || "Payment Pending"}
                          </p>

                          {order.outForDeliveryAt && (
                            <p className="mt-2 text-xs font-semibold text-blue-700">
                              Out for delivery at{" "}
                              {formatDateTime(order.outForDeliveryAt)}
                            </p>
                          )}

                          {order.deliveredAt && (
                            <p className="mt-2 text-xs font-semibold text-green-700">
                              Delivered at {formatDateTime(order.deliveredAt)}
                            </p>
                          )}

                          {order.deliveryFailureReason && (
                            <p className="mt-2 text-xs font-semibold text-red-700">
                              Failure reason: {order.deliveryFailureReason}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => markOutForDelivery(order.id)}
                            className="rounded bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            Out for Delivery
                          </button>

                          <button
                            onClick={() => markDelivered(order.id)}
                            className="rounded bg-[#15803d] px-4 py-2 text-xs font-bold text-white hover:bg-[#166534]"
                          >
                            Delivered
                          </button>

                          <button
                            onClick={() => {
                              setActiveFailureOrderId(order.id);
                              setFailureReason("");
                            }}
                            className="rounded bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                          >
                            Failed
                          </button>
                        </div>
                      </div>

                      {activeFailureOrderId === order.id && (
                        <div className="mt-5 rounded-xl bg-red-50 p-4">
                          <label className="text-sm font-bold text-red-700">
                            Delivery Failure Reason
                          </label>

                          <input
                            value={failureReason}
                            onChange={(event) =>
                              setFailureReason(event.target.value)
                            }
                            placeholder="Customer not available, wrong address, etc."
                            className="mt-1 w-full rounded border border-red-200 px-3 py-2 text-sm outline-none focus:border-red-600"
                          />

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => markDeliveryFailed(order.id)}
                              className="rounded bg-red-600 px-4 py-2 text-xs font-bold text-white"
                            >
                              Save Failed Status
                            </button>

                            <button
                              onClick={() => {
                                setActiveFailureOrderId(null);
                                setFailureReason("");
                              }}
                              className="rounded border border-red-600 px-4 py-2 text-xs font-bold text-red-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
