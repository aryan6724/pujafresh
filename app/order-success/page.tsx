"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

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
};

type LastOrder = {
  id: string;
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total: number;
  status: string;
  paymentStatus?: string;
  paymentReference?: string;
  createdAt?: string;
  items?: OrderItem[];
  coupon?: {
    code: string;
    label: string;
    discountAmount: number;
  } | null;
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
};

const getOrderDeliverySlot = (order: LastOrder) => {
  return (
    order.customer?.deliverySlotDetails?.label ||
    order.customer?.deliverySlot ||
    "Not selected"
  );
};

const getOrderPaymentStatus = (order: LastOrder) => {
  if (order.paymentStatus) return order.paymentStatus;

  if (
    order.customer.paymentMethod === "UPI QR Payment" ||
    order.customer.paymentMethod === "Bank Transfer"
  ) {
    return "Verification Pending";
  }

  return "Payment Pending";
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

const getSafeImage = (image?: string) => {
  if (image && image.trim().length > 0) return image;
  return "/premium-pooja-pack.jpg";
};

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null>(null);

  useEffect(() => {
    const savedOrder = localStorage.getItem("pujafresh-last-order");

    if (!savedOrder) {
      setOrder(null);
      return;
    }

    try {
      setOrder(JSON.parse(savedOrder) as LastOrder);
    } catch {
      setOrder(null);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✅
          </div>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Order Placed Successfully
          </h1>

          <p className="mt-2 text-gray-600">
            Thank you for ordering from PujaFresh. Your pooja essentials will be
            delivered in your selected morning slot.
          </p>

          {!order ? (
            <div className="mt-6 rounded-lg bg-[#fff7ed] p-5">
              <p className="font-bold text-gray-900">No recent order found</p>
              <p className="mt-1 text-sm text-gray-600">
                Place a new order or check your order history.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-[#fff7ed] p-5 text-left">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-bold text-[#7a1e13]">{order.id}</p>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-semibold">{order.customer.fullName}</p>
                </div>

                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-semibold">{order.customer.phone}</p>
                </div>

                {order.customer.deliveryDate && (
                  <div>
                    <p className="text-gray-500">Delivery Date</p>
                    <p className="font-semibold">
                      {order.customer.deliveryDate}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-gray-500">Delivery Slot</p>
                  <p className="font-semibold">
                    {getOrderDeliverySlot(order)}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Payment</p>
                  <p className="font-semibold">
                    {order.customer.paymentMethod}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Payment Status</p>
                  <p className="font-semibold text-blue-700">
                    {getOrderPaymentStatus(order)}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-semibold text-[#15803d]">
                    {order.status}
                  </p>
                </div>
              </div>

              {order.customer.address && (
                <div className="mt-5 rounded-lg bg-white p-4">
                  <h2 className="font-bold text-gray-900">Delivery Address</h2>
                  <p className="mt-2 text-sm text-gray-700">
                    {order.customer.address}
                    {order.customer.landmark
                      ? `, Landmark: ${order.customer.landmark}`
                      : ""}
                    {order.customer.pincode
                      ? `, Pincode: ${order.customer.pincode}`
                      : ""}
                  </p>
                </div>
              )}

              {order.items && order.items.length > 0 && (
                <div className="mt-5 rounded-lg bg-white p-4">
                  <h2 className="font-bold text-gray-900">Order Items</h2>

                  <div className="mt-3 grid gap-3">
                    {order.items.map((item, index) => {
                      const customKit = isCustomKitItem(item);
                      const customKitItems = getCustomKitItems(item);

                      return (
                        <div
                          key={`${item.id || item.name}-${index}`}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="flex gap-3">
                            <div className="h-16 w-16 overflow-hidden rounded bg-[#fff7ed]">
                              <img
                                src={getSafeImage(item.image)}
                                alt={item.name}
                                className="h-full w-full object-contain p-1"
                                onError={(event) => {
                                  event.currentTarget.src =
                                    "/premium-pooja-pack.jpg";
                                }}
                              />
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h3 className="font-bold text-gray-900">
                                    {item.name}
                                  </h3>

                                  <p className="mt-1 text-xs font-semibold text-gray-500">
                                    {item.category || "Pooja Essential"} • Qty:{" "}
                                    {item.quantity}
                                  </p>
                                </div>

                                <p className="font-black text-[#7a1e13]">
                                  ₹{item.price * item.quantity}
                                </p>
                              </div>

                              {customKit && customKitItems.length > 0 && (
                                <div className="mt-3 rounded bg-[#fff7ed] p-3">
                                  <p className="text-xs font-black uppercase tracking-wide text-[#7a1e13]">
                                    Kit includes
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {customKitItems.map((kitItem) => (
                                      <span
                                        key={kitItem}
                                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm"
                                      >
                                        {kitItem}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-lg bg-white p-4">
                <h2 className="font-bold text-gray-900">Payment Summary</h2>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal ?? order.total}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span>
                      {order.deliveryCharge === 0
                        ? "FREE"
                        : `₹${order.deliveryCharge ?? 0}`}
                    </span>
                  </div>

                  {(order.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-[#15803d]">
                      <span>Coupon Discount</span>
                      <span>-₹{order.discountAmount}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total Paid</span>
                    <span>₹{order.total}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Continue Shopping
            </Link>

            <Link
              href="/orders"
              className="rounded border border-[#7a1e13] px-6 py-3 font-bold text-[#7a1e13]"
            >
              View Orders
            </Link>

            {order && (
              <Link
                href={`/track-order?orderId=${encodeURIComponent(order.id)}`}
                className="rounded border border-blue-700 px-6 py-3 font-bold text-blue-700"
              >
                Track Order
              </Link>
            )}

            {order && (
              <Link
                href={`/invoice?orderId=${encodeURIComponent(order.id)}`}
                className="rounded border border-[#15803d] px-6 py-3 font-bold text-[#15803d]"
              >
                View Invoice
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
