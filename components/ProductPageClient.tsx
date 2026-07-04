"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProductDetailsClient from "@/components/ProductDetailsClient";
import { Product } from "@/types";

type ProductPageClientProps = {
  slug: string;
};

const normalizeSlug = (value: string) => {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const makeProductForFrontend = (item: any): Product => {
  const image = item.image || "/premium-pooja-pack.jpg";

  return {
    id: 1,
    name: item.name || "",
    slug: item.slug || normalizeSlug(item.name || ""),
    description: item.description || "",
    price: Number(item.price || 0),
    mrp: Number(item.mrp || item.price || 0),
    image,
    images:
      Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [image],
    badge: item.badge || "Fresh",
    category: item.category || "Pooja Essentials",
    rating: Number(item.rating || 4.8),
    reviews: Number(item.reviews || 0),
    stock: item.stock || "In Stock",
    stockQuantity: Number(item.stockQuantity || 0),
    delivery: item.delivery || "Early morning delivery",
    material: item.material || item.unit || "pack",
  } as Product;
};

export default function ProductPageClient({ slug }: ProductPageClientProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [availableSlugs, setAvailableSlugs] = useState<string[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setAvailableSlugs([]);

        const requestedSlug = normalizeSlug(slug);

        const response = await fetch(`/api/products/${requestedSlug}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.ok || !data.product) {
          setProduct(null);
          setErrorMessage(data.message || "Product not found.");
          setAvailableSlugs(Array.isArray(data.availableSlugs) ? data.availableSlugs : []);
          return;
        }

        setProduct(makeProductForFrontend(data.product));
      } catch (error) {
        console.error("Product details fetch error:", error);
        setProduct(null);
        setErrorMessage("Unable to load product details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">
              Loading product...
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Fetching product details from database.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Product not found
            </h1>

            <p className="mt-2 text-gray-600">
              {errorMessage || "This product is not available right now."}
            </p>

            {availableSlugs.length > 0 && (
              <div className="mt-5 rounded bg-[#fff7ed] p-4 text-left">
                <p className="text-sm font-bold text-gray-900">
                  Available product slugs:
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {availableSlugs.map((availableSlug) => (
                    <Link
                      key={availableSlug}
                      href={`/product/${availableSlug}`}
                      className="rounded bg-white px-3 py-2 text-xs font-bold text-[#7a1e13] shadow-sm"
                    >
                      {availableSlug}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Back to Store
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <ProductDetailsClient product={product} relatedProducts={[]} />;
}
