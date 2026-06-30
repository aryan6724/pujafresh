"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type CartProduct = Product & {
  quantity: number;
};

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const [latestProducts, setLatestProducts] = useState<Product[]>([]);

  useEffect(() => {
    setLatestProducts(getProducts());
  }, []);

  const updatedCartItems = useMemo(() => {
    return cartItems.map((item) => {
      const latestProduct = latestProducts.find(
        (product) => product.id === item.id || product.slug === item.slug
      );

      return {
        ...(latestProduct || item),
        quantity: item.quantity,
      } as CartProduct;
    });
  }, [cartItems, latestProducts]);

  const getAvailableStock = (item: CartProduct) => {
    return Number(
      item.stockQuantity ??
        (item.stock === "Out of Stock" || item.stock === "Coming Soon"
          ? 0
          : 999)
    );
  };

  const isCustomKit = (item: CartProduct) => {
    return (
      item.category === "Custom Kit" ||
      item.slug?.startsWith("custom-pooja-kit") ||
      item.badge === "Custom Kit"
    );
  };

  const getCustomKitItems = (item: CartProduct) => {
    const description = String((item as any).description || "");

    if (!isCustomKit(item) || !description) return [];

    return description
      .split(",")
      .map((kitItem) => kitItem.trim())
      .filter(Boolean);
  };

  const isUnavailableProduct = (item: CartProduct) => {
    if (isCustomKit(item)) return false;

    return (
      item.stock === "Out of Stock" ||
      item.stock === "Coming Soon" ||
      getAvailableStock(item) <= 0
    );
  };

  const isOverStockLimit = (item: CartProduct) => {
    if (isCustomKit(item)) return false;

    return !isUnavailableProduct(item) && item.quantity > getAvailableStock(item);
  };

  const availableCartItems = updatedCartItems.filter(
    (item) => !isUnavailableProduct(item)
  );

  const unavailableCartItems = updatedCartItems.filter((item) =>
    isUnavailableProduct(item)
  );

  const availableCartTotal = availableCartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const deliveryCharge =
    availableCartTotal >= 299 || availableCartTotal === 0 ? 0 : 30;

  const finalTotal = availableCartTotal + deliveryCharge;

  const hasUnavailableItems = unavailableCartItems.length > 0;
  const hasStockLimitIssues = availableCartItems.some((item) =>
    isOverStockLimit(item)
  );

  const canCheckout =
    availableCartItems.length > 0 && !hasUnavailableItems && !hasStockLimitIssues;

  const handleIncreaseQuantity = (item: CartProduct) => {
    const availableStock = getAvailableStock(item);

    if (isUnavailableProduct(item)) {
      toast.error("This product is not available right now");
      return;
    }

    if (item.quantity >= availableStock) {
      toast.error(`Only ${availableStock} unit(s) available`);
      return;
    }

    increaseQuantity(item.id);
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>

        {cartItems.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold">Your cart is empty</h2>
            <p className="mt-2 text-gray-600">
              Add fresh pooja flowers, samagri or kits to continue.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {hasUnavailableItems && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-bold">Some items are not available</p>
                  <p className="mt-1">
                    Please remove Out of Stock or Coming Soon products before
                    checkout.
                  </p>
                </div>
              )}

              {updatedCartItems.map((item) => {
                const customKit = isCustomKit(item);
                const customKitItems = getCustomKitItems(item);
                const isUnavailable = isUnavailableProduct(item);
                const availableStock = getAvailableStock(item);
                const isStockLimitReached =
                  !customKit && !isUnavailable && item.quantity >= availableStock;
                const hasStockIssue = isOverStockLimit(item);

                return (
                  <div
                    key={item.id}
                    className={`grid gap-4 rounded-xl bg-white p-4 shadow-sm md:grid-cols-[140px_1fr_auto] ${
                      isUnavailable ? "border border-red-200" : ""
                    }`}
                  >
                    <div className="relative h-36 overflow-hidden rounded-lg bg-[#fff7ed]">
                      {isUnavailable && (
                        <div className="absolute left-2 top-2 z-10 rounded bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white">
                          {item.stock}
                        </div>
                      )}

                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className={`object-cover ${
                          isUnavailable ? "opacity-60 grayscale" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {item.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {item.category}
                      </p>

                      {customKit ? (
                        <p className="mt-2 inline-flex rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold uppercase text-[#7a1e13]">
                          Custom selected kit
                        </p>
                      ) : (
                        <p
                          className={`mt-2 text-sm font-bold ${
                            isUnavailable ? "text-red-600" : "text-[#15803d]"
                          }`}
                        >
                          {item.stock}
                        </p>
                      )}

                      <p className="mt-1 text-sm font-medium text-gray-600">
                        {item.delivery}
                      </p>

                      {customKit && customKitItems.length > 0 && (
                        <div className="mt-3 rounded-lg bg-[#fff7ed] p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-[#7a1e13]">
                            Kit includes
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {customKitItems.map((kitItem) => (
                              <span
                                key={kitItem}
                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm"
                              >
                                {kitItem}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!customKit && (
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            availableStock <= 5
                              ? "text-orange-600"
                              : "text-gray-700"
                          }`}
                        >
                          Available Stock: {availableStock} units
                        </p>
                      )}

                      {hasStockIssue && (
                        <p className="mt-2 rounded bg-orange-50 p-2 text-xs font-semibold text-orange-700">
                          Your cart has {item.quantity} units, but only{" "}
                          {availableStock} units are available. Please reduce
                          quantity before checkout.
                        </p>
                      )}

                      {isUnavailable && (
                        <p className="mt-2 rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                          This product cannot be purchased right now. Please
                          remove it from cart.
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xl font-bold">₹{item.price}</span>

                        {item.mrp > item.price && (
                          <span className="text-sm text-gray-400 line-through">
                            ₹{item.mrp}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="mt-3 flex items-center gap-1 text-sm font-semibold text-red-600"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>

                    <div className="flex items-center gap-3 md:flex-col md:justify-center">
                      <div className="flex items-center overflow-hidden rounded border border-gray-300">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          disabled={isUnavailable}
                          className={`px-3 py-2 ${
                            isUnavailable
                              ? "cursor-not-allowed text-gray-400"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <Minus size={16} />
                        </button>

                        <span className="px-4 py-2 font-bold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => handleIncreaseQuantity(item)}
                          disabled={isUnavailable || isStockLimitReached}
                          className={`px-3 py-2 ${
                            isUnavailable || isStockLimitReached
                              ? "cursor-not-allowed text-gray-400"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <p className="font-bold">
                        {isUnavailable
                          ? "Not available"
                          : `₹${item.price * item.quantity}`}
                      </p>

                      {!isUnavailable && isStockLimitReached && (
                        <p className="text-center text-xs font-semibold text-orange-600">
                          Stock limit reached
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-xl bg-white p-5 shadow-sm">
              <h2 className="border-b pb-3 text-lg font-bold">
                Price Details
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Available Items</span>
                  <span>{availableCartItems.length}</span>
                </div>

                {hasUnavailableItems && (
                  <div className="flex justify-between text-red-600">
                    <span>Unavailable Items</span>
                    <span>{unavailableCartItems.length}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{availableCartTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>
                    {deliveryCharge === 0 ? (
                      <span className="font-semibold text-[#15803d]">FREE</span>
                    ) : (
                      `₹${deliveryCharge}`
                    )}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{finalTotal}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Free delivery above ₹299. Order before 9 PM for next morning
                  delivery.
                </p>

                {hasUnavailableItems && (
                  <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                    Remove unavailable products before checkout.
                  </p>
                )}

                {hasStockLimitIssues && (
                  <p className="rounded bg-orange-50 p-2 text-xs font-semibold text-orange-700">
                    Some item quantities are higher than available stock. Please
                    reduce quantity before checkout.
                  </p>
                )}

                {availableCartItems.length === 0 && (
                  <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                    No available product in cart.
                  </p>
                )}

                {canCheckout ? (
                  <Link
                    href="/checkout"
                    className="block w-full rounded bg-[#15803d] py-3 text-center font-bold text-white hover:bg-[#166534]"
                  >
                    PROCEED TO CHECKOUT
                  </Link>
                ) : (
                  <button
                    disabled
                    className="block w-full cursor-not-allowed rounded bg-gray-400 py-3 text-center font-bold text-white"
                  >
                    PROCEED TO CHECKOUT
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}