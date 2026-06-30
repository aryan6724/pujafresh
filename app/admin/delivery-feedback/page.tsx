"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  deleteDeliveryFeedback,
  DeliveryFeedback,
  getDeliveryFeedbacks,
} from "@/utils/deliveryFeedbackStorage";

const issueFilters = [
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

const ratingFilters = ["All Ratings", "5", "4", "3", "2", "1"];

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAverage = (values: number[]) => {
  if (values.length === 0) return 0;

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
};

export default function AdminDeliveryFeedbackPage() {
  const router = useRouter();

  const [feedbacks, setFeedbacks] = useState<DeliveryFeedback[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [issueFilter, setIssueFilter] = useState("All Issues");
  const [ratingFilter, setRatingFilter] = useState("All Ratings");
  const [recommendFilter, setRecommendFilter] = useState("All");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadFeedbacks();
    setIsCheckingAuth(false);
  }, [router]);

  const loadFeedbacks = () => {
    setFeedbacks(getDeliveryFeedbacks());
  };

  const filteredFeedbacks = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return feedbacks.filter((feedback) => {
      const matchesSearch =
        search.length === 0 ||
        feedback.orderId.toLowerCase().includes(search) ||
        feedback.customerName.toLowerCase().includes(search) ||
        feedback.customerPhone.includes(search) ||
        feedback.deliveryPartnerName?.toLowerCase().includes(search) ||
        feedback.comment.toLowerCase().includes(search);

      const matchesIssue =
        issueFilter === "All Issues" || feedback.issueType === issueFilter;

      const matchesRating =
        ratingFilter === "All Ratings" ||
        feedback.orderRating === Number(ratingFilter) ||
        feedback.deliveryRating === Number(ratingFilter) ||
        feedback.packagingRating === Number(ratingFilter);

      const matchesRecommend =
        recommendFilter === "All" ||
        (recommendFilter === "Recommended" && feedback.wouldRecommend) ||
        (recommendFilter === "Not Recommended" && !feedback.wouldRecommend);

      return matchesSearch && matchesIssue && matchesRating && matchesRecommend;
    });
  }, [feedbacks, searchQuery, issueFilter, ratingFilter, recommendFilter]);

  const stats = useMemo(() => {
    const complaintCount = feedbacks.filter(
      (feedback) => feedback.issueType !== "None"
    ).length;

    return {
      total: feedbacks.length,
      averageOrderRating: getAverage(
        feedbacks.map((feedback) => feedback.orderRating)
      ),
      averageDeliveryRating: getAverage(
        feedbacks.map((feedback) => feedback.deliveryRating)
      ),
      averagePackagingRating: getAverage(
        feedbacks.map((feedback) => feedback.packagingRating)
      ),
      complaints: complaintCount,
      recommended: feedbacks.filter((feedback) => feedback.wouldRecommend)
        .length,
      notRecommended: feedbacks.filter((feedback) => !feedback.wouldRecommend)
        .length,
    };
  }, [feedbacks]);

  const partnerFeedbackSummary = useMemo(() => {
    const summaryMap = new Map<
      string,
      {
        partnerName: string;
        partnerPhone: string;
        count: number;
        deliveryRatings: number[];
        complaints: number;
      }
    >();

    feedbacks.forEach((feedback) => {
      if (!feedback.deliveryPartnerId) return;

      const existing = summaryMap.get(feedback.deliveryPartnerId) || {
        partnerName: feedback.deliveryPartnerName || "Partner",
        partnerPhone: feedback.deliveryPartnerPhone || "",
        count: 0,
        deliveryRatings: [],
        complaints: 0,
      };

      existing.count += 1;
      existing.deliveryRatings.push(feedback.deliveryRating);

      if (feedback.issueType !== "None") {
        existing.complaints += 1;
      }

      summaryMap.set(feedback.deliveryPartnerId, existing);
    });

    return Array.from(summaryMap.entries()).map(([partnerId, summary]) => ({
      partnerId,
      ...summary,
      averageDeliveryRating: getAverage(summary.deliveryRatings),
    }));
  }, [feedbacks]);

  const clearFilters = () => {
    setSearchQuery("");
    setIssueFilter("All Issues");
    setRatingFilter("All Ratings");
    setRecommendFilter("All");
  };

  const handleDeleteFeedback = (feedbackId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this feedback?"
    );

    if (!confirmDelete) return;

    deleteDeliveryFeedback(feedbackId);
    loadFeedbacks();
    toast.success("Feedback deleted successfully");
  };

  const handleExportCsv = () => {
    if (filteredFeedbacks.length === 0) {
      toast.error("No feedback to export");
      return;
    }

    const headers = [
      "Feedback ID",
      "Order ID",
      "Customer",
      "Phone",
      "Partner",
      "Order Rating",
      "Delivery Rating",
      "Packaging Rating",
      "Issue",
      "Recommend",
      "Comment",
      "Created At",
    ];

    const rows = filteredFeedbacks.map((feedback) => [
      feedback.id,
      feedback.orderId,
      feedback.customerName,
      feedback.customerPhone,
      feedback.deliveryPartnerName || "Not assigned",
      feedback.orderRating,
      feedback.deliveryRating,
      feedback.packagingRating,
      feedback.issueType,
      feedback.wouldRecommend ? "Yes" : "No",
      feedback.comment,
      formatDateTime(feedback.createdAt),
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
    link.download = `pujafresh-delivery-feedback-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Delivery feedback CSV exported");
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
              Review customer delivery ratings, complaints, packaging feedback
              and partner-wise service quality.
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
              href="/delivery-feedback"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Customer Form
            </Link>

            <button
              onClick={loadFeedbacks}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Feedbacks</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Order Rating
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.averageOrderRating}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Delivery Rating
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.averageDeliveryRating}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Packaging
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.averagePackagingRating}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Complaints</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.complaints}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Recommended
            </p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.recommended}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_160px_190px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Feedback
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order, customer, phone, partner or comment..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
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

            <div>
              <label className="text-sm font-bold text-gray-700">Rating</label>

              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {ratingFilters.map((rating) => (
                  <option key={rating}>{rating}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Recommend
              </label>

              <select
                value={recommendFilter}
                onChange={(event) => setRecommendFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All</option>
                <option>Recommended</option>
                <option>Not Recommended</option>
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
            Showing {filteredFeedbacks.length} of {feedbacks.length} feedback
            {feedbacks.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Partner Feedback Summary
          </h2>

          {partnerFeedbackSummary.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              Partner feedback will appear after customers submit ratings.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partnerFeedbackSummary.map((summary) => (
                <div
                  key={summary.partnerId}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <h3 className="font-bold text-gray-900">
                    {summary.partnerName}
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    {summary.partnerPhone || "No phone"}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-gray-500">Feedback</p>
                      <p className="font-black text-gray-900">
                        {summary.count}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-gray-500">Rating</p>
                      <p className="font-black text-green-700">
                        {summary.averageDeliveryRating}
                      </p>
                    </div>

                    <div className="rounded bg-gray-50 p-3">
                      <p className="text-gray-500">Issues</p>
                      <p className="font-black text-red-600">
                        {summary.complaints}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Feedback List
          </h2>

          {filteredFeedbacks.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No feedback found
              </h3>

              <p className="mt-2 text-gray-600">
                Customer feedback will appear here after delivery.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {filteredFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {feedback.orderId}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            feedback.issueType === "None"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {feedback.issueType}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {feedback.wouldRecommend
                            ? "Recommended"
                            : "Not Recommended"}
                        </span>
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {feedback.customerName}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {feedback.customerPhone} • Partner:{" "}
                        {feedback.deliveryPartnerName || "Not assigned"}
                      </p>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded bg-gray-50 p-3">
                          <p className="text-gray-500">Order Rating</p>
                          <p className="font-black text-gray-900">
                            {feedback.orderRating}/5
                          </p>
                        </div>

                        <div className="rounded bg-gray-50 p-3">
                          <p className="text-gray-500">Delivery Rating</p>
                          <p className="font-black text-gray-900">
                            {feedback.deliveryRating}/5
                          </p>
                        </div>

                        <div className="rounded bg-gray-50 p-3">
                          <p className="text-gray-500">Packaging Rating</p>
                          <p className="font-black text-gray-900">
                            {feedback.packagingRating}/5
                          </p>
                        </div>
                      </div>

                      {feedback.comment && (
                        <p className="mt-4 rounded bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                          {feedback.comment}
                        </p>
                      )}

                      <p className="mt-3 text-xs font-semibold text-gray-500">
                        Submitted on {formatDateTime(feedback.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/invoice/${feedback.orderId}`}
                        className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                      >
                        Invoice
                      </Link>

                      <button
                        onClick={() => handleDeleteFeedback(feedback.id)}
                        className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        Delete
                      </button>
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
