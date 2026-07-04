"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  addOrderStatusNotification,
  addPaymentStatusNotification,
} from "@/utils/customerNotificationStorage";

type Product = {
  id: number | string;
  name: string;
  slug: string;
  price: number;
  mrp?: number;
  image?: string;
  category?: string;
  badge?: string;
  stock?: string;
  stockQuantity?: number;
  delivery?: string;
  description?: string;
};

type OrderItem = Product & {
  quantity: number;
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

type StatusHistory = {
  status: string;
  message: string;
  updatedAt: string;
  updatedBy: string;
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
    type?: string;
    value?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    expiryDate?: string;
    discountAmount: number;
    deliveryDiscount?: number;
  } | null;
  total: number;
  paymentStatus?: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  stockRestoredOnCancel?: boolean;
  statusHistory?: StatusHistory[];
};

const orderStatuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Archived",
];

const paymentMethods = [
  "Cash on Delivery",
  "UPI QR Payment",
  "Bank Transfer",
  "Card Payment",
];

const paymentStatuses = [
  "Payment Pending",
  "Verification Pending",
  "Payment Received",
  "Payment Failed",
  "Refunded",
];

const getSafeImage = (image?: string) => {
  if (image && image.trim().length > 0) return image;
  return "/premium-pooja-pack.jpg";
};

const normalizeAdminProduct = (item: any, index: number): Product => {
  return {
    id: item.id || index + 1,
    name: item.name || "Product",
    slug: item.slug || `product-${index + 1}`,
    price: Number(item.price || 0),
    mrp: Number(item.mrp || item.price || 0),
    image: item.image || "/premium-pooja-pack.jpg",
    category: item.category || "Pooja Essentials",
    badge: item.badge || "Fresh",
    stock: item.stock || "In Stock",
    stockQuantity: Number(item.stockQuantity ?? 999),
    delivery: item.delivery || "Early Morning Delivery",
    description: item.description || "",
  };
};

const getOrderDeliverySlot = (order: Order) => {
  return (
    order.customer?.deliverySlotDetails?.label ||
    order.customer?.deliverySlot ||
    "Not selected"
  );
};

const getOrderPaymentStatus = (order: Order) => {
  if (order.paymentStatus) {
    return order.paymentStatus;
  }

  if (
    order.customer.paymentMethod === "UPI QR Payment" ||
    order.customer.paymentMethod === "Bank Transfer"
  ) {
    return "Verification Pending";
  }

  return "Payment Pending";
};

const getOrderPaymentReference = (order: Order) => {
  return order.paymentReference?.trim() || "Not provided";
};

const getOrderCouponDiscount = (order: Order) => {
  return order.coupon?.discountAmount ?? order.discountAmount ?? 0;
};

const getOrderCouponDeliveryDiscount = (order: Order) => {
  return order.coupon?.deliveryDiscount ?? 0;
};

