"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";
import { getDefaultCustomerAddress } from "@/utils/addressStorage";
import {
  addSubscription,
  calculateNextDeliveryDate,
  CustomerSubscription,
  getCustomerSubscriptions,
  SubscriptionFrequency,
  updateSubscriptionStatus,
} from "@/utils/subscriptionStorage";

type SubscriptionFormData = {
  productId: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  customFrequencyNote: string;
  preferredDeliverySlot: string;
  startDate: string;
  endDate: string;
  addressSummary: string;
  pincode: string;
  paymentMode: "Cash on Delivery" | "UPI" | "Monthly Billing";
  notes: string;
};

const defaultFormData: SubscriptionFormData = {
  productId: "",
  quantity: 1,
  frequency: "Weekly",
  customFrequencyNote: "",
  preferredDeliverySlot: "5:00 AM - 7:00 AM",
  startDate: "",
  endDate: "",
  addressSummary: "",
  pincode: "",
  paymentMode: "Cash on Delivery",
  notes: "",
};

const frequencyOptions: SubscriptionFrequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Custom",
];

const statusFilters = [
  "All Status",
  "Pending Approval",
  "Active",
  "Paused",
  "Cancelled",
  "Completed",
];

const formatCurrency = (amount?: number) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow.toISOString().slice(0, 10);
};

const getStatusBadgeClass = (status: string) => {
  if (status === "Active") return "bg-green-50 text-green-700";
  if (status === "Pending Approval") return "bg-orange-50 text-orange-700";
  if (status === "Paused") return "bg-blue-50 text-blue-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Completed") return "bg-purple-50 text-purple-700";

  return "bg-gray-100 text-gray-700";
};

