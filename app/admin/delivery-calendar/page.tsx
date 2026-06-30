"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { DeliverySlot, getDeliverySlots } from "@/utils/deliverySlotStorage";

type OrderItem = {
  id?: number;
  name?: string;
  quantity?: number;
  price?: number;
};

type Order = {
  id: string;
  items?: OrderItem[];
  total?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    landmark?: string;
    pincode?: string;
    deliveryDate?: string;
    deliverySlot?: string;
    deliverySlotDetails?: {
      label?: string;
      timeRange?: string;
    };
  };
};

type SlotSummary = {
  slot: DeliverySlot;
  orders: Order[];
  booked: number;
  capacity: number;
  remaining: number;
  revenue: number;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: string) => {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
};

const getOrderDeliveryDate = (order: Order) => {
  return order.customer?.deliveryDate || order.deliveryDate || "";
};

const getOrderDeliverySlot = (order: Order) => {
  return (
    order.customer?.deliverySlotDetails?.label ||
    order.customer?.deliverySlot ||
    order.deliverySlot ||
    "Not selected"
  );
};

const getCustomerName = (order: Order) => {
  return (
    order.customer?.fullName ||
    order.customer?.name ||
    order.customerName ||
    order.customer?.email ||
    order.customerEmail ||
    "Customer"
  );
};

const getCustomerPhone = (order: Order) => {
  return order.customer?.phone || order.customerPhone || "N/A";
};

const getCustomerAddress = (order: Order) => {
  const address = order.customer?.address || "";
  const landmark = order.customer?.landmark || "";
  const pincode = order.customer?.pincode || "";

  return [address, landmark, pincode].filter(Boolean).join(", ") || "N/A";
};

