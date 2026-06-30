"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import toast from "react-hot-toast";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

type ProductCardProps = {
  product: Product;
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
};

const getReviewStorageKey = (productSlug: string) => {
  return `pujafresh-reviews-${productSlug}`;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [customerReviews, setCustomerReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    const loadProductReviews = () => {
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
    };

    loadProductReviews();

    window.addEventListener("focus", loadProductReviews);

    return () => {
      window.removeEventListener("focus", loadProductReviews);
    };
  }, [product.slug]);

  const dynamicRating = useMemo(() => {
    if (customerReviews.length === 0) {
      return product.rating;
    }

    const existingRatingTotal = product.rating * product.reviews;
    const customerRatingTotal = customerReviews.reduce(
      (total, review) => total + review.rating,
      0
    );

    const finalRating =
      (existingRatingTotal + customerRatingTotal) /
      (product.reviews + customerReviews.length);

    return Number(finalRating.toFixed(1));
  }, [customerReviews, product.rating, product.reviews]);

  const dynamicReviewCount = product.reviews + customerReviews.length;

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

  const discount = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100
  );

  const getStockColor = () => {
    if (isOutOfStock) return "text-red-600";
    if (isComingSoon) return "text-blue-600";
    if (isLimitedStock) return "text-orange-600";
    return "text-[#15803d]";
  };

  const getStockLabel = () => {
    if (isOutOfStock) return "Out of Stock";
    if (isComingSoon) return "Coming Soon";
    return product.stock;
  };

  const handleAddToCart = () => {
    if (isUnavailable) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    if (availableStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    addToCart(product);
    toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    if (isUnavailable) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    if (availableStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    addToCart(product);
    toast.success(`${product.name} added. Go to cart to checkout.`);
  };

  return (
    <article className="group relative rounded bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <button
        onClick={() => {
          toggleWishlist(product);

          if (isWishlisted) {
            toast.success(`${product.name} removed from wishlist`);
          } else {
            toast.success(`${product.name} added to wishlist`);
          }
        }}
        className={`absolute right-3 top-3 z-10 rounded-full bg-white p-2 shadow-sm transition ${
          isWishlisted ? "text-red-500" : "text-gray-500 hover:text-red-500"
        }`}
      >
        <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
      </button>

      {isUnavailable && (
        <div className="absolute left-3 top-3 z-10 rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white">
          {isOutOfStock ? "Out of Stock" : "Coming Soon"}
        </div>
      )}

      {!isUnavailable && isLimitedStock && (
        <div className="absolute left-3 top-3 z-10 rounded bg-orange-600 px-3 py-1 text-xs font-bold uppercase text-white">
          {isLowStock ? `Only ${availableStock} Left` : "Limited Stock"}
        </div>
      )}

      <Link
        href={`/product/${product.slug}`}
        className="relative block h-48 w-full overflow-hidden rounded-lg bg-[#fff7ed]"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className={`object-cover transition duration-300 group-hover:scale-105 ${
            isUnavailable ? "opacity-60 grayscale" : ""
          }`}
        />
      </Link>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#f97316]">
          {product.badge}
        </p>

        <Link href={`/product/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 min-h-12 text-base font-semibold text-gray-900 hover:text-[#7a1e13]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1 text-sm text-gray-500">{product.category}</p>

        <div className="mt-2 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded bg-[#15803d] px-2 py-0.5 text-xs font-bold text-white">
            {dynamicRating}
            <Star size={12} fill="white" />
          </span>

          <span className="text-xs font-medium text-gray-500">
            {dynamicReviewCount} Reviews
          </span>
        </div>

        {customerReviews.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-[#15803d]">
            {customerReviews.length} verified customer review
            {customerReviews.length !== 1 ? "s" : ""}
          </p>
        )}

        <div className="mt-3 flex items-end gap-2">
          <span className="text-xl font-bold text-gray-900">
            ₹{product.price}
          </span>

          <span className="text-sm text-gray-400 line-through">
            ₹{product.mrp}
          </span>

          <span className="text-sm font-semibold text-[#15803d]">
            {discount}% off
          </span>
        </div>

        <p className="mt-2 text-sm font-medium text-gray-600">
          {product.delivery}
        </p>

        <p className={`mt-1 text-sm font-bold ${getStockColor()}`}>
          {getStockLabel()}
        </p>

        {!isComingSoon && (
          <p
            className={`mt-1 text-xs font-semibold ${
              isLowStock ? "text-orange-600" : "text-gray-600"
            }`}
          >
            {isOutOfStock
              ? "No units available"
              : isLowStock
              ? `Only ${availableStock} unit(s) left`
              : `${availableStock} units available`}
          </p>
        )}

        {isLimitedStock && !isOutOfStock && !isComingSoon && (
          <p className="mt-1 text-xs font-semibold text-orange-600">
            Hurry! Only limited quantity available.
          </p>
        )}

        {isUnavailable && (
          <p className="mt-1 text-xs font-semibold text-red-600">
            This product cannot be added to cart right now.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isUnavailable}
            className={`rounded px-3 py-2 text-sm font-bold text-white transition ${
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
            className={`rounded px-3 py-2 text-sm font-bold text-white transition ${
              isUnavailable
                ? "cursor-not-allowed bg-gray-400"
                : "bg-[#15803d] hover:bg-[#166534]"
            }`}
          >
            BUY NOW
          </button>
        </div>
      </div>
    </article>
  );
}
