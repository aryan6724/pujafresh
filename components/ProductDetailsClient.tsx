"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/types";

type ProductDetailsClientProps = {
  product: Product;
  relatedProducts: Product[];
};

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

type OrderItem = Product & {
  quantity: number;
};

type CustomerOrder = {
  id: string;
  customerEmail?: string;
  customer?: {
    email?: string;
  };
  items: OrderItem[];
  status: string;
};

const serviceablePincodes = ["110042", "110033", "110034", "110085", "110086"];

const productIncludedMap: Record<string, string[]> = {
  "basic-daily-pooja-pack": [
    "Fresh genda flowers for daily pooja",
    "Rose petals for offering",
    "Roli / kumkum for tilak",
    "Chawal for pooja rituals",
    "Kapoor and cotton batti",
    "Agarbatti for fragrance",
    "Clean packing for morning delivery",
  ],
  "fresh-genda-flowers": [
    "Fresh orange and yellow genda flowers",
    "Suitable for daily mandir use",
    "Packed in clean transparent packaging",
    "Good for pooja, decoration and offerings",
    "Delivered fresh in the morning slot",
  ],
  "kapoor-dhoop-combo": [
    "Kapoor pieces for aarti",
    "Dhoop sticks / cones for fragrance",
    "Useful for daily pooja and evening aarti",
    "Packed safely to avoid damage",
    "Affordable combo for regular use",
  ],
  "complete-navratri-kit": [
    "Mata chunri",
    "Kalash setup items",
    "Nariyal and mauli",
    "Roli, chawal and kapoor",
    "Fresh flowers and rose petals",
    "Agarbatti, diya and cotton batti",
    "Complete festive pooja essentials",
  ],
  "small-ganesh-ji-murti": [
    "Small Ganesh Ji murti",
    "Safe protective packaging",
    "Suitable for home mandir",
    "Can be used for Ganesh Chaturthi and daily worship",
    "Eco-friendly style product positioning",
  ],
  "premium-daily-pooja-pack": [
    "Fresh flowers and rose petals",
    "Roli, chawal and kapoor",
    "Cotton batti and agarbatti",
    "Brass-style pooja essentials presentation",
    "Premium clean packing",
    "Best for daily home mandir use",
  ],
};

const productHighlightsMap: Record<string, string[]> = {
  "basic-daily-pooja-pack": [
    "Affordable daily pooja pack",
    "Best for regular home mandir use",
    "Fresh morning delivery support",
    "Good for daily budget",
  ],
  "fresh-genda-flowers": [
    "Fresh genda flowers",
    "Ideal for daily pooja and decoration",
    "Packed cleanly",
    "Available for early morning delivery",
  ],
  "kapoor-dhoop-combo": [
    "Useful daily pooja combo",
    "Kapoor and dhoop together",
    "Compact and affordable",
    "Easy to store at home",
  ],
  "complete-navratri-kit": [
    "Complete Navratri essentials",
    "Festival-ready combo",
    "Saves shopping time",
    "Good for home pooja setup",
  ],
  "small-ganesh-ji-murti": [
    "Small size for home mandir",
    "Safe delivery packaging",
    "Good for gifting and festivals",
    "Simple devotional design",
  ],
  "premium-daily-pooja-pack": [
    "Premium daily pooja set",
    "More complete than basic pack",
    "Fresh flowers with pooja essentials",
    "Best for regular family pooja",
  ],
};

const defaultReviews: ProductReview[] = [
  {
    id: "default-review-1",
    name: "Ritika Sharma",
    rating: 5,
    title: "Fresh and neatly packed",
    comment:
      "Flowers were fresh and packing was clean. Morning delivery idea is really useful.",
    date: "12 Jun 2026",
    verified: true,
  },
  {
    id: "default-review-2",
    name: "Amit Verma",
    rating: 4,
    title: "Good quality",
    comment:
      "Good quality pooja items. Delivery timing can be improved but overall nice.",
    date: "10 Jun 2026",
    verified: true,
  },
  {
    id: "default-review-3",
    name: "Neha Gupta",
    rating: 5,
    title: "Perfect for daily pooja",
    comment: "Items were clean, useful and neatly packed. Good for daily use.",
    date: "08 Jun 2026",
    verified: true,
  },
];