const getOrderQuantity = (order: Order) => {
  return (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
};

export default function AdminDeliveryCalendarPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [statusFilter, setStatusFilter] = useState("All Orders");
  const [slotFilter, setSlotFilter] = useState("All Slots");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadCalendarData();
    setIsCheckingAuth(false);
  }, [router]);

  const loadCalendarData = () => {
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];

      setOrders(Array.isArray(parsedOrders) ? parsedOrders : []);
      setDeliverySlots(
        getDeliverySlots()
          .filter((slot) => slot.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch {
      setOrders([]);
      setDeliverySlots(getDeliverySlots().filter((slot) => slot.isActive));
    }
  };

  const selectedDateOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = getOrderDeliveryDate(order);
      const orderSlot = getOrderDeliverySlot(order);

      const matchesDate = orderDate === selectedDate;

      const matchesStatus =
        statusFilter === "All Orders" || order.status === statusFilter;

      const matchesSlot =
        slotFilter === "All Slots" || orderSlot === slotFilter;

      return matchesDate && matchesStatus && matchesSlot;
    });
  }, [orders, selectedDate, statusFilter, slotFilter]);

  const slotSummaries = useMemo<SlotSummary[]>(() => {
    return deliverySlots.map((slot) => {
      const slotOrders = orders.filter((order) => {
        const orderDate = getOrderDeliveryDate(order);
        const orderSlot = getOrderDeliverySlot(order);

        const isCancelled =
          order.status === "Cancelled" || order.status === "Refunded";

        return orderDate === selectedDate && orderSlot === slot.label && !isCancelled;
      });

      const booked = slotOrders.length;
      const capacity = Number(slot.maxOrders || 0);
      const remaining = Math.max(capacity - booked, 0);
      const revenue = slotOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      return {
        slot,
        orders: slotOrders,
        booked,
        capacity,
        remaining,
        revenue,
      };
    });
  }, [deliverySlots, orders, selectedDate]);

  const stats = useMemo(() => {
    const activeOrders = selectedDateOrders.filter(
      (order) => order.status !== "Cancelled"
    );

    return {
      totalOrders: selectedDateOrders.length,
      activeOrders: activeOrders.length,
      totalItems: selectedDateOrders.reduce(
        (sum, order) => sum + getOrderQuantity(order),
        0
      ),
      totalRevenue: activeOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
      totalCapacity: slotSummaries.reduce(
        (sum, summary) => sum + summary.capacity,
        0
      ),
      bookedCapacity: slotSummaries.reduce(
        (sum, summary) => sum + summary.booked,
        0
      ),
      fullSlots: slotSummaries.filter(
        (summary) => summary.capacity > 0 && summary.booked >= summary.capacity
      ).length,
    };
  }, [selectedDateOrders, slotSummaries]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(orders.map((order) => order.status).filter(Boolean))
    ) as string[];

    return ["All Orders", ...statuses];
  }, [orders]);

  const goToPreviousDate = () => {
    const date = new Date(`${selectedDate}T00:00:00`);
    date.setDate(date.getDate() - 1);
    setSelectedDate(formatDateForInput(date));
  };

  const goToNextDate = () => {
    const date = new Date(`${selectedDate}T00:00:00`);
    date.setDate(date.getDate() + 1);
    setSelectedDate(formatDateForInput(date));
  };

  const handleExportCsv = () => {
    if (selectedDateOrders.length === 0) {
      toast.error("No delivery orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer",
      "Phone",
      "Address",
      "Delivery Date",
      "Delivery Slot",
      "Status",
      "Payment Status",
      "Items",
      "Total",
    ];

    const rows = selectedDateOrders.map((order) => [
      order.id,
      getCustomerName(order),
      getCustomerPhone(order),
      getCustomerAddress(order),
      getOrderDeliveryDate(order),
      getOrderDeliverySlot(order),
      order.status || "Pending",
      order.paymentStatus || "Payment Pending",
      getOrderQuantity(order),
      order.total || 0,
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
    link.download = `pujafresh-delivery-calendar-${selectedDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Delivery calendar CSV exported");
  };

  const getSlotCapacityClass = (summary: SlotSummary) => {
    if (summary.capacity === 0) return "bg-gray-100 text-gray-700";

    const usage = summary.booked / summary.capacity;

    if (usage >= 1) return "bg-red-50 text-red-700";
    if (usage >= 0.75) return "bg-orange-50 text-orange-700";
    return "bg-green-50 text-green-700";
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
              Delivery Calendar
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Track date-wise orders, slot capacity, delivery workload and
              pending dispatch planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <button
              onClick={loadCalendarData}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="rounded bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-black"
            >
              Print
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[150px_1fr_150px_220px_220px]">
            <button
              onClick={goToPreviousDate}
              className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Previous
            </button>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Delivery Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <button
              onClick={goToNextDate}
              className="self-end rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Next
            </button>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Order Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Delivery Slot
              </label>

              <select
                value={slotFilter}
                onChange={(event) => setSlotFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Slots</option>
                {deliverySlots.map((slot) => (
                  <option key={slot.id}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing delivery plan for {formatDisplayDate(selectedDate)}.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Orders
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.activeOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Items</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.totalItems}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Revenue</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              ₹{stats.totalRevenue}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Capacity</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.bookedCapacity}/{stats.totalCapacity}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Full Slots</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.fullSlots}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Slot Capacity Summary
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {slotSummaries.map((summary) => (
              <div
                key={summary.slot.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {summary.slot.label}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {summary.slot.timeRange}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getSlotCapacityClass(
                      summary
                    )}`}
                  >
                    {summary.booked}/{summary.capacity}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#7a1e13]"
                    style={{
                      width:
                        summary.capacity > 0
                          ? `${Math.min(
                              (summary.booked / summary.capacity) * 100,
                              100
                            )}%`
                          : "0%",
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-gray-500">Booked</p>
                    <p className="font-black text-gray-900">
                      {summary.booked}
                    </p>
                  </div>

                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-gray-500">Left</p>
                    <p className="font-black text-gray-900">
                      {summary.remaining}
                    </p>
                  </div>

                  <div className="rounded bg-gray-50 p-3">
                    <p className="text-gray-500">Revenue</p>
                    <p className="font-black text-gray-900">
                      ₹{summary.revenue}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {slotSummaries.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center md:col-span-2 lg:col-span-3">
                <h3 className="text-lg font-bold text-gray-900">
                  No active delivery slots found
                </h3>

                <p className="mt-2 text-gray-600">
                  Add active delivery slots first to see calendar capacity.
                </p>

                <Link
                  href="/admin/delivery-slots"
                  className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
                >
                  Manage Delivery Slots
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Orders for Selected Date
          </h2>

          {selectedDateOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No delivery orders found
              </h3>

              <p className="mt-2 text-gray-600">
                Orders will appear here when customers place orders for this
                delivery date.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#fff7ed] text-[#7a1e13]">
                    <th className="border-b px-4 py-3">Order</th>
                    <th className="border-b px-4 py-3">Customer</th>
                    <th className="border-b px-4 py-3">Phone</th>
                    <th className="border-b px-4 py-3">Slot</th>
                    <th className="border-b px-4 py-3">Items</th>
                    <th className="border-b px-4 py-3">Amount</th>
                    <th className="border-b px-4 py-3">Status</th>
                    <th className="border-b px-4 py-3">Payment</th>
                    <th className="border-b px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedDateOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {order.id}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">
                          {getCustomerName(order)}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-gray-500">
                          {getCustomerAddress(order)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {getCustomerPhone(order)}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {getOrderDeliverySlot(order)}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {getOrderQuantity(order)}
                      </td>

                      <td className="px-4 py-3 font-bold text-gray-900">
                        ₹{order.total || 0}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {order.status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                          {order.paymentStatus || "Payment Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/invoice/${order.id}`}
                          className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                        >
                          Invoice
                        </Link>
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
