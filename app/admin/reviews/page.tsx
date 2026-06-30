"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type ProductReview = {
  id: string;
  name: string;
  email?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  status?: "Pending" | "Approved" | "Rejected";
  createdAt?: string;
};

type ReviewWithProduct = ProductReview & {
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  productCategory: string;
};

const statusOptions = ["All Reviews", "Pending", "Approved", "Rejected"];

const getReviewStorageKey = (productSlug: string) => {
  return `pujafresh-reviews-${productSlug}`;
};

export default function AdminReviewsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Reviews");
  const [ratingFilter, setRatingFilter] = useState("All Ratings");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const productList = getProducts();
    setProducts(productList);

    const allReviews = productList.flatMap((product) => {
      const savedReviews = localStorage.getItem(getReviewStorageKey(product.slug));

      if (!savedReviews) return [];

      try {
        const parsedReviews = JSON.parse(savedReviews) as ProductReview[];

        if (!Array.isArray(parsedReviews)) return [];

        return parsedReviews.map((review) => ({
          ...review,
          status: review.status || "Approved",
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          productImage: product.image,
          productCategory: product.category,
        }));
      } catch {
        return [];
      }
    });

    setReviews(allReviews);
    setIsCheckingAuth(false);
  }, [router]);

  const saveProductReviews = (
    productSlug: string,
    updatedReviews: ProductReview[]
  ) => {
    localStorage.setItem(
      getReviewStorageKey(productSlug),
      JSON.stringify(updatedReviews)
    );
  };

  const syncReviewStatus = (
    productSlug: string,
    reviewId: string,
    status: "Pending" | "Approved" | "Rejected"
  ) => {
    const productReviews = reviews
      .filter((review) => review.productSlug === productSlug)
      .map(({ productId, productSlug: slug, productName, productImage, productCategory, ...review }) => ({
        ...review,
        status: review.id === reviewId ? status : review.status || "Approved",
      }));

    saveProductReviews(productSlug, productReviews);

    setReviews((prevReviews) =>
      prevReviews.map((review) =>
        review.id === reviewId && review.productSlug === productSlug
          ? { ...review, status }
          : review
      )
    );

    toast.success(`Review marked as ${status}`);
  };

  const deleteReview = (productSlug: string, reviewId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this review?"
    );

    if (!confirmDelete) return;

    const productReviews = reviews
      .filter(
        (review) =>
          review.productSlug === productSlug && review.id !== reviewId
      )
      .map(({ productId, productSlug: slug, productName, productImage, productCategory, ...review }) => review);

    saveProductReviews(productSlug, productReviews);

    setReviews((prevReviews) =>
      prevReviews.filter(
        (review) =>
          !(review.productSlug === productSlug && review.id === reviewId)
      )
    );

    toast.success("Review deleted successfully");
  };

  const filteredReviews = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return reviews.filter((review) => {
      const reviewStatus = review.status || "Approved";

      const matchesSearch =
        search.length === 0 ||
        review.productName.toLowerCase().includes(search) ||
        review.productCategory.toLowerCase().includes(search) ||
        review.name.toLowerCase().includes(search) ||
        review.email?.toLowerCase().includes(search) ||
        review.title.toLowerCase().includes(search) ||
        review.comment.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Reviews" || reviewStatus === statusFilter;

      const matchesRating =
        ratingFilter === "All Ratings" ||
        review.rating === Number(ratingFilter);

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter]);

  const stats = useMemo(() => {
    const pending = reviews.filter(
      (review) => (review.status || "Approved") === "Pending"
    ).length;

    const approved = reviews.filter(
      (review) => (review.status || "Approved") === "Approved"
    ).length;

    const rejected = reviews.filter(
      (review) => (review.status || "Approved") === "Rejected"
    ).length;

    const approvedReviews = reviews.filter(
      (review) => (review.status || "Approved") === "Approved"
    );

    const averageRating =
      approvedReviews.length > 0
        ? Number(
            (
              approvedReviews.reduce(
                (sum, review) => sum + review.rating,
                0
              ) / approvedReviews.length
            ).toFixed(1)
          )
        : 0;

    return {
      total: reviews.length,
      pending,
      approved,
      rejected,
      averageRating,
    };
  }, [reviews]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Reviews");
    setRatingFilter("All Ratings");
  };

  const handleExportCsv = () => {
    if (filteredReviews.length === 0) {
      toast.error("No reviews to export");
      return;
    }

    const headers = [
      "Product",
      "Category",
      "Reviewer",
      "Email",
      "Rating",
      "Title",
      "Comment",
      "Status",
      "Verified",
      "Date",
    ];

    const rows = filteredReviews.map((review) => [
      review.productName,
      review.productCategory,
      review.name,
      review.email || "",
      review.rating,
      review.title,
      review.comment,
      review.status || "Approved",
      review.verified ? "Yes" : "No",
      review.date,
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
    link.download = `pujafresh-reviews-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Reviews CSV exported");
  };

  const getStatusClass = (status?: string) => {
    if (status === "Pending") return "bg-orange-50 text-orange-700";
    if (status === "Rejected") return "bg-red-50 text-red-700";
    return "bg-green-50 text-green-700";
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
              Reviews Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Approve, reject, delete and export customer product reviews.
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Reviews
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Pending Reviews
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.pending}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Approved Reviews
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.approved}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Rejected Reviews
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.rejected}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Avg. Rating
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.averageRating} ★
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Reviews
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by product, customer, title or comment..."
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

            <div>
              <label className="text-sm font-bold text-gray-700">
                Rating Filter
              </label>

              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Ratings</option>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} Star
                  </option>
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
            Showing {filteredReviews.length} of {reviews.length} review
            {reviews.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No reviews found
              </h2>

              <p className="mt-2 text-gray-600">
                Customer reviews will appear here after submission.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredReviews.map((review) => (
                <div
                  key={`${review.productSlug}-${review.id}`}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[72px_1fr_220px]">
                    <div className="relative h-16 w-16 overflow-hidden rounded bg-[#fff7ed]">
                      <Image
                        src={review.productImage || "/basic-pooja-pack.jpg"}
                        alt={review.productName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900">
                          {review.productName}
                        </h3>

                        <span className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13]">
                          {review.productCategory}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            review.status || "Approved"
                          )}`}
                        >
                          {review.status || "Approved"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 rounded bg-[#15803d] px-2 py-0.5 text-xs font-bold text-white">
                          {review.rating} ★
                        </span>

                        {review.verified && (
                          <span className="text-xs font-semibold text-[#15803d]">
                            Verified Purchase
                          </span>
                        )}

                        <span className="text-xs text-gray-500">
                          {review.date}
                        </span>
                      </div>

                      <p className="mt-3 font-bold text-gray-900">
                        {review.title}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        {review.comment}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-gray-500">
                        By {review.name}
                        {review.email ? ` • ${review.email}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap content-start gap-2">
                      <button
                        onClick={() =>
                          syncReviewStatus(
                            review.productSlug,
                            review.id,
                            "Approved"
                          )
                        }
                        disabled={(review.status || "Approved") === "Approved"}
                        className="rounded bg-[#15803d] px-3 py-2 text-xs font-bold text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          syncReviewStatus(
                            review.productSlug,
                            review.id,
                            "Rejected"
                          )
                        }
                        disabled={(review.status || "Approved") === "Rejected"}
                        className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() =>
                          syncReviewStatus(
                            review.productSlug,
                            review.id,
                            "Pending"
                          )
                        }
                        disabled={(review.status || "Approved") === "Pending"}
                        className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                      >
                        Pending
                      </button>

                      <button
                        onClick={() => deleteReview(review.productSlug, review.id)}
                        className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>

                      <Link
                        href={`/product/${review.productSlug}`}
                        className="rounded border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-900 hover:text-white"
                      >
                        View Product
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
