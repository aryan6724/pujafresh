"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

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

type OrderItem = {
  id?: number;
  name?: string;
  quantity?: number;
  price?: number;
  image?: string;
};

type Order = {
  id: string;
  total?: number;
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
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
  items?: OrderItem[];
};

type TrackingStep = {
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  time?: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const formatDateTime = (date?: string) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date?: string) => {
  if (!date) return "Not selected";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
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
  return order.customer?.phone || order.customerPhone || "";
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

const getStatusRank = (status?: string) => {
  if (status === "Cancelled" || status === "Refunded") return -1;
  if (status === "Delivery Failed") return 3;
  if (status === "Delivered") return 5;
  if (status === "Out for Delivery") return 4;
  if (status === "Packed" || status === "Ready for Delivery") return 3;
  if (status === "Processing" || status === "Confirmed") return 2;
  return 1;
};

const findStatusTime = (order: Order, statusList: string[]) => {
  const history = order.statusHistory || [];

  const found = history
    .slice()
    .reverse()
    .find((entry) => statusList.includes(entry.status));

  if (found) return found.updatedAt;

  if (statusList.includes("Order Placed")) return order.createdAt;
  if (statusList.includes("Out for Delivery")) return order.outForDeliveryAt;
  if (statusList.includes("Delivered")) return order.deliveredAt;

  return undefined;
};

const buildTrackingSteps = (order: Order): TrackingStep[] => {
  const rank = getStatusRank(order.status);

  if (rank === -1) {
    return [
      {
        title: "Order Placed",
        description: "Your order was created successfully.",
        completed: true,
        active: false,
        time: order.createdAt,
      },
      {
        title: order.status || "Order Cancelled",
        description:
          order.status === "Refunded"
            ? "Refund status has been updated for this order."
            : "This order is no longer active.",
        completed: true,
        active: true,
        time: findStatusTime(order, ["Cancelled", "Refunded"]),
      },
    ];
  }

  if (order.status === "Delivery Failed") {
    return [
      {
        title: "Order Placed",
        description: "Your order was created successfully.",
        completed: true,
        active: false,
        time: order.createdAt,
      },
      {
        title: "Processing",
        description: "Your order was prepared for delivery.",
        completed: true,
        active: false,
        time: findStatusTime(order, ["Processing", "Confirmed", "Packed"]),
      },
      {
        title: "Out for Delivery",
        description: "Delivery partner attempted delivery.",
        completed: true,
        active: false,
        time: order.outForDeliveryAt,
      },
      {
        title: "Delivery Failed",
        description:
          order.deliveryFailureReason ||
          "Delivery could not be completed. Please contact support.",
        completed: true,
        active: true,
        time: findStatusTime(order, ["Delivery Failed"]),
      },
    ];
  }

  return [
    {
      title: "Order Placed",
      description: "Your order has been placed successfully.",
      completed: rank >= 1,
      active: rank === 1,
      time: order.createdAt,
    },
    {
      title: "Confirmed / Processing",
      description: "The store team is checking stock and preparing your items.",
      completed: rank >= 2,
      active: rank === 2,
      time: findStatusTime(order, ["Confirmed", "Processing"]),
    },
    {
      title: "Packed / Ready",
      description: "Your pooja essentials are ready for delivery pickup.",
      completed: rank >= 3,
      active: rank === 3,
      time: findStatusTime(order, ["Packed", "Ready for Delivery"]),
    },
    {
      title: "Out for Delivery",
      description: "Your order is on the way with the delivery partner.",
      completed: rank >= 4,
      active: rank === 4,
      time: order.outForDeliveryAt || findStatusTime(order, ["Out for Delivery"]),
    },
    {
      title: "Delivered",
      description: "Your order has been delivered successfully.",
      completed: rank >= 5,
      active: rank === 5,
      time: order.deliveredAt || findStatusTime(order, ["Delivered"]),
    },
  ];
};

export default function TrackOrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];

      setOrders(Array.isArray(parsedOrders) ? parsedOrders : []);
    } catch {
      setOrders([]);
    }
  };

  const trackingSteps = useMemo(() => {
    if (!trackedOrder) return [];

    return buildTrackingSteps(trackedOrder);
  }, [trackedOrder]);

  const handleTrackOrder = (event: FormEvent) => {
    event.preventDefault();

    const cleanOrderId = orderIdInput.trim();
    const cleanPhone = phoneInput.trim();

    if (!cleanOrderId) {
      toast.error("Please enter your order ID");
      return;
    }

    const foundOrder = orders.find(
      (order) => order.id.toLowerCase() === cleanOrderId.toLowerCase()
    );

    if (!foundOrder) {
      setTrackedOrder(null);
      setHasSearched(true);
      toast.error("Order not found");
      return;
    }

    if (cleanPhone && getCustomerPhone(foundOrder) !== cleanPhone) {
      setTrackedOrder(null);
      setHasSearched(true);
      toast.error("Phone number does not match this order");
      return;
    }

    setTrackedOrder(foundOrder);
    setHasSearched(true);
    toast.success("Order found");
  };

  const handleDemoTrack = (order: Order) => {
    setOrderIdInput(order.id);
    setPhoneInput(getCustomerPhone(order));
    setTrackedOrder(order);
    setHasSearched(true);
    toast.success("Demo order loaded");
  };

  const latestOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Tracking
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Track Your Order
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Enter your order ID to check delivery status, partner details,
            delivery slot and complete tracking timeline.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-gray-900">
              Order Tracking
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Phone number is optional, but it helps verify customer order.
            </p>

            <form onSubmit={handleTrackOrder} className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Order ID *
                </label>

                <input
                  value={orderIdInput}
                  onChange={(event) => setOrderIdInput(event.target.value)}
                  placeholder="Example: PF-1234567890"
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Phone Number
                </label>

                <input
                  value={phoneInput}
                  onChange={(event) =>
                    setPhoneInput(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="Registered phone number"
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <button
                type="submit"
                className="rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
              >
                Track Order
              </button>

              <button
                type="button"
                onClick={loadOrders}
                className="rounded border border-[#7a1e13] px-6 py-3 font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Refresh Orders
              </button>
            </form>

            {latestOrders.length > 0 && (
              <div className="mt-6 rounded-xl bg-[#fff7ed] p-4">
                <p className="text-sm font-bold text-gray-900">
                  Demo Recent Orders
                </p>

                <div className="mt-3 grid gap-2">
                  {latestOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleDemoTrack(order)}
                      className="rounded bg-white px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:text-[#7a1e13]"
                    >
                      {order.id} — {getCustomerName(order)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {!trackedOrder && hasSearched && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <h2 className="text-2xl font-black text-gray-900">
                  Order Not Found
                </h2>

                <p className="mt-3 text-gray-600">
                  Please check your order ID or phone number and try again.
                </p>

                <Link
                  href="/support"
                  className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
                >
                  Contact Support
                </Link>
              </div>
            )}

            {!trackedOrder && !hasSearched && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <h2 className="text-2xl font-black text-gray-900">
                  Enter order details to begin
                </h2>

                <p className="mt-3 text-gray-600">
                  Once you search an order, complete tracking information will
                  appear here.
                </p>
              </div>
            )}

            {trackedOrder && (
              <div className="grid gap-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-gray-500">
                        Order ID
                      </p>

                      <h2 className="mt-1 text-3xl font-black text-gray-900">
                        {trackedOrder.id}
                      </h2>

                      <p className="mt-2 text-sm text-gray-600">
                        Placed on {formatDateTime(trackedOrder.createdAt)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-black text-[#7a1e13]">
                        {trackedOrder.status || "Pending"}
                      </span>

                      <p className="mt-3 text-sm font-semibold text-gray-600">
                        Payment: {trackedOrder.paymentStatus || "Payment Pending"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        Delivery Date
                      </p>
                      <p className="mt-1 font-black text-gray-900">
                        {formatDate(getOrderDeliveryDate(trackedOrder))}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        Delivery Slot
                      </p>
                      <p className="mt-1 font-black text-gray-900">
                        {getOrderDeliverySlot(trackedOrder)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        Total Items
                      </p>
                      <p className="mt-1 font-black text-gray-900">
                        {getOrderQuantity(trackedOrder)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold text-gray-500">
                        Order Total
                      </p>
                      <p className="mt-1 font-black text-gray-900">
                        ₹{trackedOrder.total || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black text-gray-900">
                    Tracking Timeline
                  </h2>

                  <div className="mt-6 grid gap-4">
                    {trackingSteps.map((step, index) => (
                      <div key={step.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                              step.completed
                                ? step.active
                                  ? "bg-[#7a1e13] text-white"
                                  : "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {index + 1}
                          </div>

                          {index !== trackingSteps.length - 1 && (
                            <div
                              className={`mt-2 h-full min-h-[38px] w-1 rounded-full ${
                                step.completed ? "bg-green-600" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>

                        <div className="pb-5">
                          <h3 className="font-black text-gray-900">
                            {step.title}
                          </h3>

                          <p className="mt-1 text-sm text-gray-600">
                            {step.description}
                          </p>

                          {step.time && (
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                              {formatDateTime(step.time)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {trackedOrder.deliveryPartner && (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-black text-gray-900">
                      Delivery Partner
                    </h2>

                    <div className="mt-4 rounded-xl bg-[#fff7ed] p-5">
                      <h3 className="text-lg font-black text-gray-900">
                        {trackedOrder.deliveryPartner.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {trackedOrder.deliveryPartner.vehicleType} •{" "}
                        {trackedOrder.deliveryPartner.vehicleNumber}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-700">
                        Assigned at{" "}
                        {formatDateTime(trackedOrder.deliveryPartner.assignedAt)}
                      </p>

                      <a
                        href={`tel:${trackedOrder.deliveryPartner.phone}`}
                        className="mt-4 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
                      >
                        Call Partner
                      </a>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black text-gray-900">
                    Customer & Items
                  </h2>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-900">
                        {getCustomerName(trackedOrder)}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        Phone: {getCustomerPhone(trackedOrder) || "N/A"}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        {getCustomerAddress(trackedOrder)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="font-bold text-gray-900">Order Items</p>

                      <div className="mt-3 grid gap-2">
                        {(trackedOrder.items || []).map((item, index) => (
                          <div
                            key={`${item.name}-${index}`}
                            className="flex justify-between gap-3 text-sm"
                          >
                            <span className="text-gray-700">
                              {item.name || "Item"} x {item.quantity || 0}
                            </span>

                            <span className="font-bold text-gray-900">
                              ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/invoice/${trackedOrder.id}`}
                      className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
                    >
                      View Invoice
                    </Link>

                    <Link
                      href="/support"
                      className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                    >
                      Need Help?
                    </Link>

                    {trackedOrder.status === "Delivered" && (
                      <Link
                        href="/delivery-feedback"
                        className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
                      >
                        Give Feedback
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
