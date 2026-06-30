"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";

type OrderItem = Product & {
  quantity: number;
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
    type?: string;
    value?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    expiryDate?: string;
    discountAmount: number;
    deliveryDiscount?: number;
  } | null;
  loyalty?: {
    pointsEarned: number;
    earnRate?: string;
  };
  total: number;
  paymentStatus?: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
};

const getOrderDeliverySlot = (order: Order) => {
  return (
    order.customer?.deliverySlotDetails?.label ||
    order.customer?.deliverySlot ||
    "Not selected"
  );
};

const getOrderPaymentStatus = (order: Order) => {
  if (order.paymentStatus) {
    return order.paymentStatus;
  }

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

const getOrderCouponDiscount = (order: Order) => {
  return order.coupon?.discountAmount ?? order.discountAmount ?? 0;
};

const getOrderCouponDeliveryDiscount = (order: Order) => {
  return order.coupon?.deliveryDiscount ?? 0;
};

const getOrderCouponTotalSavings = (order: Order) => {
  return getOrderCouponDiscount(order) + getOrderCouponDeliveryDiscount(order);
};

const getOrderLoyaltyPoints = (order: Order) => {
  return order.loyalty?.pointsEarned ?? Math.floor(Number(order.total || 0) / 100);
};

export default function InvoicePage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const { user, isLoggedIn } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = `Invoice ${orderId} - PujaFresh`;

    const savedOrders = localStorage.getItem("pujafresh-orders");

    if (!savedOrders) {
      setOrder(null);
      setIsLoading(false);
      return;
    }

    const allOrders = JSON.parse(savedOrders) as Order[];
    const foundOrder = allOrders.find((item) => item.id === orderId) || null;

    setOrder(foundOrder);
    setIsLoading(false);
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-gray-600">
              Please login to view this invoice.
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Loading invoice...
            </h1>
          </div>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice not found
            </h1>

            <p className="mt-2 text-gray-600">
              This order invoice is not available.
            </p>

            <Link
              href="/orders"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Back to Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isOwner =
    order.customerEmail === user.email || order.customer?.email === user.email;

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Access Denied
            </h1>

            <p className="mt-2 text-gray-600">
              You cannot view another customer&apos;s invoice.
            </p>

            <Link
              href="/orders"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Back to Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <section className="mx-auto max-w-5xl px-4 py-8 print:px-0 print:py-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/orders"
            className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]"
          >
            Back to Orders
          </Link>

          <button
            onClick={handlePrint}
            className="rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
          >
            Print Invoice
          </button>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-[#7a1e13]">
                PujaFresh
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Fresh Pooja Essentials Delivered Every Morning
              </p>
            </div>

            <div className="text-left md:text-right">
              <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
              <p className="mt-1 text-sm text-gray-600">
                Invoice No: {order.id}
              </p>
              <p className="text-sm text-gray-600">
                Date: {new Date(order.createdAt).toLocaleDateString("en-IN")}
              </p>
              <p className="mt-2 font-bold text-[#15803d]">
                Status: {order.status}
              </p>
              <p className="mt-1 font-bold text-blue-700">
                Payment: {getOrderPaymentStatus(order)}
              </p>
              <p className="mt-1 max-w-[260px] break-words text-sm font-bold text-gray-700">
                Reference: {getOrderPaymentReference(order)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-[#fff7ed] p-4">
              <h3 className="font-bold text-gray-900">Bill To</h3>

              <div className="mt-3 space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Name:</span>{" "}
                  {order.customer.fullName}
                </p>

                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {order.customer.phone}
                </p>

                {order.customer.email && (
                  <p>
                    <span className="font-semibold">Email:</span>{" "}
                    {order.customer.email}
                  </p>
                )}

                <p>
                  <span className="font-semibold">Address:</span>{" "}
                  {order.customer.address}
                </p>

                {order.customer.landmark && (
                  <p>
                    <span className="font-semibold">Landmark:</span>{" "}
                    {order.customer.landmark}
                  </p>
                )}

                {order.customer.pincode && (
                  <p>
                    <span className="font-semibold">Pincode:</span>{" "}
                    {order.customer.pincode}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <h3 className="font-bold text-gray-900">Order Details</h3>

              <div className="mt-3 space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Payment:</span>{" "}
                  {order.customer.paymentMethod}
                </p>

                <p>
                  <span className="font-semibold">Payment Status:</span>{" "}
                  {getOrderPaymentStatus(order)}
                </p>

                <p>
                  <span className="font-semibold">
                    Payment Reference / UTR:
                  </span>{" "}
                  {getOrderPaymentReference(order)}
                </p>

                <p>
                  <span className="font-semibold">Delivery Slot:</span>{" "}
                  {getOrderDeliverySlot(order)}
                </p>

                {order.customer.deliveryDate && (
                  <p>
                    <span className="font-semibold">Delivery Date:</span>{" "}
                    {order.customer.deliveryDate}
                  </p>
                )}

                <p>
                  <span className="font-semibold">Order ID:</span> {order.id}
                </p>

                {order.coupon && (
                  <p>
                    <span className="font-semibold">Coupon:</span>{" "}
                    <span className="font-bold text-[#15803d]">
                      {order.coupon.code}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
            <div className="grid grid-cols-[1fr_80px_100px_100px] bg-[#7a1e13] px-4 py-3 text-sm font-bold text-white">
              <p>Product</p>
              <p className="text-center">Qty</p>
              <p className="text-right">Price</p>
              <p className="text-right">Amount</p>
            </div>

            {order.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_80px_100px_100px] items-center border-t px-4 py-4 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded bg-[#fff7ed] print:hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>

                <p className="text-center font-semibold">{item.quantity}</p>
                <p className="text-right">₹{item.price}</p>
                <p className="text-right font-bold">
                  ₹{item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>

          {order.coupon && (
            <div className="mt-6 rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-bold">Coupon Applied: {order.coupon.code}</p>
              <p className="mt-1">{order.coupon.label}</p>
              {getOrderCouponTotalSavings(order) > 0 && (
                <p className="mt-1 font-semibold">
                  Total coupon saving: ₹{getOrderCouponTotalSavings(order)}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
            <p className="font-bold">Loyalty Points Earned</p>
            <p className="mt-1">
              This order earned {getOrderLoyaltyPoints(order)} loyalty point
              {getOrderLoyaltyPoints(order) !== 1 ? "s" : ""}.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full rounded-lg bg-gray-50 p-4 md:w-80">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>

              <div className="mt-3 flex justify-between text-sm">
                <span>Delivery Charge</span>
                <span>
                  {order.deliveryCharge === 0
                    ? "FREE"
                    : `₹${order.deliveryCharge}`}
                </span>
              </div>

              {getOrderCouponDiscount(order) > 0 && (
                <div className="mt-3 flex justify-between text-sm text-[#15803d]">
                  <span>
                    Coupon Discount
                    {order.coupon ? ` (${order.coupon.code})` : ""}
                  </span>
                  <span>-₹{getOrderCouponDiscount(order)}</span>
                </div>
              )}

              {getOrderCouponDeliveryDiscount(order) > 0 && (
                <div className="mt-3 flex justify-between text-sm text-[#15803d]">
                  <span>
                    Delivery Coupon
                    {order.coupon ? ` (${order.coupon.code})` : ""}
                  </span>
                  <span>-₹{getOrderCouponDeliveryDiscount(order)}</span>
                </div>
              )}

              {order.coupon && getOrderCouponTotalSavings(order) === 0 && (
                <div className="mt-3 flex justify-between text-sm text-[#15803d]">
                  <span>Coupon Applied</span>
                  <span>{order.coupon.code}</span>
                </div>
              )}

              <div className="mt-3 flex justify-between text-sm">
                <span>Payment Status</span>
                <span className="font-bold text-blue-700">
                  {getOrderPaymentStatus(order)}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span>Payment Reference</span>
                <span className="break-words text-right font-bold text-gray-700">
                  {getOrderPaymentReference(order)}
                </span>
              </div>

              <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            <p className="font-bold text-gray-900">Note:</p>
            <p className="mt-1">
              This is a demo invoice generated by PujaFresh. For real business,
              GST number, company address, refund policy and official invoice
              series should be added.
            </p>
          </div>

          <p className="mt-8 text-center text-sm font-semibold text-gray-600">
            Thank you for shopping with PujaFresh.
          </p>
        </div>
      </section>
    </main>
  );
}