"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  status: "Subscribed" | "Unsubscribed";
  subscribedAt: string;
  updatedAt?: string;
};

const NEWSLETTER_STORAGE_KEY = "pujafresh-newsletter-subscribers";

const statusOptions = ["All Subscribers", "Subscribed", "Unsubscribed"];

export default function AdminNewsletterPage() {
  const router = useRouter();

  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Subscribers");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadSubscribers();
    setIsCheckingAuth(false);
  }, [router]);

  const loadSubscribers = () => {
    const savedSubscribers = localStorage.getItem(NEWSLETTER_STORAGE_KEY);

    if (!savedSubscribers) {
      setSubscribers([]);
      return;
    }

    try {
      const parsedSubscribers = JSON.parse(
        savedSubscribers
      ) as NewsletterSubscriber[];

      if (Array.isArray(parsedSubscribers)) {
        setSubscribers(parsedSubscribers);
      }
    } catch {
      setSubscribers([]);
    }
  };

  const saveSubscribers = (updatedSubscribers: NewsletterSubscriber[]) => {
    setSubscribers(updatedSubscribers);
    localStorage.setItem(
      NEWSLETTER_STORAGE_KEY,
      JSON.stringify(updatedSubscribers)
    );
  };

  const filteredSubscribers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return subscribers.filter((subscriber) => {
      const matchesSearch =
        search.length === 0 ||
        subscriber.id.toLowerCase().includes(search) ||
        subscriber.email.toLowerCase().includes(search) ||
        subscriber.source.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Subscribers" ||
        subscriber.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscribers, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const activeSubscribers = subscribers.filter(
      (subscriber) => subscriber.status === "Subscribed"
    ).length;

    const unsubscribedSubscribers = subscribers.filter(
      (subscriber) => subscriber.status === "Unsubscribed"
    ).length;

    const today = new Date().toISOString().slice(0, 10);

    const joinedToday = subscribers.filter(
      (subscriber) => subscriber.subscribedAt.slice(0, 10) === today
    ).length;

    return {
      total: subscribers.length,
      activeSubscribers,
      unsubscribedSubscribers,
      joinedToday,
    };
  }, [subscribers]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSubscriberStatus = (subscriberId: string) => {
    const updatedSubscribers = subscribers.map((subscriber) =>
      subscriber.id === subscriberId
        ? {
            ...subscriber,
            status:
              subscriber.status === "Subscribed"
                ? ("Unsubscribed" as const)
                : ("Subscribed" as const),
            updatedAt: new Date().toISOString(),
          }
        : subscriber
    );

    saveSubscribers(updatedSubscribers);
    toast.success("Subscriber status updated");
  };

  const deleteSubscriber = (subscriberId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this subscriber?"
    );

    if (!confirmDelete) return;

    const updatedSubscribers = subscribers.filter(
      (subscriber) => subscriber.id !== subscriberId
    );

    saveSubscribers(updatedSubscribers);
    toast.success("Subscriber deleted successfully");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Subscribers");
  };

  const handleExportCsv = () => {
    if (filteredSubscribers.length === 0) {
      toast.error("No subscribers to export");
      return;
    }

    const headers = [
      "Subscriber ID",
      "Email",
      "Source",
      "Status",
      "Subscribed At",
      "Updated At",
    ];

    const rows = filteredSubscribers.map((subscriber) => [
      subscriber.id,
      subscriber.email,
      subscriber.source,
      subscriber.status,
      formatDateTime(subscriber.subscribedAt),
      subscriber.updatedAt ? formatDateTime(subscriber.updatedAt) : "",
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
    link.download = `pujafresh-newsletter-subscribers-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Newsletter CSV exported");
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
              Newsletter Subscribers
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage customers who subscribed from the website footer.
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
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Subscribers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.activeSubscribers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Unsubscribed
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.unsubscribedSubscribers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Joined Today
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.joinedToday}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Subscribers
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by email, source or subscriber ID..."
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
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredSubscribers.length} of {subscribers.length} subscriber
            {subscribers.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {filteredSubscribers.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No subscribers found
              </h2>

              <p className="mt-2 text-gray-600">
                Footer newsletter subscriptions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#fff7ed] text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Subscriber</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Subscribed</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">
                          {subscriber.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {subscriber.id}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {subscriber.source}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            subscriber.status === "Subscribed"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {subscriber.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {formatDateTime(subscriber.subscribedAt)}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {subscriber.updatedAt
                          ? formatDateTime(subscriber.updatedAt)
                          : "Not updated"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleSubscriberStatus(subscriber.id)}
                            className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white hover:bg-[#ea580c]"
                          >
                            {subscriber.status === "Subscribed"
                              ? "Unsubscribe"
                              : "Resubscribe"}
                          </button>

                          <button
                            onClick={() => deleteSubscriber(subscriber.id)}
                            className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
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