export default function SubscriptionsPage() {
  const { user, isLoggedIn } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [formData, setFormData] = useState<SubscriptionFormData>({
    ...defaultFormData,
    startDate: getTomorrowDate(),
  });
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchQuery, setSearchQuery] = useState("");

  const customerEmail = user?.email;
  const customerPhone = (user as any)?.phone;

  const loadSubscriptions = () => {
    setSubscriptions(getCustomerSubscriptions(customerEmail, customerPhone));
  };

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  useEffect(() => {
    if (!user) return;

    const defaultAddress = getDefaultCustomerAddress(
      user.email,
      (user as any)?.phone
    );

    setFormData((prev) => ({
      ...prev,
      startDate: prev.startDate || getTomorrowDate(),
      addressSummary:
        prev.addressSummary ||
        (defaultAddress
          ? `${defaultAddress.addressLine1}${
              defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ""
            }, ${defaultAddress.city}, ${defaultAddress.state}`
          : ""),
      pincode: prev.pincode || defaultAddress?.pincode || "",
    }));

    loadSubscriptions();
  }, [user]);

  const subscriptionProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.stock !== "Out of Stock" && product.stock !== "Coming Soon"
    );
  }, [products]);

  const selectedProduct = useMemo(() => {
    return subscriptionProducts.find(
      (product) => String(product.id) === formData.productId
    );
  }, [formData.productId, subscriptionProducts]);

  const estimatedTotal = selectedProduct
    ? Number(selectedProduct.price || 0) * Number(formData.quantity || 1)
    : 0;

  const filteredSubscriptions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      const matchesSearch =
        search.length === 0 ||
        subscription.id.toLowerCase().includes(search) ||
        subscription.items.some((item) => item.name.toLowerCase().includes(search)) ||
        subscription.status.toLowerCase().includes(search) ||
        subscription.frequency.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Status" || subscription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, subscriptions]);

  const stats = useMemo(() => {
    const active = subscriptions.filter(
      (subscription) => subscription.status === "Active"
    );
    const pending = subscriptions.filter(
      (subscription) => subscription.status === "Pending Approval"
    );

    return {
      total: subscriptions.length,
      active: active.length,
      pending: pending.length,
      paused: subscriptions.filter((subscription) => subscription.status === "Paused")
        .length,
      monthlyValue: active.reduce(
        (sum, subscription) => sum + Number(subscription.totalPerDelivery || 0),
        0
      ),
    };
  }, [subscriptions]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    if (name === "quantity") {
      setFormData((prev) => ({
        ...prev,
        quantity: Math.max(Number(value || 1), 1),
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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!selectedProduct) {
      toast.error("Please select a product");
      return false;
    }

    if (!formData.startDate) {
      toast.error("Please select start date");
      return false;
    }

    if (!formData.addressSummary.trim()) {
      toast.error("Please enter delivery address");
      return false;
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      toast.error("Please enter valid 6-digit pincode");
      return false;
    }

    if (formData.frequency === "Custom" && !formData.customFrequencyNote.trim()) {
      toast.error("Please explain custom frequency");
      return false;
    }

    return true;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!validateForm() || !selectedProduct) return;

    addSubscription({
      customerName: user.fullName || "Customer",
      customerEmail: user.email,
      customerPhone: (user as any)?.phone || "",
      items: [
        {
          productId: selectedProduct.id,
          slug: selectedProduct.slug,
          name: selectedProduct.name,
          image: selectedProduct.image,
          category: selectedProduct.category,
          price: Number(selectedProduct.price || 0),
          quantity: Number(formData.quantity || 1),
        },
      ],
      frequency: formData.frequency,
      customFrequencyNote: formData.customFrequencyNote.trim(),
      preferredDeliverySlot: formData.preferredDeliverySlot,
      startDate: formData.startDate,
      endDate: formData.endDate,
      nextDeliveryDate: formData.startDate,
      addressSummary: formData.addressSummary.trim(),
      pincode: formData.pincode.trim(),
      paymentMode: formData.paymentMode,
      notes: formData.notes.trim(),
      status: "Pending Approval",
    });

    toast.success("Subscription request created");
    setFormData({
      ...defaultFormData,
      startDate: getTomorrowDate(),
      addressSummary: formData.addressSummary,
      pincode: formData.pincode,
    });
    loadSubscriptions();
  };

  const handlePause = (subscriptionId: string) => {
    updateSubscriptionStatus(
      subscriptionId,
      "Paused",
      "Customer",
      "Subscription paused by customer."
    );
    loadSubscriptions();
    toast.success("Subscription paused");
  };

  const handleResume = (subscriptionId: string) => {
    updateSubscriptionStatus(
      subscriptionId,
      "Active",
      "Customer",
      "Subscription resumed by customer."
    );
    loadSubscriptions();
    toast.success("Subscription resumed");
  };

  const handleCancel = (subscriptionId: string) => {
    const confirmCancel = window.confirm("Cancel this subscription?");

    if (!confirmCancel) return;

    updateSubscriptionStatus(
      subscriptionId,
      "Cancelled",
      "Customer",
      "Subscription cancelled by customer."
    );
    loadSubscriptions();
    toast.success("Subscription cancelled");
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
              Please login to create and manage subscriptions.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]"
              >
                Register
              </Link>
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
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Repeat Delivery
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Subscriptions
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Schedule regular delivery for flowers, diya, incense, pooja samagri
            and other essentials.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Back to Profile
            </Link>

            <Link
              href="/reorder"
              className="rounded border border-white px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
            >
              Reorder Instead
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">{stats.active}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">{stats.pending}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Paused</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">{stats.paused}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active Value</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {formatCurrency(stats.monthlyValue)}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              Create Subscription
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Product *</label>

                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  <option value="">Select product</option>
                  {subscriptionProducts.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min={1}
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Frequency
                  </label>

                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  >
                    {frequencyOptions.map((frequency) => (
                      <option key={frequency}>{frequency}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.frequency === "Custom" && (
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Custom Frequency *
                  </label>

                  <input
                    name="customFrequencyNote"
                    value={formData.customFrequencyNote}
                    onChange={handleChange}
                    placeholder="Example: Every Monday and Friday"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Preferred Slot
                </label>

                <select
                  name="preferredDeliverySlot"
                  value={formData.preferredDeliverySlot}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  <option>5:00 AM - 7:00 AM</option>
                  <option>7:00 AM - 9:00 AM</option>
                  <option>5:00 PM - 7:00 PM</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Start Date *
                  </label>

                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    End Date
                  </label>

                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Delivery Address *
                </label>

                <textarea
                  name="addressSummary"
                  value={formData.addressSummary}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter delivery address"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Pincode *
                </label>

                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Payment Mode
                </label>

                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  <option>Cash on Delivery</option>
                  <option>UPI</option>
                  <option>Monthly Billing</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Notes</label>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any special instruction"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="rounded-xl bg-[#fff7ed] p-4">
                <p className="text-sm font-bold text-[#7a1e13]">
                  Estimated per delivery
                </p>
                <h3 className="mt-1 text-2xl font-black text-[#7a1e13]">
                  {formatCurrency(estimatedTotal)}
                </h3>
                <p className="mt-1 text-xs font-semibold text-gray-600">
                  Next delivery after start:{" "}
                  {formatDate(
                    calculateNextDeliveryDate(
                      formData.startDate,
                      formData.frequency
                    )
                  )}
                </p>
              </div>

              <button
                type="submit"
                className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
              >
                Request Subscription
              </button>
            </div>
          </form>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  My Subscriptions
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Showing {filteredSubscriptions.length} of {subscriptions.length} subscription
                  {subscriptions.length !== 1 ? "s" : ""}.
                </p>
              </div>

              <button
                onClick={loadSubscriptions}
                className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Search
                </label>

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search subscription, product, status..."
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                >
                  {statusFilters.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredSubscriptions.length === 0 ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-bold text-gray-900">
                  No subscription found
                </h3>

                <p className="mt-2 text-gray-600">
                  Create your first repeat delivery subscription from the form.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredSubscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                              subscription.status
                            )}`}
                          >
                            {subscription.status}
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                            {subscription.frequency}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black text-gray-900">
                          {subscription.id}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-gray-600">
                          {subscription.items
                            .map((item) => `${item.name} x ${item.quantity}`)
                            .join(", ")}
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          Next delivery: {formatDate(subscription.nextDeliveryDate)} •{" "}
                          {subscription.preferredDeliverySlot}
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          {subscription.addressSummary} - {subscription.pincode}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black text-[#7a1e13]">
                          {formatCurrency(subscription.totalPerDelivery)}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          per delivery
                        </p>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          {subscription.status === "Active" && (
                            <button
                              onClick={() => handlePause(subscription.id)}
                              className="rounded border border-blue-700 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-700 hover:text-white"
                            >
                              Pause
                            </button>
                          )}

                          {subscription.status === "Paused" && (
                            <button
                              onClick={() => handleResume(subscription.id)}
                              className="rounded border border-green-700 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-700 hover:text-white"
                            >
                              Resume
                            </button>
                          )}

                          {!["Cancelled", "Completed"].includes(subscription.status) && (
                            <button
                              onClick={() => handleCancel(subscription.id)}
                              className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