const getReviewStorageKey = (productSlug: string) => {
  return `pujafresh-reviews-${productSlug}`;
};

export default function ProductDetailsClient({
  product,
  relatedProducts,
}: ProductDetailsClientProps) {
  const { user, isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState<
    "available" | "unavailable" | null
  >(null);

  const [customerReviews, setCustomerReviews] = useState<ProductReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [hasPurchasedProduct, setHasPurchasedProduct] = useState(false);

  useEffect(() => {
    const savedReviews = localStorage.getItem(getReviewStorageKey(product.slug));

    if (!savedReviews) {
      setCustomerReviews([]);
      return;
    }

    try {
      const parsedReviews = JSON.parse(savedReviews) as ProductReview[];

      if (Array.isArray(parsedReviews)) {
        setCustomerReviews(parsedReviews);
      } else {
        setCustomerReviews([]);
      }
    } catch {
      setCustomerReviews([]);
    }
  }, [product.slug]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setHasPurchasedProduct(false);
      return;
    }

    const savedOrders = localStorage.getItem("pujafresh-orders");

    if (!savedOrders) {
      setHasPurchasedProduct(false);
      return;
    }

    try {
      const orders = JSON.parse(savedOrders) as CustomerOrder[];

      if (!Array.isArray(orders)) {
        setHasPurchasedProduct(false);
        return;
      }

      const purchased = orders.some((order) => {
        const belongsToCurrentUser =
          order.customerEmail === user.email ||
          order.customer?.email === user.email;

        const isValidOrder =
          order.status !== "Cancelled" && order.status !== "Archived";

        const hasProduct = order.items?.some((item) => {
          return item.id === product.id || item.slug === product.slug;
        });

        return belongsToCurrentUser && isValidOrder && hasProduct;
      });

      setHasPurchasedProduct(purchased);
    } catch {
      setHasPurchasedProduct(false);
    }
  }, [isLoggedIn, user, product.id, product.slug]);

  const approvedCustomerReviews = useMemo(() => {
    return customerReviews.filter(
      (review) => !review.status || review.status === "Approved"
    );
  }, [customerReviews]);

  const pendingCustomerReview = useMemo(() => {
    if (!user) return null;

    return (
      customerReviews.find(
        (review) =>
          review.email === user.email && review.status === "Pending"
      ) || null
    );
  }, [customerReviews, user]);

  const allReviews = useMemo(() => {
    return [...approvedCustomerReviews, ...defaultReviews];
  }, [approvedCustomerReviews]);

  const averageRating = useMemo(() => {
    if (allReviews.length === 0) return product.rating;

    const totalRating = allReviews.reduce(
      (total, review) => total + review.rating,
      0
    );

    return Number((totalRating / allReviews.length).toFixed(1));
  }, [allReviews, product.rating]);

  const totalRatings = product.reviews + approvedCustomerReviews.length;

  const alreadyReviewed = useMemo(() => {
    if (!user) return false;

    return customerReviews.some(
      (review) =>
        review.email === user.email &&
        (!review.status ||
          review.status === "Approved" ||
          review.status === "Pending")
    );
  }, [customerReviews, user]);

  const isWishlisted = isInWishlist(product.id);

  const availableStock = Number(
    product.stockQuantity ??
      (product.stock === "Out of Stock" || product.stock === "Coming Soon"
        ? 0
        : 999)
  );

  const isOutOfStock = product.stock === "Out of Stock" || availableStock <= 0;
  const isComingSoon = product.stock === "Coming Soon";
  const isLowStock =
    !isOutOfStock && !isComingSoon && availableStock > 0 && availableStock <= 5;
  const isLimitedStock = product.stock === "Limited Stock" || isLowStock;
  const isUnavailable = isOutOfStock || isComingSoon;
  const isStockLimitReached = !isUnavailable && quantity >= availableStock;

  const discount = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100
  );

  const includedItems =
    productIncludedMap[product.slug] || [
      "Fresh selected product items",
      "Clean packaging",
      "Morning delivery support",
      "Affordable pricing",
    ];

  const highlights =
    productHighlightsMap[product.slug] || [
      "Fresh product",
      "Clean packaging",
      "Affordable rate",
      "Morning delivery support",
    ];

  const getStockColor = () => {
    if (isOutOfStock) return "text-red-600";
    if (isComingSoon) return "text-blue-600";
    if (isLimitedStock) return "text-orange-600";
    return "text-[#15803d]";
  };

  const getStockMessage = () => {
    if (isOutOfStock) {
      return "This product is currently out of stock.";
    }

    if (isComingSoon) {
      return "This product is coming soon and cannot be ordered right now.";
    }

    if (isLowStock) {
      return `Only ${availableStock} unit(s) left. Order soon before it sells out.`;
    }

    if (isLimitedStock) {
      return "Hurry! Only limited quantity is available.";
    }

    return "This product is available for order.";
  };

  const increaseQuantity = () => {
    if (isUnavailable) return;

    if (quantity >= availableStock) {
      toast.error(`Only ${availableStock} unit(s) available`);
      return;
    }

    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (isUnavailable) return;
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCart = () => {
    if (isUnavailable) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} unit(s) available`);
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }

    toast.success(`${quantity} × ${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    if (isUnavailable) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} unit(s) available`);
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }

    toast.success(`${quantity} × ${product.name} added. Go to cart to checkout.`);
  };

  const handleWishlist = () => {
    toggleWishlist(product);

    if (isWishlisted) {
      toast.success(`${product.name} removed from wishlist`);
    } else {
      toast.success(`${product.name} added to wishlist`);
    }
  };

  const handlePincodeCheck = () => {
    if (!pincode.trim()) {
      toast.error("Please enter your pincode");
      setPincodeResult(null);
      return;
    }

    if (serviceablePincodes.includes(pincode.trim())) {
      setPincodeResult("available");
      toast.success("Delivery available in your area");
      return;
    }

    setPincodeResult("unavailable");
    toast.error("Currently not available in this pincode");
  };

  const handleSubmitReview = () => {
    if (!isLoggedIn || !user) {
      toast.error("Please login to write a review");
      return;
    }

    if (!hasPurchasedProduct) {
      toast.error("Only verified customers can write a review");
      return;
    }

    if (alreadyReviewed) {
      toast.error("You have already reviewed this product");
      return;
    }

    if (!reviewTitle.trim()) {
      toast.error("Please enter review title");
      return;
    }

    if (!reviewComment.trim()) {
      toast.error("Please write your review");
      return;
    }

    const newReview: ProductReview = {
      id: `review-${Date.now()}`,
      name: user.fullName || "PujaFresh Customer",
      email: user.email,
      rating: reviewRating,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      verified: true,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    const updatedReviews = [newReview, ...customerReviews];

    setCustomerReviews(updatedReviews);
    localStorage.setItem(
      getReviewStorageKey(product.slug),
      JSON.stringify(updatedReviews)
    );

    setReviewRating(5);
    setReviewTitle("");
    setReviewComment("");

    toast.success("Review submitted for admin approval");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-600">
          <Link href="/" className="font-semibold hover:text-[#7a1e13]">
            Home
          </Link>
          <ChevronRight size={16} />
          <span>{product.category}</span>
          <ChevronRight size={16} />
          <span className="font-semibold text-gray-900">{product.name}</span>
        </div>

        <div className="grid gap-6 rounded-xl bg-white p-5 shadow-sm lg:grid-cols-[460px_1fr]">
          <div>
            <div className="relative h-[420px] overflow-hidden rounded-xl bg-[#fff7ed]">
              {(isUnavailable || isLimitedStock) && (
                <div
                  className={`absolute left-4 top-4 z-10 rounded px-3 py-1 text-xs font-bold uppercase text-white ${
                    isLimitedStock ? "bg-orange-600" : "bg-red-600"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of Stock"
                    : isComingSoon
                    ? "Coming Soon"
                    : isLowStock
                    ? `Only ${availableStock} Left`
                    : "Limited Stock"}
                </div>
              )}

              <Image
                src={product.image}
                alt={product.name}
                fill
                className={`object-cover ${
                  isUnavailable ? "opacity-60 grayscale" : ""
                }`}
                priority
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isUnavailable}
                className={`rounded py-4 font-bold text-white ${
                  isUnavailable
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#f59e0b] hover:bg-[#d97706]"
                }`}
              >
                {isOutOfStock
                  ? "OUT OF STOCK"
                  : isComingSoon
                  ? "COMING SOON"
                  : "ADD TO CART"}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isUnavailable}
                className={`rounded py-4 font-bold text-white ${
                  isUnavailable
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#15803d] hover:bg-[#166534]"
                }`}
              >
                BUY NOW
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">
              {product.badge}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              {product.name}
            </h1>

            <p className="mt-2 text-gray-500">{product.category}</p>

            <div className="mt-3 flex items-center gap-3">
              <span className="flex items-center gap-1 rounded bg-[#15803d] px-2 py-1 text-sm font-bold text-white">
                {averageRating}
                <Star size={14} fill="white" />
              </span>

              <span className="text-sm font-medium text-gray-500">
                {totalRatings} Ratings & Reviews
              </span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900">
                ₹{product.price}
              </span>

              <span className="text-lg text-gray-400 line-through">
                ₹{product.mrp}
              </span>

              <span className="text-lg font-bold text-[#15803d]">
                {discount}% off
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-[#15803d]">
              Inclusive of all taxes
            </p>

            <div className="mt-4 rounded-lg bg-[#fff7ed] p-4">
              <p className={`text-sm font-bold ${getStockColor()}`}>
                {isOutOfStock ? "Out of Stock" : product.stock}
              </p>

              {!isComingSoon && (
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  Available Stock: {availableStock} units
                </p>
              )}

              <p className="mt-1 text-sm text-gray-700">{getStockMessage()}</p>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-900">Quantity</h2>

              <div className="mt-2 flex w-fit items-center overflow-hidden rounded border border-gray-300">
                <button
                  onClick={decreaseQuantity}
                  disabled={isUnavailable}
                  className={`px-4 py-2 ${
                    isUnavailable
                      ? "cursor-not-allowed text-gray-400"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <Minus size={16} />
                </button>

                <span className="px-5 py-2 font-bold">{quantity}</span>

                <button
                  onClick={increaseQuantity}
                  disabled={isUnavailable || isStockLimitReached}
                  className={`px-4 py-2 ${
                    isUnavailable || isStockLimitReached
                      ? "cursor-not-allowed text-gray-400"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <Plus size={16} />
                </button>
              </div>

              {!isUnavailable && isStockLimitReached && (
                <p className="mt-2 text-xs font-bold text-orange-600">
                  Stock limit reached.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-900">
                Check Delivery Availability
              </h2>

              <div className="mt-3 flex gap-2">
                <input
                  value={pincode}
                  onChange={(event) =>
                    setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="Enter pincode"
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />

                <button
                  onClick={handlePincodeCheck}
                  className="rounded bg-[#7a1e13] px-5 py-2 font-bold text-white"
                >
                  Check
                </button>
              </div>

              {pincodeResult === "available" && (
                <p className="mt-2 text-sm font-semibold text-[#15803d]">
                  Delivery available. Order before 9 PM for next morning slot.
                </p>
              )}

              {pincodeResult === "unavailable" && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  Sorry, delivery is not available in this pincode yet.
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <Truck className="text-[#7a1e13]" />
                <p className="mt-2 text-sm font-bold">Morning Delivery</p>
                <p className="mt-1 text-xs text-gray-500">Order before 9 PM</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <CheckCircle className="text-[#15803d]" />
                <p className="mt-2 text-sm font-bold">Fresh Products</p>
                <p className="mt-1 text-xs text-gray-500">Packed carefully</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <ShieldCheck className="text-[#f97316]" />
                <p className="mt-2 text-sm font-bold">Trusted Quality</p>
                <p className="mt-1 text-xs text-gray-500">
                  Checked before delivery
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-[#fff7ed] p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Product Highlights
              </h2>

              <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                {highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2">
                    <span className="font-bold text-[#15803d]">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">
                What&apos;s Included
              </h2>

              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {includedItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="font-bold text-[#7a1e13]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Delivery Information
              </h2>

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Delivery:</span>{" "}
                  {product.delivery}
                </p>
                <p>
                  <span className="font-semibold">Available:</span>{" "}
                  {isOutOfStock ? "Out of Stock" : product.stock}
                </p>
                {!isComingSoon && (
                  <p>
                    <span className="font-semibold">Stock Quantity:</span>{" "}
                    {availableStock} units
                  </p>
                )}
                <p>
                  <span className="font-semibold">Cut-off time:</span> Order
                  before 9 PM for next morning delivery.
                </p>
              </div>
            </div>

            <button
              onClick={handleWishlist}
              className={`mt-5 flex items-center gap-2 text-sm font-bold ${
                isWishlisted ? "text-red-500" : "text-[#7a1e13]"
              }`}
            >
              <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
              {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Customer Reviews
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Only verified customers who purchased this product can write a
                review.
              </p>
            </div>

            <div className="rounded-lg bg-[#15803d] px-4 py-2 text-white">
              <p className="text-sm font-bold">{averageRating} ★</p>
              <p className="text-xs">{totalRatings} ratings</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="rounded-lg border border-gray-200 bg-[#fff7ed] p-4">
              <h3 className="font-bold text-gray-900">Write a Review</h3>

              {!isLoggedIn ? (
                <div className="mt-4 rounded bg-white p-4 text-sm">
                  <p className="font-semibold text-gray-700">
                    Please login to submit a review.
                  </p>

                  <Link
                    href="/login"
                    className="mt-3 inline-block rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white"
                  >
                    Login
                  </Link>
                </div>
              ) : !hasPurchasedProduct ? (
                <div className="mt-4 rounded bg-white p-4 text-sm">
                  <p className="font-bold text-gray-900">
                    Verified purchase required
                  </p>

                  <p className="mt-2 text-gray-600">
                    Only customers who purchased this product can write a
                    review. Cancelled or archived orders are not counted.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/orders"
                      className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13]"
                    >
                      My Orders
                    </Link>

                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isUnavailable}
                      className={`rounded px-4 py-2 text-sm font-bold text-white ${
                        isUnavailable
                          ? "cursor-not-allowed bg-gray-400"
                          : "bg-[#15803d] hover:bg-[#166534]"
                      }`}
                    >
                      Buy This Product
                    </button>
                  </div>
                </div>
              ) : alreadyReviewed ? (
                <div className="mt-4 rounded bg-white p-4 text-sm">
                  <p className="font-bold text-[#15803d]">
                    Review already submitted
                  </p>

                  <p className="mt-2 text-gray-600">
                    {pendingCustomerReview
                      ? "Your review is waiting for admin approval."
                      : "You have already reviewed this product from your account."}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">
                    <p className="font-bold">Verified Purchase</p>
                    <p>You can review this product because it exists in your order history.</p>
                  </div>

                  <label className="text-sm font-bold text-gray-700">
                    Your Rating
                  </label>

                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewRating(rating)}
                        className="rounded p-1 hover:bg-white"
                      >
                        <Star
                          size={24}
                          className={
                            rating <= reviewRating
                              ? "text-[#f59e0b]"
                              : "text-gray-300"
                          }
                          fill={rating <= reviewRating ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-bold text-gray-700">
                      Review Title
                    </label>

                    <input
                      value={reviewTitle}
                      onChange={(event) => setReviewTitle(event.target.value)}
                      placeholder="Example: Fresh and clean product"
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-bold text-gray-700">
                      Your Review
                    </label>

                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      rows={4}
                      placeholder="Write your experience with this product..."
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    className="mt-4 w-full rounded bg-[#7a1e13] px-4 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
                  >
                    Submit Review for Approval
                  </button>
                </div>
              )}
            </div>

            <div>
              {allReviews.length === 0 ? (
                <div className="rounded-lg border border-gray-200 p-6 text-center">
                  <h3 className="font-bold text-gray-900">No reviews yet</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Be the first verified customer to review this product.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {allReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 rounded bg-[#15803d] px-2 py-0.5 text-xs font-bold text-white">
                          {review.rating}
                          <Star size={12} fill="white" />
                        </span>

                        {review.verified && (
                          <span className="text-xs font-semibold text-[#15803d]">
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {review.title}
                      </h3>

                      <p className="mt-2 text-sm text-gray-600">
                        {review.comment}
                      </p>

                      <div className="mt-4 border-t pt-3 text-xs text-gray-500">
                        <p className="font-semibold text-gray-800">
                          {review.name}
                        </p>
                        <p>{review.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Related Products
            </h2>

            <Link href="/" className="text-sm font-bold text-[#7a1e13]">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}