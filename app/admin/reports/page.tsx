"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type OrderItem = Product & {
  quantity: number;
};

type Order = {
  id: string;
  customerEmail?: string;
  customerName?: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    landmark?: string;
    pincode?: string;
    deliveryDate?: string;
    deliverySlot: string;
    deliverySlotDetails?: {
      id?: string;
      label?: string;
    } | null;
    paymentMethod: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount?: number;
  coupon?: {
    code: string;
    label: string;
    discountAmount: number;
  } | null;
  total: number;
  paymentStatus?: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
};

type BestSellingProduct = {
  id: number;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthStartDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
};

const formatDate = (date: string) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const safeCell = String(cell ?? "").replace(/"/g, '""');
          return `"${safeCell}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

export default function AdminReportsPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [startDate, setStartDate] = useState(getMonthStartDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedOrders = localStorage.getItem("pujafresh-orders");

    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders) as Order[]);
      } catch {
        setOrders([]);
      }
    }

    setProducts(getProducts());
    setIsCheckingAuth(false);
  }, [router]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.createdAt.slice(0, 10);

      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const activeOrders = useMemo(() => {
    return filteredOrders.filter(
      (order) => order.status !== "Cancelled" && order.status !== "Archived"
    );
  }, [filteredOrders]);

  const deliveredOrders = useMemo(() => {
    return filteredOrders.filter((order) => order.status === "Delivered");
  }, [filteredOrders]);

  const cancelledOrders = useMemo(() => {
    return filteredOrders.filter((order) => order.status === "Cancelled");
  }, [filteredOrders]);

  const getProductStockQuantity = (product: Product) => {
    return Number(
      product.stockQuantity ??
        (product.stock === "Out of Stock" || product.stock === "Coming Soon"
          ? 0
          : 999)
    );
  };

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const stockQuantity = getProductStockQuantity(product);

      return (
        product.stock !== "Out of Stock" &&
        product.stock !== "Coming Soon" &&
        stockQuantity > 0 &&
        stockQuantity <= 5
      );
    });
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((product) => {
      const stockQuantity = getProductStockQuantity(product);

      return (
        product.stock === "Out of Stock" ||
        product.stock === "Coming Soon" ||
        stockQuantity <= 0
      );
    });
  }, [products]);

  const bestSellingProducts = useMemo(() => {
    const productMap = new Map<number, BestSellingProduct>();

    activeOrders.forEach((order) => {
      order.items.forEach((item) => {
        const existingProduct = productMap.get(item.id);

        if (existingProduct) {
          productMap.set(item.id, {
            ...existingProduct,
            quantitySold: existingProduct.quantitySold + item.quantity,
            revenue: existingProduct.revenue + item.quantity * item.price,
          });

          return;
        }

        productMap.set(item.id, {
          id: item.id,
          name: item.name,
          category: item.category,
          quantitySold: item.quantity,
          revenue: item.quantity * item.price,
        });
      });
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.quantitySold - a.quantitySold
    );
  }, [activeOrders]);

  const stats = useMemo(() => {
    const totalRevenue = activeOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const deliveredRevenue = deliveredOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const totalDiscount = activeOrders.reduce(
      (sum, order) => sum + (order.discountAmount ?? 0),
      0
    );

    const totalItemsSold = activeOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    const averageOrderValue =
      activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0;

    return {
      totalOrders: filteredOrders.length,
      activeOrders: activeOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      deliveredRevenue,
      totalDiscount,
      totalItemsSold,
      averageOrderValue,
      totalProducts: products.length,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
    };
  }, [
    filteredOrders,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    products,
    lowStockProducts,
    outOfStockProducts,
  ]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportSalesCsv = () => {
    const rows = [
      [
        "Order ID",
        "Customer Name",
        "Phone",
        "Order Date",
        "Status",
        "Payment Method",
        "Payment Status",
        "Subtotal",
        "Delivery Charge",
        "Discount",
        "Total",
      ],
      ...filteredOrders.map((order) => [
        order.id,
        order.customer.fullName,
        order.customer.phone,
        formatDate(order.createdAt),
        order.status,
        order.customer.paymentMethod,
        order.paymentStatus || "Payment Pending",
        String(order.subtotal),
        String(order.deliveryCharge),
        String(order.discountAmount ?? 0),
        String(order.total),
      ]),
    ];

    downloadCsv(`pujafresh-sales-report-${startDate}-to-${endDate}.csv`, rows);
  };

  const handleExportInventoryCsv = () => {
    const rows = [
      [
        "Product ID",
        "Product Name",
        "Category",
        "Stock Status",
        "Stock Quantity",
        "Price",
        "MRP",
        "Badge",
      ],
      ...products.map((product) => [
        String(product.id),
        product.name,
        product.category,
        product.stock,
        String(getProductStockQuantity(product)),
        String(product.price),
        String(product.mrp),
        product.badge,
      ]),
    ];

    downloadCsv(`pujafresh-inventory-report-${getTodayDate()}.csv`, rows);
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
    <main className="min-h-screen bg-[#f7f3ea] print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 print:px-0 print:py-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sales & Inventory Reports
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Track revenue, orders, best-selling products and inventory stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#7a1e13] hover:text-white hover:shadow-lg active:scale-95"
            >
              Back to Admin
            </Link>

            <button
              onClick={handlePrintReport}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#5f160e] hover:shadow-lg active:scale-95"
            >
              Print Report
            </button>

            <button
              onClick={handleExportSalesCsv}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#166534] hover:shadow-lg active:scale-95"
            >
              Export Sales CSV
            </button>

            <button
              onClick={handleExportInventoryCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#ea580c] hover:shadow-lg active:scale-95"
            >
              Export Inventory CSV
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-[#7a1e13]">
                PujaFresh Business Report
              </h2>

              <p className="mt-1 text-sm font-semibold text-gray-600">
                Report Period: {formatDate(startDate)} to {formatDate(endDate)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              <div>
                <label className="text-xs font-bold text-gray-700">
                  Start Date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-1 block rounded border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">
                  End Date
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-1 block rounded border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Active Orders
              </p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                {stats.activeOrders}
              </h3>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Total Revenue
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[#15803d]">
                ₹{stats.totalRevenue}
              </h3>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">Items Sold</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                {stats.totalItemsSold}
              </h3>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Average Order Value
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[#7a1e13]">
                ₹{stats.averageOrderValue}
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <div className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
              <p className="text-sm font-semibold text-gray-500">
                Delivered Orders
              </p>
              <h3 className="mt-1 text-2xl font-bold text-green-700">
                {stats.deliveredOrders}
              </h3>
            </div>

            <div className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
              <p className="text-sm font-semibold text-gray-500">
                Cancelled Orders
              </p>
              <h3 className="mt-1 text-2xl font-bold text-red-600">
                {stats.cancelledOrders}
              </h3>
            </div>

            <div className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
              <p className="text-sm font-semibold text-gray-500">
                Total Discount
              </p>
              <h3 className="mt-1 text-2xl font-bold text-orange-600">
                ₹{stats.totalDiscount}
              </h3>
            </div>

            <div className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
              <p className="text-sm font-semibold text-gray-500">
                Stock Alerts
              </p>
              <h3 className="mt-1 text-2xl font-bold text-red-600">
                {stats.lowStockProducts + stats.outOfStockProducts}
              </h3>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900">
                Best Selling Products
              </h3>

              {bestSellingProducts.length === 0 ? (
                <p className="mt-4 rounded bg-[#fff7ed] p-4 text-sm font-semibold text-gray-600">
                  No product sales found in this date range.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead>
                      <tr className="bg-[#fff7ed] text-left text-xs uppercase text-gray-600">
                        <th className="px-3 py-3">Product</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3 text-right">Qty Sold</th>
                        <th className="px-3 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bestSellingProducts.slice(0, 10).map((product) => (
                        <tr key={product.id} className="border-b">
                          <td className="px-3 py-3 font-bold text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-3 py-3 text-gray-600">
                            {product.category}
                          </td>
                          <td className="px-3 py-3 text-right font-bold">
                            {product.quantitySold}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-[#15803d]">
                            ₹{product.revenue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900">
                Inventory Alerts
              </h3>

              {lowStockProducts.length === 0 &&
              outOfStockProducts.length === 0 ? (
                <p className="mt-4 rounded bg-green-50 p-4 text-sm font-semibold text-green-700">
                  All products have healthy stock.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {[...lowStockProducts, ...outOfStockProducts]
                    .slice(0, 10)
                    .map((product) => {
                      const stockQuantity = getProductStockQuantity(product);
                      const isOutOfStock =
                        product.stock === "Out of Stock" ||
                        product.stock === "Coming Soon" ||
                        stockQuantity <= 0;

                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 rounded bg-[#fff7ed] p-3"
                        >
                          <div>
                            <p className="font-bold text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-xs font-semibold text-gray-500">
                              {product.category}
                            </p>
                          </div>

                          <p
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              isOutOfStock
                                ? "bg-red-50 text-red-600"
                                : "bg-orange-50 text-orange-600"
                            }`}
                          >
                            {isOutOfStock
                              ? "Out of Stock"
                              : `${stockQuantity} left`}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900">
              Sales Orders Summary
            </h3>

            {filteredOrders.length === 0 ? (
              <p className="mt-4 rounded bg-[#fff7ed] p-4 text-sm font-semibold text-gray-600">
                No orders found in this date range.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-[#fff7ed] text-left text-xs uppercase text-gray-600">
                      <th className="px-3 py-3">Order ID</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Payment</th>
                      <th className="px-3 py-3 text-right">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.slice(0, 20).map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="px-3 py-3 font-bold text-[#7a1e13]">
                          {order.id}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-gray-900">
                            {order.customer.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customer.phone}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-3 py-3">{order.status}</td>
                        <td className="px-3 py-3">
                          {order.customer.paymentMethod}
                        </td>
                        <td className="px-3 py-3 text-right font-bold">
                          ₹{order.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredOrders.length > 20 && (
                  <p className="mt-3 text-sm font-semibold text-gray-500">
                    Showing latest 20 orders in preview. Export CSV to download
                    full report.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 hidden border-t pt-4 text-sm text-gray-600 print:block">
            <p className="font-bold text-gray-900">Report Notes:</p>
            <div className="mt-3 h-20 rounded border border-dashed border-gray-400"></div>

            <div className="mt-6 grid grid-cols-2 gap-8">
              <div>
                <p className="font-semibold">Prepared By:</p>
                <div className="mt-8 border-t border-gray-400"></div>
              </div>

              <div>
                <p className="font-semibold">Admin Signature:</p>
                <div className="mt-8 border-t border-gray-400"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
