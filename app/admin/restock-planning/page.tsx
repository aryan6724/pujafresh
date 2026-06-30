"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Product } from "@/types";
import { getProducts, saveProducts } from "@/utils/productStorage";

type RestockRow = Product & {
  currentStockQuantity: number;
  suggestedRestockQuantity: number;
  estimatedStockAfterRestock: number;
};

type InventoryHistoryLog = {
  id: string;
  productId: number;
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

const filterOptions = [
  "All Products",
  "Need Restock",
  "Low Stock",
  "Out of Stock",
  "Coming Soon",
];

export default function RestockPlanningPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [targetStock, setTargetStock] = useState("20");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("Need Restock");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setProducts(getProducts());
    setIsCheckingAuth(false);
  }, [router]);

  const targetStockNumber = Math.max(Number(targetStock || 0), 0);

  const getProductStockQuantity = (product: Product) => {
    return Number(
      product.stockQuantity ??
        (product.stock === "Out of Stock" || product.stock === "Coming Soon"
          ? 0
          : 999)
    );
  };

  const restockRows = useMemo<RestockRow[]>(() => {
    return products.map((product) => {
      const currentStockQuantity = getProductStockQuantity(product);
      const suggestedRestockQuantity = Math.max(
        targetStockNumber - currentStockQuantity,
        0
      );

      return {
        ...product,
        currentStockQuantity,
        suggestedRestockQuantity,
        estimatedStockAfterRestock:
          currentStockQuantity + suggestedRestockQuantity,
      };
    });
  }, [products, targetStockNumber]);

  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return restockRows.filter((product) => {
      const matchesSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search) ||
        product.slug.toLowerCase().includes(search) ||
        product.stock.toLowerCase().includes(search);

      const isLowStock =
        product.stock !== "Out of Stock" &&
        product.stock !== "Coming Soon" &&
        product.currentStockQuantity > 0 &&
        product.currentStockQuantity <= 5;

      const isOutOfStock =
        product.stock === "Out of Stock" || product.currentStockQuantity <= 0;

      const needsRestock = product.suggestedRestockQuantity > 0;

      const matchesFilter =
        stockFilter === "All Products" ||
        (stockFilter === "Need Restock" && needsRestock) ||
        (stockFilter === "Low Stock" && isLowStock) ||
        (stockFilter === "Out of Stock" && isOutOfStock) ||
        (stockFilter === "Coming Soon" && product.stock === "Coming Soon");

      return matchesSearch && matchesFilter;
    });
  }, [restockRows, searchQuery, stockFilter]);

  const stats = useMemo(() => {
    const needRestock = restockRows.filter(
      (product) => product.suggestedRestockQuantity > 0
    );

    const totalSuggestedUnits = needRestock.reduce(
      (sum, product) => sum + product.suggestedRestockQuantity,
      0
    );

    const lowStockProducts = restockRows.filter(
      (product) =>
        product.stock !== "Out of Stock" &&
        product.stock !== "Coming Soon" &&
        product.currentStockQuantity > 0 &&
        product.currentStockQuantity <= 5
    ).length;

    const outOfStockProducts = restockRows.filter(
      (product) =>
        product.stock === "Out of Stock" || product.currentStockQuantity <= 0
    ).length;

    return {
      totalProducts: products.length,
      needRestock: needRestock.length,
      lowStockProducts,
      outOfStockProducts,
      totalSuggestedUnits,
    };
  }, [products.length, restockRows]);

  const getUpdatedStockStatus = (stockQuantity: number) => {
    if (stockQuantity <= 0) return "Out of Stock";
    if (stockQuantity <= 5) return "Limited Stock";
    return "In Stock";
  };

  const handleApplyRestock = (product: RestockRow) => {
    if (product.suggestedRestockQuantity <= 0) {
      toast.error("This product does not need restock");
      return;
    }

    const confirmRestock = window.confirm(
      `Restock ${product.name} by ${product.suggestedRestockQuantity} unit(s)?`
    );

    if (!confirmRestock) return;

    const updatedStockQuantity =
      product.currentStockQuantity + product.suggestedRestockQuantity;

    const updatedProducts = products.map((item) =>
      item.id === product.id
        ? {
            ...item,
            stockQuantity: updatedStockQuantity,
            stock: getUpdatedStockStatus(updatedStockQuantity),
          }
        : item
    );

    const now = new Date().toISOString();

    saveProducts(updatedProducts);
    saveInventoryHistoryLogs([
      {
        id: `INV-${Date.now()}-${product.id}`,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productImage: product.image,
        productCategory: product.category,
        changeType: "Manual Update",
        quantityChange: product.suggestedRestockQuantity,
        previousStock: product.currentStockQuantity,
        updatedStock: updatedStockQuantity,
        reason: "Restock plan applied by admin",
        createdAt: now,
        updatedBy: "Admin",
      },
    ]);

    setProducts(updatedProducts);
    toast.success(`${product.name} restocked successfully`);
  };

  const handleApplyAllRestock = () => {
    const productsNeedingRestock = restockRows.filter(
      (product) => product.suggestedRestockQuantity > 0
    );

    if (productsNeedingRestock.length === 0) {
      toast.error("No products need restock");
      return;
    }

    const confirmRestock = window.confirm(
      `Apply suggested restock to ${productsNeedingRestock.length} product(s)?`
    );

    if (!confirmRestock) return;

    const now = new Date().toISOString();
    const historyLogs: InventoryHistoryLog[] = [];

    const updatedProducts = products.map((product) => {
      const restockProduct = productsNeedingRestock.find(
        (item) => item.id === product.id
      );

      if (!restockProduct) {
        return product;
      }

      const updatedStockQuantity =
        restockProduct.currentStockQuantity +
        restockProduct.suggestedRestockQuantity;

      historyLogs.push({
        id: `INV-${Date.now()}-${product.id}`,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productImage: product.image,
        productCategory: product.category,
        changeType: "Manual Update",
        quantityChange: restockProduct.suggestedRestockQuantity,
        previousStock: restockProduct.currentStockQuantity,
        updatedStock: updatedStockQuantity,
        reason: "Bulk restock plan applied by admin",
        createdAt: now,
        updatedBy: "Admin",
      });

      return {
        ...product,
        stockQuantity: updatedStockQuantity,
        stock: getUpdatedStockStatus(updatedStockQuantity),
      };
    });

    saveProducts(updatedProducts);
    saveInventoryHistoryLogs(historyLogs);
    setProducts(updatedProducts);

    toast.success("Suggested restock applied successfully");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStockFilter("Need Restock");
  };

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.error("No restock data to export");
      return;
    }

    const headers = [
      "Product ID",
      "Product Name",
      "Category",
      "Stock Status",
      "Current Stock",
      "Target Stock",
      "Suggested Restock Quantity",
      "Estimated Stock After Restock",
    ];

    const rows = filteredRows.map((product) => [
      product.id,
      product.name,
      product.category,
      product.stock,
      product.currentStockQuantity,
      targetStockNumber,
      product.suggestedRestockQuantity,
      product.estimatedStockAfterRestock,
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
    link.download = `pujafresh-restock-plan-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Restock plan CSV exported");
  };

  const handlePrint = () => {
    window.print();
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
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Restock Planning
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Plan how many units should be restocked based on your target stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <Link
              href="/admin/products"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Manage Stock
            </Link>

            <button
              onClick={handlePrint}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Print Plan
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleApplyAllRestock}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Apply All Restock
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-gray-900">
            PujaFresh Restock Plan
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Target stock: {targetStockNumber} units per product
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Products
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalProducts}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Need Restock
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.needRestock}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Low Stock</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.lowStockProducts}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Out of Stock
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.outOfStockProducts}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Suggested Units
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#15803d]">
              {stats.totalSuggestedUnits}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 lg:grid-cols-[1fr_180px_220px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Product
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by product, category, slug or stock..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Target Stock
              </label>

              <input
                type="number"
                min="0"
                value={targetStock}
                onChange={(event) =>
                  setTargetStock(event.target.value.replace(/\D/g, ""))
                }
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
                {filterOptions.map((filter) => (
                  <option key={filter}>{filter}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredRows.length} product
            {filteredRows.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No products found
              </h2>

              <p className="mt-2 text-gray-600">
                Try changing your stock filter, search query or target stock.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Product</th>
                    <th className="p-3">Stock Status</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Suggested Restock</th>
                    <th className="p-3">After Restock</th>
                    <th className="p-3 print:hidden">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((product) => (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded bg-[#fff7ed]">
                            <Image
                              src={product.image || "/basic-pooja-pack.jpg"}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div>
                            <p className="font-bold text-gray-900">
                              {product.name}
                            </p>

                            <p className="text-xs text-gray-500">
                              {product.category}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.stock === "Out of Stock"
                              ? "bg-red-50 text-red-700"
                              : product.stock === "Limited Stock"
                              ? "bg-orange-50 text-orange-700"
                              : product.stock === "Coming Soon"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        {product.currentStockQuantity}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        {targetStockNumber}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.suggestedRestockQuantity > 0
                              ? "bg-[#fff7ed] text-[#7a1e13]"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {product.suggestedRestockQuantity > 0
                            ? `+${product.suggestedRestockQuantity}`
                            : "No need"}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-[#15803d]">
                        {product.estimatedStockAfterRestock}
                      </td>

                      <td className="p-3 print:hidden">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyRestock(product)}
                            disabled={product.suggestedRestockQuantity <= 0}
                            className="rounded bg-[#15803d] px-3 py-2 text-xs font-bold text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:bg-gray-400"
                          >
                            Apply
                          </button>

                          <Link
                            href="/admin/products"
                            className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
