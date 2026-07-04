"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { addOrderStatusNotification } from "@/utils/customerNotificationStorage";

type Product = {
  id?: number | string;
  name: string;
  slug?: string;
  price: number;
  image?: string;
  category?: string;
  badge?: string;
  description?: string;
};

type OrderItem = Product & {
  quantity: number;
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
    discountAmount: number;
  } | null;
  total: number;
  paymentStatus?: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
  statusHistory?: StatusHistory[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const readOrders = () => {
  try {
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    const parsedOrders = savedOrders
      ? (JSON.parse(savedOrders) as Order[])
      : [];

    const orders = Array.isArray(parsedOrders) ? parsedOrders : [];

    if (!lastOrder) return orders;

    const parsedLastOrder = JSON.parse(lastOrder) as Order;

    const existsInOrders = orders.some((order) => order.id === parsedLastOrder.id);

    return existsInOrders ? orders : [parsedLastOrder, ...orders];
  } catch {
    return [];
  }
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (date: string) => {
  if (!date) return "Not selected";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

const getProductsText = (items: OrderItem[]) => {
  return items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
};

const getStatusBadgeStyle = (status: string) => {
  if (status === "Pending") return "bg-orange-50 text-orange-700";
  if (status === "Confirmed") return "bg-blue-50 text-blue-700";
  if (status === "Packed") return "bg-purple-50 text-purple-700";
  if (status === "Out for Delivery") return "bg-indigo-50 text-indigo-700";
  if (status === "Delivered") return "bg-green-50 text-green-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Delivery Failed") return "bg-red-50 text-red-700";
  if (status === "Archived") return "bg-gray-100 text-gray-700";

  return "bg-gray-100 text-gray-700";
};

const getPaymentBadgeStyle = (paymentStatus: string) => {
  if (paymentStatus === "Payment Received") {
    return "bg-green-50 text-green-700";
  }

  if (paymentStatus === "Verification Pending") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (paymentStatus === "Payment Failed") {
    return "bg-red-50 text-red-700";
  }

  if (paymentStatus === "Refunded") {
    return "bg-gray-100 text-gray-700";
  }

  return "bg-orange-50 text-orange-700";
};

export default function DeliveryListPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setOrders(readOrders());

    setIsCheckingAuth(false);
  }, [router]);

  const deliveryOrders = useMemo(() => {
    return orders
      .filter((order) => {
        return (
          order.customer.deliveryDate === selectedDate &&
          order.status !== "Cancelled" &&
          order.status !== "Archived"
        );
      })
      .sort((a, b) => {
        const slotA = getOrderDeliverySlot(a);
        const slotB = getOrderDeliverySlot(b);

        if (slotA !== slotB) {
          return slotA.localeCompare(slotB);
        }

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [orders, selectedDate]);

  const groupedOrders = useMemo(() => {
    return deliveryOrders.reduce<Record<string, Order[]>>((groups, order) => {
      const slot = getOrderDeliverySlot(order);

      if (!groups[slot]) {
        groups[slot] = [];
      }

      groups[slot].push(order);

      return groups;
    }, {});
  }, [deliveryOrders]);

  const stats = useMemo(() => {
    const totalItems = deliveryOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      );
    }, 0);

    const totalRevenue = deliveryOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const pendingPayments = deliveryOrders.filter((order) => {
      const paymentStatus = getOrderPaymentStatus(order);

      return (
        paymentStatus === "Payment Pending" ||
        paymentStatus === "Verification Pending"
      );
    }).length;

    return {
      totalOrders: deliveryOrders.length,
      totalItems,
      totalRevenue,
      pendingPayments,
    };
  }, [deliveryOrders]);

  const saveOrders = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));

    const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

    if (!lastOrder) return;

    try {
      const parsedLastOrder = JSON.parse(lastOrder) as Order;
      const updatedLastOrder = updatedOrders.find(
        (order) => order.id === parsedLastOrder.id
      );

      if (updatedLastOrder) {
        localStorage.setItem(
          LAST_ORDER_STORAGE_KEY,
          JSON.stringify(updatedLastOrder)
        );
      }
    } catch {
      // Ignore invalid last order data.
    }
  };

  const getDeliveryStatusMessage = (status: string) => {
    if (status === "Out for Delivery") return "Order is out for delivery.";
    if (status === "Delivered") return "Order delivered successfully.";
    if (status === "Delivery Failed") return "Delivery attempt failed.";
    return "Delivery status updated.";
  };

  const updateDeliveryStatus = (orderId: string, status: string) => {
    const now = new Date().toISOString();

    const updatedOrders = orders.map((order) => {
      if (order.id !== orderId) return order;

      return {
        ...order,
        status,
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status,
            message: getDeliveryStatusMessage(status),
            updatedAt: now,
            updatedBy: "Admin",
          },
        ],
      };
    });

    saveOrders(updatedOrders);

    const updatedOrder = updatedOrders.find((order) => order.id === orderId);

    if (updatedOrder) {
      addOrderStatusNotification(updatedOrder, status, "Admin");
    }

    toast.success(`Order marked as ${status}`);
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
    <main className="min-h-screen bg-[#f7f3ea] print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 print:px-0 print:py-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Daily Delivery List
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Print date-wise delivery sheet for PujaFresh orders.
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
              onClick={handlePrint}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#5f160e] hover:shadow-lg active:scale-95"
            >
              Print Delivery Sheet
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-[#7a1e13]">
                PujaFresh Delivery Sheet
              </h2>

              <p className="mt-1 text-sm font-semibold text-gray-600">
                Delivery Date: {formatDate(selectedDate)}
              </p>
            </div>

            <div className="print:hidden">
              <label className="text-sm font-bold text-gray-700">
                Select Delivery Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-1 block rounded border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#7a1e13]"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Total Orders
              </p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                {stats.totalOrders}
              </h3>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Total Items
              </p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                {stats.totalItems}
              </h3>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Pending Payments
              </p>
              <h3 className="mt-1 text-2xl font-bold text-orange-600">
                {stats.pendingPayments}
              </h3>
            </div>

            <div className="rounded-lg bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">
                Expected Collection
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[#15803d]">
                ₹{stats.totalRevenue}
              </h3>
            </div>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-10 text-center">
              <h3 className="text-xl font-bold text-gray-900">
                No delivery orders found
              </h3>

              <p className="mt-2 text-gray-600">
                No active order is scheduled for {formatDate(selectedDate)}.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {Object.entries(groupedOrders).map(([slot, slotOrders]) => (
                <div key={slot} className="rounded-xl border border-gray-200">
                  <div className="rounded-t-xl bg-[#7a1e13] px-4 py-3 text-white">
                    <h3 className="font-bold">Delivery Slot: {slot}</h3>
                    <p className="text-sm opacity-90">
                      {slotOrders.length} order
                      {slotOrders.length !== 1 ? "s" : ""} in this slot
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#fff7ed] text-left text-xs uppercase text-gray-600">
                          <th className="border-b px-4 py-3">Order</th>
                          <th className="border-b px-4 py-3">Customer</th>
                          <th className="border-b px-4 py-3">Address</th>
                          <th className="border-b px-4 py-3">Products</th>
                          <th className="border-b px-4 py-3">Payment</th>
                          <th className="border-b px-4 py-3 text-right">
                            Total
                          </th>
                          <th className="border-b px-4 py-3 print:hidden">
                            Check
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {slotOrders.map((order) => (
                          <tr key={order.id} className="align-top">
                            <td className="border-b px-4 py-4">
                              <p className="font-bold text-[#7a1e13]">
                                {order.id}
                              </p>

                              <p
                                className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-bold ${getStatusBadgeStyle(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </p>
                            </td>

                            <td className="border-b px-4 py-4">
                              <p className="font-bold text-gray-900">
                                {order.customer.fullName}
                              </p>

                              <p className="mt-1 font-semibold text-gray-700">
                                {order.customer.phone}
                              </p>

                              {order.customer.email && (
                                <p className="mt-1 break-words text-xs text-gray-500">
                                  {order.customer.email}
                                </p>
                              )}
                            </td>

                            <td className="border-b px-4 py-4">
                              <p className="font-semibold text-gray-800">
                                {order.customer.address}
                              </p>

                              {order.customer.landmark && (
                                <p className="mt-1 text-gray-600">
                                  Landmark: {order.customer.landmark}
                                </p>
                              )}

                              <p className="mt-1 font-semibold text-gray-700">
                                Pincode:{" "}
                                {order.customer.pincode || "Not provided"}
                              </p>

                              {order.customer.notes && (
                                <p className="mt-2 rounded bg-yellow-50 p-2 text-xs font-semibold text-yellow-800">
                                  Note: {order.customer.notes}
                                </p>
                              )}
                            </td>

                            <td className="border-b px-4 py-4">
                              <p className="font-semibold text-gray-900">
                                {getProductsText(order.items)}
                              </p>

                              <div className="mt-2 space-y-1">
                                {order.items.map((item) => (
                                  <p
                                    key={`${order.id}-${item.id}`}
                                    className="text-xs text-gray-600"
                                  >
                                    {item.name} — Qty {item.quantity}
                                  </p>
                                ))}
                              </div>
                            </td>

                            <td className="border-b px-4 py-4">
                              <p className="font-bold text-gray-900">
                                {order.customer.paymentMethod}
                              </p>

                              <p
                                className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-bold ${getPaymentBadgeStyle(
                                  getOrderPaymentStatus(order)
                                )}`}
                              >
                                {getOrderPaymentStatus(order)}
                              </p>

                              <p className="mt-2 break-words text-xs font-semibold text-gray-700">
                                UTR: {getOrderPaymentReference(order)}
                              </p>
                            </td>

                            <td className="border-b px-4 py-4 text-right">
                              <p className="font-bold text-gray-900">
                                ₹{order.total}
                              </p>

                              {order.discountAmount ? (
                                <p className="mt-1 text-xs font-semibold text-[#15803d]">
                                  Discount: ₹{order.discountAmount}
                                </p>
                              ) : null}
                            </td>

                            <td className="border-b px-4 py-4 print:hidden">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDeliveryStatus(order.id, "Out for Delivery")
                                  }
                                  disabled={order.status === "Out for Delivery"}
                                  className="rounded bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                  Out
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDeliveryStatus(order.id, "Delivered")
                                  }
                                  disabled={order.status === "Delivered"}
                                  className="rounded bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                  Delivered
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDeliveryStatus(order.id, "Delivery Failed")
                                  }
                                  disabled={order.status === "Delivery Failed"}
                                  className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                  Failed
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 hidden border-t pt-4 text-sm text-gray-600 print:block">
            <p className="font-bold text-gray-900">Delivery Staff Notes:</p>
            <div className="mt-3 h-20 rounded border border-dashed border-gray-400"></div>

            <div className="mt-6 grid grid-cols-2 gap-8">
              <div>
                <p className="font-semibold">Prepared By:</p>
                <div className="mt-8 border-t border-gray-400"></div>
              </div>

              <div>
                <p className="font-semibold">Delivery Staff Signature:</p>
                <div className="mt-8 border-t border-gray-400"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}