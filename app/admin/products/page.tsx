"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type Product = {
  id: number | string;
  name: string;
  slug: string;
  category: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  image: string;
  badge: string;
  delivery: string;
  stock: string;
  stockQuantity?: number;
  description?: string;
};

const productCategories = [
  "Daily Pooja Packs",
  "Fresh Flowers",
  "Pooja Samagri",
  "Festival Kits",
  "Murtis & Idols",
  "Custom Kit",
];

const stockOptions = [
  "In Stock",
  "Limited Stock",
  "Out of Stock",
  "Coming Soon",
];

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const createUniqueSlug = (
  name: string,
  products: Product[],
  editingProductId?: number | string | null
) => {
  const baseSlug = createSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (
    products.some(
      (product) =>
        product.slug === slug &&
        String(product.id) !== String(editingProductId || "")
    )
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

const getSafeImage = (image?: string) => {
  if (image && image.trim().length > 0) return image;
  return "/premium-pooja-pack.jpg";
};

const normalizeProduct = (item: any, index: number): Product => {
  return {
    id: item.id || index + 1,
    name: item.name || "Product",
    slug: item.slug || createSlug(item.name || `product-${index + 1}`),
    category: item.category || "Daily Pooja Packs",
    price: Number(item.price || 0),
    mrp: Number(item.mrp || item.price || 0),
    rating: Number(item.rating || 4.5),
    reviews: Number(item.reviews || 0),
    image: item.image || "/premium-pooja-pack.jpg",
    badge: item.badge || "New",
    delivery: item.delivery || "Next Morning Delivery",
    stock: item.stock || "In Stock",
    stockQuantity: Number(item.stockQuantity ?? 20),
    description: item.description || "",
  };
};

type ProductFormData = {
  name: string;
  category: string;
  price: string;
  mrp: string;
  rating: string;
  reviews: string;
  image: string;
  badge: string;
  delivery: string;
  stock: string;
  stockQuantity: string;
};

type InventoryHistoryLog = {
  id: string;
  productId: number | string;
  productSlug: string;
  productName: string;
  productImage: string;
  productCategory: string;
  changeType: "Stock Reduced" | "Stock Restored" | "Manual Update";
  quantityChange: number;
  previousStock: number;
  updatedStock: number;
  reason: string;
  orderId?: string;
  createdAt: string;
  updatedBy: string;
};

const emptyForm: ProductFormData = {
  name: "",
  category: "Daily Pooja Packs",
  price: "",
  mrp: "",
  rating: "4.5",
  reviews: "0",
  image: "/premium-pooja-pack.jpg",
  badge: "New",
  delivery: "Next Morning Delivery",
  stock: "In Stock",
  stockQuantity: "20",
};

const INVENTORY_HISTORY_KEY = "pujafresh-inventory-history";

const saveInventoryHistoryLogs = (logs: InventoryHistoryLog[]) => {
  if (logs.length === 0) return;

  const savedHistory = localStorage.getItem(INVENTORY_HISTORY_KEY);
  const previousHistory = savedHistory
    ? (JSON.parse(savedHistory) as InventoryHistoryLog[])
    : [];

  localStorage.setItem(
    INVENTORY_HISTORY_KEY,
    JSON.stringify([...logs, ...previousHistory])
  );
};

export default function AdminProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [editingProductId, setEditingProductId] = useState<number | string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("All Products");

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.ok && Array.isArray(data.products)) {
        setProducts(
          data.products.map((product: any, index: number) =>
            normalizeProduct(product, index)
          )
        );
        return;
      }

      setProducts([]);
    } catch {
      setProducts([]);
      toast.error("Unable to load database products");
    }
  };

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadProducts().finally(() => {
      setIsCheckingAuth(false);
    });
  }, [router]);

  const stats = useMemo(() => {
    const inStock = products.filter(
      (product) => product.stock === "In Stock"
    ).length;

    const outOfStock = products.filter(
      (product) => product.stock === "Out of Stock"
    ).length;

    const limitedStock = products.filter(
      (product) => product.stock === "Limited Stock"
    ).length;

    return {
      total: products.length,
      inStock,
      outOfStock,
      limitedStock,
    };
  }, [products]);

  const getProductStockQuantity = (product: Product) => {
    return Number(
      product.stockQuantity ??
        (product.stock === "Out of Stock" || product.stock === "Coming Soon"
          ? 0
          : 999)
    );
  };

  const filteredProducts = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const stockQuantity = getProductStockQuantity(product);

      const matchesSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search) ||
        product.badge.toLowerCase().includes(search) ||
        product.slug.toLowerCase().includes(search) ||
        product.stock.toLowerCase().includes(search);

      const matchesStockFilter =
        stockFilter === "All Products" ||
        product.stock === stockFilter ||
        (stockFilter === "Low Stock" &&
          product.stock !== "Out of Stock" &&
          product.stock !== "Coming Soon" &&
          stockQuantity > 0 &&
          stockQuantity <= 5) ||
        (stockFilter === "Out of Stock" &&
          (product.stock === "Out of Stock" || stockQuantity <= 0));

      return matchesSearch && matchesStockFilter;
    });
  }, [products, searchQuery, stockFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStockFilter("All Products");
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (name === "stock") {
      setFormData((prev) => ({
        ...prev,
        stock: value,
        stockQuantity:
          value === "Out of Stock" || value === "Coming Soon"
            ? "0"
            : prev.stockQuantity === "0"
            ? "20"
            : prev.stockQuantity,
      }));

      return;
    }

    if (name === "stockQuantity") {
      const onlyPositiveNumber = value.replace(/\D/g, "");

      setFormData((prev) => ({
        ...prev,
        stockQuantity: onlyPositiveNumber,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearForm = () => {
    setFormData(emptyForm);
    setEditingProductId(null);
    setShowForm(false);
  };

  const handleSaveProduct = async (event: FormEvent) => {
    event.preventDefault();

    if (
      !formData.name ||
      !formData.price ||
      !formData.mrp ||
      !formData.image ||
      !formData.badge ||
      !formData.delivery
    ) {
      toast.error("Please fill all required product details");
      return;
    }

    const price = Number(formData.price);
    const mrp = Number(formData.mrp);
    const rating = Number(formData.rating);
    const reviews = Number(formData.reviews);
    const stockQuantity = Number(formData.stockQuantity || 0);

    if (price <= 0 || mrp <= 0) {
      toast.error("Price and MRP must be greater than 0");
      return;
    }

    if (price > mrp) {
      toast.error("Selling price cannot be greater than MRP");
      return;
    }

    if (stockQuantity < 0) {
      toast.error("Stock quantity cannot be negative");
      return;
    }

    const finalStockQuantity =
      formData.stock === "Out of Stock" || formData.stock === "Coming Soon"
        ? 0
        : stockQuantity;

    const slug = createUniqueSlug(formData.name, products, editingProductId);

    const payload = {
      name: formData.name,
      slug,
      category: formData.category,
      price,
      mrp,
      rating,
      reviews,
      image: formData.image,
      badge: formData.badge,
      delivery: formData.delivery,
      stock: formData.stock,
      stockQuantity: finalStockQuantity,
      description: "",
    };

    try {
      const response = await fetch(
        editingProductId
          ? `/api/admin/products/${encodeURIComponent(String(editingProductId))}`
          : "/api/admin/products",
        {
          method: editingProductId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        toast.error(data.message || "Unable to save product");
        return;
      }

      const existingProduct = editingProductId
        ? products.find((product) => String(product.id) === String(editingProductId))
        : null;

      const previousStockQuantity = existingProduct
        ? getProductStockQuantity(existingProduct)
        : 0;

      if (previousStockQuantity !== finalStockQuantity) {
        saveInventoryHistoryLogs([
          {
            id: `INV-${Date.now()}-${editingProductId || data.product?.id || slug}`,
            productId: editingProductId || data.product?.id || slug,
            productSlug: slug,
            productName: formData.name,
            productImage: formData.image,
            productCategory: formData.category,
            changeType: "Manual Update",
            quantityChange: finalStockQuantity - previousStockQuantity,
            previousStock: previousStockQuantity,
            updatedStock: finalStockQuantity,
            reason: editingProductId
              ? "Manual stock update by admin"
              : "New product stock added by admin",
            createdAt: new Date().toISOString(),
            updatedBy: "Admin",
          },
        ]);
      }

      await loadProducts();
      toast.success(editingProductId ? "Product updated successfully" : "Product added successfully");
      clearForm();
    } catch {
      toast.error("Unable to save product");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setShowForm(true);

    setFormData({
      name: product.name,
      category: product.category,
      price: String(product.price),
      mrp: String(product.mrp),
      rating: String(product.rating),
      reviews: String(product.reviews),
      image: product.image,
      badge: product.badge,
      delivery: product.delivery,
      stock: product.stock,
      stockQuantity: String(
        product.stockQuantity ??
          (product.stock === "Out of Stock" || product.stock === "Coming Soon"
            ? 0
            : 20)
      ),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleQuickStockUpdate = async (product: Product, quantityChange: number) => {
    const previousStockQuantity = getProductStockQuantity(product);
    const updatedStockQuantity = Math.max(
      previousStockQuantity + quantityChange,
      0
    );
    const finalQuantityChange = updatedStockQuantity - previousStockQuantity;

    if (finalQuantityChange === 0) {
      toast.error("Stock quantity is already 0");
      return;
    }

    const updatedStock =
      updatedStockQuantity <= 0
        ? "Out of Stock"
        : updatedStockQuantity <= 5
        ? "Limited Stock"
        : "In Stock";

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(String(product.id))}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stockQuantity: updatedStockQuantity,
            stock: updatedStock,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        toast.error(data.message || "Unable to update stock");
        return;
      }

      saveInventoryHistoryLogs([
        {
          id: `INV-${Date.now()}-${product.id}`,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          productImage: product.image,
          productCategory: product.category,
          changeType: "Manual Update",
          quantityChange: finalQuantityChange,
          previousStock: previousStockQuantity,
          updatedStock: updatedStockQuantity,
          reason:
            finalQuantityChange > 0
              ? "Quick stock increase by admin"
              : "Quick stock decrease by admin",
          createdAt: new Date().toISOString(),
          updatedBy: "Admin",
        },
      ]);

      await loadProducts();
      toast.success(
        `Stock updated from ${previousStockQuantity} to ${updatedStockQuantity}`
      );
    } catch {
      toast.error("Unable to update stock");
    }
  };

  const handleDeleteProduct = async (productId: number | string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(String(productId))}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        toast.error(data.message || "Unable to delete product");
        return;
      }

      await loadProducts();
      toast.success("Product deleted successfully");
    } catch {
      toast.error("Unable to delete product");
    }
  };

  const handleExportCurrentInventory = () => {
    if (products.length === 0) {
      toast.error("No products available to export");
      return;
    }

    const headers = [
      "Product ID",
      "Product Name",
      "Slug",
      "Category",
      "Price",
      "MRP",
      "Stock Status",
      "Stock Quantity",
      "Delivery",
    ];

    const rows = products.map((product) => [
      product.id,
      product.name,
      product.slug,
      product.category,
      product.price,
      product.mrp,
      product.stock,
      product.stockQuantity ?? getProductStockQuantity(product),
      product.delivery,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-current-inventory-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Current inventory CSV exported");
  };

  const handleResetProducts = () => {
    toast.error("Default reset is disabled after database migration. Use the seed script if you want to reset database products.");
  };

  const handleLogout = () => {
    localStorage.removeItem("pujafresh-admin-auth");
    router.push("/admin/login");
  };

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Checking admin access...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Add, edit, delete and manage PujaFresh products.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13]"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/admin/inventory-history"
              className="rounded border border-[#f97316] px-4 py-2 text-sm font-bold text-[#f97316] hover:bg-[#f97316] hover:text-white"
            >
              Inventory History
            </Link>

            <button
              onClick={handleExportCurrentInventory}
              className="rounded bg-[#0f766e] px-4 py-2 text-sm font-bold text-white hover:bg-[#115e59]"
            >
              Export Inventory
            </button>

            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingProductId(null);
                setFormData(emptyForm);
              }}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white"
            >
              {showForm ? "Hide Form" : "Add Product"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Products
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">In Stock</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.inStock}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Limited Stock
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.limitedStock}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Out of Stock</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.outOfStock}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#0f766e]/20 bg-teal-50 p-4 text-sm text-teal-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">Inventory Control</p>
              <p className="mt-1">
                Export current stock from this page, and use Inventory History
                to track every stock movement.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportCurrentInventory}
                className="rounded bg-[#0f766e] px-4 py-2 text-xs font-bold text-white hover:bg-[#115e59]"
              >
                Export Current Stock
              </button>

              <Link
                href="/admin/inventory-history"
                className="rounded bg-[#f97316] px-4 py-2 text-xs font-bold text-white hover:bg-[#ea580c]"
              >
                View Stock History
              </Link>
            </div>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSaveProduct}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProductId ? "Edit Product" : "Add New Product"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Use image path from public folder, example:
                  /premium-pooja-pack.jpg
                </p>
              </div>

              <button
                type="button"
                onClick={clearForm}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Product Name *
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Example: Fresh Rose Petals"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  {productCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Selling Price *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="49"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  MRP *
                </label>
                <input
                  type="number"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="79"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="4.5"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Reviews
                </label>
                <input
                  type="number"
                  name="reviews"
                  value={formData.reviews}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Badge *
                </label>
                <input
                  name="badge"
                  value={formData.badge}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Best Seller"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Stock *
                </label>
                <select
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  {stockOptions.map((stock) => (
                    <option key={stock}>{stock}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  name="stockQuantity"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="20"
                />

                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Out of Stock / Coming Soon products will automatically save as
                  0 quantity.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Product Image Path *
                </label>
                <input
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="/premium-pooja-pack.jpg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Delivery Text *
                </label>
                <input
                  name="delivery"
                  value={formData.delivery}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Next Morning Delivery"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              {editingProductId ? "Update Product" : "Save Product"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">All Products</h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredProducts.length} of {products.length} product
                {products.length !== 1 ? "s" : ""} shown
              </p>
            </div>

            <button
              onClick={handleResetProducts}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset Default Products
            </button>
          </div>

          <div className="mt-5 grid gap-3 rounded-lg bg-[#fff7ed] p-4 lg:grid-cols-[1fr_240px_auto]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Product
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, category, badge, slug or stock..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Stock Filter
              </label>

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Products</option>
                <option>In Stock</option>
                <option>Limited Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
                <option>Coming Soon</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!searchQuery && stockFilter === "All Products"}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] transition-all duration-300 hover:bg-[#7a1e13] hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No products found
              </h3>
              <p className="mt-2 text-gray-600">
                Add a product or reset default products.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No matching products found
              </h3>
              <p className="mt-2 text-gray-600">
                Try changing your search or stock filter.
              </p>

              <button
                onClick={clearFilters}
                className="mt-5 rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid gap-4 rounded-xl border border-gray-200 p-4 lg:grid-cols-[90px_1fr_160px_180px]"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded bg-[#fff7ed]">
                    <Image
                      src={getSafeImage(product.image)}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#f97316]">
                      {product.badge}
                    </p>

                    <h3 className="mt-1 font-bold text-gray-900">
                      {product.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {product.category}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Slug:{" "}
                      <span className="font-semibold">{product.slug}</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{product.price}
                    </p>
                    <p className="text-sm text-gray-400 line-through">
                      ₹{product.mrp}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#15803d]">
                      {product.rating} ★ / {product.reviews} reviews
                    </p>
                  </div>

                  <div>
                    <p
                      className={`text-sm font-bold ${
                        product.stock === "Out of Stock"
                          ? "text-red-600"
                          : product.stock === "Limited Stock"
                          ? "text-orange-600"
                          : "text-green-700"
                      }`}
                    >
                      {product.stock}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      Quantity: {product.stockQuantity ?? 0} units
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {product.delivery}
                    </p>

                    <div className="mt-3 rounded-lg bg-[#fff7ed] p-2">
                      <p className="text-xs font-bold text-gray-700">
                        Quick Stock Update
                      </p>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickStockUpdate(product, -1)}
                          className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          -1
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickStockUpdate(product, 1)}
                          className="rounded border border-green-200 bg-white px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-700 hover:text-white"
                        >
                          +1
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickStockUpdate(product, 10)}
                          className="rounded border border-[#7a1e13] bg-white px-2 py-1 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                        >
                          +10
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/product/${product.slug}`}
                        className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13]"
                      >
                        View
                      </Link>

                      <button
                        onClick={() => handleEditProduct(product)}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}