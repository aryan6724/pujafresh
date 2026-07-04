"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  DeliveryArea,
  findDeliveryAreaByPincode,
  getDeliveryAreas,
} from "@/utils/pincodeStorage";
import { DeliverySlot, getDeliverySlots } from "@/utils/deliverySlotStorage";

type CheckoutFormData = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  landmark: string;
  pincode: string;
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
};

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return formatDateForInput(tomorrow);
};

const getSafeImage = (image: unknown) => {
  const value = String(image || "").trim();

  if (value.length > 0) {
    return value;
  }

  return "/premium-pooja-pack.jpg";
};

const isCustomKitItem = (item: any) => {
  return (
    item?.category === "Custom Kit" ||
    item?.badge === "Custom Kit" ||
    String(item?.slug || "").startsWith("custom-pooja-kit")
  );
};

const getAvailableStock = (item: any) => {
  if (isCustomKitItem(item)) return null;

  return Number(
    item?.stockQuantity ??
      (item?.stock === "Out of Stock" || item?.stock === "Coming Soon"
        ? 0
        : 999)
  );
};

const getCustomKitItems = (item: any) => {
  if (!isCustomKitItem(item)) return [];

  return String(item?.description || "")
    .split(",")
    .map((kitItem) => kitItem.trim())
    .filter(Boolean);
};

const getInitialPaymentStatus = (paymentMethod: string) => {
  if (paymentMethod === "Cash on Delivery") {
    return "Payment Pending";
  }

  return "Verification Pending";
};

