"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  CustomerLoyalty,
  getCustomerLoyalty,
  getRedeemValue,
} from "@/utils/loyaltyStorage";

export default function LoyaltyPage() {
  const { isLoggedIn, user } = useAuth();

  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const customerEmail = user?.email?.trim().toLowerCase();
  const customerPhone = (user as any)?.phone?.replace(/\D/g, "") || "";

  const loadLoyalty = () => {
    if (!isLoggedIn || !user) {
      setLoyalty(null);
      setIsLoading(false);
      return;
    }

    setLoyalty(getCustomerLoyalty(customerEmail, customerPhone));
    setIsLoading(false);
  };

  useEffect(() => {
    loadLoyalty();

    const handleLoyaltyUpdate = () => {
      loadLoyalty();
    };

    window.addEventListener("storage", handleLoyaltyUpdate);
    window.addEventListener("pujafresh-loyalty-updated", handleLoyaltyUpdate);

    return () => {
      window.removeEventListener("storage", handleLoyaltyUpdate);
      window.removeEventListener("pujafresh-loyalty-updated", handleLoyaltyUpdate);
    };
  }, [isLoggedIn, user, customerEmail, customerPhone]);

  const tierDetails = useMemo(() => {
    const points = loyalty?.totalPoints || 0;

    if (points >= 500) {
      return { name: "Platinum", nextTier: "Top tier reached", pointsNeeded: 0, progress: 100 };
    }

    if (points >= 250) {
      return { name: "Gold", nextTier: "Platinum", pointsNeeded: 500 - points, progress: Math.round((points / 500) * 100) };
    }

    if (points >= 100) {
      return { name: "Silver", nextTier: "Gold", pointsNeeded: 250 - points, progress: Math.round((points / 250) * 100) };
    }

    return { name: "Bronze", nextTier: "Silver", pointsNeeded: Math.max(100 - points, 0), progress: Math.round((points / 100) * 100) };
  }, [loyalty?.totalPoints]);

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

  const handleExportCsv = () => {
    if (!loyalty || loyalty.history.length === 0) {
      toast.error("No loyalty history to export");
      return;
    }

    const headers = ["Date", "Type", "Points", "Order ID", "Order Total", "Reason", "Updated By"];

    const rows = loyalty.history.map((transaction) => [
      formatDateTime(transaction.createdAt),
      transaction.type,
      transaction.points,
      transaction.orderId || "",
      transaction.orderTotal || "",
      transaction.reason,
      transaction.updatedBy,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-my-loyalty-points-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Loyalty history exported");
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Loading loyalty points...</h1>
        </div>
      </main>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">Login Required</h1>
            <p className="mt-2 text-gray-600">Please login to view your PujaFresh loyalty points.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/login" className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white">Login</Link>
              <Link href="/register" className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]">Register</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Loyalty Points</h1>
            <p className="mt-1 text-sm text-gray-600">Earn points on PujaFresh orders and track your reward history.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/coupons" className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white">Coupons</Link>
            <Link href="/orders" className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white">My Orders</Link>
            <button onClick={handleExportCsv} className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]">Export History</button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-[#7a1e13] p-6 text-white shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">PujaFresh Rewards</p>
              <h2 className="mt-3 text-4xl font-black">{loyalty?.totalPoints || 0} Points</h2>
              <p className="mt-2 text-white/80">Current Tier: <span className="font-bold text-white">{tierDetails.name}</span></p>

              <div className="mt-5 max-w-xl">
                <div className="flex justify-between text-xs font-bold text-white/80">
                  <span>{tierDetails.name}</span>
                  <span>{tierDetails.nextTier}</span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#f97316]" style={{ width: `${tierDetails.progress}%` }} />
                </div>

                <p className="mt-2 text-sm text-white/80">
                  {tierDetails.pointsNeeded > 0
                    ? `${tierDetails.pointsNeeded} more points needed for ${tierDetails.nextTier} tier.`
                    : "You have reached the highest loyalty tier."}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-5">
              <p className="text-sm font-semibold text-white/70">How points work</p>
              <h3 className="mt-2 text-2xl font-bold">₹100 = 1 point</h3>
              <p className="mt-2 text-sm text-white/80">Active points can be redeemed during checkout when redemption is enabled.</p>
              <p className="mt-3 rounded bg-white/10 p-3 text-sm font-bold text-white">Current redeem value: ₹{getRedeemValue(loyalty?.totalPoints || 0)}</p>
              <Link href="/" className="mt-5 inline-block rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13]">Continue Shopping</Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Lifetime Earned</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">{loyalty?.lifetimeEarned || 0}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Lifetime Redeemed</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">{loyalty?.lifetimeRedeemed || 0}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{loyalty?.totalOrders || 0}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Lifetime Spend</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">₹{loyalty?.lifetimeSpent || 0}</h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Points History</h2>
              <p className="mt-1 text-sm text-gray-500">Earned, redeemed and adjusted points appear here.</p>
            </div>

            <button onClick={loadLoyalty} className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white">Refresh</button>
          </div>

          {!loyalty || loyalty.history.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">No points history yet</h3>
              <p className="mt-2 text-gray-600">Place your first order to start earning loyalty points.</p>
              <Link href="/" className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white">Shop Now</Link>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Points</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Order Total</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {loyalty.history.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-b-0">
                      <td className="p-3 text-gray-700">{formatDateTime(transaction.createdAt)}</td>
                      <td className="p-3 text-gray-700">{transaction.type}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${transaction.points >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {transaction.points > 0 ? `+${transaction.points}` : transaction.points}
                        </span>
                      </td>
                      <td className="p-3">
                        {transaction.orderId ? (
                          <Link href={`/track-order?orderId=${encodeURIComponent(transaction.orderId)}`} className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13] hover:underline">
                            {transaction.orderId}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Not linked</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-gray-900">{transaction.orderTotal ? `₹${transaction.orderTotal}` : "-"}</td>
                      <td className="p-3 text-gray-700">{transaction.reason}</td>
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
