"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistPage() {
  const { addToCart } = useCart();
  const { wishlistItems, removeFromWishlist } = useWishlist();

  const handleMoveToCart = (productId: number) => {
    const product = wishlistItems.find((item) => item.id === productId);

    if (!product) return;

    const isUnavailable =
      product.stock === "Out of Stock" || product.stock === "Coming Soon";

    if (isUnavailable) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    addToCart(product);
    removeFromWishlist(product.id);
    toast.success(`${product.name} moved to cart`);
  };

  const handleRemove = (productId: number, productName: string) => {
    removeFromWishlist(productId);
    toast.success(`${productName} removed from wishlist`);
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Heart className="text-red-500" fill="currentColor" />
              My Wishlist
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              {wishlistItems.length} product
              {wishlistItems.length !== 1 ? "s" : ""} saved for later.
            </p>
          </div>

          <Link
            href="/"
            className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
          >
            Continue Shopping
          </Link>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <Heart className="text-red-500" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              Your wishlist is empty
            </h2>

            <p className="mt-2 text-gray-600">
              Save your favourite pooja essentials here and buy them later.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wishlistItems.map((product) => {
              const discount = Math.round(
                ((product.mrp - product.price) / product.mrp) * 100
              );

              const isUnavailable =
                product.stock === "Out of Stock" ||
                product.stock === "Coming Soon";

              return (
                <article
                  key={product.id}
                  className="rounded-xl bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    className="relative block h-48 overflow-hidden rounded-lg bg-[#fff7ed]"
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className={`object-cover transition hover:scale-105 ${
                        isUnavailable ? "opacity-60 grayscale" : ""
                      }`}
                    />
                  </Link>

                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#f97316]">
                      {product.badge}
                    </p>

                    <Link href={`/product/${product.slug}`}>
                      <h2 className="mt-1 line-clamp-2 min-h-12 font-bold text-gray-900 hover:text-[#7a1e13]">
                        {product.name}
                      </h2>
                    </Link>

                    <p className="mt-1 text-sm text-gray-500">
                      {product.category}
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        ₹{product.price}
                      </span>

                      <span className="text-sm text-gray-400 line-through">
                        ₹{product.mrp}
                      </span>

                      <span className="text-sm font-bold text-[#15803d]">
                        {discount}% off
                      </span>
                    </div>

                    <p
                      className={`mt-2 text-sm font-bold ${
                        isUnavailable ? "text-red-600" : "text-[#15803d]"
                      }`}
                    >
                      {product.stock}
                    </p>

                    {isUnavailable && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        This product cannot be moved to cart right now.
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleMoveToCart(product.id)}
                        disabled={isUnavailable}
                        className={`flex items-center justify-center gap-1 rounded px-3 py-2 text-sm font-bold text-white ${
                          isUnavailable
                            ? "cursor-not-allowed bg-gray-400"
                            : "bg-[#15803d] hover:bg-[#166534]"
                        }`}
                      >
                        <ShoppingCart size={16} />
                        Move to Cart
                      </button>

                      <button
                        onClick={() => handleRemove(product.id, product.name)}
                        className="flex items-center justify-center gap-1 rounded border border-red-600 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}