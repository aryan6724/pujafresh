"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  addDeliveryFeedback,
  createDeliveryFeedbackId,
  DeliveryFeedbackIssue,
  getFeedbackByOrderId,
} from "@/utils/deliveryFeedbackStorage";

type AssignedPartner = {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  assignedAt: string;
};

type Order = {
  id: string;
  total?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveredAt?: string;
  deliveryPartner?: AssignedPartner | null;
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
  };
  items?: {
    name?: string;
    quantity?: number;
    price?: number;
  }[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const issueTypes: DeliveryFeedbackIssue[] = [
  "None",
  "Late Delivery",
  "Damaged Item",
  "Wrong Item",
  "Missing Item",
  "Partner Behaviour",
  "Packaging Issue",
  "Other",
];

const ratingOptions = [5, 4, 3, 2, 1];

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

const getCustomerEmail = (order: Order) => {
  return order.customer?.email || order.customerEmail || "";
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

function DeliveryFeedbackContent() {
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [existingFeedbackFound, setExistingFeedbackFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [orderRating, setOrderRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [packagingRating, setPackagingRating] = useState(5);
  const [issueType, setIssueType] = useState<DeliveryFeedbackIssue>("None");
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);

  useEffect(() => {
    const loadedOrders = loadOrders();

    if (!queryOrderId) return;

    const foundOrder = loadedOrders.find(
      (order) => order.id.toLowerCase() === queryOrderId.toLowerCase()
    );

    setOrderIdInput(queryOrderId);

    if (!foundOrder) {
      setSelectedOrder(null);
      setExistingFeedbackFound(false);
      setHasSearched(true);
      return;
    }

    if (foundOrder.status !== "Delivered") {
      setSelectedOrder(null);
      setExistingFeedbackFound(false);
      setHasSearched(true);
      return;
    }

    const existingFeedback = getFeedbackByOrderId(foundOrder.id);

    setPhoneInput(getCustomerPhone(foundOrder));
    setSelectedOrder(foundOrder);
    setExistingFeedbackFound(Boolean(existingFeedback));
    setHasSearched(true);
    resetForm();
  }, [queryOrderId]);

  const loadOrders = () => {
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const savedLastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

      const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];
      const baseOrders = Array.isArray(parsedOrders) ? parsedOrders : [];

      let mergedOrders = baseOrders;

      if (savedLastOrder) {
        const lastOrder = JSON.parse(savedLastOrder) as Order;
        const existsInOrders = baseOrders.some((order) => order.id === lastOrder.id);

        mergedOrders = existsInOrders ? baseOrders : [lastOrder, ...baseOrders];
      }

      mergedOrders = mergedOrders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

      setOrders(mergedOrders);
      return mergedOrders;
    } catch {
      setOrders([]);
      return [];
    }
  };

  const latestDeliveredOrders = useMemo(() => {
    return orders.filter((order) => order.status === "Delivered").slice(0, 5);
  }, [orders]);

  const resetForm = () => {
    setOrderRating(5);
    setDeliveryRating(5);
    setPackagingRating(5);
    setIssueType("None");
    setComment("");
    setWouldRecommend(true);
  };

  const handleFindOrder = (event: FormEvent) => {
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
      setSelectedOrder(null);
      setExistingFeedbackFound(false);
      setHasSearched(true);
      toast.error("Order not found");
      return;
    }

    if (cleanPhone && getCustomerPhone(foundOrder) !== cleanPhone) {
      setSelectedOrder(null);
      setExistingFeedbackFound(false);
      setHasSearched(true);
      toast.error("Phone number does not match this order");
      return;
    }

    if (foundOrder.status !== "Delivered") {
      setSelectedOrder(null);
      setExistingFeedbackFound(false);
      setHasSearched(true);
      toast.error("Feedback can be submitted only after delivery");
      return;
    }

    const existingFeedback = getFeedbackByOrderId(foundOrder.id);

    setExistingFeedbackFound(Boolean(existingFeedback));
    setSelectedOrder(foundOrder);
    setHasSearched(true);
    resetForm();

    if (existingFeedback) {
      toast.error("Feedback already submitted for this order");
      return;
    }

    toast.success("Delivered order found");
  };

  const handleDemoOrder = (order: Order) => {
    setOrderIdInput(order.id);
    setPhoneInput(getCustomerPhone(order));
    setSelectedOrder(order);
    setExistingFeedbackFound(Boolean(getFeedbackByOrderId(order.id)));
    setHasSearched(true);
    resetForm();
    toast.success("Demo delivered order loaded");
  };

  const handleSubmitFeedback = (event: FormEvent) => {
    event.preventDefault();

    if (!selectedOrder) {
      toast.error("Please find a delivered order first");
      return;
    }

    if (existingFeedbackFound) {
      toast.error("Feedback already submitted for this order");
      return;
    }

    if (issueType !== "None" && !comment.trim()) {
      toast.error("Please add a short comment for the selected issue");
      return;
    }

    addDeliveryFeedback({
      id: createDeliveryFeedbackId(),
      orderId: selectedOrder.id,
      customerName: getCustomerName(selectedOrder),
      customerPhone: getCustomerPhone(selectedOrder),
      customerEmail: getCustomerEmail(selectedOrder),
      deliveryPartnerId: selectedOrder.deliveryPartner?.id,
      deliveryPartnerName: selectedOrder.deliveryPartner?.name,
      deliveryPartnerPhone: selectedOrder.deliveryPartner?.phone,
      orderRating,
      deliveryRating,
      packagingRating,
      issueType,
      comment: comment.trim(),
      wouldRecommend,
      createdAt: new Date().toISOString(),
    });

    setExistingFeedbackFound(true);
    toast.success("Thank you for your feedback");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Feedback
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Delivery Feedback
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Share your experience after delivery. Your feedback helps improve
            packaging, delivery quality and customer support.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-gray-900">
              Find Delivered Order
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Enter order ID and optional phone number to submit feedback.
            </p>

            <form onSubmit={handleFindOrder} className="mt-5 grid gap-4">
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
                Find Order
              </button>
            </form>

            {latestDeliveredOrders.length > 0 && (
              <div className="mt-6 rounded-xl bg-[#fff7ed] p-4">
                <p className="text-sm font-bold text-gray-900">
                  Demo delivered orders
                </p>

                <div className="mt-3 grid gap-2">
                  {latestDeliveredOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleDemoOrder(order)}
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
            {!selectedOrder && hasSearched && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <h2 className="text-2xl font-black text-gray-900">
                  Feedback Not Available
                </h2>

                <p className="mt-3 text-gray-600">
                  Please check order ID or make sure your order is delivered.
                </p>

                <Link
                  href={orderIdInput ? `/track-order?orderId=${encodeURIComponent(orderIdInput)}` : "/track-order"}
                  className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
                >
                  Track Order
                </Link>
              </div>
            )}

            {!selectedOrder && !hasSearched && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <h2 className="text-2xl font-black text-gray-900">
                  Search a delivered order
                </h2>

                <p className="mt-3 text-gray-600">
                  Feedback form will appear after you find a delivered order.
                </p>
              </div>
            )}

            {selectedOrder && (
              <form
                onSubmit={handleSubmitFeedback}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-gray-500">
                      Feedback for
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-gray-900">
                      {selectedOrder.id}
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                      Delivered at {formatDateTime(selectedOrder.deliveredAt)}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
                    Delivered
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-bold text-gray-500">
                      Customer
                    </p>
                    <p className="mt-1 font-black text-gray-900">
                      {getCustomerName(selectedOrder)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-bold text-gray-500">
                      Partner
                    </p>
                    <p className="mt-1 font-black text-gray-900">
                      {selectedOrder.deliveryPartner?.name || "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-bold text-gray-500">
                      Order Total
                    </p>
                    <p className="mt-1 font-black text-gray-900">
                      ₹{selectedOrder.total || 0}
                    </p>
                  </div>
                </div>

                {existingFeedbackFound ? (
                  <div className="mt-6 rounded-xl bg-green-50 p-5 text-center">
                    <h3 className="text-xl font-black text-green-700">
                      Feedback already submitted
                    </h3>

                    <p className="mt-2 text-sm text-green-700">
                      Thank you for sharing your experience with PujaFresh.
                    </p>

                    <Link
                      href={orderIdInput ? `/track-order?orderId=${encodeURIComponent(orderIdInput)}` : "/track-order"}
                      className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
                    >
                      Track Another Order
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-bold text-gray-700">
                          Overall Order Rating
                        </label>

                        <select
                          value={orderRating}
                          onChange={(event) =>
                            setOrderRating(Number(event.target.value))
                          }
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                        >
                          {ratingOptions.map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} Star{rating !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700">
                          Delivery Rating
                        </label>

                        <select
                          value={deliveryRating}
                          onChange={(event) =>
                            setDeliveryRating(Number(event.target.value))
                          }
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                        >
                          {ratingOptions.map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} Star{rating !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700">
                          Packaging Rating
                        </label>

                        <select
                          value={packagingRating}
                          onChange={(event) =>
                            setPackagingRating(Number(event.target.value))
                          }
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                        >
                          {ratingOptions.map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} Star{rating !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-bold text-gray-700">
                          Issue Type
                        </label>

                        <select
                          value={issueType}
                          onChange={(event) =>
                            setIssueType(event.target.value as DeliveryFeedbackIssue)
                          }
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                        >
                          {issueTypes.map((issue) => (
                            <option key={issue}>{issue}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-700">
                          Would you recommend PujaFresh?
                        </label>

                        <select
                          value={String(wouldRecommend)}
                          onChange={(event) =>
                            setWouldRecommend(event.target.value === "true")
                          }
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="text-sm font-bold text-gray-700">
                        Comment
                      </label>

                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={4}
                        placeholder="Share your experience..."
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-5 rounded bg-[#7a1e13] px-8 py-3 font-bold text-white hover:bg-[#64180f]"
                    >
                      Submit Feedback
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}


function DeliveryFeedbackFallback() {
  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Loading delivery feedback...
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we prepare your feedback page.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function DeliveryFeedbackPage() {
  return (
    <Suspense fallback={<DeliveryFeedbackFallback />}>
      <DeliveryFeedbackContent />
    </Suspense>
  );
}
