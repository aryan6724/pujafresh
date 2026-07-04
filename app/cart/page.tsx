"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const getSafeImage = (image: unknown) => {
  const value = String(image || "").trim();

  if (value.length > 0) {
    return value;
  }

  return "/premium-pooja-pack.jpg";
};

const isCustomKitItem = (item: any) => {
  return (
    item?.category === "Custom Kit" ||
    item?.badge === "Custom Kit" ||
    String(item?.slug || "").startsWith("custom-pooja-kit")
  );
};

const getAvailableStock = (item: any) => {
  if (isCustomKitItem(item)) return null;

  return Number(
    item?.stockQuantity ??
      (item?.stock === "Out of Stock" || item?.stock === "Coming Soon"
        ? 0
        : 999)
  );
};

const getCartActionId = (item: any, index: number) => {
  const numericId = Number(item?.id);

  if (Number.isFinite(numericId) && numericId > 0) return numericId;

  return index + 1;
};

export default function CartPage() {
  const auth = useAuth() as any;
  const cart = useCart() as any;

  const isLoggedIn = Boolean(auth?.isLoggedIn);
  const cartItems = Array.isArray(cart?.cartItems) ? cart.cartItems : [];

  const removeFromCart = cart?.removeFromCart;
  const increaseQuantity = cart?.increaseQuantity;
  const decreaseQuantity = cart?.decreaseQuantity;
  const clearCart = cart?.clearCart;

  let cartCount = 0;
  let cartTotal = 0;

  for (const item of cartItems) {
    cartCount = cartCount + Number(item?.quantity || 0);
    cartTotal = cartTotal + Number(item?.price || 0) * Number(item?.quantity || 0);
  }

  const availableCartItems = cartItems.filter((item: any) => {
    return item?.stock !== "Out of Stock" && item?.stock !== "Coming Soon";
  });

  const hasUnavailableItems = availableCartItems.length !== cartItems.length;

  const deliveryCharge = cartTotal >= 299 || cartTotal === 0 ? 0 : 30;
  const finalTotal = cartTotal + deliveryCharge;

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-gray-900">My Cart</h1>

            <p className="mt-1 text-sm text-gray-600">
              {cartCount > 0
                ? `${cartCount} item${cartCount !== 1 ? "s" : ""} in your cart`
                : "Your cart is currently empty"}
            </p>
          </div>

          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={() => clearCart?.()}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              Clear Cart
            </button>
          )}
        </div>

        {!isLoggedIn && cartItems.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Please login to view your cart
            </h2>

            <p className="mt-2 text-gray-600">
              Your cart is saved safely after login.
            </p>

            <Link
              href="/login?callbackUrl=/cart"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Login
            </Link>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Your cart is empty
            </h2>

            <p className="mt-2 text-gray-600">
              Add fresh flowers, pooja samagri, or custom kits to continue.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              {cartItems.map((item: any, index: number) => {
                const itemId = getCartActionId(item, index);
                const quantity = Number(item?.quantity || 1);
                const price = Number(item?.price || 0);
                const mrp = Number(item?.mrp || 0);
                const lineTotal = price * quantity;
                const stockQuantity = getAvailableStock(item);
                const isUnavailable =
                  item?.stock === "Out of Stock" || item?.stock === "Coming Soon";
                const isCustomKit = isCustomKitItem(item);

                const customKitItems =
                  isCustomKit && item?.description
                    ? String(item.description)
                        .split(",")
                        .map((kitItem) => kitItem.trim())
                        .filter(Boolean)
                    : [];

                return (
                  <div
                    key={`${item?.slug || "cart-item"}-${itemId}-${index}`}
                    className="rounded-xl bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-4 md:grid-cols-[160px_1fr_180px]">
                      <div className="h-40 overflow-hidden rounded-lg bg-[#fff7ed]">
                        <img
                          src={getSafeImage(item?.image)}
                          alt={String(item?.name || "Cart item")}
                          className="h-full w-full object-contain p-2"
                          onError={(event) => {
                            event.currentTarget.src = "/premium-pooja-pack.jpg";
                          }}
                        />
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-gray-900">
                          {item?.name || "Product"}
                        </h2>

                        <p className="mt-1 text-gray-600">
                          {item?.category || "Pooja Essentials"}
                        </p>

                        <p
                          className={`mt-3 text-sm font-bold ${
                            isUnavailable ? "text-red-600" : "text-[#15803d]"
                          }`}
                        >
                          {item?.stock || "In Stock"}
                        </p>

                        <p className="mt-2 text-sm text-gray-700">
                          {item?.delivery || "Early morning delivery"}
                        </p>

                        {stockQuantity !== null && (
                          <p className="mt-1 text-sm font-bold text-gray-800">
                            Available Stock: {stockQuantity} units
                          </p>
                        )}

                        {customKitItems.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {customKitItems.slice(0, 8).map((kitItem) => (
                              <span
                                key={kitItem}
                                className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]"
                              >
                                {kitItem}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="text-2xl font-black text-gray-900">
                            ₹{price}
                          </span>

                          {mrp > price && (
                            <span className="text-sm text-gray-400 line-through">
                              ₹{mrp}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart?.(itemId)}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-red-600"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>

                      <div className="flex flex-col items-end justify-center gap-5">
                        <div className="flex overflow-hidden rounded border border-gray-300">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity?.(itemId)}
                            className="px-4 py-3 hover:bg-gray-100"
                          >
                            <Minus size={16} />
                          </button>

                          <span className="min-w-12 px-4 py-3 text-center font-black">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => increaseQuantity?.(itemId)}
                            disabled={
                              stockQuantity !== null && quantity >= stockQuantity
                            }
                            className="px-4 py-3 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <p className="text-xl font-black text-gray-900">
                          ₹{lineTotal}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Price Details
              </h2>

              <div className="mt-4 space-y-3 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span>Available Items</span>
                  <span>{availableCartItems.length}</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
                </div>

                <div className="flex justify-between border-t pt-3 text-lg font-black">
                  <span>Total Payable</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>

              {hasUnavailableItems && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                  Remove out-of-stock or coming-soon items before checkout.
                </div>
              )}

              {hasUnavailableItems ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 block w-full cursor-not-allowed rounded bg-gray-400 px-6 py-3 text-center font-black text-white"
                >
                  Checkout Disabled
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="mt-6 block rounded bg-[#7a1e13] px-6 py-3 text-center font-black text-white hover:bg-[#5f160e]"
                >
                  Proceed to Checkout
                </Link>
              )}

              <Link
                href="/"
                className="mt-3 block rounded border border-[#7a1e13] px-6 py-3 text-center font-black text-[#7a1e13]"
              >
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

