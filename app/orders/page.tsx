"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { addOrderStatusNotification } from "@/utils/customerNotificationStorage";

type OrderItem = {
  id?: number | string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  slug?: string;
  badge?: string;
  description?: string;
  image?: string;
  stock?: string;
};

type StatusHistory = {
  status: string;
  message: string;
  updatedAt: string;
  updatedBy: string;
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

type Order = {
  id: string;
  customerEmail?: string;
  customerName?: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    landmark?: string;
    pincode?: string;
    deliveryDate?: string;
    deliverySlot: string;
    deliverySlotDetails?: {
      id?: string;
      label?: string;
    } | null;
    paymentMethod: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount?: number;
  coupon?: {
    code: string;
    label: string;
    discountAmount: number;
    deliveryDiscount?: number;
  } | null;
  loyalty?: {
    pointsEarned?: number;
    pointsRedeemed?: number;
    redemptionAmount?: number;
  };
  total: number;
  paymentStatus?: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundRequest?: RefundRequest | null;
  statusHistory?: StatusHistory[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const trackingSteps = [
  "Pending",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

const getSafeImage = (image?: string) => {
  if (image && image.trim().length > 0) return image;
  return "/premium-pooja-pack.jpg";
};

const getOrderDeliverySlot = (order: Order) => {
  return (
    order.customer?.deliverySlotDetails?.label ||
    order.customer?.deliverySlot ||
    "Not selected"
  );
};

const getOrderPaymentStatus = (order: Order) => {
  if (order.paymentStatus) return order.paymentStatus;

  if (
    order.customer.paymentMethod === "UPI QR Payment" ||
    order.customer.paymentMethod === "Bank Transfer"
  ) {
    return "Verification Pending";
  }

  return "Payment Pending";
};

const getOrderPaymentReference = (order: Order) => {
  return order.paymentReference?.trim() || "Not provided";
};

const isCustomKitItem = (item: OrderItem) => {
  return (
    item.category === "Custom Kit" ||
    item.slug?.startsWith("custom-pooja-kit") ||
    item.badge === "Custom Kit"
  );
};

const getCustomKitItems = (item: OrderItem) => {
  const description = String(item.description || "");

  if (!isCustomKitItem(item) || !description) return [];

  return description
    .split(",")
    .map((kitItem) => kitItem.trim())
    .filter(Boolean);
};

const formatDate = (date?: string) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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

const getStatusColor = (status: string) => {
  if (status === "Pending") return "text-orange-600 bg-orange-50";
  if (status === "Confirmed") return "text-blue-600 bg-blue-50";
  if (status === "Packed") return "text-purple-600 bg-purple-50";
  if (status === "Out for Delivery") return "text-indigo-600 bg-indigo-50";
  if (status === "Delivered") return "text-green-700 bg-green-50";
  if (status === "Cancelled") return "text-red-600 bg-red-50";
  if (status === "Delivery Failed") return "text-red-600 bg-red-50";
  if (status === "Archived") return "text-gray-600 bg-gray-100";
  return "text-gray-700 bg-gray-100";
};

const canCancelOrder = (status: string) => {
  return status === "Pending" || status === "Confirmed";
};

const canRequestReturnRefund = (order: Order) => {
  return (
    (order.status === "Delivered" || order.status === "Closed") &&
    !order.refundRequest
  );
};

const getStatusMessage = (status: string) => {
  if (status === "Pending") return "Order placed successfully.";
  if (status === "Confirmed") return "Your order has been confirmed.";
  if (status === "Packed") return "Your order has been packed.";
  if (status === "Out for Delivery") return "Your order is out for delivery.";
  if (status === "Delivered") return "Your order has been delivered.";
  if (status === "Cancelled") return "This order has been cancelled.";
  if (status === "Archived") return "This order has been archived.";
  return "Order status updated.";
};

const getOrderHistory = (order: Order) => {
  const baseHistory: StatusHistory[] = [
    {
      status: "Pending",
      message: "Order placed successfully.",
      updatedAt: order.createdAt,
      updatedBy: "Customer",
    },
  ];

  if (order.statusHistory && order.statusHistory.length > 0) {
    return order.statusHistory;
  }

  if (order.status === "Pending") {
    return baseHistory;
  }

  return [
    ...baseHistory,
    {
      status: order.status,
      message:
        order.status === "Cancelled" && order.cancellationReason
          ? `Order cancelled. Reason: ${order.cancellationReason}`
          : getStatusMessage(order.status),
      updatedAt: order.cancelledAt || order.createdAt,
      updatedBy: order.status === "Cancelled" ? "Customer/Admin" : "Admin",
    },
  ];
};

const getStepState = (orderStatus: string, step: string) => {
  if (orderStatus === "Cancelled") return "cancelled";
  if (orderStatus === "Archived") return "archived";

  const currentIndex = trackingSteps.indexOf(orderStatus);
  const stepIndex = trackingSteps.indexOf(step);

  if (currentIndex === -1) return "pending";
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";

  return "pending";
};

const getHistoryDotStyle = (status: string) => {
  if (status === "Cancelled") return "bg-red-600";
  if (status === "Delivered") return "bg-green-700";
  if (status === "Archived") return "bg-gray-600";
  return "bg-[#7a1e13]";
};

export default function OrdersPage() {
  const router = useRouter();
  const auth = useAuth() as any;
  const cart = useCart() as any;

  const user = auth?.user || null;
  const isLoggedIn = Boolean(auth?.isLoggedIn);
  const addToCart = cart?.addToCart;

  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = () => {
    if (!user) return;

    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const savedLastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

      const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];
      const baseOrders = Array.isArray(parsedOrders) ? parsedOrders : [];

      let allOrders = baseOrders;

      if (savedLastOrder) {
        const lastOrder = JSON.parse(savedLastOrder) as Order;
        const existsInOrders = baseOrders.some((order) => order.id === lastOrder.id);

        allOrders = existsInOrders ? baseOrders : [lastOrder, ...baseOrders];
      }

      const userEmail = String(user.email || "").trim().toLowerCase();
      const userPhone = String((user as any)?.phone || "").replace(/\D/g, "");

      const customerOrders = allOrders
        .filter((order) => {
          const orderEmail = String(order.customerEmail || order.customer?.email || "")
            .trim()
            .toLowerCase();
          const orderPhone = String(order.customer?.phone || "").replace(/\D/g, "");

          if (userEmail && orderEmail && userEmail === orderEmail) return true;
          if (userPhone && orderPhone && userPhone === orderPhone) return true;

          return false;
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );

      setOrders(customerOrders);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const saveCustomerOrderUpdate = (updatedOrder: Order) => {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (!savedOrders) return;

    const allOrders = JSON.parse(savedOrders) as Order[];

    const updatedOrders = allOrders.map((order) =>
      order.id === updatedOrder.id ? updatedOrder : order
    );

    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));

    const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    if (lastOrder) {
      try {
        const parsedLastOrder = JSON.parse(lastOrder) as Order;

        if (parsedLastOrder.id === updatedOrder.id) {
          localStorage.setItem(
            LAST_ORDER_STORAGE_KEY,
            JSON.stringify(updatedOrder)
          );
        }
      } catch {}
    }

    loadOrders();
  };

  const handleCancelOrder = (order: Order) => {
    if (!canCancelOrder(order.status)) {
      toast.error("This order cannot be cancelled now");
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    const cancellationReason =
      window.prompt("Please enter cancellation reason") ||
      "Cancelled by customer";

    const now = new Date().toISOString();

    const cancelledOrder: Order = {
      ...order,
      status: "Cancelled",
      cancelledAt: now,
      cancellationReason,
      statusHistory: [
        ...getOrderHistory(order),
        {
          status: "Cancelled",
          message: `Order cancelled by customer. Reason: ${cancellationReason}.`,
          updatedAt: now,
          updatedBy: "Customer",
        },
      ],
    };

    saveCustomerOrderUpdate(cancelledOrder);
    addOrderStatusNotification(cancelledOrder, "Cancelled", "Customer");
    toast.success("Order cancelled successfully");
  };

  const handleRequestReturnRefund = (order: Order) => {
    if (!canRequestReturnRefund(order)) {
      toast.error("Return/refund request is available only after delivery");
      return;
    }

    router.push(`/return-refund?orderId=${encodeURIComponent(order.id)}`);
  };

  const handleRefreshOrders = () => {
    loadOrders();
    toast.success("Orders refreshed");
  };

  const handleReorder = (order: Order) => {
    let addedQuantity = 0;

    order.items.forEach((item) => {
      const requestedQuantity = Math.max(Number(item.quantity || 1), 1);

      for (let i = 0; i < requestedQuantity; i++) {
        addToCart?.(item);
        addedQuantity += 1;
      }
    });

    if (addedQuantity === 0) {
      toast.error("No items found to reorder");
      return;
    }

    toast.success(`${addedQuantity} item(s) added to cart`);
    router.push("/cart");
  };

  const activeOrders = orders.filter(
    (order) =>
      order.status !== "Delivered" &&
      order.status !== "Cancelled" &&
      order.status !== "Archived"
  );

  const deliveredOrders = orders.filter((order) => order.status === "Delivered");
  const cancelledOrders = orders.filter((order) => order.status === "Cancelled");

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />
        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">Login Required</h1>
            <p className="mt-2 text-gray-600">Please login to view your orders.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/login" className="rounded bg-[#7a1e13] px-5 py-3 text-center font-bold text-white">Login</Link>
              <Link href="/register" className="rounded border border-[#7a1e13] px-5 py-3 text-center font-bold text-[#7a1e13]">Register</Link>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="mt-1 text-sm text-gray-600">Showing orders for {user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleRefreshOrders} className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white">
              Refresh Orders
            </button>
            <Link href="/" className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white">Continue Shopping</Link>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">{activeOrders.length}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Delivered</p>
              <p className="mt-1 text-2xl font-bold text-[#15803d]">{deliveredOrders.length}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Cancelled</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{cancelledOrders.length}</p>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">No orders found</h2>
            <p className="mt-2 text-gray-600">You have not placed any order from this account yet.</p>
            <Link href="/" className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white">Start Shopping</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {orders.map((order) => {
              const orderHistory = getOrderHistory(order);

              return (
                <div key={order.id} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                      <p className="text-sm text-gray-500">Order ID</p>
                      <h2 className="font-bold text-[#7a1e13]">{order.id}</h2>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-semibold">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className={`mt-1 rounded-full px-3 py-1 text-sm font-bold ${getStatusColor(order.status)}`}>{order.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Status</p>
                      <p className="mt-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{getOrderPaymentStatus(order)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-lg font-bold">₹{order.total}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/invoice?orderId=${encodeURIComponent(order.id)}`} className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white">View Invoice</Link>
                      <Link href={`/track-order?orderId=${encodeURIComponent(order.id)}`} className="rounded border border-blue-700 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-700 hover:text-white">Track</Link>
                      <button type="button" onClick={() => handleReorder(order)} className="rounded border border-[#15803d] px-4 py-2 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white">Reorder</button>
                      {canCancelOrder(order.status) && (
                        <button type="button" onClick={() => handleCancelOrder(order)} className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white">Cancel Order</button>
                      )}
                      {canRequestReturnRefund(order) && (
                        <button type="button" onClick={() => handleRequestReturnRefund(order)} className="rounded border border-orange-600 px-4 py-2 text-sm font-bold text-orange-600 hover:bg-orange-600 hover:text-white">Return / Refund</button>
                      )}
                    </div>
                  </div>

                  {order.status === "Cancelled" && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <p className="font-bold">Order Cancelled</p>
                      {order.cancelledAt && <p className="mt-1">Cancelled on {formatDateTime(order.cancelledAt)}</p>}
                      {order.cancellationReason && <p className="mt-1"><span className="font-semibold">Reason:</span> {order.cancellationReason}</p>}
                    </div>
                  )}

                  {order.refundRequest && (
                    <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                      <p className="font-bold">{order.refundRequest.type} Request</p>
                      <p className="mt-1">Status: <span className="font-bold">{order.refundRequest.status}</span></p>
                      <p className="mt-2"><span className="font-semibold">Reason:</span> {order.refundRequest.reason}</p>
                    </div>
                  )}

                  <div className="mt-5 rounded-lg bg-[#fff7ed] p-4">
                    <h3 className="font-bold text-gray-900">Order Tracking</h3>
                    {order.status === "Cancelled" ? (
                      <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700">This order has been cancelled and will not be delivered.</div>
                    ) : (
                      <div className="mt-5 grid gap-4 md:grid-cols-5">
                        {trackingSteps.map((step, index) => {
                          const state = getStepState(order.status, step);
                          return (
                            <div key={step} className="flex items-center gap-3 md:block">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold md:mx-auto ${state === "completed" ? "bg-[#15803d] text-white" : state === "active" ? "bg-[#7a1e13] text-white" : "bg-gray-200 text-gray-500"}`}>
                                {state === "completed" ? "✓" : index + 1}
                              </div>
                              <p className={`text-sm font-bold md:mt-2 md:text-center ${state === "completed" ? "text-[#15803d]" : state === "active" ? "text-[#7a1e13]" : "text-gray-500"}`}>{step}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {order.customer.deliveryDate && order.status !== "Cancelled" && order.status !== "Delivered" && (
                      <p className="mt-4 rounded bg-white p-3 text-sm font-semibold text-gray-700">Expected delivery date: {order.customer.deliveryDate} | {getOrderDeliverySlot(order)}</p>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900">Detailed Status History</h3>
                    <div className="mt-4 space-y-4">
                      {orderHistory.map((history, index) => (
                        <div key={`${history.status}-${history.updatedAt}-${index}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`h-3 w-3 rounded-full ${getHistoryDotStyle(history.status)}`} />
                            {index !== orderHistory.length - 1 && <div className="mt-1 h-full min-h-8 w-px bg-gray-300" />}
                          </div>
                          <div className="flex-1 rounded-lg bg-[#fff7ed] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold text-gray-900">{history.status}</p>
                              <p className="text-xs font-semibold text-gray-500">{formatDateTime(history.updatedAt)}</p>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{history.message}</p>
                            <p className="mt-1 text-xs font-semibold text-[#7a1e13]">Updated by: {history.updatedBy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-3">
                      {order.items.map((item, index) => {
                        const customKit = isCustomKitItem(item);
                        const customKitItems = getCustomKitItems(item);
                        return (
                          <div key={`${order.id}-${item.id || item.name}-${index}`} className="flex gap-4 rounded-lg border border-gray-100 p-3">
                            <div className="h-20 w-20 overflow-hidden rounded bg-[#fff7ed]">
                              <img src={getSafeImage(item.image)} alt={item.name} className="h-full w-full object-contain p-1" onError={(event) => { event.currentTarget.src = "/premium-pooja-pack.jpg"; }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-gray-900">{item.name}</h3>
                                {customKit && <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[11px] font-black uppercase text-[#7a1e13]">Custom Kit</span>}
                              </div>
                              <p className="text-sm text-gray-500">{item.category || "Pooja Essential"}</p>
                              <p className="mt-1 text-sm">Qty: <span className="font-semibold">{item.quantity}</span></p>
                              {customKit && customKitItems.length > 0 && (
                                <div className="mt-2 rounded-lg bg-[#fff7ed] p-3">
                                  <p className="text-xs font-black uppercase tracking-wide text-[#7a1e13]">Kit includes</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {customKitItems.map((kitItem) => (
                                      <span key={kitItem} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">{kitItem}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <p className="mt-2 font-bold">₹{item.price * item.quantity}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg bg-[#fff7ed] p-4">
                      <h3 className="font-bold text-gray-900">Delivery Details</h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p><span className="font-semibold">Name:</span> {order.customer.fullName}</p>
                        <p><span className="font-semibold">Phone:</span> {order.customer.phone}</p>
                        {order.customer.email && <p><span className="font-semibold">Email:</span> {order.customer.email}</p>}
                        <p><span className="font-semibold">Address:</span> {order.customer.address}</p>
                        {order.customer.pincode && <p><span className="font-semibold">Pincode:</span> {order.customer.pincode}</p>}
                        {order.customer.deliveryDate && <p><span className="font-semibold">Date:</span> {order.customer.deliveryDate}</p>}
                        <p><span className="font-semibold">Delivery Slot:</span> {getOrderDeliverySlot(order)}</p>
                        <p><span className="font-semibold">Payment:</span> {order.customer.paymentMethod}</p>
                        <p><span className="font-semibold">Payment Status:</span> {getOrderPaymentStatus(order)}</p>
                        <p><span className="font-semibold">Payment Reference / UTR:</span> {getOrderPaymentReference(order)}</p>
                      </div>
                      <div className="mt-4 border-t pt-3 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                        <div className="mt-2 flex justify-between"><span>Delivery</span><span>{order.deliveryCharge === 0 ? "FREE" : `₹${order.deliveryCharge}`}</span></div>
                        {(order.discountAmount ?? 0) > 0 && <div className="mt-2 flex justify-between text-[#15803d]"><span>Discount</span><span>-₹{order.discountAmount}</span></div>}
                        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>₹{order.total}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    Admin status updates will appear here. Click Refresh Orders if you updated status from admin dashboard in another tab.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
