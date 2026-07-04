"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
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
    landmark?: string;
    pincode?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      id?: string;
      label?: string;
    };
    paymentMethod?: string;
    notes?: string;
    deliveryArea?: {
      areaName?: string;
      city?: string;
      pincode?: string;
    } | null;
  };
  items: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  coupon?: {
    code?: string;
    label?: string;
    discountAmount?: number;
    deliveryDiscount?: number;
  } | null;
  loyalty?: {
    pointsEarned?: number;
    pointsRedeemed?: number;
    redemptionAmount?: number;
  };
  total?: number;
  paymentStatus?: string;
  paymentReference?: string;
  status?: string;
  createdAt?: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const formatCurrency = (amount?: number) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const formatDateTime = (date?: string) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "N/A";

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-IN", {
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

const getCustomerEmail = (order: Order) => {
  return order.customerEmail || order.customer?.email || "N/A";
};

const getCustomerPhone = (order: Order) => {
  return order.customer?.phone || "N/A";
};

const getInvoiceNumber = (orderId: string) => {
  return `INV-${orderId.replace(/[^A-Za-z0-9]/g, "")}`;
};

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (!savedOrders) return [];

    const parsedOrders = JSON.parse(savedOrders) as Order[];

    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
};

const readLastOrder = () => {
  try {
    const savedOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    if (!savedOrder) return null;

    return JSON.parse(savedOrder) as Order;
  } catch {
    return null;
  }
};

const getPaymentStatus = (order: Order) => {
  if (order.paymentStatus) return order.paymentStatus;

  if (
    order.customer?.paymentMethod === "UPI QR Payment" ||
    order.customer?.paymentMethod === "Bank Transfer"
  ) {
    return "Verification Pending";
  }

  return "Payment Pending";
};

const getPaymentReference = (order: Order) => {
  return order.paymentReference?.trim() || "Not provided";
};

