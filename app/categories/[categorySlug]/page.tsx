"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type CategoryPageData = {
  title: string;
  subtitle: string;
  description: string;
  categoryNames: string[];
};

const categoryPages: Record<string, CategoryPageData> = {
  "fresh-flowers": {
    title: "Fresh Flowers",
    subtitle: "Fresh flowers for daily pooja and home mandir decoration.",
    description:
      "Explore fresh genda flowers, rose petals and selected pooja flowers packed cleanly for early morning delivery.",
    categoryNames: ["Fresh Flowers"],
  },
  "pooja-samagri": {
    title: "Pooja Samagri",
    subtitle: "Essential samagri for daily rituals and festivals.",
    description:
      "Find kapoor, dhoop, agarbatti, roli, chawal, cotton batti and other useful pooja essentials.",
    categoryNames: ["Pooja Samagri"],
  },
  "daily-packs": {
    title: "Daily Pooja Packs",
    subtitle: "Ready-to-use packs for everyday worship.",
    description:
      "Save time with complete daily pooja packs containing flowers, roli, chawal, kapoor and other essentials.",
    categoryNames: ["Daily Pooja Packs", "Daily Packs"],
  },
  "festival-kits": {
    title: "Festival Kits",
    subtitle: "Complete kits for special festivals and occasions.",
    description:
      "Festival-ready pooja kits for Navratri, Ganesh Chaturthi and other devotional occasions.",
    categoryNames: ["Festival Kits"],
  },
  murtis: {
    title: "Murtis",
    subtitle: "Devotional murtis for your home mandir.",
    description:
      "Explore carefully packed murtis suitable for home mandir, gifting and festive worship.",
    categoryNames: ["Murtis"],
  },
  subscriptions: {
    title: "Subscriptions",
    subtitle: "Daily and weekly pooja essentials delivered regularly.",
    description:
      "Set up regular delivery for daily pooja packs and fresh flowers so your home mandir stays ready every morning.",
    categoryNames: ["Subscriptions"],
  },
};

const categoryLinks = [
  { label: "Fresh Flowers", href: "/categories/fresh-flowers" },
  { label: "Pooja Samagri", href: "/categories/pooja-samagri" },
  { label: "Daily Packs", href: "/categories/daily-packs" },
  { label: "Festival Kits", href: "/categories/festival-kits" },
  { label: "Murtis", href: "/categories/murtis" },
  { label: "Subscriptions", href: "/categories/subscriptions" },
];

export default function CategoryPage() {
  const params = useParams<{ categorySlug: string }>();
  const categorySlug = params.categorySlug;

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const pageData = categoryPages[categorySlug];

  const categoryProducts = useMemo(() => {
    if (!pageData) return [];

    return products.filter((product) =>
      pageData.categoryNames.includes(product.category)
    );
  }, [products, pageData]);

  if (!pageData) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-gray-900">
              Category Not Found
            </h1>

            <p className="mt-3 text-gray-600">
              The category you are looking for does not exist.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
              PujaFresh Category
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              {pageData.title}
            </h1>

            <p className="mt-4 text-lg font-semibold text-orange-50">
              {pageData.subtitle}
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-50">
              {pageData.description}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
            Shop By Category
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {categoryLinks.map((category) => {
              const isActive = category.href.endsWith(categorySlug);

              return (
                <Link
                  key={category.href}
                  href={category.href}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? "border-[#7a1e13] bg-[#7a1e13] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                  }`}
                >
                  {category.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {pageData.title}
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {categoryProducts.length} product
              {categoryProducts.length !== 1 ? "s" : ""} available
            </p>
          </div>

          <Link
            href="/"
            className="rounded border border-[#7a1e13] px-5 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
          >
            Back to Store
          </Link>
        </div>

        {categoryProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h3 className="text-xl font-black text-gray-900">
              No products available yet
            </h3>

            <p className="mt-2 text-gray-600">
              Products for this category will appear here after they are added.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}