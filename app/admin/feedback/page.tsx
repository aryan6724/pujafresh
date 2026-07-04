"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type DeliveryFeedbackIssue =
  | "None"
  | "Late Delivery"
  | "Damaged Item"
  | "Wrong Item"
  | "Missing Item"
  | "Partner Behaviour"
  | "Packaging Issue"
  | "Other";

type DeliveryFeedback = {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  orderRating: number;
  deliveryRating: number;
  packagingRating: number;
  issueType: DeliveryFeedbackIssue;
  comment?: string;
  wouldRecommend: boolean;
  status?: "New" | "Reviewed" | "Action Needed" | "Resolved" | "Archived";
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
};

const FEEDBACK_STORAGE_KEYS = [
  "pujafresh-delivery-feedbacks",
  "pujafresh-delivery-feedback",
  "pujafresh-delivery-feedback-list",
];

const PRIMARY_FEEDBACK_STORAGE_KEY = "pujafresh-delivery-feedbacks";

const statusFilters = [
  "All Feedback",
  "New",
  "Reviewed",
  "Action Needed",
  "Resolved",
  "Archived",
];

const issueFilters: Array<"All Issues" | DeliveryFeedbackIssue> = [
  "All Issues",
  "None",
  "Late Delivery",
  "Damaged Item",
  "Wrong Item",
  "Missing Item",
  "Partner Behaviour",
  "Packaging Issue",
  "Other",
];

const normalizeFeedback = (feedback: Partial<DeliveryFeedback>): DeliveryFeedback => {
  return {
    id: String(feedback.id || `FDB-${Date.now()}`),
    orderId: String(feedback.orderId || "N/A"),
    customerName: String(feedback.customerName || "Customer"),
    customerPhone: feedback.customerPhone || "",
    customerEmail: feedback.customerEmail || "",
    deliveryPartnerId: feedback.deliveryPartnerId,
    deliveryPartnerName: feedback.deliveryPartnerName || "Not assigned",
    deliveryPartnerPhone: feedback.deliveryPartnerPhone || "",
    orderRating: Number(feedback.orderRating || 0),
    deliveryRating: Number(feedback.deliveryRating || 0),
    packagingRating: Number(feedback.packagingRating || 0),
    issueType: feedback.issueType || "None",
    comment: feedback.comment || "",
    wouldRecommend: Boolean(feedback.wouldRecommend),
    status: feedback.status || "New",
    adminNote: feedback.adminNote || "",
    createdAt: feedback.createdAt || new Date().toISOString(),
    updatedAt: feedback.updatedAt,
  };
};

const readFeedbackFromStorage = () => {
  const feedbackMap = new Map<string, DeliveryFeedback>();

  FEEDBACK_STORAGE_KEYS.forEach((key) => {
    try {
      const savedValue = localStorage.getItem(key);

      if (!savedValue) return;

      const parsedValue = JSON.parse(savedValue) as Partial<DeliveryFeedback>[];

      if (!Array.isArray(parsedValue)) return;

      parsedValue.forEach((feedback) => {
        const normalized = normalizeFeedback(feedback);
        feedbackMap.set(normalized.id, normalized);
      });
    } catch {
      // Ignore invalid storage key.
    }
  });

  return Array.from(feedbackMap.values()).sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );
};

const saveFeedbackToStorage = (feedbackList: DeliveryFeedback[]) => {
  localStorage.setItem(
    PRIMARY_FEEDBACK_STORAGE_KEY,
    JSON.stringify(feedbackList)
  );

  // Keep common legacy key in sync too, so customer/admin pages do not split data.
  localStorage.setItem("pujafresh-delivery-feedback", JSON.stringify(feedbackList));

  window.dispatchEvent(new Event("pujafresh-delivery-feedback-updated"));
};

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

const formatRating = (rating?: number) => {
  return `${Number(rating || 0).toFixed(1)} / 5`;
};

const getAverageRating = (feedback: DeliveryFeedback) => {
  return (
    (Number(feedback.orderRating || 0) +
      Number(feedback.deliveryRating || 0) +
      Number(feedback.packagingRating || 0)) /
    3
  );
};

const getStatusBadgeClass = (status?: string) => {
  if (status === "New") return "bg-orange-50 text-orange-700";
  if (status === "Reviewed") return "bg-blue-50 text-blue-700";
  if (status === "Action Needed") return "bg-red-50 text-red-700";
  if (status === "Resolved") return "bg-green-50 text-green-700";
  if (status === "Archived") return "bg-gray-100 text-gray-700";

  return "bg-gray-100 text-gray-700";
};

