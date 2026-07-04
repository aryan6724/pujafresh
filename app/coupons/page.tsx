"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  Coupon,
  getActiveCoupons,
  getCouponDisplayText,
  getCoupons,
  isCouponExpired,
} from "@/utils/couponStorage";

const statusFilters = ["Active", "All", "Expired", "Inactive"];

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCouponStatus = (coupon: Coupon) => {
  if (isCouponExpired(coupon)) return "Expired";
  if (!coupon.isActive) return "Inactive";
  return "Active";
};

const getStatusClass = (status: string) => {
  if (status === "Active") return "bg-green-50 text-green-700";
  if (status === "Expired") return "bg-red-50 text-red-700";
  if (status === "Inactive") return "bg-orange-50 text-orange-700";
  return "bg-gray-100 text-gray-700";
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");

  const loadCoupons = () => {
    setCoupons(getCoupons());
  };

  useEffect(() => {
    loadCoupons();

    const handleCouponUpdate = () => {
      loadCoupons();
    };

    window.addEventListener("storage", handleCouponUpdate);
    window.addEventListener("pujafresh-coupons-updated", handleCouponUpdate);

    return () => {
      window.removeEventListener("storage", handleCouponUpdate);
      window.removeEventListener("pujafresh-coupons-updated", handleCouponUpdate);
    };
  }, []);

  const filteredCoupons = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const status = getCouponStatus(coupon);

      const matchesSearch =
        search.length === 0 ||
        coupon.code.toLowerCase().includes(search) ||
        coupon.label.toLowerCase().includes(search) ||
        coupon.type.toLowerCase().includes(search);

      const matchesStatus = statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: coupons.length,
      active: getActiveCoupons().length,
      expired: coupons.filter((coupon) => isCouponExpired(coupon)).length,
      inactive: coupons.filter((coupon) => !coupon.isActive).length,
    };
  }, [coupons]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.success(`Use coupon code: ${code}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("Active");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Offers
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Coupons & Offers
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Browse active coupons. Copy a coupon code and apply it at checkout.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/checkout"
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Go to Checkout
            </Link>

            <Link
              href="/loyalty"
              className="rounded border border-white px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
            >
              My Rewards
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.active}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Expired</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.expired}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Inactive</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.inactive}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Coupon
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search code, label or type..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Status</label>

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

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredCoupons.length} coupon
            {filteredCoupons.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6">
          {filteredCoupons.length === 0 ? (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                No coupons found
              </h2>

              <p className="mt-2 text-gray-600">
                New PujaFresh offers will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCoupons.map((coupon) => {
                const status = getCouponStatus(coupon);

                return (
                  <div
                    key={coupon.id}
                    className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(status)}`}
                        >
                          {status}
                        </span>

                        <h2 className="mt-4 text-2xl font-black text-[#7a1e13]">
                          {coupon.code}
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-gray-600">
                          {coupon.label}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#fff7ed] px-3 py-2 text-right">
                        <p className="text-xs font-bold text-gray-500">Offer</p>
                        <p className="font-black text-[#7a1e13]">
                          {getCouponDisplayText(coupon)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <span className="font-semibold text-gray-500">
                          Minimum order:
                        </span>{" "}
                        <span className="font-black text-gray-900">
                          ₹{coupon.minOrderValue}
                        </span>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3">
                        <span className="font-semibold text-gray-500">
                          Valid till:
                        </span>{" "}
                        <span className="font-black text-gray-900">
                          {formatDate(coupon.expiryDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        disabled={status !== "Active"}
                        className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f] disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Copy Code
                      </button>

                      <Link
                        href="/checkout"
                        className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                      >
                        Use at Checkout
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
