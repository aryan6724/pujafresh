"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProductDetailsClient from "@/components/ProductDetailsClient";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type ProductPageClientProps = {
  slug: string;
};

export default function ProductPageClient({ slug }: ProductPageClientProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const allProducts = getProducts();
    const matchedProduct = allProducts.find((item) => item.slug === slug);

    if (!matchedProduct) {
      setProduct(null);
      setRelatedProducts([]);
      setIsLoading(false);
      return;
    }

    const sameCategoryProducts = allProducts.filter(
      (item) =>
        item.category === matchedProduct.category &&
        item.id !== matchedProduct.id
    );

    const fallbackProducts = allProducts.filter(
      (item) =>
        item.id !== matchedProduct.id &&
        !sameCategoryProducts.some(
          (relatedItem) => relatedItem.id === item.id
        )
    );

    const finalRelatedProducts = [
      ...sameCategoryProducts,
      ...fallbackProducts,
    ].slice(0, 4);

    setProduct(matchedProduct);
    setRelatedProducts(finalRelatedProducts);
    setIsLoading(false);
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
          </div>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Product not found
            </h1>

            <p className="mt-2 text-gray-600">
              This product is not available right now.
            </p>

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

  return (
    <ProductDetailsClient
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}