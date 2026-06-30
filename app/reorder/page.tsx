"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type OrderItem = Product & {
  quantity: number;
};

type Order = {
  id: string;
  customerEmail?: string;
  customerName?: string;
  customer?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      label?: string;
    };
  };
  items: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total?: number;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const statusFilters = [
  "All Orders",
  "Delivered",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Pending",
];

const normalizeEmail = (email?: string) => {
  return email?.trim().toLowerCase() || "";
};

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

const formatCurrency = (amount?: number) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const formatDateTime = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (!savedOrders) return [];

    const parsedOrders = JSON.parse(savedOrders) as Order[];

    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
};

const getOrderCustomerEmail = (order: Order) => {
  return normalizeEmail(order.customerEmail || order.customer?.email);
};

const getOrderCustomerPhone = (order: Order) => {
  return normalizePhone(order.customer?.phone);
};

const getProductStockQuantity = (product: Product) => {
  return Number(
    product.stockQuantity ??
      (product.stock === "Out of Stock" || product.stock === "Coming Soon"
        ? 0
        : 999)
  );
};

const isUnavailableProduct = (product: Product) => {
  return (
    product.stock === "Out of Stock" ||
    product.stock === "Coming Soon" ||
    getProductStockQuantity(product) <= 0
  );
};

const getStatusBadgeClass = (status?: string) => {
  if (status === "Delivered") return "bg-green-50 text-green-700";
  if (status === "Out for Delivery") return "bg-blue-50 text-blue-700";
  if (status === "Cancelled" || status === "Delivery Failed") {
    return "bg-red-50 text-red-700";
  }
  if (status === "Pending") return "bg-orange-50 text-orange-700";

  return "bg-gray-100 text-gray-700";
};

export default function ReorderPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { addToCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Orders");

  const customerEmail = normalizeEmail(user?.email);
  const customerPhone = normalizePhone((user as any)?.phone);

  const loadOrders = () => {
    if (!customerEmail && !customerPhone) {
      setOrders([]);
      return;
    }

    const allOrders = readOrders();

    const customerOrders = allOrders.filter((order) => {
      const orderEmail = getOrderCustomerEmail(order);
      const orderPhone = getOrderCustomerPhone(order);

      if (customerEmail && orderEmail && customerEmail === orderEmail) return true;
      if (customerPhone && orderPhone && customerPhone === orderPhone) return true;

      return false;
    });

    setOrders(
      customerOrders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    );
  };

  useEffect(() => {
    loadOrders();
  }, [customerEmail, customerPhone]);

  const filteredOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        order.items.some((item) => item.name.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === "All Orders" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const reorderableOrders = orders.filter(
      (order) =>
        order.items?.length > 0 &&
        !["Cancelled", "Archived", "Delivery Failed"].includes(order.status || "")
    );

    const totalReorderValue = reorderableOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const totalItems = orders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + Number(item.quantity || 0),
          0
        ),
      0
    );

    return {
      totalOrders: orders.length,
      reorderableOrders: reorderableOrders.length,
      totalItems,
      totalReorderValue,
      deliveredOrders: orders.filter((order) => order.status === "Delivered")
        .length,
    };
  }, [orders]);

  const handleReorder = (order: Order) => {
    const latestProducts = getProducts();

    let addedQuantity = 0;
    let skippedItems = 0;
    let limitedItems = 0;

    order.items.forEach((item) => {
      const latestProduct =
        latestProducts.find(
          (product) => product.id === item.id || product.slug === item.slug
        ) || item;

      const availableStock = getProductStockQuantity(latestProduct);

      if (isUnavailableProduct(latestProduct) || availableStock <= 0) {
        skippedItems += 1;
        return;
      }

      const requestedQuantity = Math.max(Number(item.quantity || 1), 1);
      const quantityToAdd = Math.min(requestedQuantity, availableStock);

      if (quantityToAdd < requestedQuantity) {
        limitedItems += 1;
      }

      for (let index = 0; index < quantityToAdd; index += 1) {
        addToCart(latestProduct);
      }

      addedQuantity += quantityToAdd;
    });

    if (addedQuantity === 0) {
      toast.error("All products from this order are currently unavailable");
      return;
    }

    if (skippedItems > 0 || limitedItems > 0) {
      toast.success(
        `${addedQuantity} item(s) added. ${skippedItems} unavailable and ${limitedItems} limited stock item(s) adjusted.`
      );
    } else {
      toast.success(`${addedQuantity} item(s) added to cart`);
    }

    router.push("/cart");
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Orders");
  };

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-gray-600">
              Please login to reorder from your previous PujaFresh orders.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]"
              >
                Register
              </Link>
            </div>
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
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Repeat Orders
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Reorder Essentials
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Quickly add items from your previous orders back to cart. Stock
            validation is checked before adding items.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Back to Profile
            </Link>

            <Link
              href="/cart"
              className="rounded border border-white px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
            >
              Open Cart
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Reorderable</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.reorderableOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivered</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.deliveredOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Past Items</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.totalItems}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Past Value</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {formatCurrency(stats.totalReorderValue)}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Orders
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order ID or product name..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Status</label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {statusFilters.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredOrders.length} of {orders.length} order
            {orders.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                No previous orders found
              </h2>

              <p className="mt-2 text-gray-600">
                Place your first order, then reorder options will appear here.
              </p>

              <Link
                href="/"
                className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status || "N/A"}
                      </span>

                      <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                        {order.items.length} item(s)
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-black text-gray-900">
                      {order.id}
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      Ordered on {formatDateTime(order.createdAt)}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      Delivery: {formatDate(order.customer?.deliveryDate)} •{" "}
                      {order.customer?.deliverySlotDetails?.label ||
                        order.customer?.deliverySlot ||
                        "No slot"}
                    </p>

                    <div className="mt-4 grid gap-2">
                      {order.items.slice(0, 4).map((item, index) => (
                        <div
                          key={`${order.id}-${item.id}-${index}`}
                          className="flex flex-wrap justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              Qty {item.quantity} • {item.category || "Pooja Essential"}
                            </p>
                          </div>

                          <p className="font-black text-[#7a1e13]">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}

                      {order.items.length > 4 && (
                        <p className="text-xs font-semibold text-gray-500">
                          +{order.items.length - 4} more item(s)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-[190px] text-right">
                    <p className="text-sm font-semibold text-gray-500">
                      Order Total
                    </p>

                    <h3 className="mt-1 text-3xl font-black text-[#7a1e13]">
                      {formatCurrency(order.total)}
                    </h3>

                    <div className="mt-5 grid gap-2">
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={
                          order.items.length === 0 ||
                          ["Cancelled", "Archived", "Delivery Failed"].includes(
                            order.status || ""
                          )
                        }
                        className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f] disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Reorder
                      </button>

                      <Link
                        href={`/invoice?orderId=${encodeURIComponent(order.id)}`}
                        className="rounded border border-[#7a1e13] px-5 py-3 text-center text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                      >
                        Invoice
                      </Link>

                      <Link
                        href="/track-order"
                        className="rounded border border-gray-300 px-5 py-3 text-center text-sm font-bold text-gray-700 hover:bg-gray-900 hover:text-white"
                      >
                        Track
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
