"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  Coupon,
  CouponType,
  getCoupons,
  isCouponExpired,
  resetCouponsToDefault,
  saveCoupons,
} from "@/utils/couponStorage";

type CouponFormData = {
  code: string;
  label: string;
  type: CouponType;
  value: string;
  minOrderValue: string;
  maxDiscountAmount: string;
  expiryDate: string;
  isActive: boolean;
};

const emptyForm: CouponFormData = {
  code: "",
  label: "",
  type: "Percentage",
  value: "",
  minOrderValue: "0",
  maxDiscountAmount: "0",
  expiryDate: "",
  isActive: true,
};

const statusOptions = ["All Coupons", "Active", "Inactive", "Expired"];
const typeOptions: CouponType[] = ["Percentage", "Fixed Amount", "Free Delivery"];

export default function AdminCouponsPage() {
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [formData, setFormData] = useState<CouponFormData>(emptyForm);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Coupons");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setCoupons(getCoupons());
    setIsCheckingAuth(false);
  }, [router]);

  const saveCouponList = (updatedCoupons: Coupon[]) => {
    setCoupons(updatedCoupons);
    saveCoupons(updatedCoupons);
  };

  const stats = useMemo(() => {
    const activeCoupons = coupons.filter(
      (coupon) => coupon.isActive && !isCouponExpired(coupon)
    ).length;

    const inactiveCoupons = coupons.filter((coupon) => !coupon.isActive).length;

    const expiredCoupons = coupons.filter((coupon) =>
      isCouponExpired(coupon)
    ).length;

    return {
      total: coupons.length,
      activeCoupons,
      inactiveCoupons,
      expiredCoupons,
    };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const expired = isCouponExpired(coupon);

      const matchesSearch =
        search.length === 0 ||
        coupon.code.toLowerCase().includes(search) ||
        coupon.label.toLowerCase().includes(search) ||
        coupon.type.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Coupons" ||
        (statusFilter === "Active" && coupon.isActive && !expired) ||
        (statusFilter === "Inactive" && !coupon.isActive) ||
        (statusFilter === "Expired" && expired);

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  const clearForm = () => {
    setFormData(emptyForm);
    setEditingCouponId(null);
    setShowForm(false);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (
      name === "value" ||
      name === "minOrderValue" ||
      name === "maxDiscountAmount"
    ) {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^\d.]/g, ""),
      }));

      return;
    }

    if (name === "code") {
      setFormData((prev) => ({
        ...prev,
        code: value.toUpperCase().replace(/\s/g, ""),
      }));

      return;
    }

    if (name === "type") {
      const couponType = value as CouponType;

      setFormData((prev) => ({
        ...prev,
        type: couponType,
        value: couponType === "Free Delivery" ? "0" : prev.value,
        maxDiscountAmount:
          couponType === "Fixed Amount" || couponType === "Free Delivery"
            ? "0"
            : prev.maxDiscountAmount,
      }));

      return;
    }

    if (name === "isActive") {
      setFormData((prev) => ({
        ...prev,
        isActive: value === "true",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveCoupon = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.code || !formData.label || !formData.expiryDate) {
      toast.error("Please fill all required coupon details");
      return;
    }

    const value = Number(formData.value || 0);
    const minOrderValue = Number(formData.minOrderValue || 0);
    const maxDiscountAmount = Number(formData.maxDiscountAmount || 0);

    if (formData.type !== "Free Delivery" && value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    if (formData.type === "Percentage" && value > 100) {
      toast.error("Percentage discount cannot be greater than 100%");
      return;
    }

    if (minOrderValue < 0 || maxDiscountAmount < 0) {
      toast.error("Amount fields cannot be negative");
      return;
    }

    const duplicateCoupon = coupons.find(
      (coupon) => coupon.code === formData.code && coupon.id !== editingCouponId
    );

    if (duplicateCoupon) {
      toast.error("Coupon code already exists");
      return;
    }

    if (editingCouponId) {
      const updatedCoupons = coupons.map((coupon) =>
        coupon.id === editingCouponId
          ? {
              ...coupon,
              code: formData.code,
              label: formData.label,
              type: formData.type,
              value: formData.type === "Free Delivery" ? 0 : value,
              minOrderValue,
              maxDiscountAmount,
              expiryDate: formData.expiryDate,
              isActive: formData.isActive,
            }
          : coupon
      );

      saveCouponList(updatedCoupons);
      toast.success("Coupon updated successfully");
      clearForm();
      return;
    }

    const newCoupon: Coupon = {
      id: `CPN-${Date.now()}`,
      code: formData.code,
      label: formData.label,
      type: formData.type,
      value: formData.type === "Free Delivery" ? 0 : value,
      minOrderValue,
      maxDiscountAmount,
      expiryDate: formData.expiryDate,
      isActive: formData.isActive,
      createdAt: new Date().toISOString(),
    };

    saveCouponList([newCoupon, ...coupons]);
    toast.success("Coupon created successfully");
    clearForm();
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setShowForm(true);

    setFormData({
      code: coupon.code,
      label: coupon.label,
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: String(coupon.minOrderValue),
      maxDiscountAmount: String(coupon.maxDiscountAmount ?? 0),
      expiryDate: coupon.expiryDate,
      isActive: coupon.isActive,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleToggleCouponStatus = (couponId: string) => {
    const updatedCoupons = coupons.map((coupon) =>
      coupon.id === couponId
        ? {
            ...coupon,
            isActive: !coupon.isActive,
          }
        : coupon
    );

    saveCouponList(updatedCoupons);
    toast.success("Coupon status updated");
  };

  const handleDeleteCoupon = (couponId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this coupon?"
    );

    if (!confirmDelete) return;

    const updatedCoupons = coupons.filter((coupon) => coupon.id !== couponId);

    saveCouponList(updatedCoupons);
    toast.success("Coupon deleted successfully");
  };

  const handleResetCoupons = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset coupons to default?"
    );

    if (!confirmReset) return;

    const defaultCouponList = resetCouponsToDefault();
    setCoupons(defaultCouponList);
    clearForm();
    toast.success("Coupons reset to default");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Coupons");
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === "Percentage") {
      return `${coupon.value}%${
        coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0
          ? ` up to ₹${coupon.maxDiscountAmount}`
          : ""
      }`;
    }

    if (coupon.type === "Fixed Amount") {
      return `₹${coupon.value} OFF`;
    }

    return "Free Delivery";
  };

  const handleExportCsv = () => {
    if (filteredCoupons.length === 0) {
      toast.error("No coupons to export");
      return;
    }

    const headers = [
      "Code",
      "Label",
      "Type",
      "Value",
      "Minimum Order",
      "Maximum Discount",
      "Expiry Date",
      "Status",
    ];

    const rows = filteredCoupons.map((coupon) => [
      coupon.code,
      coupon.label,
      coupon.type,
      coupon.value,
      coupon.minOrderValue,
      coupon.maxDiscountAmount ?? 0,
      coupon.expiryDate,
      isCouponExpired(coupon)
        ? "Expired"
        : coupon.isActive
        ? "Active"
        : "Inactive",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-coupons-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Coupons CSV exported");
  };

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Checking admin access...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Coupon Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Create, update and manage discount coupons for customers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Dashboard
            </Link>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-4 py-2 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleResetCoupons}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset Defaults
            </button>

            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingCouponId(null);
                setFormData(emptyForm);
              }}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              {showForm ? "Hide Form" : "Add Coupon"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Coupons
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Coupons
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.activeCoupons}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Inactive Coupons
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.inactiveCoupons}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Expired Coupons
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.expiredCoupons}
            </h2>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSaveCoupon}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCouponId ? "Edit Coupon" : "Add New Coupon"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Example: WELCOME10, FRESH50, FREEDEL
                </p>
              </div>

              <button
                type="button"
                onClick={clearForm}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Coupon Code *
                </label>

                <input
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 uppercase outline-none focus:border-[#7a1e13]"
                  placeholder="WELCOME10"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Coupon Label *
                </label>

                <input
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="10% off on your first order"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Coupon Type *
                </label>

                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  {typeOptions.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Discount Value *
                </label>

                <input
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  disabled={formData.type === "Free Delivery"}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13] disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder={
                    formData.type === "Percentage"
                      ? "10"
                      : formData.type === "Fixed Amount"
                      ? "100"
                      : "0"
                  }
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Minimum Order Value
                </label>

                <input
                  name="minOrderValue"
                  value={formData.minOrderValue}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="499"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Max Discount Amount
                </label>

                <input
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={handleChange}
                  disabled={formData.type !== "Percentage"}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13] disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="100"
                />

                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Use 0 for no max limit. Mainly useful for percentage coupons.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Expiry Date *
                </label>

                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Status
                </label>

                <select
                  name="isActive"
                  value={String(formData.isActive)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              {editingCouponId ? "Update Coupon" : "Save Coupon"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">All Coupons</h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredCoupons.length} of {coupons.length} coupon
                {coupons.length !== 1 ? "s" : ""} shown
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-lg bg-[#fff7ed] p-4 lg:grid-cols-[1fr_240px_auto]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Coupon
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by code, label or discount type..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Status Filter
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!searchQuery && statusFilter === "All Coupons"}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] transition-all duration-300 hover:bg-[#7a1e13] hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {filteredCoupons.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No coupons found
              </h3>

              <p className="mt-2 text-gray-600">
                Add a coupon or change your search filter.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Coupon</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Minimum Order</th>
                    <th className="p-3">Expiry</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCoupons.map((coupon) => {
                    const expired = isCouponExpired(coupon);

                    return (
                      <tr key={coupon.id} className="border-b last:border-b-0">
                        <td className="p-3">
                          <p className="font-bold text-gray-900">
                            {coupon.code}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {coupon.label}
                          </p>
                        </td>

                        <td className="p-3 font-bold text-[#7a1e13]">
                          {formatDiscount(coupon)}
                        </td>

                        <td className="p-3 font-bold text-gray-900">
                          ₹{coupon.minOrderValue}
                        </td>

                        <td className="p-3 text-gray-700">
                          {coupon.expiryDate}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              expired
                                ? "bg-red-50 text-red-700"
                                : coupon.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {expired
                              ? "Expired"
                              : coupon.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEditCoupon(coupon)}
                              className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleToggleCouponStatus(coupon.id)
                              }
                              className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white"
                            >
                              {coupon.isActive ? "Disable" : "Enable"}
                            </button>

                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