export default function CheckoutPage() {
  const router = useRouter();

  const auth = useAuth() as any;
  const cart = useCart() as any;

  const user = auth?.user || null;
  const isLoggedIn = Boolean(auth?.isLoggedIn);

  const cartItems = Array.isArray(cart?.cartItems) ? cart.cartItems : [];
  const clearCart = cart?.clearCart;

  const tomorrowDate = getTomorrowDate();

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    landmark: "",
    pincode: "",
    deliveryDate: tomorrowDate,
    deliverySlot: "",
    paymentMethod: "Cash on Delivery",
    paymentReference: "",
    notes: "",
  });

  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);

  useEffect(() => {
    const areas = getDeliveryAreas();
    const slots = getDeliverySlots()
      .filter((slot) => slot.isActive)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

    setDeliveryAreas(areas);
    setDeliverySlots(slots);

    if (slots.length > 0) {
      setFormData((prev) => ({
        ...prev,
        deliverySlot: prev.deliverySlot || slots[0].label,
      }));
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      fullName: String(user?.fullName || user?.name || ""),
      phone: String(user?.phone || ""),
      email: String(user?.email || ""),
    }));
  }, [user]);

  const availableCartItems = useMemo(() => {
    return cartItems.filter((item: any) => {
      const stockQuantity = getAvailableStock(item);

      if (isCustomKitItem(item)) return true;

      return (
        item?.stock !== "Out of Stock" &&
        item?.stock !== "Coming Soon" &&
        Number(stockQuantity || 0) > 0
      );
    });
  }, [cartItems]);

  const unavailableCartItems = useMemo(() => {
    return cartItems.filter((item: any) => {
      return !availableCartItems.includes(item);
    });
  }, [cartItems, availableCartItems]);

  const stockLimitIssueItems = useMemo(() => {
    return availableCartItems.filter((item: any) => {
      const stockQuantity = getAvailableStock(item);

      if (stockQuantity === null) return false;

      return Number(item?.quantity || 0) > stockQuantity;
    });
  }, [availableCartItems]);

  const hasUnavailableItems = unavailableCartItems.length > 0;
  const hasStockLimitIssues = stockLimitIssueItems.length > 0;

  let subtotal = 0;

  for (const item of availableCartItems) {
    subtotal =
      subtotal + Number(item?.price || 0) * Number(item?.quantity || 0);
  }

  const selectedDeliveryArea = formData.pincode.trim().length === 6
    ? findDeliveryAreaByPincode(formData.pincode.trim())
    : null;

  const activeDeliverySlots = deliverySlots.filter((slot) => slot.isActive);

  const selectedDeliverySlot =
    activeDeliverySlots.find((slot) => slot.label === formData.deliverySlot) ||
    activeDeliverySlots[0] ||
    null;

  const isPincodeSixDigits = formData.pincode.trim().length === 6;
  const isPincodeServiceable = Boolean(selectedDeliveryArea);

  const minimumOrderValue = selectedDeliveryArea?.minOrderValue ?? 0;
  const freeDeliveryAbove = selectedDeliveryArea?.freeDeliveryAbove ?? 0;
  const areaDeliveryCharge = selectedDeliveryArea?.deliveryCharge ?? 0;

  const isMinimumOrderValueValid =
    !selectedDeliveryArea || subtotal >= minimumOrderValue;

  const deliveryCharge =
    subtotal === 0 ||
    !selectedDeliveryArea ||
    (freeDeliveryAbove > 0 && subtotal >= freeDeliveryAbove)
      ? 0
      : areaDeliveryCharge;

  const finalTotal = subtotal + deliveryCharge;

  const requiresPaymentReference =
    formData.paymentMethod === "UPI QR Payment" ||
    formData.paymentMethod === "Bank Transfer";

  const isPaymentReferenceValid =
    !requiresPaymentReference || formData.paymentReference.trim().length >= 6;

  const isPlaceOrderDisabled =
    subtotal <= 0 ||
    hasUnavailableItems ||
    hasStockLimitIssues ||
    !formData.fullName.trim() ||
    formData.phone.trim().length !== 10 ||
    !formData.address.trim() ||
    !isPincodeSixDigits ||
    !isPincodeServiceable ||
    !isMinimumOrderValueValid ||
    !selectedDeliverySlot ||
    !formData.deliveryDate ||
    formData.deliveryDate < tomorrowDate ||
    !isPaymentReferenceValid;

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        phone: value.replace(/\D/g, "").slice(0, 10),
      }));

      return;
    }

    if (name === "pincode") {
      setFormData((prev) => ({
        ...prev,
        pincode: value.replace(/\D/g, "").slice(0, 6),
      }));

      return;
    }

    if (name === "paymentMethod") {
      setFormData((prev) => ({
        ...prev,
        paymentMethod: value,
        paymentReference:
          value === "UPI QR Payment" || value === "Bank Transfer"
            ? prev.paymentReference
            : "",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlaceOrder = (event: FormEvent) => {
    event.preventDefault();

    if (!isLoggedIn || !user) {
      toast.error("Please login before checkout");
      router.push("/login");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      router.push("/cart");
      return;
    }

    if (hasUnavailableItems) {
      toast.error("Remove unavailable products before checkout");
      router.push("/cart");
      return;
    }

    if (hasStockLimitIssues) {
      toast.error("Reduce item quantity according to available stock");
      router.push("/cart");
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error("Please enter full name");
      return;
    }

    if (formData.phone.trim().length !== 10) {
      toast.error("Please enter valid 10-digit phone number");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("Please enter full address");
      return;
    }

    if (!isPincodeSixDigits) {
      toast.error("Please enter valid 6-digit pincode");
      return;
    }

    if (!isPincodeServiceable || !selectedDeliveryArea) {
      toast.error("Delivery is not available in this pincode yet");
      return;
    }

    if (!isMinimumOrderValueValid) {
      toast.error(`Minimum order value for this area is ₹${minimumOrderValue}`);
      return;
    }

    if (!selectedDeliverySlot) {
      toast.error("No active delivery slot available");
      return;
    }

    if (!formData.deliveryDate || formData.deliveryDate < tomorrowDate) {
      toast.error("Delivery date must be tomorrow or later");
      return;
    }

    if (!isPaymentReferenceValid) {
      toast.error("Please enter valid payment reference / UTR number");
      return;
    }

    const now = new Date().toISOString();

    const order = {
      id: `PF-${Date.now()}`,
      customerEmail: String(user?.email || formData.email),
      customerName: String(user?.fullName || user?.name || formData.fullName),
      customer: {
        fullName: formData.fullName,
        phone: formData.phone,
        email: String(user?.email || formData.email),
        address: formData.address,
        landmark: formData.landmark,
        pincode: formData.pincode,
        deliveryDate: formData.deliveryDate,
        deliverySlot: selectedDeliverySlot.label,
        deliverySlotDetails: {
          id: selectedDeliverySlot.id,
          label: selectedDeliverySlot.label,
          timeRange: selectedDeliverySlot.timeRange,
        },
        deliveryArea: {
          id: selectedDeliveryArea.id,
          pincode: selectedDeliveryArea.pincode,
          areaName: selectedDeliveryArea.areaName,
          city: selectedDeliveryArea.city,
          state: selectedDeliveryArea.state,
          deliveryCharge: selectedDeliveryArea.deliveryCharge,
          freeDeliveryAbove: selectedDeliveryArea.freeDeliveryAbove,
          minOrderValue: selectedDeliveryArea.minOrderValue,
        },
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
      },
      items: availableCartItems,
      subtotal,
      deliveryCharge,
      discountAmount: 0,
      coupon: null,
      total: finalTotal,
      paymentStatus: getInitialPaymentStatus(formData.paymentMethod),
      paymentReference: requiresPaymentReference
        ? formData.paymentReference.trim()
        : "",
      status: "Pending",
      createdAt: now,
      statusHistory: [
        {
          status: "Pending",
          message: "Order placed by customer.",
          updatedAt: now,
          updatedBy: "Customer",
        },
      ],
    };

    const previousOrders = JSON.parse(
      localStorage.getItem("pujafresh-orders") || "[]"
    );

    localStorage.setItem(
      "pujafresh-orders",
      JSON.stringify([order, ...previousOrders])
    );

    localStorage.setItem("pujafresh-last-order", JSON.stringify(order));

    clearCart?.();

    toast.success("Order placed successfully");
    router.push("/order-success");
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
              Please login or create an account before checkout.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 text-center font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 text-center font-bold text-[#7a1e13]"
              >
                Register
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Your cart is empty
            </h1>

            <p className="mt-2 text-gray-600">Add products before checkout.</p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Continue Shopping
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
          Logged in as {formData.fullName || user?.email}
        </div>

        {hasUnavailableItems && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">Checkout blocked</p>
            <p className="mt-1">
              Some products are unavailable. Please remove them from cart.
            </p>

            <Link
              href="/cart"
              className="mt-3 inline-block rounded bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Go to Cart
            </Link>
          </div>
        )}

        {hasStockLimitIssues && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <p className="font-bold">Stock limit issue</p>
            <p className="mt-1">
              Some item quantities are higher than available stock.
            </p>

            <Link
              href="/cart"
              className="mt-3 inline-block rounded bg-orange-600 px-4 py-2 text-sm font-bold text-white"
            >
              Go to Cart
            </Link>
          </div>
        )}

        <form
          onSubmit={handlePlaceOrder}
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]"
        >
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Delivery Details
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Full Name *
                  </label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    inputMode="numeric"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter mobile number"
                  />

                  {formData.phone.length > 0 && formData.phone.length < 10 && (
                    <p className="mt-1 text-xs font-semibold text-orange-600">
                      Please enter complete 10-digit phone number.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    name="email"
                    value={formData.email}
                    readOnly
                    className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 outline-none"
                    placeholder="Email from your account"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Pincode *
                  </label>
                  <input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    maxLength={6}
                    inputMode="numeric"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter pincode"
                  />

                  {isPincodeSixDigits && selectedDeliveryArea && (
                    <p className="mt-1 text-xs font-semibold text-[#15803d]">
                      Delivery available in {selectedDeliveryArea.areaName}. Min
                      order ₹{selectedDeliveryArea.minOrderValue}, free delivery
                      above ₹{selectedDeliveryArea.freeDeliveryAbove}.
                    </p>
                  )}

                  {isPincodeSixDigits && !selectedDeliveryArea && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Sorry, delivery is not available in this pincode yet.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Full Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="House no, street, area, city"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Landmark
                  </label>
                  <input
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Near temple, school, metro station etc."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Delivery Slot
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    min={tomorrowDate}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Delivery Slot
                  </label>
                  <select
                    name="deliverySlot"
                    value={formData.deliverySlot}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  >
                    {activeDeliverySlots.length === 0 ? (
                      <option value="">No active slot available</option>
                    ) : (
                      activeDeliverySlots.map((slot) => (
                        <option key={slot.id} value={slot.label}>
                          {slot.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <p className="mt-3 text-sm font-medium text-[#15803d]">
                Minimum delivery date is tomorrow.
              </p>

              {selectedDeliverySlot && (
                <p className="mt-1 text-sm font-semibold text-gray-600">
                  Selected slot: {selectedDeliverySlot.timeRange} | Capacity:{" "}
                  {selectedDeliverySlot.maxOrders} orders
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Payment Method
              </h2>

              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="mt-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
              >
                <option>Cash on Delivery</option>
                <option>UPI QR Payment</option>
                <option>Bank Transfer</option>
              </select>

              {requiresPaymentReference && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <label className="text-sm font-bold text-gray-900">
                    Payment Reference / UTR Number *
                  </label>

                  <input
                    name="paymentReference"
                    value={formData.paymentReference}
                    onChange={handleChange}
                    className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter transaction ID or UTR number"
                  />

                  <p className="mt-2 text-xs font-semibold text-blue-700">
                    Enter payment reference after payment. Admin can verify it
                    manually.
                  </p>
                </div>
              )}

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Order notes: leave at gate, call before delivery..."
              />
            </div>
          </div>

          <aside className="h-fit rounded-xl bg-white p-5 shadow-sm">
            <h2 className="border-b pb-3 text-lg font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="mt-4 space-y-4">
              {cartItems.map((item: any, index: number) => {
                const quantity = Number(item?.quantity || 1);
                const price = Number(item?.price || 0);
                const stockQuantity = getAvailableStock(item);
                const customKitItems = getCustomKitItems(item);
                const isUnavailable =
                  item?.stock === "Out of Stock" || item?.stock === "Coming Soon";
                const hasStockIssue =
                  stockQuantity !== null && quantity > stockQuantity;

                return (
                  <div
                    key={`${item?.slug || "checkout-item"}-${index}`}
                    className="flex gap-3"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded bg-[#fff7ed]">
                      <img
                        src={getSafeImage(item?.image)}
                        alt={String(item?.name || "Product")}
                        className={`h-full w-full object-contain p-1 ${
                          isUnavailable ? "opacity-60 grayscale" : ""
                        }`}
                        onError={(event) => {
                          event.currentTarget.src = "/premium-pooja-pack.jpg";
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="line-clamp-1 text-sm font-bold">
                        {item?.name || "Product"}
                      </h3>

                      <p className="text-xs text-gray-500">Qty: {quantity}</p>

                      {customKitItems.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {customKitItems.slice(0, 4).map((kitItem) => (
                            <span
                              key={kitItem}
                              className="rounded bg-[#fff7ed] px-2 py-1 text-[11px] font-semibold text-[#7a1e13]"
                            >
                              {kitItem}
                            </span>
                          ))}
                        </div>
                      )}

                      {stockQuantity !== null && (
                        <p
                          className={`text-xs font-semibold ${
                            hasStockIssue ? "text-orange-600" : "text-gray-500"
                          }`}
                        >
                          Available Stock: {stockQuantity} units
                        </p>
                      )}

                      {isUnavailable ? (
                        <p className="text-xs font-bold text-red-600">
                          {item?.stock}
                        </p>
                      ) : (
                        <p className="text-sm font-bold">₹{price * quantity}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 space-y-3 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="font-bold text-[#15803d]">FREE</span>
                  ) : (
                    `₹${deliveryCharge}`
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>

              {hasUnavailableItems && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Remove unavailable products before checkout.
                </p>
              )}

              {hasStockLimitIssues && (
                <p className="rounded bg-orange-50 p-2 text-xs font-semibold text-orange-700">
                  Some item quantities are higher than available stock.
                </p>
              )}

              {!isPincodeServiceable && isPincodeSixDigits && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Delivery is not available for this pincode.
                </p>
              )}

              {selectedDeliveryArea && !isMinimumOrderValueValid && (
                <p className="rounded bg-orange-50 p-2 text-xs font-semibold text-orange-700">
                  Minimum order value for {selectedDeliveryArea.areaName} is ₹
                  {minimumOrderValue}.
                </p>
              )}

              {selectedDeliveryArea && isMinimumOrderValueValid && (
                <p className="rounded bg-green-50 p-2 text-xs font-semibold text-green-700">
                  Delivery area: {selectedDeliveryArea.areaName},{" "}
                  {selectedDeliveryArea.city}
                </p>
              )}

              {!selectedDeliverySlot && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  No active delivery slot available.
                </p>
              )}

              {!isPaymentReferenceValid && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Enter payment reference / UTR number.
                </p>
              )}

              <button
                type="submit"
                disabled={isPlaceOrderDisabled}
                className={`w-full rounded py-3 font-bold text-white ${
                  isPlaceOrderDisabled
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#15803d] hover:bg-[#166534]"
                }`}
              >
                PLACE ORDER
              </button>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}
