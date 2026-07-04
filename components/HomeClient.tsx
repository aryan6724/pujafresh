"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CategoryBar from "@/components/categoryBar";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types";

type HomeClientProps = {
  products: Product[];
};

type SortOption =
  | "Newest"
  | "Price Low to High"
  | "Price High to Low"
  | "Rating High to Low"
  | "Discount High to Low";

const sortOptions: SortOption[] = [
  "Newest",
  "Price Low to High",
  "Price High to Low",
  "Rating High to Low",
  "Discount High to Low",
];

// Only these are the main store/project products.
// Custom-kit internal items like Kumkum, Diya Set, Agarbatti Pack etc. will NOT show here.
const STOREFRONT_PRODUCT_SLUGS = [
  "fresh-rose-petals",
  "premium-daily-pooja-pack",
  "small-ganesh-ji-murti",
  "complete-navratri-kit",
  "kapoor-dhoop-combo",
  "fresh-genda-flowers",
  "basic-daily-pooja-pack",
];

const normalizeProduct = (item: any, index: number): Product => {
  const image = item.image || "/premium-pooja-pack.jpg";

  return {
    id: index + 1,
    name: item.name || "",
    slug: item.slug || "",
    description: item.description || "",
    price: Number(item.price || 0),
    mrp: Number(item.mrp || item.price || 0),
    image,
    badge: item.badge || "Fresh",
    category: item.category || "Pooja Essentials",
    rating: Number(item.rating || 4.8),
    reviews: Number(item.reviews || 0),
    stock: item.stock || "In Stock",
    stockQuantity: Number(item.stockQuantity || 0),
    delivery: item.delivery || "Early Morning Delivery",
    material: item.material || item.unit || "pack",
  } as Product;
};

const sortStorefrontProducts = (products: Product[]) => {
  return [...products].sort((a, b) => {
    return (
      STOREFRONT_PRODUCT_SLUGS.indexOf(a.slug) -
      STOREFRONT_PRODUCT_SLUGS.indexOf(b.slug)
    );
  });
};

export default function HomeClient({ products }: HomeClientProps) {
  const fallbackProducts = (products || []).filter((product) =>
    STOREFRONT_PRODUCT_SLUGS.includes(product.slug)
  );

  const [allProducts, setAllProducts] = useState<Product[]>(
    sortStorefrontProducts(fallbackProducts)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");

  const productsSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const fetchDatabaseProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductError("");

        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Unable to fetch products");
        }

        const databaseProducts = (data.products || [])
          .filter((item: any) => STOREFRONT_PRODUCT_SLUGS.includes(item.slug))
          .map((item: any, index: number) => normalizeProduct(item, index));

        setAllProducts(sortStorefrontProducts(databaseProducts));
      } catch (error) {
        console.error("Home products fetch error:", error);
        setProductError("Database products could not be loaded.");
        setAllProducts(sortStorefrontProducts(fallbackProducts));
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchDatabaseProducts();
  }, []);

  const getDiscountPercentage = (product: Product) => {
    if (!product.mrp || product.mrp <= product.price) return 0;
    return Math.round(((product.mrp - product.price) / product.mrp) * 100);
  };

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const filtered = allProducts.filter((product) => {
      const matchesSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search) ||
        product.badge.toLowerCase().includes(search) ||
        product.delivery.toLowerCase().includes(search) ||
        product.slug.toLowerCase().includes(search);

      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];

    if (sortBy === "Newest") {
      sorted.sort((a, b) => {
        return (
          STOREFRONT_PRODUCT_SLUGS.indexOf(a.slug) -
          STOREFRONT_PRODUCT_SLUGS.indexOf(b.slug)
        );
      });
    }

    if (sortBy === "Price Low to High") {
      sorted.sort((a, b) => a.price - b.price);
    }

    if (sortBy === "Price High to Low") {
      sorted.sort((a, b) => b.price - a.price);
    }

    if (sortBy === "Rating High to Low") {
      sorted.sort((a, b) => b.rating - a.rating);
    }

    if (sortBy === "Discount High to Low") {
      sorted.sort(
        (a, b) => getDiscountPercentage(b) - getDiscountPercentage(a)
      );
    }

    return sorted;
  }, [allProducts, searchTerm, selectedCategory, sortBy]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSortBy("Newest");
  };

  const handleShopNowClick = () => {
    clearFilters();

    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar searchValue={searchTerm} onSearchChange={setSearchTerm} />

      <CategoryBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <section className="mx-auto max-w-7xl px-4 py-5">
        <div className="rounded-xl bg-gradient-to-r from-[#7a1e13] via-[#9a3412] to-[#f97316] p-6 text-white shadow-md md:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-100">
              Early Morning Delivery
            </p>

            <h2 className="mt-2 text-3xl font-extrabold md:text-5xl">
              Fresh Pooja Flowers & Samagri Delivered Every Morning
            </h2>

            <p className="mt-4 text-base text-orange-50 md:text-lg">
              Order before 9 PM and get fresh flowers, pooja kits, murtis and
              daily essentials delivered to your home early morning.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleShopNowClick}
                className="rounded bg-white px-6 py-3 font-bold text-[#7a1e13] hover:bg-orange-50"
              >
                Shop Now
              </button>

              <Link
                href="/custom-kit"
                className="rounded border border-white px-6 py-3 font-bold text-white hover:bg-white hover:text-[#7a1e13]"
              >
                Build Custom Kit
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="products"
        ref={productsSectionRef}
        className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-10"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCategory === "All"
                ? "Best Selling Pooja Essentials"
                : selectedCategory}
            </h2>

            <p className="text-sm text-gray-600">
              {isLoadingProducts
                ? "Loading products from database..."
                : `${filteredProducts.length} product${
                    filteredProducts.length !== 1 ? "s" : ""
                  } found`}
            </p>

            {productError && (
              <p className="mt-1 text-sm font-bold text-red-600">
                {productError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="mr-2 text-sm font-bold text-gray-700">
                Sort by
              </label>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-[#7a1e13]"
              >
                {sortOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedCategory !== "All" || sortBy !== "Newest") && (
              <button
                onClick={clearFilters}
                className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13]"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">
              No products found
            </h3>

            <p className="mt-2 text-gray-600">
              Try another search term or category.
            </p>

            <button
              onClick={clearFilters}
              className="mt-6 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={`${product.slug}-${product.id}`} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
