"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type CouponUsageLog = {
  id: string;
  orderId: string;
  couponCode: string;
  couponLabel: string;
  couponType: string;
  couponValue: number;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  deliveryCharge: number;
  orderTotal: number;
  discountAmount: number;
  deliveryDiscount: number;
  totalSavings: number;
  usedAt: string;
};

type CouponSummary = {
  couponCode: string;
  couponLabel: string;
  couponType: string;
  usageCount: number;
  totalSubtotal: number;
  totalOrderValue: number;
  totalDiscount: number;
  totalDeliveryDiscount: number;
  totalSavings: number;
  uniqueCustomers: number;
  lastUsedAt: string;
};

const COUPON_USAGE_KEY = "pujafresh-coupon-usage";

export default function CouponUsagePage() {
  const router = useRouter();

  const [usageLogs, setUsageLogs] = useState<CouponUsageLog[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [couponTypeFilter, setCouponTypeFilter] = useState("All Types");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedUsage = localStorage.getItem(COUPON_USAGE_KEY);

    if (savedUsage) {
      try {
        const parsedUsage = JSON.parse(savedUsage) as CouponUsageLog[];

        if (Array.isArray(parsedUsage)) {
          setUsageLogs(parsedUsage);
        }
      } catch {
        setUsageLogs([]);
      }
    }

    setIsCheckingAuth(false);
  }, [router]);

  const couponTypeOptions = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(usageLogs.map((log) => log.couponType).filter(Boolean))
    );

    return ["All Types", ...uniqueTypes];
  }, [usageLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return usageLogs.filter((log) => {
      const matchesSearch =
        search.length === 0 ||
        log.couponCode.toLowerCase().includes(search) ||
        log.couponLabel.toLowerCase().includes(search) ||
        log.orderId.toLowerCase().includes(search) ||
        log.customerName.toLowerCase().includes(search) ||
        log.customerEmail.toLowerCase().includes(search);

      const matchesType =
        couponTypeFilter === "All Types" ||
        log.couponType === couponTypeFilter;

      const logDate = log.usedAt.slice(0, 10);

      const matchesDateFrom = !dateFrom || logDate >= dateFrom;
      const matchesDateTo = !dateTo || logDate <= dateTo;

      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [usageLogs, searchQuery, couponTypeFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalDiscount = filteredLogs.reduce(
      (sum, log) => sum + log.discountAmount,
      0
    );

    const totalDeliveryDiscount = filteredLogs.reduce(
      (sum, log) => sum + log.deliveryDiscount,
      0
    );

    const totalSavings = filteredLogs.reduce(
      (sum, log) => sum + log.totalSavings,
      0
    );

    const totalOrderValue = filteredLogs.reduce(
      (sum, log) => sum + log.orderTotal,
      0
    );

    const uniqueCustomers = new Set(
      filteredLogs.map((log) => log.customerEmail)
    ).size;

    return {
      totalUses: filteredLogs.length,
      totalDiscount,
      totalDeliveryDiscount,
      totalSavings,
      totalOrderValue,
      uniqueCustomers,
    };
  }, [filteredLogs]);

  const couponSummary = useMemo<CouponSummary[]>(() => {
    const summaryMap = new Map<
      string,
      CouponSummary & { customerEmails: Set<string> }
    >();

    filteredLogs.forEach((log) => {
      const existing = summaryMap.get(log.couponCode);

      if (!existing) {
        summaryMap.set(log.couponCode, {
          couponCode: log.couponCode,
          couponLabel: log.couponLabel,
          couponType: log.couponType,
          usageCount: 1,
          totalSubtotal: log.subtotal,
          totalOrderValue: log.orderTotal,
          totalDiscount: log.discountAmount,
          totalDeliveryDiscount: log.deliveryDiscount,
          totalSavings: log.totalSavings,
          uniqueCustomers: 1,
          customerEmails: new Set([log.customerEmail]),
          lastUsedAt: log.usedAt,
        });

        return;
      }

      existing.usageCount += 1;
      existing.totalSubtotal += log.subtotal;
      existing.totalOrderValue += log.orderTotal;
      existing.totalDiscount += log.discountAmount;
      existing.totalDeliveryDiscount += log.deliveryDiscount;
      existing.totalSavings += log.totalSavings;
      existing.customerEmails.add(log.customerEmail);
      existing.uniqueCustomers = existing.customerEmails.size;
      existing.lastUsedAt =
        new Date(log.usedAt) > new Date(existing.lastUsedAt)
          ? log.usedAt
          : existing.lastUsedAt;
    });

    return Array.from(summaryMap.values())
      .map(({ customerEmails, ...summary }) => summary)
      .sort((a, b) => b.usageCount - a.usageCount);
  }, [filteredLogs]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const setTodayFilter = () => {
    const today = new Date().toISOString().slice(0, 10);

    setDateFrom(today);
    setDateTo(today);
  };

  const setLast7DaysFilter = () => {
    const today = new Date();
    const last7Days = new Date();

    last7Days.setDate(today.getDate() - 6);

    setDateFrom(last7Days.toISOString().slice(0, 10));
    setDateTo(today.toISOString().slice(0, 10));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCouponTypeFilter("All Types");
    setDateFrom("");
    setDateTo("");
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.error("No coupon usage data to export");
      return;
    }

    const headers = [
      "Used At",
      "Coupon Code",
      "Coupon Label",
      "Coupon Type",
      "Customer Name",
      "Customer Email",
      "Order ID",
      "Subtotal",
      "Delivery Charge",
      "Coupon Discount",
      "Delivery Discount",
      "Total Savings",
      "Order Total",
    ];

    const rows = filteredLogs.map((log) => [
      formatDateTime(log.usedAt),
      log.couponCode,
      log.couponLabel,
      log.couponType,
      log.customerName,
      log.customerEmail,
      log.orderId,
      log.subtotal,
      log.deliveryCharge,
      log.discountAmount,
      log.deliveryDiscount,
      log.totalSavings,
      log.orderTotal,
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
    link.download = `pujafresh-coupon-usage-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Coupon usage CSV exported");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClearUsage = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear coupon usage history? This will not delete coupons or orders."
    );

    if (!confirmClear) return;

    localStorage.removeItem(COUPON_USAGE_KEY);
    setUsageLogs([]);
    toast.success("Coupon usage history cleared");
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
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Coupon Usage Report
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Track coupon performance, customer usage and total discount given.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <Link
              href="/admin/coupons"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Manage Coupons
            </Link>

            <button
              onClick={handlePrint}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Print Report
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleClearUsage}
              className="rounded bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Clear Usage
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-gray-900">
            PujaFresh Coupon Usage Report
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Printed on {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Uses</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalUses}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Unique Customers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.uniqueCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Coupon Discount
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              ₹{stats.totalDiscount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Delivery Discount
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              ₹{stats.totalDeliveryDiscount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Savings
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              ₹{stats.totalSavings}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Order Value</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              ₹{stats.totalOrderValue}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_170px_170px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Usage
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by coupon, customer, email or order ID..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Coupon Type
              </label>

              <select
                value={couponTypeFilter}
                onChange={(event) => setCouponTypeFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {couponTypeOptions.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Date From
              </label>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Date To</label>

              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={setTodayFilter}
              className="rounded bg-[#fff7ed] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Today
            </button>

            <button
              type="button"
              onClick={setLast7DaysFilter}
              className="rounded bg-[#fff7ed] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Last 7 Days
            </button>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredLogs.length} of {usageLogs.length} usage log
            {usageLogs.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Coupon Performance Summary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Coupon-wise usage count, customer count and savings.
              </p>
            </div>
          </div>

          {couponSummary.length === 0 ? (
            <div className="py-8 text-center">
              <h3 className="font-bold text-gray-900">No coupon usage yet</h3>
              <p className="mt-1 text-sm text-gray-600">
                Coupon performance will appear after customers use coupons.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Coupon</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Uses</th>
                    <th className="p-3">Customers</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Delivery Discount</th>
                    <th className="p-3">Total Savings</th>
                    <th className="p-3">Last Used</th>
                  </tr>
                </thead>

                <tbody>
                  {couponSummary.map((summary) => (
                    <tr
                      key={summary.couponCode}
                      className="border-b last:border-b-0"
                    >
                      <td className="p-3">
                        <p className="font-bold text-gray-900">
                          {summary.couponCode}
                        </p>
                        <p className="text-xs text-gray-500">
                          {summary.couponLabel}
                        </p>
                      </td>

                      <td className="p-3 text-gray-700">
                        {summary.couponType}
                      </td>

                      <td className="p-3 font-bold text-[#7a1e13]">
                        {summary.usageCount}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        {summary.uniqueCustomers}
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        ₹{summary.totalDiscount}
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        ₹{summary.totalDeliveryDiscount}
                      </td>

                      <td className="p-3 font-bold text-orange-600">
                        ₹{summary.totalSavings}
                      </td>

                      <td className="p-3 text-gray-600">
                        {formatDateTime(summary.lastUsedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Coupon Usage Logs
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Detailed order-wise coupon usage records.
              </p>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="font-bold text-gray-900">No usage logs found</h3>
              <p className="mt-1 text-sm text-gray-600">
                Apply different filters or place an order with coupon.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Coupon</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Delivery Discount</th>
                    <th className="p-3">Final Total</th>
                    <th className="p-3">Used At</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <p className="font-bold text-gray-900">
                          {log.couponCode}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.couponLabel}
                        </p>
                      </td>

                      <td className="p-3">
                        <p className="font-bold text-gray-900">
                          {log.customerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.customerEmail}
                        </p>
                      </td>

                      <td className="p-3">
                        <span className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13]">
                          {log.orderId}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        ₹{log.subtotal}
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        ₹{log.discountAmount}
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        ₹{log.deliveryDiscount}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        ₹{log.orderTotal}
                      </td>

                      <td className="p-3 text-gray-600">
                        {formatDateTime(log.usedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
