"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type InventoryHistoryLog = {
  id: string;
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  productCategory: string;
  changeType: "Stock Reduced" | "Stock Restored" | "Manual Update";
  quantityChange: number;
  previousStock: number;
  updatedStock: number;
  reason: string;
  orderId?: string;
  createdAt: string;
  updatedBy: string;
};

const INVENTORY_HISTORY_KEY = "pujafresh-inventory-history";

const changeTypeOptions = [
  "All",
  "Stock Reduced",
  "Stock Restored",
  "Manual Update",
];

export default function InventoryHistoryPage() {
  const router = useRouter();

  const [historyLogs, setHistoryLogs] = useState<InventoryHistoryLog[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [changeTypeFilter, setChangeTypeFilter] = useState("All");
  const [updatedByFilter, setUpdatedByFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedHistory = localStorage.getItem(INVENTORY_HISTORY_KEY);

    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory) as InventoryHistoryLog[];

        if (Array.isArray(parsedHistory)) {
          setHistoryLogs(parsedHistory);
        } else {
          setHistoryLogs([]);
        }
      } catch {
        setHistoryLogs([]);
      }
    }

    setIsCheckingAuth(false);
  }, [router]);

  const updatedByOptions = useMemo(() => {
    const uniqueUpdatedBy = Array.from(
      new Set(historyLogs.map((log) => log.updatedBy).filter(Boolean))
    );

    return ["All", ...uniqueUpdatedBy];
  }, [historyLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return historyLogs.filter((log) => {
      const matchesSearch =
        search.length === 0 ||
        log.productName.toLowerCase().includes(search) ||
        log.productCategory.toLowerCase().includes(search) ||
        log.productSlug.toLowerCase().includes(search) ||
        log.reason.toLowerCase().includes(search) ||
        log.changeType.toLowerCase().includes(search) ||
        log.updatedBy.toLowerCase().includes(search) ||
        log.orderId?.toLowerCase().includes(search);

      const matchesChangeType =
        changeTypeFilter === "All" || log.changeType === changeTypeFilter;

      const matchesUpdatedBy =
        updatedByFilter === "All" || log.updatedBy === updatedByFilter;

      const logDate = log.createdAt.slice(0, 10);

      const matchesDateFrom = !dateFrom || logDate >= dateFrom;
      const matchesDateTo = !dateTo || logDate <= dateTo;

      return (
        matchesSearch &&
        matchesChangeType &&
        matchesUpdatedBy &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [
    historyLogs,
    searchQuery,
    changeTypeFilter,
    updatedByFilter,
    dateFrom,
    dateTo,
  ]);

  const stats = useMemo(() => {
    const totalReduced = historyLogs
      .filter((log) => log.quantityChange < 0)
      .reduce((sum, log) => sum + Math.abs(log.quantityChange), 0);

    const totalRestored = historyLogs
      .filter((log) => log.quantityChange > 0)
      .reduce((sum, log) => sum + log.quantityChange, 0);

    const stockReducedLogs = historyLogs.filter(
      (log) => log.changeType === "Stock Reduced"
    ).length;

    const stockRestoredLogs = historyLogs.filter(
      (log) => log.changeType === "Stock Restored"
    ).length;

    return {
      totalLogs: historyLogs.length,
      totalReduced,
      totalRestored,
      stockReducedLogs,
      stockRestoredLogs,
    };
  }, [historyLogs]);

  const productMovementSummary = useMemo(() => {
    const summaryMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        productImage: string;
        productCategory: string;
        totalReduced: number;
        totalRestored: number;
        netChange: number;
        lastUpdatedAt: string;
      }
    >();

    filteredLogs.forEach((log) => {
      const existingSummary = summaryMap.get(log.productId);

      const reducedQuantity =
        log.quantityChange < 0 ? Math.abs(log.quantityChange) : 0;
      const restoredQuantity = log.quantityChange > 0 ? log.quantityChange : 0;

      if (!existingSummary) {
        summaryMap.set(log.productId, {
          productId: log.productId,
          productName: log.productName,
          productImage: log.productImage,
          productCategory: log.productCategory,
          totalReduced: reducedQuantity,
          totalRestored: restoredQuantity,
          netChange: log.quantityChange,
          lastUpdatedAt: log.createdAt,
        });

        return;
      }

      summaryMap.set(log.productId, {
        ...existingSummary,
        totalReduced: existingSummary.totalReduced + reducedQuantity,
        totalRestored: existingSummary.totalRestored + restoredQuantity,
        netChange: existingSummary.netChange + log.quantityChange,
        lastUpdatedAt:
          new Date(log.createdAt) > new Date(existingSummary.lastUpdatedAt)
            ? log.createdAt
            : existingSummary.lastUpdatedAt,
      });
    });

    return Array.from(summaryMap.values()).sort(
      (a, b) =>
        Math.abs(b.netChange) - Math.abs(a.netChange) ||
        new Date(b.lastUpdatedAt).getTime() -
          new Date(a.lastUpdatedAt).getTime()
    );
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

  const getChangeStyle = (quantityChange: number) => {
    if (quantityChange < 0) {
      return "bg-red-50 text-red-700";
    }

    if (quantityChange > 0) {
      return "bg-green-50 text-green-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const getChangeText = (quantityChange: number) => {
    if (quantityChange > 0) return `+${quantityChange}`;
    return String(quantityChange);
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
    setChangeTypeFilter("All");
    setUpdatedByFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.error("No inventory history to export");
      return;
    }

    const headers = [
      "Date",
      "Product Name",
      "Category",
      "Change Type",
      "Quantity Change",
      "Previous Stock",
      "Updated Stock",
      "Reason",
      "Order ID",
      "Updated By",
    ];

    const rows = filteredLogs.map((log) => [
      formatDateTime(log.createdAt),
      log.productName,
      log.productCategory,
      log.changeType,
      getChangeText(log.quantityChange),
      log.previousStock,
      log.updatedStock,
      log.reason,
      log.orderId || "",
      log.updatedBy,
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
    link.download = `pujafresh-inventory-history-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Inventory history CSV exported");
  };

  const handleClearHistory = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear all inventory history logs? This will not change product stock."
    );

    if (!confirmClear) return;

    localStorage.removeItem(INVENTORY_HISTORY_KEY);
    setHistoryLogs([]);
    toast.success("Inventory history cleared");
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
              Inventory History
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Track stock reduce and stock restore activity for PujaFresh.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <button
              onClick={handlePrint}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Print History
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleClearHistory}
              className="rounded bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Clear History
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-gray-900">
            PujaFresh Inventory History
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Printed on {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Logs</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalLogs}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Stock Reduced Logs
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.stockReducedLogs}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Stock Restored Logs
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.stockRestoredLogs}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Units Reduced
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.totalReduced}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Units Restored
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.totalRestored}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_170px_170px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search History
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by product, order ID, reason, category..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Change Type
              </label>

              <select
                value={changeTypeFilter}
                onChange={(event) => setChangeTypeFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {changeTypeOptions.map((changeType) => (
                  <option key={changeType}>{changeType}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Updated By
              </label>

              <select
                value={updatedByFilter}
                onChange={(event) => setUpdatedByFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {updatedByOptions.map((updatedBy) => (
                  <option key={updatedBy}>{updatedBy}</option>
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
              <label className="text-sm font-bold text-gray-700">
                Date To
              </label>

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
            Showing {filteredLogs.length} of {historyLogs.length} log
            {historyLogs.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Product Movement Summary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Product-wise total reduced, restored and net stock movement for
                the selected filters.
              </p>
            </div>
          </div>

          {productMovementSummary.length === 0 ? (
            <div className="py-8 text-center">
              <h3 className="font-bold text-gray-900">No movement summary</h3>

              <p className="mt-1 text-sm text-gray-600">
                Apply a different filter or wait for inventory activity.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Product</th>
                    <th className="p-3">Total Reduced</th>
                    <th className="p-3">Total Restored</th>
                    <th className="p-3">Net Change</th>
                    <th className="p-3">Last Updated</th>
                  </tr>
                </thead>

                <tbody>
                  {productMovementSummary.map((summary) => (
                    <tr
                      key={summary.productId}
                      className="border-b last:border-b-0"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded bg-[#fff7ed]">
                            <Image
                              src={
                                summary.productImage || "/basic-pooja-pack.jpg"
                              }
                              alt={summary.productName}
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div>
                            <p className="font-bold text-gray-900">
                              {summary.productName}
                            </p>

                            <p className="text-xs text-gray-500">
                              {summary.productCategory}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-bold text-red-600">
                        {summary.totalReduced}
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        {summary.totalRestored}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            summary.netChange < 0
                              ? "bg-red-50 text-red-700"
                              : summary.netChange > 0
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {summary.netChange > 0
                            ? `+${summary.netChange}`
                            : summary.netChange}
                        </span>
                      </td>

                      <td className="p-3 text-gray-600">
                        {formatDateTime(summary.lastUpdatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No inventory history found
              </h2>

              <p className="mt-2 text-gray-600">
                Stock movement logs will appear here after an order is placed or
                cancelled.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Product</th>
                    <th className="p-3">Change</th>
                    <th className="p-3">Before</th>
                    <th className="p-3">After</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Updated By</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded bg-[#fff7ed]">
                            <Image
                              src={log.productImage || "/basic-pooja-pack.jpg"}
                              alt={log.productName}
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div>
                            <p className="font-bold text-gray-900">
                              {log.productName}
                            </p>

                            <p className="text-xs text-gray-500">
                              {log.productCategory}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getChangeStyle(
                            log.quantityChange
                          )}`}
                        >
                          {getChangeText(log.quantityChange)}
                        </span>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {log.changeType}
                        </p>
                      </td>

                      <td className="p-3 font-bold text-gray-700">
                        {log.previousStock}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        {log.updatedStock}
                      </td>

                      <td className="p-3">
                        <p className="max-w-[220px] text-gray-700">
                          {log.reason}
                        </p>
                      </td>

                      <td className="p-3">
                        {log.orderId ? (
                          <span className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13]">
                            {log.orderId}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not linked</span>
                        )}
                      </td>

                      <td className="p-3 font-semibold text-gray-700">
                        {log.updatedBy}
                      </td>

                      <td className="p-3 text-gray-600">
                        {formatDateTime(log.createdAt)}
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