export default function InvoicePage() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId") || "";
    const phone = params.get("phone") || "";

    if (orderId) {
      setOrderIdInput(orderId);
      setPhoneInput(phone);
      findOrder(orderId, phone, false);
      return;
    }

    const lastOrder = readLastOrder();

    if (lastOrder) {
      setOrder(lastOrder);
      setOrderIdInput(lastOrder.id);
    }
  }, []);

  const calculatedSubtotal = useMemo(() => {
    if (!order) return 0;

    return order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [order]);

  const subtotal = order?.subtotal ?? calculatedSubtotal;
  const deliveryCharge = Number(order?.deliveryCharge || 0);
  const discountAmount = Number(
    order?.coupon?.discountAmount ?? order?.discountAmount ?? 0
  );
  const deliveryDiscount = Number(order?.coupon?.deliveryDiscount || 0);
  const loyaltyDiscount = Number(order?.loyalty?.redemptionAmount || 0);
  const total =
    order?.total ??
    Math.max(
      subtotal + deliveryCharge - discountAmount - deliveryDiscount - loyaltyDiscount,
      0
    );

  const findOrder = (
    orderIdValue = orderIdInput,
    phoneValue = phoneInput,
    showToast = true
  ) => {
    const orderId = orderIdValue.trim();
    const phone = phoneValue.replace(/\D/g, "");

    if (!orderId) {
      toast.error("Please enter order ID");
      return;
    }

    const orders = readOrders();
    const lastOrder = readLastOrder();

    const allOrders = lastOrder
      ? [lastOrder, ...orders.filter((savedOrder) => savedOrder.id !== lastOrder.id)]
      : orders;

    const matchedOrder = allOrders.find((savedOrder) => {
      const matchesOrderId =
        savedOrder.id.toLowerCase() === orderId.toLowerCase();

      if (!matchesOrderId) return false;

      if (!phone) return true;

      const orderPhone = savedOrder.customer?.phone?.replace(/\D/g, "") || "";

      return orderPhone === phone;
    });

    setSearched(true);

    if (!matchedOrder) {
      setOrder(null);

      if (showToast) {
        toast.error("Invoice not found. Please check order ID or phone number.");
      }

      return;
    }

    setOrder(matchedOrder);

    if (showToast) {
      toast.success("Invoice loaded");
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    findOrder();
  };

  const printInvoice = () => {
    window.print();
  };

  const copyInvoiceLink = async () => {
    if (!order) return;

    const url = `${window.location.origin}/invoice?orderId=${encodeURIComponent(
      order.id
    )}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invoice link copied");
    } catch {
      toast.error("Could not copy invoice link");
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-gray-900">
      <div className="print:hidden">
        <Navbar />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="print:hidden">
          <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
              PujaFresh Invoice
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Order Invoice
            </h1>

            <p className="mt-3 max-w-3xl text-orange-50">
              Search by order ID and print or save the bill as PDF from your
              browser print window.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Order ID *
                </label>

                <input
                  value={orderIdInput}
                  onChange={(event) => setOrderIdInput(event.target.value)}
                  placeholder="Example: PF-1234567890"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Phone Optional
                </label>

                <input
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                  placeholder="10-digit phone"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded bg-[#7a1e13] px-5 py-3 font-bold text-white hover:bg-[#64180f]"
                >
                  Find Invoice
                </button>
              </div>
            </div>
          </form>
        </div>

        {!order && searched && (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm print:hidden">
            <h2 className="text-2xl font-black text-gray-900">
              Invoice Not Found
            </h2>

            <p className="mt-2 text-gray-600">
              Please check the order ID and try again.
            </p>

            <Link
              href="/track-order"
              className="mt-5 inline-block rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Orders
            </Link>
          </div>
        )}

        {order && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm print:mt-0 print:rounded-none print:p-8 print:shadow-none">
            <div className="mb-6 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={printInvoice}
                className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
              >
                Print / Save as PDF
              </button>

              <button
                onClick={copyInvoiceLink}
                className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
              >
                Copy Link
              </button>

              <Link
                href="/orders"
                className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Back to Orders
              </Link>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-[#7a1e13]">
                    PujaFresh
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    Fresh Pooja Essentials
                  </p>

                  <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">
                    Delhi, India<br />
                    Email: support@pujafresh.local<br />
                    Phone: +91 98765 00000
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <h1 className="text-3xl font-black text-gray-900">
                    INVOICE
                  </h1>

                  <p className="mt-2 text-sm font-bold text-gray-600">
                    Invoice No: {getInvoiceNumber(order.id)}
                  </p>

                  <p className="mt-1 text-sm font-bold text-gray-600">
                    Order ID: {order.id}
                  </p>

                  <p className="mt-1 text-sm font-bold text-gray-600">
                    Date: {formatDateTime(order.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 border-b border-gray-200 py-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  Bill To
                </h3>

                <p className="mt-3 text-lg font-black text-gray-900">
                  {getCustomerName(order)}
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Email: {getCustomerEmail(order)}<br />
                  Phone: {getCustomerPhone(order)}<br />
                  Address: {order.customer?.address || "N/A"}<br />
                  Landmark: {order.customer?.landmark || "N/A"}<br />
                  Pincode: {order.customer?.pincode || "N/A"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  Order Details
                </h3>

                <div className="mt-3 grid gap-2 text-sm text-gray-700">
                  <p>
                    <span className="font-bold">Order Status:</span>{" "}
                    {order.status || "N/A"}
                  </p>
                  <p>
                    <span className="font-bold">Payment Status:</span>{" "}
                    {getPaymentStatus(order)}
                  </p>
                  <p>
                    <span className="font-bold">Payment Method:</span>{" "}
                    {order.customer?.paymentMethod || "N/A"}
                  </p>
                  <p>
                    <span className="font-bold">Payment Reference:</span>{" "}
                    {getPaymentReference(order)}
                  </p>
                  <p>
                    <span className="font-bold">Delivery Date:</span>{" "}
                    {formatDate(order.customer?.deliveryDate)}
                  </p>
                  <p>
                    <span className="font-bold">Delivery Slot:</span>{" "}
                    {order.customer?.deliverySlotDetails?.label ||
                      order.customer?.deliverySlot ||
                      "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="py-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#fff7ed] text-[#7a1e13]">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items.map((item, index) => {
                      const customKit = isCustomKitItem(item);
                      const customKitItems = getCustomKitItems(item);

                      return (
                        <tr
                          key={`${item.id || item.name}-${index}`}
                          className="border-b align-top"
                        >
                          <td className="px-4 py-4">
                            <p className="font-bold text-gray-900">
                              {item.name}
                            </p>

                            {customKit && (
                              <span className="mt-1 inline-flex rounded-full bg-[#fff7ed] px-2 py-1 text-[11px] font-black uppercase text-[#7a1e13]">
                                Custom Kit
                              </span>
                            )}

                            {customKitItems.length > 0 && (
                              <div className="mt-2 rounded bg-gray-50 p-2">
                                <p className="text-[11px] font-black uppercase text-gray-600">
                                  Kit includes
                                </p>

                                <p className="mt-1 text-xs leading-5 text-gray-700">
                                  {customKitItems.join(", ")}
                                </p>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-gray-600">
                            {item.category || "Pooja Essential"}
                          </td>

                          <td className="px-4 py-4 text-right text-gray-700">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-4 text-right text-gray-700">
                            {formatCurrency(item.price)}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto mt-6 max-w-md rounded-xl bg-gray-50 p-5">
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(deliveryCharge)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Coupon Discount {order.coupon?.code ? `(${order.coupon.code})` : ""}
                    </span>
                    <span className="font-bold text-green-700">
                      - {formatCurrency(discountAmount)}
                    </span>
                  </div>

                  {deliveryDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Coupon</span>
                      <span className="font-bold text-green-700">
                        - {formatCurrency(deliveryDiscount)}
                      </span>
                    </div>
                  )}

                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Loyalty Redemption
                      </span>
                      <span className="font-bold text-green-700">
                        - {formatCurrency(loyaltyDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg">
                      <span className="font-black text-gray-900">
                        Grand Total
                      </span>
                      <span className="font-black text-[#7a1e13]">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 text-sm leading-6 text-gray-600">
              <p className="font-bold text-gray-900">Thank you for shopping with PujaFresh.</p>
              <p>
                This is a computer-generated invoice for demo project use. For
                any order issue, please contact support with your Order ID.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
