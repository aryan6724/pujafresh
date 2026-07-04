"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";

type KitItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  imageAlt: string;
};

const kitItems: KitItem[] = [
  {
    id: 1,
    name: "Fresh Marigold Flowers",
    price: 80,
    category: "Flowers",
    image:
      "/custom-kit/marigold.png",
    imageAlt: "Fresh marigold flowers",
  },
  {
    id: 2,
    name: "Fresh Rose Petals",
    price: 60,
    category: "Flowers",
    image:
      "/custom-kit/rose-petals.png",
    imageAlt: "Fresh rose petals",
  },
  {
    id: 3,
    name: "Agarbatti Pack",
    price: 40,
    category: "Samagri",
    image:
      "/custom-kit/agarbatti.png",
    imageAlt: "Agarbatti incense sticks",
  },
  {
    id: 4,
    name: "Diya Set",
    price: 50,
    category: "Samagri",
    image:
      "/custom-kit/diya-set.png",
    imageAlt: "Diya set",
  },
  {
    id: 5,
    name: "Kumkum",
    price: 25,
    category: "Samagri",
    image:
      "/custom-kit/kumkum.png",
    imageAlt: "Kumkum powder",
  },
  {
    id: 6,
    name: "Roli Chawal Pack",
    price: 35,
    category: "Samagri",
    image:
      "/custom-kit/roli-chawal.png",
    imageAlt: "Rice grains for pooja",
  },
  {
    id: 7,
    name: "Camphor / Kapoor",
    price: 45,
    category: "Samagri",
    image:
      "/custom-kit/kapoor.png",
    imageAlt: "Camphor and pooja samagri",
  },
  {
    id: 8,
    name: "Coconut",
    price: 55,
    category: "Essentials",
    image:
      "/custom-kit/coconut.png",
    imageAlt: "Fresh coconut",
  },
  {
    id: 9,
    name: "Pooja Thali Items",
    price: 120,
    category: "Essentials",
    image:
      "/custom-kit/pooja-thali.png",
    imageAlt: "Pooja thali items",
  },
  {
    id: 10,
    name: "Prasad Pack",
    price: 90,
    category: "Essentials",
    image:
      "/custom-kit/prasad-pack.png",
    imageAlt: "Prasad sweets",
  },
];

type KitPreset = {
  id: string;
  name: string;
  description: string;
  badge: string;
  items: Record<number, number>;
};

const kitPresets: KitPreset[] = [
  {
    id: "daily",
    name: "Daily Puja Kit",
    description: "Simple daily morning puja essentials.",
    badge: "Daily",
    items: {
      1: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
    },
  },
  {
    id: "complete",
    name: "Complete Home Puja Kit",
    description: "Balanced kit with flowers, diya, roli, chawal and prasad.",
    badge: "Popular",
    items: {
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
      7: 1,
      10: 1,
    },
  },
  {
    id: "festival",
    name: "Festival Special Kit",
    description: "Premium kit for festive pooja and special occasions.",
    badge: "Premium",
    items: {
      1: 2,
      2: 2,
      3: 1,
      4: 2,
      5: 1,
      6: 1,
      7: 1,
      8: 1,
      9: 1,
      10: 2,
    },
  },
];