const getIssueBadgeClass = (issue?: string) => {
  if (!issue || issue === "None") return "bg-green-50 text-green-700";
  if (
    issue === "Damaged Item" ||
    issue === "Wrong Item" ||
    issue === "Missing Item" ||
    issue === "Partner Behaviour"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-orange-50 text-orange-700";
};

export default function AdminDeliveryFeedbackPage() {
  const router = useRouter();

  const [feedbackList, setFeedbackList] = useState<DeliveryFeedback[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Feedback");
  const [issueFilter, setIssueFilter] = useState("All Issues");

  const loadFeedback = () => {
    setFeedbackList(readFeedbackFromStorage());
  };

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadFeedback();
    setIsCheckingAuth(false);

    window.addEventListener("storage", loadFeedback);
    window.addEventListener("pujafresh-delivery-feedback-updated", loadFeedback);

    return () => {
      window.removeEventListener("storage", loadFeedback);
      window.removeEventListener(
        "pujafresh-delivery-feedback-updated",
        loadFeedback
      );
    };
  }, [router]);

  const filteredFeedback = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return feedbackList.filter((feedback) => {
      const matchesSearch =
        search.length === 0 ||
        feedback.id.toLowerCase().includes(search) ||
        feedback.orderId.toLowerCase().includes(search) ||
        feedback.customerName.toLowerCase().includes(search) ||
        String(feedback.customerEmail || "").toLowerCase().includes(search) ||
        String(feedback.customerPhone || "").includes(search) ||
        String(feedback.deliveryPartnerName || "").toLowerCase().includes(search) ||
        String(feedback.comment || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Feedback" || feedback.status === statusFilter;

      const matchesIssue =
        issueFilter === "All Issues" || feedback.issueType === issueFilter;

      return matchesSearch && matchesStatus && matchesIssue;
    });
  }, [feedbackList, issueFilter, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const ratings = feedbackList.map(getAverageRating);
    const averageRating =
      ratings.length === 0
        ? 0
        : ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    return {
      total: feedbackList.length,
      averageRating,
      actionNeeded: feedbackList.filter(
        (feedback) => feedback.status === "Action Needed"
      ).length,
      resolved: feedbackList.filter((feedback) => feedback.status === "Resolved")
        .length,
      issues: feedbackList.filter((feedback) => feedback.issueType !== "None")
        .length,
      recommended: feedbackList.filter((feedback) => feedback.wouldRecommend)
        .length,
    };
  }, [feedbackList]);

  const saveFeedbackList = (updatedFeedbackList: DeliveryFeedback[]) => {
    setFeedbackList(updatedFeedbackList);
    saveFeedbackToStorage(updatedFeedbackList);
  };

  const updateFeedbackStatus = (
    feedbackId: string,
    status: DeliveryFeedback["status"]
  ) => {
    const adminNote =
      window.prompt("Add admin note", "") ||
      feedbackList.find((feedback) => feedback.id === feedbackId)?.adminNote ||
      "";

    const now = new Date().toISOString();

    const updatedFeedbackList = feedbackList.map((feedback) =>
      feedback.id === feedbackId
        ? {
            ...feedback,
            status,
            adminNote,
            updatedAt: now,
          }
        : feedback
    );

    saveFeedbackList(updatedFeedbackList);
    toast.success(`Feedback marked as ${status}`);
  };

  const deleteFeedback = (feedbackId: string) => {
    const confirmDelete = window.confirm("Delete this feedback record?");

    if (!confirmDelete) return;

    saveFeedbackList(feedbackList.filter((feedback) => feedback.id !== feedbackId));
    toast.success("Feedback deleted");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Feedback");
    setIssueFilter("All Issues");
  };

  const exportCsv = () => {
    if (filteredFeedback.length === 0) {
      toast.error("No feedback to export");
      return;
    }

    const headers = [
      "Feedback ID",
      "Order ID",
      "Customer",
      "Email",
      "Phone",
      "Partner",
      "Order Rating",
      "Delivery Rating",
      "Packaging Rating",
      "Issue",
      "Comment",
      "Recommend",
      "Status",
      "Admin Note",
      "Created At",
    ];

    const rows = filteredFeedback.map((feedback) => [
      feedback.id,
      feedback.orderId,
      feedback.customerName,
      feedback.customerEmail || "",
      feedback.customerPhone || "",
      feedback.deliveryPartnerName || "",
      feedback.orderRating,
      feedback.deliveryRating,
      feedback.packagingRating,
      feedback.issueType,
      feedback.comment || "",
      feedback.wouldRecommend ? "Yes" : "No",
      feedback.status || "New",
      feedback.adminNote || "",
      formatDateTime(feedback.createdAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-delivery-feedback-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Feedback CSV exported");
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
              Delivery Feedback
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Review customer delivery experience, issues, ratings and partner
              feedback.
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
              onClick={loadFeedback}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={exportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Average</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.averageRating.toFixed(1)}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Issues</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.issues}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Action Needed</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.actionNeeded}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Resolved</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.resolved}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Recommend</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.recommended}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_220px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Feedback
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search feedback ID, order ID, customer, partner or comment..."
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

            <div>
              <label className="text-sm font-bold text-gray-700">Issue</label>

              <select
                value={issueFilter}
                onChange={(event) => setIssueFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {issueFilters.map((issue) => (
                  <option key={issue}>{issue}</option>
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
            Showing {filteredFeedback.length} of {feedbackList.length} feedback
            record{feedbackList.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredFeedback.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No delivery feedback found
              </h2>

              <p className="mt-2 text-gray-600">
                Customer feedback will appear here after delivery feedback
                submission.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                            feedback.status
                          )}`}
                        >
                          {feedback.status || "New"}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getIssueBadgeClass(
                            feedback.issueType
                          )}`}
                        >
                          {feedback.issueType}
                        </span>

                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          Avg {getAverageRating(feedback).toFixed(1)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            feedback.wouldRecommend
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {feedback.wouldRecommend ? "Recommended" : "Not recommended"}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black text-gray-900">
                        {feedback.orderId}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        {feedback.customerName} • {feedback.customerEmail || "No email"} •{" "}
                        {feedback.customerPhone || "No phone"}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Partner: {feedback.deliveryPartnerName || "Not assigned"}{" "}
                        {feedback.deliveryPartnerPhone
                          ? `• ${feedback.deliveryPartnerPhone}`
                          : ""}
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-bold text-gray-500">
                            Order Rating
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-900">
                            {formatRating(feedback.orderRating)}
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-bold text-gray-500">
                            Delivery Rating
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-900">
                            {formatRating(feedback.deliveryRating)}
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-bold text-gray-500">
                            Packaging Rating
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-900">
                            {formatRating(feedback.packagingRating)}
                          </p>
                        </div>
                      </div>

                      {feedback.comment && (
                        <div className="mt-4 rounded-lg bg-[#fff7ed] p-3 text-sm text-gray-700">
                          <p className="font-bold text-gray-900">Comment</p>
                          <p className="mt-1">{feedback.comment}</p>
                        </div>
                      )}

                      {feedback.adminNote && (
                        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                          <p className="font-bold">Admin Note</p>
                          <p className="mt-1">{feedback.adminNote}</p>
                        </div>
                      )}

                      <p className="mt-3 text-xs font-semibold text-gray-500">
                        Submitted: {formatDateTime(feedback.createdAt)}
                        {feedback.updatedAt
                          ? ` • Updated: ${formatDateTime(feedback.updatedAt)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap content-start gap-2">
                      <button
                        onClick={() => updateFeedbackStatus(feedback.id, "Reviewed")}
                        disabled={feedback.status === "Reviewed"}
                        className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Reviewed
                      </button>

                      <button
                        onClick={() =>
                          updateFeedbackStatus(feedback.id, "Action Needed")
                        }
                        disabled={feedback.status === "Action Needed"}
                        className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Action Needed
                      </button>

                      <button
                        onClick={() => updateFeedbackStatus(feedback.id, "Resolved")}
                        disabled={feedback.status === "Resolved"}
                        className="rounded bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Resolve
                      </button>

                      <button
                        onClick={() => updateFeedbackStatus(feedback.id, "Archived")}
                        disabled={feedback.status === "Archived"}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Archive
                      </button>

                      <button
                        onClick={() => deleteFeedback(feedback.id)}
                        className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        Delete
                      </button>

                      <Link
                        href={`/track-order?orderId=${encodeURIComponent(
                          feedback.orderId
                        )}`}
                        className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                      >
                        Track Order
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
