"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type LoyaltyTransaction = {
  id: string;
  orderId?: string;
  type: "Earned" | "Redeemed" | "Manual Adjustment";
  points: number;
  orderTotal?: number;
  reason: string;
  createdAt: string;
  updatedBy: string;
};

type CustomerLoyalty = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalPoints: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lifetimeSpent: number;
  totalOrders: number;
  lastOrderId: string;
  lastUpdatedAt: string;
  history: LoyaltyTransaction[];
};

const LOYALTY_POINTS_KEY = "pujafresh-loyalty-points";

const filterOptions = [
  "All Customers",
  "Has Points",
  "No Points",
  "High Points",
  "Repeat Customers",
];

export default function AdminLoyaltyPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerLoyalty[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Customers");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedLoyalty = localStorage.getItem(LOYALTY_POINTS_KEY);

    if (savedLoyalty) {
      try {
        const parsedLoyalty = JSON.parse(savedLoyalty) as CustomerLoyalty[];

        if (Array.isArray(parsedLoyalty)) {
          setCustomers(parsedLoyalty);
        }
      } catch {
        setCustomers([]);
      }
    }

    setIsCheckingAuth(false);
  }, [router]);

  const saveCustomers = (updatedCustomers: CustomerLoyalty[]) => {
    setCustomers(updatedCustomers);
    localStorage.setItem(LOYALTY_POINTS_KEY, JSON.stringify(updatedCustomers));
  };

  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        search.length === 0 ||
        customer.customerName.toLowerCase().includes(search) ||
        customer.customerEmail.toLowerCase().includes(search) ||
        customer.customerPhone.toLowerCase().includes(search) ||
        customer.lastOrderId.toLowerCase().includes(search);

      const matchesFilter =
        filterType === "All Customers" ||
        (filterType === "Has Points" && customer.totalPoints > 0) ||
        (filterType === "No Points" && customer.totalPoints <= 0) ||
        (filterType === "High Points" && customer.totalPoints >= 100) ||
        (filterType === "Repeat Customers" && customer.totalOrders > 1);

      return matchesSearch && matchesFilter;
    });
  }, [customers, searchQuery, filterType]);

  const selectedCustomer = useMemo(() => {
    return (
      customers.find((customer) => customer.id === selectedCustomerId) || null
    );
  }, [customers, selectedCustomerId]);

  const stats = useMemo(() => {
    const totalActivePoints = customers.reduce(
      (sum, customer) => sum + customer.totalPoints,
      0
    );

    const lifetimeEarned = customers.reduce(
      (sum, customer) => sum + customer.lifetimeEarned,
      0
    );

    const lifetimeRedeemed = customers.reduce(
      (sum, customer) => sum + customer.lifetimeRedeemed,
      0
    );

    const lifetimeSpent = customers.reduce(
      (sum, customer) => sum + customer.lifetimeSpent,
      0
    );

    const highPointsCustomers = customers.filter(
      (customer) => customer.totalPoints >= 100
    ).length;

    return {
      totalCustomers: customers.length,
      totalActivePoints,
      lifetimeEarned,
      lifetimeRedeemed,
      lifetimeSpent,
      highPointsCustomers,
    };
  }, [customers]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("All Customers");
  };

  const handleAdjustPoints = (
    customer: CustomerLoyalty,
    adjustmentType: "add" | "remove"
  ) => {
    const pointsInput = window.prompt(
      `Enter points to ${adjustmentType === "add" ? "add" : "remove"}`
    );

    if (!pointsInput) return;

    const points = Number(pointsInput);

    if (!Number.isFinite(points) || points <= 0) {
      toast.error("Please enter valid points");
      return;
    }

    const reason =
      window.prompt("Enter reason for this adjustment") ||
      "Manual loyalty points adjustment";

    const signedPoints = adjustmentType === "add" ? points : -points;

    const updatedTotalPoints = Math.max(
      customer.totalPoints + signedPoints,
      0
    );

    const actualPointChange = updatedTotalPoints - customer.totalPoints;

    if (actualPointChange === 0) {
      toast.error("No points changed");
      return;
    }

    const now = new Date().toISOString();

    const transaction: LoyaltyTransaction = {
      id: `LPT-${Date.now()}-${customer.id}`,
      type: "Manual Adjustment",
      points: actualPointChange,
      reason,
      createdAt: now,
      updatedBy: "Admin",
    };

    const updatedCustomers = customers.map((item) =>
      item.id === customer.id
        ? {
            ...item,
            totalPoints: updatedTotalPoints,
            lifetimeEarned:
              actualPointChange > 0
                ? item.lifetimeEarned + actualPointChange
                : item.lifetimeEarned,
            lifetimeRedeemed:
              actualPointChange < 0
                ? item.lifetimeRedeemed + Math.abs(actualPointChange)
                : item.lifetimeRedeemed,
            lastUpdatedAt: now,
            history: [transaction, ...(item.history || [])],
          }
        : item
    );

    saveCustomers(updatedCustomers);
    toast.success("Loyalty points updated");
  };

  const handleExportCsv = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No loyalty customers to export");
      return;
    }

    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "Active Points",
      "Lifetime Earned",
      "Lifetime Redeemed",
      "Lifetime Spent",
      "Total Orders",
      "Last Order ID",
      "Last Updated",
    ];

    const rows = filteredCustomers.map((customer) => [
      customer.customerName,
      customer.customerEmail,
      customer.customerPhone,
      customer.totalPoints,
      customer.lifetimeEarned,
      customer.lifetimeRedeemed,
      customer.lifetimeSpent,
      customer.totalOrders,
      customer.lastOrderId,
      formatDateTime(customer.lastUpdatedAt),
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
    link.download = `pujafresh-loyalty-points-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Loyalty CSV exported");
  };

  const handlePrint = () => {
    window.print();
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
              Loyalty Points
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Track customer reward points, lifetime earning and manual
              adjustments.
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
              Print Report
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-gray-900">
            PujaFresh Loyalty Points Report
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Printed on {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Loyalty Customers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Points
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.totalActivePoints}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Lifetime Earned
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.lifetimeEarned}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Lifetime Redeemed
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.lifetimeRedeemed}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              High Points Users
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#15803d]">
              {stats.highPointsCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Loyalty Revenue
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              ₹{stats.lifetimeSpent}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Customer
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, phone or order ID..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Filter
              </label>

              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {filterOptions.map((filter) => (
                  <option key={filter}>{filter}</option>
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
            Showing {filteredCustomers.length} of {customers.length} loyalty
            customer{customers.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {selectedCustomer && (
          <div className="mt-6 rounded-xl border border-[#7a1e13]/20 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedCustomer.customerName}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {selectedCustomer.customerEmail} •{" "}
                  {selectedCustomer.customerPhone}
                </p>
              </div>

              <button
                onClick={() => setSelectedCustomerId(null)}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Active Points
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedCustomer.totalPoints}
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Lifetime Earned
                </p>
                <p className="text-xl font-bold text-green-700">
                  {selectedCustomer.lifetimeEarned}
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Lifetime Redeemed
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {selectedCustomer.lifetimeRedeemed}
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Total Orders
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedCustomer.totalOrders}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={() => handleAdjustPoints(selectedCustomer, "add")}
                className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
              >
                Add Points
              </button>

              <button
                onClick={() => handleAdjustPoints(selectedCustomer, "remove")}
                className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Remove Points
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Points</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Updated By</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedCustomer.history || []).map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="p-3 text-gray-700">
                        {formatDateTime(transaction.createdAt)}
                      </td>

                      <td className="p-3 text-gray-700">
                        {transaction.type}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            transaction.points >= 0
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {transaction.points > 0
                            ? `+${transaction.points}`
                            : transaction.points}
                        </span>
                      </td>

                      <td className="p-3">
                        {transaction.orderId ? (
                          <span className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13]">
                            {transaction.orderId}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not linked</span>
                        )}
                      </td>

                      <td className="p-3 text-gray-700">
                        {transaction.reason}
                      </td>

                      <td className="p-3 text-gray-700">
                        {transaction.updatedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No loyalty customers found
              </h2>

              <p className="mt-2 text-gray-600">
                Customers will earn loyalty points after placing orders.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Active Points</th>
                    <th className="p-3">Lifetime Earned</th>
                    <th className="p-3">Redeemed</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Spent</th>
                    <th className="p-3">Last Updated</th>
                    <th className="p-3 print:hidden">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <p className="font-bold text-gray-900">
                          {customer.customerName}
                        </p>

                        <p className="text-xs text-gray-500">
                          {customer.customerEmail}
                        </p>

                        <p className="text-xs text-gray-500">
                          {customer.customerPhone}
                        </p>
                      </td>

                      <td className="p-3 font-bold text-[#7a1e13]">
                        {customer.totalPoints}
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        {customer.lifetimeEarned}
                      </td>

                      <td className="p-3 font-bold text-orange-600">
                        {customer.lifetimeRedeemed}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        {customer.totalOrders}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        ₹{customer.lifetimeSpent}
                      </td>

                      <td className="p-3 text-gray-700">
                        {formatDateTime(customer.lastUpdatedAt)}
                      </td>

                      <td className="p-3 print:hidden">
                        <button
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className="rounded bg-[#7a1e13] px-3 py-2 text-xs font-bold text-white hover:bg-[#5f160e]"
                        >
                          View / Adjust
                        </button>
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