const getOrderCouponTotalSavings = (order: Order) => {
  return getOrderCouponDiscount(order) + getOrderCouponDeliveryDiscount(order);
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

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryHistoryLogs, setInventoryHistoryLogs] = useState<
    InventoryHistoryLog[]
  >([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedOrders = localStorage.getItem("pujafresh-orders");

    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }

    const loadDatabaseProducts = async () => {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok && data.ok && Array.isArray(data.products)) {
          const databaseProducts = data.products.map(
            (item: any, index: number) => normalizeAdminProduct(item, index)
          );

          setProducts(databaseProducts);
          return;
        }

        setProducts([]);
      } catch {
        setProducts([]);
      }
    };

    loadDatabaseProducts();

    const savedInventoryHistory = localStorage.getItem(
      "pujafresh-inventory-history"
    );

    if (savedInventoryHistory) {
      try {
        const parsedInventoryHistory = JSON.parse(
          savedInventoryHistory
        ) as InventoryHistoryLog[];

        if (Array.isArray(parsedInventoryHistory)) {
          setInventoryHistoryLogs(parsedInventoryHistory);
        }
      } catch {
        setInventoryHistoryLogs([]);
      }
    }

    setIsCheckingAuth(false);
  }, [router]);

  const getStatusMessage = (status: string) => {
    if (status === "Pending") return "Order placed by customer.";
    if (status === "Confirmed") return "Order confirmed by admin.";
    if (status === "Packed") return "Order packed for delivery.";
    if (status === "Out for Delivery") return "Order is out for delivery.";
    if (status === "Delivered") return "Order delivered successfully.";
    if (status === "Cancelled") return "Order cancelled.";
    if (status === "Archived") return "Order archived by admin.";
    return "Order status updated.";
  };

  const getOrderHistory = (order: Order) => {
    const baseHistory: StatusHistory[] = [
      {
        status: "Pending",
        message: "Order placed by customer.",
        updatedAt: order.createdAt,
        updatedBy: "Customer",
      },
    ];

    if (!order.statusHistory || order.statusHistory.length === 0) {
      if (order.status === "Pending") return baseHistory;

      return [
        ...baseHistory,
        {
          status: order.status,
          message: getStatusMessage(order.status),
          updatedAt: order.cancelledAt || order.createdAt,
          updatedBy: order.status === "Cancelled" ? "Customer/Admin" : "Admin",
        },
      ];
    }

    return order.statusHistory;
  };

  const visibleOrders = useMemo(() => {
    if (showArchived) {
      return orders;
    }

    return orders.filter((order) => order.status !== "Archived");
  }, [orders, showArchived]);

  const filteredOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return visibleOrders.filter((order) => {
      const orderHistory = getOrderHistory(order);

      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        order.customer.fullName.toLowerCase().includes(search) ||
        order.customer.phone.toLowerCase().includes(search) ||
        order.customer.email?.toLowerCase().includes(search) ||
        order.customer.paymentMethod.toLowerCase().includes(search) ||
        getOrderPaymentStatus(order).toLowerCase().includes(search) ||
        getOrderPaymentReference(order).toLowerCase().includes(search) ||
        getOrderDeliverySlot(order).toLowerCase().includes(search) ||
        order.coupon?.code.toLowerCase().includes(search) ||
        order.cancellationReason?.toLowerCase().includes(search) ||
        orderHistory.some(
          (history) =>
            history.status.toLowerCase().includes(search) ||
            history.message.toLowerCase().includes(search)
        );

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        order.customer.paymentMethod === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [visibleOrders, searchQuery, statusFilter, paymentFilter]);

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

  const stockAlertProducts = useMemo(() => {
    return [...lowStockProducts, ...outOfStockProducts].slice(0, 8);
  }, [lowStockProducts, outOfStockProducts]);

  const stats = useMemo(() => {
    const totalOrders = orders.filter(
      (order) => order.status !== "Archived"
    ).length;

    const pendingOrders = orders.filter(
      (order) => order.status === "Pending"
    ).length;

    const deliveredOrders = orders.filter(
      (order) => order.status === "Delivered"
    ).length;

    const cancelledOrders = orders.filter(
      (order) => order.status === "Cancelled"
    ).length;

    const archivedOrders = orders.filter(
      (order) => order.status === "Archived"
    ).length;

    const totalRevenue = orders
      .filter(
        (order) => order.status !== "Cancelled" && order.status !== "Archived"
      )
      .reduce((sum, order) => sum + order.total, 0);

    const totalDiscount = orders
      .filter(
        (order) => order.status !== "Cancelled" && order.status !== "Archived"
      )
      .reduce((sum, order) => sum + (order.discountAmount ?? 0), 0);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      archivedOrders,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      totalRevenue,
      totalDiscount,
    };
  }, [orders, lowStockProducts.length, outOfStockProducts.length]);

  const recentInventoryLogs = useMemo(() => {
    return inventoryHistoryLogs.slice(0, 5);
  }, [inventoryHistoryLogs]);

  const formatInventoryChange = (quantityChange: number) => {
    if (quantityChange > 0) return `+${quantityChange}`;
    return String(quantityChange);
  };

  const getInventoryChangeColor = (quantityChange: number) => {
    if (quantityChange > 0) return "text-green-700 bg-green-50";
    if (quantityChange < 0) return "text-red-700 bg-red-50";
    return "text-gray-700 bg-gray-100";
  };

  const restoreStockForCancelledOrder = (order: Order) => {
    const historyLogs: InventoryHistoryLog[] = [];
    const now = new Date().toISOString();

    const updatedProducts = products.map((product) => {
      const orderedItem = order.items.find(
        (item) => item.id === product.id || item.slug === product.slug
      );

      if (!orderedItem) {
        return product;
      }

      const currentStockQuantity = getProductStockQuantity(product);
      const updatedStockQuantity = currentStockQuantity + orderedItem.quantity;

      const updatedStock =
        updatedStockQuantity <= 0
          ? "Out of Stock"
          : updatedStockQuantity <= 5
          ? "Limited Stock"
          : "In Stock";

      historyLogs.push({
        id: `INV-${Date.now()}-${product.id}`,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productImage: getSafeImage(product.image),
        productCategory: product.category || "Pooja Essentials",
        changeType: "Stock Restored",
        quantityChange: orderedItem.quantity,
        previousStock: currentStockQuantity,
        updatedStock: updatedStockQuantity,
        reason: "Order cancelled by admin",
        orderId: order.id,
        createdAt: now,
        updatedBy: "Admin",
      });

      return {
        ...product,
        stockQuantity: updatedStockQuantity,
        stock: updatedStock,
      };
    });

    if (historyLogs.length === 0) {
      order.items.forEach((item) => {
        historyLogs.push({
          id: `INV-${Date.now()}-${item.id || item.slug}`,
          productId: item.id || item.slug || "unknown",
          productSlug: item.slug || "unknown-product",
          productName: item.name,
          productImage: getSafeImage(item.image),
          productCategory: item.category || "Pooja Essentials",
          changeType: "Stock Restored",
          quantityChange: item.quantity,
          previousStock: 0,
          updatedStock: item.quantity,
          reason: "Order cancelled by admin",
          orderId: order.id,
          createdAt: now,
          updatedBy: "Admin",
        });
      });
    }

    saveInventoryHistoryLogs(historyLogs);
    setProducts(updatedProducts);
    setInventoryHistoryLogs((prevLogs) => [...historyLogs, ...prevLogs]);
  };

  const saveOrders = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
    localStorage.setItem("pujafresh-orders", JSON.stringify(updatedOrders));

    const lastOrder = localStorage.getItem("pujafresh-last-order");

    if (lastOrder) {
      const parsedLastOrder = JSON.parse(lastOrder) as Order;
      const updatedLastOrder = updatedOrders.find(
        (order) => order.id === parsedLastOrder.id
      );

      if (updatedLastOrder) {
        localStorage.setItem(
          "pujafresh-last-order",
          JSON.stringify(updatedLastOrder)
        );
      }
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const selectedOrder = orders.find((order) => order.id === orderId);

    if (!selectedOrder) {
      toast.error("Order not found");
      return;
    }

    const shouldRestoreStock =
      newStatus === "Cancelled" &&
      selectedOrder.status !== "Cancelled" &&
      !selectedOrder.stockRestoredOnCancel;

    if (shouldRestoreStock) {
      restoreStockForCancelledOrder(selectedOrder);
    }

    const updatedOrders = orders.map((order) => {
      if (order.id !== orderId) return order;

      if (order.status === newStatus) {
        return order;
      }

      const existingHistory = getOrderHistory(order);

      const newHistoryItem: StatusHistory = {
        status: newStatus,
        message: shouldRestoreStock
          ? "Order cancelled by admin and stock restored."
          : getStatusMessage(newStatus),
        updatedAt: new Date().toISOString(),
        updatedBy: "Admin",
      };

      if (newStatus === "Cancelled") {
        return {
          ...order,
          status: newStatus,
          cancelledAt: order.cancelledAt || new Date().toISOString(),
          cancellationReason:
            order.cancellationReason || "Cancelled by admin",
          stockRestoredOnCancel:
            order.stockRestoredOnCancel || shouldRestoreStock,
          statusHistory: [...existingHistory, newHistoryItem],
        };
      }

      return {
        ...order,
        status: newStatus,
        statusHistory: [...existingHistory, newHistoryItem],
      };
    });

    saveOrders(updatedOrders);

    const updatedOrderForNotification = updatedOrders.find(
      (order) => order.id === orderId
    );

    if (updatedOrderForNotification && newStatus !== "Archived") {
      addOrderStatusNotification(updatedOrderForNotification, newStatus, "Admin");
    }

    if (shouldRestoreStock) {
      toast.success(`Order cancelled and stock restored`);
      return;
    }

    toast.success(`Order status updated to ${newStatus}`);
  };

  const updatePaymentStatus = (orderId: string, newPaymentStatus: string) => {
    const updatedOrders = orders.map((order) => {
      if (order.id !== orderId) return order;

      return {
        ...order,
        paymentStatus: newPaymentStatus,
      };
    });

    saveOrders(updatedOrders);

    const updatedOrderForNotification = updatedOrders.find(
      (order) => order.id === orderId
    );

    if (updatedOrderForNotification) {
      addPaymentStatusNotification(updatedOrderForNotification, newPaymentStatus);
    }

    toast.success(`Payment status updated to ${newPaymentStatus}`);
  };

  const archiveOrder = (orderId: string) => {
    const confirmArchive = window.confirm(
      "Are you sure you want to archive this order?"
    );

    if (!confirmArchive) return;

    updateOrderStatus(orderId, "Archived");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setPaymentFilter("All");
  };

  const handleLogout = () => {
    localStorage.removeItem("pujafresh-admin-auth");
    router.push("/admin/login");
  };

  const formatDateTime = (date?: string) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderCardStyle = (status: string) => {
    if (status === "Cancelled") {
      return "border-red-200 bg-red-50";
    }

    if (status === "Archived") {
      return "border-gray-300 bg-gray-50 opacity-75";
    }

    return "border-gray-200 bg-white";
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === "Pending") return "bg-orange-50 text-orange-600";
    if (status === "Confirmed") return "bg-blue-50 text-blue-600";
    if (status === "Packed") return "bg-purple-50 text-purple-600";
    if (status === "Out for Delivery") return "bg-indigo-50 text-indigo-600";
    if (status === "Delivered") return "bg-green-50 text-green-700";
    if (status === "Cancelled") return "bg-red-100 text-red-700";
    if (status === "Archived") return "bg-gray-100 text-gray-600";
    return "bg-gray-100 text-gray-700";
  };

  const getHistoryDotStyle = (status: string) => {
    if (status === "Cancelled") return "bg-red-600";
    if (status === "Delivered") return "bg-green-700";
    if (status === "Archived") return "bg-gray-600";
    return "bg-[#7a1e13]";
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
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage PujaFresh orders and delivery status.
            </p>
          </div>

          <div className="mt-6 w-full rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Admin Control Center
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  All PujaFresh management modules are grouped below for faster navigation.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowArchived((prev) => !prev)}
                  className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                >
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-red-700 hover:shadow-md active:scale-95"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-[#fffaf2] p-4">
                <h3 className="text-lg font-black text-gray-900">
                  Storefront & Settings
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Website, store rules and customer-facing pages.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Go to Store
                  </Link>
                  <Link
                    href="/admin/store-settings"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Store Settings
                  </Link>

                  <Link
                    href="/admin/backup"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Backup & Restore
                  </Link>

                  <Link
                    href="/admin/audit-log"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Audit Trail
                  </Link>

                  <Link
                    href="/admin/action-center"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Action Center
                  </Link>

                  <Link
                    href="/admin/system-health"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    System Health
                  </Link>

                  <Link
                    href="/admin/deployment-checklist"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Deployment Checklist
                  </Link>

                  <Link
                    href="/admin/project-guide"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Project Guide
                  </Link>

                  <Link
                    href="/admin/demo-data"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Demo Data
                  </Link>
                  <Link
                    href="/admin/announcements"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Announcements
                  </Link>
                  <Link
                    href="/admin/faqs"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    FAQs
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[#fffaf2] p-4">
                <h3 className="text-lg font-black text-gray-900">
                  Products & Inventory
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Product catalogue, stock movement and restock planning.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/admin/products"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Manage Products
                  </Link>
                  <Link
                    href="/admin/inventory-history"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Inventory History
                  </Link>
                  <Link
                    href="/admin/restock-planning"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Restock Planning
                  </Link>
                  <Link
                    href="/admin/reports"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Reports
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[#fffaf2] p-4">
                <h3 className="text-lg font-black text-gray-900">
                  Orders & Revenue
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Orders, delivery list, returns and subscriptions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/admin/delivery-list"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Daily Delivery List
                  </Link>

                  <Link
                    href="/admin/invoices"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Invoices
                  </Link>

                  <Link
                    href="/admin/payments"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Payments
                  </Link>
                  <Link
                    href="/admin/returns"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Returns & Refunds
                  </Link>
                  <Link
                    href="/admin/subscriptions"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Subscriptions
                  </Link>

                  <Link
                    href="/admin/subscription-calendar"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Subscription Calendar
                  </Link>

                  <Link
                    href="/admin/subscription-order-generator"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Generate Subscription Orders
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Analytics
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[#fffaf2] p-4">
                <h3 className="text-lg font-black text-gray-900">
                  Delivery Operations
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Areas, slots, calendar, partners, assignments and performance.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/admin/delivery-areas"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Delivery Areas
                  </Link>
                  <Link
                    href="/admin/delivery-slots"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Delivery Slots
                  </Link>
                  <Link
                    href="/admin/delivery-calendar"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Delivery Calendar
                  </Link>
                  <Link
                    href="/admin/delivery-partners"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Delivery Partners
                  </Link>
                  <Link
                    href="/admin/delivery-assignments"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Assignments
                  </Link>
                  <Link
                    href="/delivery-partner"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Partner Portal
                  </Link>
                  <Link
                    href="/admin/delivery-performance"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Performance
                  </Link>
                  <Link
                    href="/admin/delivery-feedback"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Delivery Feedback
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[#fffaf2] p-4">
                <h3 className="text-lg font-black text-gray-900">
                  Customers & Support
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Customer list, reviews, support tickets and activity.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/admin/customers"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Customers
                  </Link>
                  <Link
                    href="/admin/reviews"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Reviews
                  </Link>
                  <Link
                    href="/admin/support"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Support
                  </Link>
                  <Link
                    href="/admin/activity"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Activity Center
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[#fffaf2] p-4">
                <h3 className="text-lg font-black text-gray-900">
                  Marketing & Notifications
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Coupons, loyalty, newsletter and customer notifications.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/admin/coupons"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Coupons
                  </Link>
                  <Link
                    href="/admin/coupon-usage"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Coupon Usage
                  </Link>
                  <Link
                    href="/admin/loyalty"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Loyalty Points
                  </Link>
                  <Link
                    href="/admin/newsletter"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Newsletter
                  </Link>
                  <Link
                    href="/admin/notification-broadcast"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Broadcast
                  </Link>
                  <Link
                    href="/admin/notification-logs"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Notification Logs
                  </Link>
                  <Link
                    href="/notifications"
                    className="rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white hover:shadow-md active:scale-95"
                  >
                    Customer Alerts
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.pendingOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivered</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.deliveredOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Cancelled</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.cancelledOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Archived</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-600">
              {stats.archivedOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Low Stock</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.lowStockProducts}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Out of Stock</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.outOfStockProducts}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Discounts</p>
            <h2 className="mt-2 text-3xl font-bold text-[#15803d]">
              ₹{stats.totalDiscount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Revenue</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              ₹{stats.totalRevenue}
            </h2>
          </div>
        </div>

        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-orange-800">
                  Low Stock Alert
                </h2>

                <p className="mt-1 text-sm font-semibold text-orange-700">
                  {lowStockProducts.length} low stock product
                  {lowStockProducts.length !== 1 ? "s" : ""} and{" "}
                  {outOfStockProducts.length} out of stock product
                  {outOfStockProducts.length !== 1 ? "s" : ""}.
                </p>
              </div>

              <Link
                href="/admin/products"
                className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#5f160e] hover:shadow-lg active:scale-95"
              >
                Manage Stock
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {stockAlertProducts.map((product) => {
                const stockQuantity = getProductStockQuantity(product);
                const isOutOfStock =
                  product.stock === "Out of Stock" ||
                  product.stock === "Coming Soon" ||
                  stockQuantity <= 0;

                return (
                  <div
                    key={product.id}
                    className="rounded-lg bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded bg-[#fff7ed]">
                        <Image
                          src={getSafeImage(product.image)}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-bold text-gray-900">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {product.category}
                        </p>

                        <p
                          className={`mt-2 text-sm font-bold ${
                            isOutOfStock ? "text-red-600" : "text-orange-600"
                          }`}
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : `${stockQuantity} units left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {stockAlertProducts.length === 8 &&
              lowStockProducts.length + outOfStockProducts.length > 8 && (
                <p className="mt-3 text-sm font-semibold text-orange-700">
                  More stock alerts available. Open Manage Products to view all.
                </p>
              )}
          </div>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recent Inventory Activity
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest stock reduce, restore and manual update logs.
              </p>
            </div>

            <Link
              href="/admin/inventory-history"
              className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              View Full History
            </Link>
          </div>

          {recentInventoryLogs.length === 0 ? (
            <div className="py-8 text-center">
              <h3 className="font-bold text-gray-900">
                No inventory activity yet
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Stock movement logs will appear after orders, cancellations or
                manual stock updates.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {recentInventoryLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid gap-3 rounded-lg border border-gray-100 p-3 md:grid-cols-[1fr_120px_150px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-[#fff7ed]">
                      <Image
                        src={getSafeImage(log.productImage)}
                        alt={log.productName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <p className="font-bold text-gray-900">
                        {log.productName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {log.reason}
                        {log.orderId ? ` • ${log.orderId}` : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getInventoryChangeColor(
                        log.quantityChange
                      )}`}
                    >
                      {formatInventoryChange(log.quantityChange)}
                    </span>

                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {log.changeType}
                    </p>
                  </div>

                  <div className="text-sm">
                    <p className="font-bold text-gray-900">
                      {log.previousStock} → {log.updatedStock}
                    </p>

                    <p className="text-xs font-semibold text-gray-500">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredOrders.length} order
                {filteredOrders.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {(searchQuery || statusFilter !== "All" || paymentFilter !== "All") && (
              <button
                onClick={clearFilters}
                className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13]"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-3 rounded-lg bg-[#fff7ed] p-4 lg:grid-cols-[1fr_220px_220px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Order
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by order ID, name, phone, email, coupon, payment status, UTR, reason..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Status Filter
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All</option>
                {orderStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Payment Filter
              </label>

              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All</option>
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No orders found
              </h3>

              <p className="mt-2 text-gray-600">
                Try changing your search or filter values.
              </p>

              <button
                onClick={clearFilters}
                className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 font-bold text-white"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {filteredOrders.map((order) => {
                const orderHistory = getOrderHistory(order);

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border p-4 ${getOrderCardStyle(
                      order.status
                    )}`}
                  >
                    <div className="grid gap-4 border-b pb-4 lg:grid-cols-[1fr_220px_180px_220px]">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Order ID
                        </p>

                        <h3 className="mt-1 font-bold text-[#7a1e13]">
                          {order.id}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleString("en-IN")}
                        </p>

                        <span
                          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeStyle(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Customer
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          {order.customer.fullName}
                        </p>

                        <p className="text-sm text-gray-600">
                          {order.customer.phone}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Payment
                        </p>

                        <p className="mt-1 font-semibold">
                          {order.customer.paymentMethod}
                        </p>

                        <p className="text-sm font-bold text-gray-900">
                          ₹{order.total}
                        </p>

                        <p className="mt-2 text-xs font-semibold uppercase text-gray-500">
                          Payment Status
                        </p>

                        <select
                          value={getOrderPaymentStatus(order)}
                          onChange={(event) =>
                            updatePaymentStatus(order.id, event.target.value)
                          }
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-xs font-bold outline-none focus:border-[#7a1e13]"
                        >
                          {paymentStatuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>

                        <p className="mt-2 text-xs font-semibold uppercase text-gray-500">
                          Payment Reference / UTR
                        </p>

                        <p className="mt-1 break-words rounded bg-[#fff7ed] px-3 py-2 text-xs font-bold text-gray-800">
                          {getOrderPaymentReference(order)}
                        </p>

                        {order.coupon && (
                          <p className="mt-1 text-xs font-semibold text-[#15803d]">
                            {order.coupon.code} applied
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Status
                        </p>

                        <div className="mt-1 flex gap-2">
                          <select
                            value={order.status}
                            onChange={(event) =>
                              updateOrderStatus(order.id, event.target.value)
                            }
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#7a1e13]"
                          >
                            {orderStatuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>

                          {order.status !== "Archived" && (
                            <button
                              onClick={() => archiveOrder(order.id)}
                              className="rounded bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:bg-gray-900"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.status === "Cancelled" && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">
                        <p className="font-bold">Cancellation Details</p>

                        <p className="mt-1">
                          <span className="font-semibold">Cancelled At:</span>{" "}
                          {formatDateTime(order.cancelledAt)}
                        </p>

                        <p className="mt-1">
                          <span className="font-semibold">Reason:</span>{" "}
                          {order.cancellationReason || "No reason provided"}
                        </p>

                        {order.stockRestoredOnCancel && (
                          <p className="mt-2 rounded bg-green-50 p-2 text-xs font-bold text-green-700">
                            Stock restored to inventory.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 rounded-lg bg-white p-4">
                      <h4 className="font-bold text-gray-900">
                        Status History
                      </h4>

                      <div className="mt-4 space-y-4">
                        {orderHistory.map((history, index) => (
                          <div
                            key={`${history.status}-${history.updatedAt}-${index}`}
                            className="flex gap-3"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-3 w-3 rounded-full ${getHistoryDotStyle(
                                  history.status
                                )}`}
                              />

                              {index !== orderHistory.length - 1 && (
                                <div className="mt-1 h-full min-h-8 w-px bg-gray-300" />
                              )}
                            </div>

                            <div className="flex-1 rounded-lg bg-[#fff7ed] p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-bold text-gray-900">
                                  {history.status}
                                </p>

                                <p className="text-xs font-semibold text-gray-500">
                                  {formatDateTime(history.updatedAt)}
                                </p>
                              </div>

                              <p className="mt-1 text-sm text-gray-600">
                                {history.message}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[#7a1e13]">
                                Updated by: {history.updatedBy}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
                      <div>
                        <h4 className="font-bold text-gray-900">Products</h4>

                        <div className="mt-3 space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={`${order.id}-${item.id}`}
                              className="flex gap-3 rounded-lg bg-[#fff7ed] p-3"
                            >
                              <div className="relative h-16 w-16 overflow-hidden rounded bg-white">
                                <Image
                                  src={getSafeImage(item.image)}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              <div className="flex-1">
                                <p className="font-bold text-gray-900">
                                  {item.name}
                                </p>

                                <p className="text-sm text-gray-500">
                                  {item.category}
                                </p>

                                <p className="mt-1 text-sm">
                                  Qty:{" "}
                                  <span className="font-bold">
                                    {item.quantity}
                                  </span>{" "}
                                  × ₹{item.price}
                                </p>
                              </div>

                              <p className="font-bold">
                                ₹{item.quantity * item.price}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-4">
                        <h4 className="font-bold text-gray-900">
                          Delivery Details
                        </h4>

                        <div className="mt-3 space-y-2 text-sm">
                          <p>
                            <span className="font-semibold">Name:</span>{" "}
                            {order.customer.fullName}
                          </p>

                          <p>
                            <span className="font-semibold">Phone:</span>{" "}
                            {order.customer.phone}
                          </p>

                          {order.customer.email && (
                            <p>
                              <span className="font-semibold">Email:</span>{" "}
                              {order.customer.email}
                            </p>
                          )}

                          <p>
                            <span className="font-semibold">Address:</span>{" "}
                            {order.customer.address}
                          </p>

                          {order.customer.landmark && (
                            <p>
                              <span className="font-semibold">Landmark:</span>{" "}
                              {order.customer.landmark}
                            </p>
                          )}

                          <p>
                            <span className="font-semibold">Pincode:</span>{" "}
                            {order.customer.pincode || "Not provided"}
                          </p>

                          <p>
                            <span className="font-semibold">Date:</span>{" "}
                            {order.customer.deliveryDate || "Not selected"}
                          </p>

                          <p>
                            <span className="font-semibold">
                              Delivery Slot:
                            </span>{" "}
                            {getOrderDeliverySlot(order)}
                          </p>

                          <p>
                            <span className="font-semibold">
                              Payment Status:
                            </span>{" "}
                            {getOrderPaymentStatus(order)}
                          </p>

                          <p>
                            <span className="font-semibold">
                              Payment Reference / UTR:
                            </span>{" "}
                            {getOrderPaymentReference(order)}
                          </p>

                          {order.customer.notes && (
                            <p>
                              <span className="font-semibold">Notes:</span>{" "}
                              {order.customer.notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 border-t pt-3 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>₹{order.subtotal}</span>
                          </div>

                          <div className="mt-2 flex justify-between">
                            <span>Delivery</span>
                            <span>
                              {order.deliveryCharge === 0
                                ? "FREE"
                                : `₹${order.deliveryCharge}`}
                            </span>
                          </div>

                          {(order.discountAmount ?? 0) > 0 && (
                            <div className="mt-2 flex justify-between text-[#15803d]">
                              <span>
                                Coupon Discount
                                {order.coupon ? ` (${order.coupon.code})` : ""}
                              </span>
                              <span>-₹{order.discountAmount}</span>
                            </div>
                          )}

                          <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                            <span>Total</span>
                            <span>₹{order.total}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}