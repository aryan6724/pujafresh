"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { getProducts, saveProducts } from "@/utils/productStorage";

type OrderItem = Product & {
  quantity: number;
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

type StatusHistory = {
  status: string;
  message: string;
  updatedAt: string;
  updatedBy: string;
};

type RefundRequest = {
  id: string;
  type: "Return" | "Refund" | "Replacement";
  reason: string;
  description?: string;
  status: "Requested" | "Approved" | "Rejected" | "Refunded" | "Completed";
  requestedAt: string;
  updatedAt?: string;
  updatedBy?: string;
  adminNote?: string;
  refundAmount?: number;
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
  loyalty?: {
    pointsEarned: number;
    pointsRedeemed?: number;
    redemptionAmount?: number;
    earnRate?: string;
    redeemRate?: string;
  };
  total: number;
  paymentStatus?: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  stockRestoredOnCancel?: boolean;
  refundRequest?: RefundRequest | null;
  statusHistory?: StatusHistory[];
};

const trackingSteps = [
  "Pending",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

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

const getOrderLoyaltyPoints = (order: Order) => {
  return order.loyalty?.pointsEarned ?? Math.floor(Number(order.total || 0) / 100);
};

const getOrderLoyaltyRedeemed = (order: Order) => {
  return order.loyalty?.pointsRedeemed ?? 0;
};

const getOrderLoyaltyDiscount = (order: Order) => {
  return order.loyalty?.redemptionAmount ?? getOrderLoyaltyRedeemed(order);
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

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = () => {
    if (!user) return;

    const savedOrders = localStorage.getItem("pujafresh-orders");

    if (!savedOrders) {
      setOrders([]);
      return;
    }

    const allOrders = JSON.parse(savedOrders) as Order[];

    const customerOrders = allOrders.filter((order) => {
      return (
        order.customerEmail === user.email ||
        order.customer?.email === user.email
      );
    });

    setOrders(customerOrders);
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const getStatusColor = (status: string) => {
    if (status === "Pending") return "text-orange-600 bg-orange-50";
    if (status === "Confirmed") return "text-blue-600 bg-blue-50";
    if (status === "Packed") return "text-purple-600 bg-purple-50";
    if (status === "Out for Delivery") return "text-indigo-600 bg-indigo-50";
    if (status === "Delivered") return "text-green-700 bg-green-50";
    if (status === "Cancelled") return "text-red-600 bg-red-50";
    if (status === "Archived") return "text-gray-600 bg-gray-100";
    return "text-gray-700 bg-gray-100";
  };

  const canCancelOrder = (status: string) => {
    return status === "Pending" || status === "Confirmed";
  };

  const canRequestReturnRefund = (order: Order) => {
    return (
      (order.status === "Delivered" || order.status === "Closed") &&
      !order.refundRequest
    );
  };

  const isUnavailableProduct = (stock: string) => {
    return stock === "Out of Stock" || stock === "Coming Soon";
  };

  const getProductStockQuantity = (product: Product) => {
    return Number(
      product.stockQuantity ??
        (product.stock === "Out of Stock" || product.stock === "Coming Soon"
          ? 0
          : 999)
    );
  };

  const restoreStockForCancelledOrder = (order: Order) => {
    const latestProductList = getProducts();
    const historyLogs: InventoryHistoryLog[] = [];
    const now = new Date().toISOString();

    const updatedProducts = latestProductList.map((product) => {
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
        productImage: product.image,
        productCategory: product.category,
        changeType: "Stock Restored",
        quantityChange: orderedItem.quantity,
        previousStock: currentStockQuantity,
        updatedStock: updatedStockQuantity,
        reason: "Order cancelled by customer",
        orderId: order.id,
        createdAt: now,
        updatedBy: "Customer",
      });

      return {
        ...product,
        stockQuantity: updatedStockQuantity,
        stock: updatedStock,
      };
    });

    saveProducts(updatedProducts);
    saveInventoryHistoryLogs(historyLogs);
  };

  const saveCustomerOrderUpdate = (updatedOrder: Order) => {
    const savedOrders = localStorage.getItem("pujafresh-orders");

    if (!savedOrders) {
      return;
    }

    const allOrders = JSON.parse(savedOrders) as Order[];

    const updatedOrders = allOrders.map((order) =>
      order.id === updatedOrder.id ? updatedOrder : order
    );

    localStorage.setItem("pujafresh-orders", JSON.stringify(updatedOrders));

    const lastOrder = localStorage.getItem("pujafresh-last-order");

    if (lastOrder) {
      const parsedLastOrder = JSON.parse(lastOrder) as Order;

      if (parsedLastOrder.id === updatedOrder.id) {
        localStorage.setItem(
          "pujafresh-last-order",
          JSON.stringify(updatedOrder)
        );
      }
    }

    if (!user) return;

    const customerOrders = updatedOrders.filter((order) => {
      return (
        order.customerEmail === user.email ||
        order.customer?.email === user.email
      );
    });

    setOrders(customerOrders);
  };

  const handleCancelOrder = (order: Order) => {
    if (!canCancelOrder(order.status)) {
      toast.error("This order cannot be cancelled now");
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    const cancellationReason =
      window.prompt("Please enter cancellation reason") ||
      "Cancelled by customer";

    const now = new Date().toISOString();

    const existingHistory = getOrderHistory(order);
    const shouldRestoreStock = !order.stockRestoredOnCancel;

    if (shouldRestoreStock) {
      restoreStockForCancelledOrder(order);
    }

    const cancelledOrder: Order = {
      ...order,
      status: "Cancelled",
      cancelledAt: now,
      cancellationReason,
      stockRestoredOnCancel: order.stockRestoredOnCancel || shouldRestoreStock,
      statusHistory: [
        ...existingHistory,
        {
          status: "Cancelled",
          message: shouldRestoreStock
            ? `Order cancelled by customer. Reason: ${cancellationReason}. Stock restored to inventory.`
            : `Order cancelled by customer. Reason: ${cancellationReason}.`,
          updatedAt: now,
          updatedBy: "Customer",
        },
      ],
    };

    saveCustomerOrderUpdate(cancelledOrder);

    if (shouldRestoreStock) {
      toast.success("Order cancelled and stock restored");
      return;
    }

    toast.success("Order cancelled successfully");
  };

  const handleRequestReturnRefund = (order: Order) => {
    if (!canRequestReturnRefund(order)) {
      toast.error("Return/refund request is available only after delivery");
      return;
    }

    const typeInput = window.prompt(
      "Request type: Return, Refund, or Replacement",
      "Refund"
    );

    if (!typeInput) return;

    const normalizedType =
      typeInput.trim().toLowerCase() === "return"
        ? "Return"
        : typeInput.trim().toLowerCase() === "replacement"
        ? "Replacement"
        : "Refund";

    const reason = window.prompt("Please enter request reason");

    if (!reason || reason.trim().length < 5) {
      toast.error("Please enter a valid reason");
      return;
    }

    const description =
      window.prompt("Add extra details if needed") || reason.trim();

    const now = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      refundRequest: {
        id: `RR-${Date.now()}`,
        type: normalizedType,
        reason: reason.trim(),
        description: description.trim(),
        status: "Requested",
        requestedAt: now,
        refundAmount: order.total,
      },
      statusHistory: [
        ...getOrderHistory(order),
        {
          status: "Return/Refund Requested",
          message: `${normalizedType} request submitted by customer. Reason: ${reason.trim()}`,
          updatedAt: now,
          updatedBy: "Customer",
        },
      ],
    };

    saveCustomerOrderUpdate(updatedOrder);
    toast.success(`${normalizedType} request submitted`);
  };

  const handleRefreshOrders = () => {
    loadOrders();
    toast.success("Orders refreshed");
  };

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

      if (isUnavailableProduct(latestProduct.stock) || availableStock <= 0) {
        skippedItems += 1;
        return;
      }

      const requestedQuantity = Math.max(item.quantity || 1, 1);
      const quantityToAdd = Math.min(requestedQuantity, availableStock);

      if (quantityToAdd < requestedQuantity) {
        limitedItems += 1;
      }

      for (let i = 0; i < quantityToAdd; i++) {
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
        `${addedQuantity} item(s) added to cart. ${skippedItems} unavailable and ${limitedItems} limited stock product(s) adjusted.`
      );
    } else {
      toast.success(`${addedQuantity} item(s) added to cart`);
    }

    router.push("/cart");
  };

  const getStatusMessage = (status: string) => {
    if (status === "Pending") return "Order placed successfully.";
    if (status === "Confirmed") return "Your order has been confirmed.";
    if (status === "Packed") return "Your order has been packed.";
    if (status === "Out for Delivery") return "Your order is out for delivery.";
    if (status === "Delivered") return "Your order has been delivered.";
    if (status === "Cancelled") return "This order has been cancelled.";
    if (status === "Archived") return "This order has been archived.";
    return "Order status updated.";
  };

  const getOrderHistory = (order: Order) => {
    const baseHistory: StatusHistory[] = [
      {
        status: "Pending",
        message: "Order placed successfully.",
        updatedAt: order.createdAt,
        updatedBy: "Customer",
      },
    ];

    if (order.statusHistory && order.statusHistory.length > 0) {
      return order.statusHistory;
    }

    if (order.status === "Pending") {
      return baseHistory;
    }

    return [
      ...baseHistory,
      {
        status: order.status,
        message:
          order.status === "Cancelled" && order.cancellationReason
            ? `Order cancelled. Reason: ${order.cancellationReason}`
            : getStatusMessage(order.status),
        updatedAt: order.cancelledAt || order.createdAt,
        updatedBy: order.status === "Cancelled" ? "Customer/Admin" : "Admin",
      },
    ];
  };

  const getStepState = (orderStatus: string, step: string) => {
    if (orderStatus === "Cancelled") return "cancelled";
    if (orderStatus === "Archived") return "archived";

    const currentIndex = trackingSteps.indexOf(orderStatus);
    const stepIndex = trackingSteps.indexOf(step);

    if (currentIndex === -1) return "pending";

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";

    return "pending";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

  const isCustomKitItem = (item: OrderItem) => {
    return (
      item.category === "Custom Kit" ||
      item.slug?.startsWith("custom-pooja-kit") ||
      item.badge === "Custom Kit"
    );
  };

  const getCustomKitItems = (item: OrderItem) => {
    const description = String((item as any).description || "");

    if (!isCustomKitItem(item) || !description) return [];

    return description
      .split(",")
      .map((kitItem) => kitItem.trim())
      .filter(Boolean);
  };

  const getHistoryDotStyle = (status: string) => {
    if (status === "Cancelled") return "bg-red-600";
    if (status === "Delivered") return "bg-green-700";
    if (status === "Archived") return "bg-gray-600";
    return "bg-[#7a1e13]";
  };

  const activeOrders = orders.filter(
    (order) =>
      order.status !== "Delivered" &&
      order.status !== "Cancelled" &&
      order.status !== "Archived"
  );

  const deliveredOrders = orders.filter((order) => order.status === "Delivered");
  const cancelledOrders = orders.filter((order) => order.status === "Cancelled");

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-gray-600">
              Please login to view your orders.
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="mt-1 text-sm text-gray-600">
              Showing orders for {user.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefreshOrders}
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Refresh Orders
            </button>

            <Link
              href="/"
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {orders.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">
                {activeOrders.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Delivered</p>
              <p className="mt-1 text-2xl font-bold text-[#15803d]">
                {deliveredOrders.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Cancelled</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {cancelledOrders.length}
              </p>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              No orders found
            </h2>

            <p className="mt-2 text-gray-600">
              You have not placed any order from this account yet.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {orders.map((order) => {
              const orderHistory = getOrderHistory(order);

              return (
                <div key={order.id} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                      <p className="text-sm text-gray-500">Order ID</p>
                      <h2 className="font-bold text-[#7a1e13]">{order.id}</h2>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-semibold">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p
                        className={`mt-1 rounded-full px-3 py-1 text-sm font-bold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Payment Status</p>
                      <p className="mt-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        {getOrderPaymentStatus(order)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Payment Reference
                      </p>
                      <p className="mt-1 max-w-[180px] break-words rounded bg-[#fff7ed] px-3 py-1 text-sm font-bold text-gray-800">
                        {getOrderPaymentReference(order)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-lg font-bold">₹{order.total}</p>

                      {order.coupon && (
                        <p className="mt-1 text-xs font-semibold text-[#15803d]">
                          {order.coupon.code} applied
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/invoice/${order.id}`}
                        className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                      >
                        View Invoice
                      </Link>

                      <button
                        onClick={() => handleReorder(order)}
                        className="rounded border border-[#15803d] px-4 py-2 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
                      >
                        Reorder
                      </button>

                      {canCancelOrder(order.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          Cancel Order
                        </button>
                      )}

                      {canRequestReturnRefund(order) && (
                        <button
                          type="button"
                          onClick={() => handleRequestReturnRefund(order)}
                          className="rounded border border-orange-600 px-4 py-2 text-sm font-bold text-orange-600 hover:bg-orange-600 hover:text-white"
                        >
                          Return / Refund
                        </button>
                      )}
                    </div>
                  </div>

                  {order.status === "Cancelled" && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <p className="font-bold">Order Cancelled</p>

                      {order.cancelledAt && (
                        <p className="mt-1">
                          Cancelled on {formatDateTime(order.cancelledAt)}
                        </p>
                      )}

                      {order.cancellationReason && (
                        <p className="mt-1">
                          <span className="font-semibold">Reason:</span>{" "}
                          {order.cancellationReason}
                        </p>
                      )}
                    </div>
                  )}

                  {order.refundRequest && (
                    <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {order.refundRequest.type} Request
                          </p>

                          <p className="mt-1">
                            Status:{" "}
                            <span className="font-bold">
                              {order.refundRequest.status}
                            </span>
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700">
                          {order.refundRequest.id}
                        </span>
                      </div>

                      <p className="mt-2">
                        <span className="font-semibold">Reason:</span>{" "}
                        {order.refundRequest.reason}
                      </p>

                      {order.refundRequest.adminNote && (
                        <p className="mt-2">
                          <span className="font-semibold">Admin Note:</span>{" "}
                          {order.refundRequest.adminNote}
                        </p>
                      )}

                      <p className="mt-2 text-xs font-semibold">
                        Requested on{" "}
                        {formatDateTime(order.refundRequest.requestedAt)}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 rounded-lg bg-[#fff7ed] p-4">
                    <h3 className="font-bold text-gray-900">Order Tracking</h3>

                    {order.status === "Cancelled" ? (
                      <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-700">
                        This order has been cancelled and will not be delivered.
                      </div>
                    ) : order.status === "Archived" ? (
                      <div className="mt-4 rounded-lg bg-gray-100 p-4 text-sm font-semibold text-gray-700">
                        This order has been archived by admin.
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4 md:grid-cols-5">
                        {trackingSteps.map((step, index) => {
                          const state = getStepState(order.status, step);

                          return (
                            <div
                              key={step}
                              className="flex items-center gap-3 md:block"
                            >
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold md:mx-auto ${
                                  state === "completed"
                                    ? "bg-[#15803d] text-white"
                                    : state === "active"
                                    ? "bg-[#7a1e13] text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                              >
                                {state === "completed" ? "✓" : index + 1}
                              </div>

                              <p
                                className={`text-sm font-bold md:mt-2 md:text-center ${
                                  state === "completed"
                                    ? "text-[#15803d]"
                                    : state === "active"
                                    ? "text-[#7a1e13]"
                                    : "text-gray-500"
                                }`}
                              >
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {order.customer.deliveryDate &&
                      order.status !== "Cancelled" &&
                      order.status !== "Delivered" && (
                        <p className="mt-4 rounded bg-white p-3 text-sm font-semibold text-gray-700">
                          Expected delivery date: {order.customer.deliveryDate} |{" "}
                          {getOrderDeliverySlot(order)}
                        </p>
                      )}
                  </div>

                  <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900">
                      Detailed Status History
                    </h3>

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

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-3">
                      {order.items.map((item, index) => {
                        const customKit = isCustomKitItem(item);
                        const customKitItems = getCustomKitItems(item);

                        return (
                          <div
                            key={`${order.id}-${item.id}-${index}`}
                            className="flex gap-4 rounded-lg border border-gray-100 p-3"
                          >
                            <div className="relative h-20 w-20 overflow-hidden rounded bg-[#fff7ed]">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-gray-900">
                                  {item.name}
                                </h3>

                                {customKit && (
                                  <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[11px] font-black uppercase text-[#7a1e13]">
                                    Custom Kit
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-gray-500">
                                {item.category}
                              </p>

                              <p className="mt-1 text-sm">
                                Qty:{" "}
                                <span className="font-semibold">
                                  {item.quantity}
                                </span>
                              </p>

                              {customKit && customKitItems.length > 0 && (
                                <div className="mt-2 rounded-lg bg-[#fff7ed] p-3">
                                  <p className="text-xs font-black uppercase tracking-wide text-[#7a1e13]">
                                    Kit includes
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {customKitItems.map((kitItem) => (
                                      <span
                                        key={kitItem}
                                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm"
                                      >
                                        {kitItem}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="mt-2 font-bold">
                                ₹{item.price * item.quantity}
                              </p>

                              {!customKit && isUnavailableProduct(item.stock) && (
                                <p className="mt-1 text-xs font-bold text-red-600">
                                  Currently {item.stock}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg bg-[#fff7ed] p-4">
                      <h3 className="font-bold text-gray-900">
                        Delivery Details
                      </h3>

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

                        {order.customer.pincode && (
                          <p>
                            <span className="font-semibold">Pincode:</span>{" "}
                            {order.customer.pincode}
                          </p>
                        )}

                        {order.customer.deliveryDate && (
                          <p>
                            <span className="font-semibold">Date:</span>{" "}
                            {order.customer.deliveryDate}
                          </p>
                        )}

                        <p>
                          <span className="font-semibold">Delivery Slot:</span>{" "}
                          {getOrderDeliverySlot(order)}
                        </p>

                        <p>
                          <span className="font-semibold">Payment:</span>{" "}
                          {order.customer.paymentMethod}
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

                        {order.coupon && (
                          <p>
                            <span className="font-semibold">
                              Coupon Applied:
                            </span>{" "}
                            {order.coupon.code} - {order.coupon.label}
                          </p>
                        )}

                        <p>
                          <span className="font-semibold">
                            Loyalty Points Earned:
                          </span>{" "}
                          {getOrderLoyaltyPoints(order)} points
                        </p>

                        {getOrderLoyaltyRedeemed(order) > 0 && (
                          <p>
                            <span className="font-semibold">
                              Loyalty Points Redeemed:
                            </span>{" "}
                            {getOrderLoyaltyRedeemed(order)} points
                          </p>
                        )}

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

                        {getOrderCouponDiscount(order) > 0 && (
                          <div className="mt-2 flex justify-between text-[#15803d]">
                            <span>
                              Coupon Discount
                              {order.coupon ? ` (${order.coupon.code})` : ""}
                            </span>
                            <span>-₹{getOrderCouponDiscount(order)}</span>
                          </div>
                        )}

                        {getOrderCouponDeliveryDiscount(order) > 0 && (
                          <div className="mt-2 flex justify-between text-[#15803d]">
                            <span>
                              Delivery Coupon
                              {order.coupon ? ` (${order.coupon.code})` : ""}
                            </span>
                            <span>
                              -₹{getOrderCouponDeliveryDiscount(order)}
                            </span>
                          </div>
                        )}

                        {getOrderLoyaltyDiscount(order) > 0 && (
                          <div className="mt-2 flex justify-between text-orange-600">
                            <span>Loyalty Points Redeemed</span>
                            <span>-₹{getOrderLoyaltyDiscount(order)}</span>
                          </div>
                        )}

                        {order.coupon &&
                          getOrderCouponTotalSavings(order) === 0 && (
                            <div className="mt-2 flex justify-between text-[#15803d]">
                              <span>Coupon Applied</span>
                              <span>{order.coupon.code}</span>
                            </div>
                          )}

                        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                          <span>Total</span>
                          <span>₹{order.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    Admin status updates will appear here. Click Refresh Orders if
                    you updated status from admin dashboard in another tab.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}