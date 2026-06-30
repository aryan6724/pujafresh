"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays,
  Mail,
  MapPin,
  Package,
  Phone,
  Repeat,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type SubscriptionStatus = "Pending" | "Active" | "Paused" | "Cancelled";

type SubscriptionRequest = {
  id: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  packageType: string;
  frequency: string;
  startDate: string;
  pincode: string;
  deliveryArea: {
    pincode: string;
    areaName: string;
    city: string;
  } | null;
  address: string;
  notes: string;
  estimatedMonthlyPrice: number;
  status: SubscriptionStatus;
  createdAt: string;
  cancelledAt?: string;
  cancelledBy?: "Customer" | "Admin";
};

const SUBSCRIPTIONS_STORAGE_KEY = "pujafresh-subscriptions";

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusStyle = (status: SubscriptionStatus) => {
  if (status === "Pending") return "bg-orange-100 text-orange-700";
  if (status === "Active") return "bg-green-100 text-green-700";
  if (status === "Paused") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
};

const getStatusMessage = (status: SubscriptionStatus) => {
  if (status === "Pending") {
    return "Your request is waiting for admin approval.";
  }

  if (status === "Active") {
    return "Your subscription is active. Deliveries will be handled as per selected frequency.";
  }

  if (status === "Paused") {
    return "Your subscription is temporarily paused.";
  }

  return "This subscription request has been cancelled.";
};

export default function MySubscriptionsPage() {
  const { user, isLoggedIn } = useAuth();

  const [subscriptions, setSubscriptions] = useState<SubscriptionRequest[]>([]);

  const loadSubscriptions = () => {
    try {
      const savedSubscriptions = JSON.parse(
        localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY) || "[]"
      ) as SubscriptionRequest[];

      if (Array.isArray(savedSubscriptions)) {
        setSubscriptions(savedSubscriptions);
      } else {
        setSubscriptions([]);
      }
    } catch {
      setSubscriptions([]);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const mySubscriptions = useMemo(() => {
    if (!user) return [];

    return subscriptions.filter(
      (subscription) => subscription.customerEmail === user.email
    );
  }, [subscriptions, user]);

  const stats = useMemo(() => {
    return {
      total: mySubscriptions.length,
      pending: mySubscriptions.filter(
        (subscription) => subscription.status === "Pending"
      ).length,
      active: mySubscriptions.filter(
        (subscription) => subscription.status === "Active"
      ).length,
      cancelled: mySubscriptions.filter(
        (subscription) => subscription.status === "Cancelled"
      ).length,
    };
  }, [mySubscriptions]);

  const saveSubscriptions = (updatedSubscriptions: SubscriptionRequest[]) => {
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem(
      SUBSCRIPTIONS_STORAGE_KEY,
      JSON.stringify(updatedSubscriptions)
    );
  };

  const cancelSubscription = (subscriptionId: string) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this subscription request?"
    );

    if (!confirmCancel) return;

    const updatedSubscriptions = subscriptions.map((subscription) => {
      if (subscription.id !== subscriptionId) return subscription;

      return {
        ...subscription,
        status: "Cancelled" as SubscriptionStatus,
        cancelledAt: new Date().toISOString(),
        cancelledBy: "Customer" as const,
      };
    });

    saveSubscriptions(updatedSubscriptions);
    toast.success("Subscription request cancelled");
  };

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Package className="mx-auto text-[#7a1e13]" size={46} />

            <h1 className="mt-4 text-2xl font-black text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Please login to view your subscription requests.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13]"
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
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
              My PujaFresh
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              My Subscriptions
            </h1>

            <p className="mt-4 text-sm leading-6 text-orange-50 md:text-base">
              Track your daily, weekly and monthly pooja essentials subscription
              requests.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/subscriptions"
                className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13]"
              >
                New Subscription
              </Link>

              <Link
                href="/contact"
                className="rounded border border-white px-5 py-3 text-sm font-bold text-white"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-black text-orange-600">
              {stats.pending}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-black text-[#15803d]">
              {stats.active}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Cancelled</p>
            <h2 className="mt-2 text-3xl font-black text-red-600">
              {stats.cancelled}
            </h2>
          </div>
        </div>

        {mySubscriptions.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <Repeat className="mx-auto text-gray-300" size={58} />

            <h2 className="mt-4 text-2xl font-black text-gray-900">
              No subscription requests yet
            </h2>

            <p className="mt-2 text-gray-600">
              Create your first PujaFresh subscription request for daily pooja
              essentials.
            </p>

            <Link
              href="/subscriptions"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 text-sm font-bold text-white"
            >
              Request Subscription
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {mySubscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-gray-900">
                        {subscription.packageType}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyle(
                          subscription.status
                        )}`}
                      >
                        {subscription.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-[#7a1e13]">
                      #{subscription.id}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Requested on {formatDateTime(subscription.createdAt)}
                    </p>
                  </div>

                  {subscription.status === "Pending" && (
                    <button
                      onClick={() => cancelSubscription(subscription.id)}
                      className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                      Cancel Request
                    </button>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-[#fff7ed] p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="text-[#7a1e13]" size={20} />

                    <div>
                      <p className="font-black text-gray-900">
                        Current Status
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-700">
                        {getStatusMessage(subscription.status)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <Repeat className="text-[#f97316]" size={22} />

                    <p className="mt-3 text-sm text-gray-500">Frequency</p>

                    <p className="mt-1 font-black text-gray-900">
                      {subscription.frequency}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <CalendarDays className="text-[#7a1e13]" size={22} />

                    <p className="mt-3 text-sm text-gray-500">Start Date</p>

                    <p className="mt-1 font-black text-gray-900">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <Package className="text-[#15803d]" size={22} />

                    <p className="mt-3 text-sm text-gray-500">
                      Monthly Price
                    </p>

                    <p className="mt-1 font-black text-[#15803d]">
                      ₹{subscription.estimatedMonthlyPrice}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <Phone className="text-blue-600" size={22} />

                    <p className="mt-3 text-sm text-gray-500">Phone</p>

                    <p className="mt-1 font-black text-gray-900">
                      {subscription.phone}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex gap-3">
                      <MapPin className="shrink-0 text-[#7a1e13]" size={20} />

                      <div>
                        <p className="font-black text-gray-900">
                          Delivery Address
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-700">
                          {subscription.address}
                        </p>

                        {subscription.deliveryArea && (
                          <p className="mt-2 text-xs font-bold text-[#15803d]">
                            {subscription.deliveryArea.pincode} -{" "}
                            {subscription.deliveryArea.areaName},{" "}
                            {subscription.deliveryArea.city}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="font-black text-gray-900">Need help?</p>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      For changes in subscription, contact support or wait for
                      admin approval.
                    </p>

                    <a
                      href={`mailto:support@pujafresh.com?subject=Subscription Help ${subscription.id}`}
                      className="mt-4 inline-flex items-center gap-2 rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white"
                    >
                      <Mail size={16} />
                      Email Support
                    </a>
                  </div>
                </div>

                {subscription.notes && (
                  <div className="mt-5 rounded-xl border border-gray-200 p-4">
                    <p className="font-black text-gray-900">Notes</p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {subscription.notes}
                    </p>
                  </div>
                )}

                {subscription.cancelledAt && (
                  <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    Cancelled by {subscription.cancelledBy || "Customer"} on{" "}
                    {formatDateTime(subscription.cancelledAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}