export default function CustomKitPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [activePresetId, setActivePresetId] = useState("");

  const selectedKitItems = useMemo(() => {
    return kitItems
      .map((item) => ({
        ...item,
        quantity: selectedItems[item.id] || 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [selectedItems]);

  const kitTotal = selectedKitItems.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  const totalQuantity = selectedKitItems.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const updateQuantity = (itemId: number, quantity: number) => {
    setActivePresetId("");

    setSelectedItems((prev) => {
      const updatedItems = { ...prev };

      if (quantity <= 0) {
        delete updatedItems[itemId];
      } else {
        updatedItems[itemId] = quantity;
      }

      return updatedItems;
    });
  };

  const applyPreset = (preset: KitPreset) => {
    setSelectedItems(preset.items);
    setActivePresetId(preset.id);
    toast.success(`${preset.name} selected`);
  };

  const clearKit = () => {
    setSelectedItems({});
    setActivePresetId("");
    toast.success("Custom kit cleared");
  };

  const handleAddKitToCart = () => {
    if (selectedKitItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    const kitTimestamp = Date.now();
    const kitName = `Custom Pooja Kit (${selectedKitItems.length} items)`;

    const customKitProduct = {
      id: kitTimestamp,
      name: kitName,
      slug: `custom-pooja-kit-${kitTimestamp}`,
      category: "Custom Kit",
      price: kitTotal,
      mrp: kitTotal,
      // Keep this image local because Cart page may use next/image.
      image: "/premium-pooja-pack.jpg",
      badge: "Custom Kit",
      description: selectedKitItems
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(", "),
      rating: 5,
      reviews: 0,
      stock: "In Stock",
      stockQuantity: 999,
      delivery: "Early Morning Delivery",
      material: "Fresh pooja essentials",
    } as unknown as Product;

    addToCart(customKitProduct);

    try {
      const savedKits = localStorage.getItem("pujafresh-custom-kits");
      const previousKits = savedKits ? JSON.parse(savedKits) : [];

      localStorage.setItem(
        "pujafresh-custom-kits",
        JSON.stringify([
          {
            id: customKitProduct.id,
            name: kitName,
            slug: customKitProduct.slug,
            items: selectedKitItems,
            total: kitTotal,
            createdAt: new Date().toISOString(),
          },
          ...(Array.isArray(previousKits) ? previousKits : []),
        ])
      );
    } catch {
      // Cart item is already added, so ignore old custom-kit storage issues.
    }

    toast.success("Custom kit added to cart");
    router.push("/cart");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            Build Your Own Kit
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Custom Pooja Kit
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Select flowers, agarbatti, diya, kumkum, prasad and other pooja
            essentials to build your own kit for early morning delivery.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/#products"
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Shop Products
            </Link>

            <Link
              href="/cart"
              className="rounded border border-white px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
            >
              Open Cart
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Select Kit Items
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Choose items manually or use a ready-made preset kit.
                </p>
              </div>

              {selectedKitItems.length > 0 && (
                <button
                  onClick={clearKit}
                  className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Clear Kit
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {kitPresets.map((preset) => {
                const isActive = activePresetId === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`rounded-xl border p-4 text-left transition hover:-translate-y-1 hover:shadow-md ${
                      isActive
                        ? "border-[#7a1e13] bg-[#fff7ed]"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="rounded bg-[#7a1e13] px-2 py-1 text-[11px] font-black uppercase text-white">
                      {preset.badge}
                    </span>

                    <h3 className="mt-3 font-black text-gray-900">
                      {preset.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {kitItems.map((item) => {
                const quantity = selectedItems[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff7ed] p-2">
                      <img
                        src={item.image}
                        alt={item.imageAlt}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src =
                            "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=500&q=80";
                        }}
                      />
                    </div>

                    <div className="flex flex-1 items-center justify-between gap-3">
                      <div>
                        <p className="inline-flex rounded bg-[#fff7ed] px-2 py-1 text-[11px] font-black uppercase text-[#7a1e13]">
                          {item.category}
                        </p>

                        <h3 className="mt-2 text-base font-black text-gray-900">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-xl font-black text-[#7a1e13]">
                          ₹{item.price}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                          className="h-9 w-9 rounded bg-gray-100 text-lg font-black text-gray-700 hover:bg-gray-900 hover:text-white"
                        >
                          -
                        </button>

                        <span className="w-8 text-center font-black">
                          {quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          className="h-9 w-9 rounded bg-[#7a1e13] text-lg font-black text-white hover:bg-[#64180f]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-xl bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-xl font-black text-gray-900">Kit Summary</h2>

            {activePresetId && (
              <p className="mt-2 rounded bg-[#fff7ed] px-3 py-2 text-sm font-bold text-[#7a1e13]">
                Preset selected:{" "}
                {kitPresets.find((preset) => preset.id === activePresetId)?.name}
              </p>
            )}

            {selectedKitItems.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No item selected yet. Add items from the left side.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {selectedKitItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded bg-gray-50 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.imageAlt}
                        className="h-12 w-12 rounded bg-[#fff7ed] object-contain p-1"
                        loading="lazy"
                      />

                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          ₹{item.price} x {item.quantity}
                        </p>
                      </div>
                    </div>

                    <p className="font-black text-[#7a1e13]">
                      ₹{item.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-xl bg-[#fff7ed] p-4">
              <p className="text-sm font-bold text-gray-600">Total Items</p>
              <h3 className="text-2xl font-black text-gray-900">
                {totalQuantity}
              </h3>

              <p className="mt-3 text-sm font-bold text-gray-600">Kit Total</p>
              <h3 className="text-3xl font-black text-[#7a1e13]">
                ₹{kitTotal}
              </h3>
            </div>

            <button
              onClick={handleAddKitToCart}
              className="mt-5 w-full rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
            >
              Add Custom Kit to Cart
            </button>

            <Link
              href="/checkout"
              className="mt-3 block rounded border border-[#7a1e13] px-5 py-3 text-center text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Go to Checkout
            </Link>

            {selectedKitItems.length > 0 && (
              <button
                onClick={clearKit}
                className="mt-3 w-full rounded border border-red-600 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Clear Selection
              </button>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
