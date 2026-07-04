"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  DeliveryPartner,
  getActiveDeliveryPartners,
} from "@/utils/deliveryPartnerStorage";

type AssignedPartner = {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  assignedAt: string;
};

type Order = {
  id: string;
  total?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  deliveryPartner?: AssignedPartner | null;
  customerName?: string;
  customerPhone?: string;
  customer?: {
    fullName?: string;
    name?: string;
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
  items?: {
    name?: string;
    quantity?: number;
  }[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LAST_ORDER_STORAGE_KEY = "pujafresh-last-order";

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

export default function AdminDeliveryAssignmentsPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [assignmentFilter, setAssignmentFilter] = useState("All Orders");
  const [partnerFilter, setPartnerFilter] = useState("All Partners");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadData();
    setIsCheckingAuth(false);
  }, [router]);

  const readOrders = () => {
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const lastOrder = localStorage.getItem(LAST_ORDER_STORAGE_KEY);

      const parsedOrders = savedOrders
        ? (JSON.parse(savedOrders) as Order[])
        : [];

      const orders = Array.isArray(parsedOrders) ? parsedOrders : [];

      if (!lastOrder) {
        return orders;
      }

      const parsedLastOrder = JSON.parse(lastOrder) as Order;

      const existsInOrders = orders.some(
        (order) => order.id === parsedLastOrder.id
      );

      return existsInOrders ? orders : [parsedLastOrder, ...orders];
    } catch {
      return [];
    }
  };

  const loadData = () => {
    setOrders(readOrders());
    setPartners(getActiveDeliveryPartners());
  };

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

  const selectedDateOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = getOrderDeliveryDate(order);
      const matchesDate = orderDate === selectedDate;

      const matchesAssignment =
        assignmentFilter === "All Orders" ||
        (assignmentFilter === "Assigned" && Boolean(order.deliveryPartner)) ||
        (assignmentFilter === "Unassigned" && !order.deliveryPartner);

      const matchesPartner =
        partnerFilter === "All Partners" ||
        order.deliveryPartner?.id === partnerFilter;

      const matchesStatus =
        statusFilter === "All Status" || order.status === statusFilter;

      const isDeliveryOrder =
        order.status !== "Cancelled" && order.status !== "Refunded";

      return (
        matchesDate &&
        matchesAssignment &&
        matchesPartner &&
        matchesStatus &&
        isDeliveryOrder
      );
    });
  }, [orders, selectedDate, assignmentFilter, partnerFilter, statusFilter]);

  const stats = useMemo(() => {
    const dateOrders = orders.filter(
      (order) =>
        getOrderDeliveryDate(order) === selectedDate &&
        order.status !== "Cancelled" &&
        order.status !== "Refunded"
    );

    return {
      total: dateOrders.length,
      assigned: dateOrders.filter((order) => Boolean(order.deliveryPartner))
        .length,
      unassigned: dateOrders.filter((order) => !order.deliveryPartner).length,
      partners: partners.length,
      items: dateOrders.reduce((sum, order) => sum + getOrderQuantity(order), 0),
    };
  }, [orders, partners.length, selectedDate]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(orders.map((order) => order.status).filter(Boolean))
    ) as string[];

    return ["All Status", ...statuses];
  }, [orders]);

  const partnerWorkload = useMemo(() => {
    return partners.map((partner) => {
      const assignedOrders = orders.filter(
        (order) =>
          getOrderDeliveryDate(order) === selectedDate &&
          order.deliveryPartner?.id === partner.id &&
          order.status !== "Cancelled" &&
          order.status !== "Refunded"
      );

      return {
        partner,
        assignedOrders,
        count: assignedOrders.length,
        capacity: partner.maxOrdersPerDay,
        remaining: Math.max(partner.maxOrdersPerDay - assignedOrders.length, 0),
      };
    });
  }, [orders, partners, selectedDate]);

  const assignOrder = (orderId: string, partnerId: string) => {
    if (!partnerId) return;

    const partner = partners.find((item) => item.id === partnerId);

    if (!partner) {
      toast.error("Delivery partner not found");
      return;
    }

    const currentPartnerOrders = orders.filter(
      (order) =>
        getOrderDeliveryDate(order) === selectedDate &&
        order.deliveryPartner?.id === partner.id &&
        order.status !== "Cancelled" &&
        order.status !== "Refunded"
    );

    const orderAlreadyAssignedToPartner = orders.find(
      (order) => order.id === orderId
    )?.deliveryPartner?.id === partner.id;

    if (
      currentPartnerOrders.length >= partner.maxOrdersPerDay &&
      !orderAlreadyAssignedToPartner
    ) {
      toast.error(`${partner.name} has reached daily capacity`);
      return;
    }

    const assignedPartner: AssignedPartner = {
      id: partner.id,
      name: partner.name,
      phone: partner.phone,
      vehicleType: partner.vehicleType,
      vehicleNumber: partner.vehicleNumber,
      assignedAt: new Date().toISOString(),
    };

    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            deliveryPartner: assignedPartner,
          }
        : order
    );

    saveOrders(updatedOrders);
    toast.success(`Order assigned to ${partner.name}`);
  };

  const unassignOrder = (orderId: string) => {
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            deliveryPartner: null,
          }
        : order
    );

    saveOrders(updatedOrders);
    toast.success("Delivery partner removed from order");
  };

  const autoAssignOrders = () => {
    const unassignedOrders = orders.filter(
      (order) =>
        getOrderDeliveryDate(order) === selectedDate &&
        !order.deliveryPartner &&
        order.status !== "Cancelled" &&
        order.status !== "Refunded"
    );

    if (unassignedOrders.length === 0) {
      toast.error("No unassigned orders found for this date");
      return;
    }

    if (partners.length === 0) {
      toast.error("No active delivery partners available");
      return;
    }

    const workloadMap = new Map<string, number>();

    partners.forEach((partner) => {
      const currentCount = orders.filter(
        (order) =>
          getOrderDeliveryDate(order) === selectedDate &&
          order.deliveryPartner?.id === partner.id &&
          order.status !== "Cancelled" &&
          order.status !== "Refunded"
      ).length;

      workloadMap.set(partner.id, currentCount);
    });

    let assignedCount = 0;

    const updatedOrders = orders.map((order) => {
      if (!unassignedOrders.some((item) => item.id === order.id)) {
        return order;
      }

      const availablePartner = [...partners]
        .sort(
          (a, b) =>
            (workloadMap.get(a.id) || 0) - (workloadMap.get(b.id) || 0)
        )
        .find(
          (partner) =>
            (workloadMap.get(partner.id) || 0) < partner.maxOrdersPerDay
        );

      if (!availablePartner) return order;

      workloadMap.set(
        availablePartner.id,
        (workloadMap.get(availablePartner.id) || 0) + 1
      );
      assignedCount += 1;

      return {
        ...order,
        deliveryPartner: {
          id: availablePartner.id,
          name: availablePartner.name,
          phone: availablePartner.phone,
          vehicleType: availablePartner.vehicleType,
          vehicleNumber: availablePartner.vehicleNumber,
          assignedAt: new Date().toISOString(),
        },
      };
    });

    saveOrders(updatedOrders);
    toast.success(`${assignedCount} order${assignedCount !== 1 ? "s" : ""} assigned`);
  };

  const handleExportCsv = () => {
    if (selectedDateOrders.length === 0) {
      toast.error("No delivery assignments to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer",
      "Phone",
      "Address",
      "Delivery Date",
      "Delivery Slot",
      "Items",
      "Order Status",
      "Assigned Partner",
      "Partner Phone",
      "Vehicle",
    ];

    const rows = selectedDateOrders.map((order) => [
      order.id,
      getCustomerName(order),
      getCustomerPhone(order),
      getCustomerAddress(order),
      getOrderDeliveryDate(order),
      getOrderDeliverySlot(order),
      getOrderQuantity(order),
      order.status || "Pending",
      order.deliveryPartner?.name || "Unassigned",
      order.deliveryPartner?.phone || "",
      order.deliveryPartner
        ? `${order.deliveryPartner.vehicleType} - ${order.deliveryPartner.vehicleNumber}`
        : "",
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
    link.download = `pujafresh-delivery-assignments-${selectedDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Delivery assignments CSV exported");
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
              Delivery Assignments
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Assign date-wise delivery orders to active delivery partners.
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
              href="/admin/delivery-partners"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Partners
            </Link>

            <button
              onClick={loadData}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={autoAssignOrders}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
            >
              Auto Assign
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Delivery Orders
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Assigned</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.assigned}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Unassigned</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.unassigned}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Partners
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.partners}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Items</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.items}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-4">
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

            <div>
              <label className="text-sm font-bold text-gray-700">
                Assignment
              </label>

              <select
                value={assignmentFilter}
                onChange={(event) => setAssignmentFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Orders</option>
                <option>Assigned</option>
                <option>Unassigned</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Partner
              </label>

              <select
                value={partnerFilter}
                onChange={(event) => setPartnerFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option value="All Partners">All Partners</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Status
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
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Partner Workload
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partnerWorkload.map(({ partner, count, capacity, remaining }) => (
              <div
                key={partner.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{partner.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {partner.phone} • {partner.vehicleType}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                    {count}/{capacity}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#7a1e13]"
                    style={{
                      width:
                        capacity > 0
                          ? `${Math.min((count / capacity) * 100, 100)}%`
                          : "0%",
                    }}
                  />
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-600">
                  Remaining capacity: {remaining} order
                  {remaining !== 1 ? "s" : ""}
                </p>
              </div>
            ))}

            {partnerWorkload.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center md:col-span-2 lg:col-span-3">
                <h3 className="text-lg font-bold text-gray-900">
                  No active delivery partners found
                </h3>

                <p className="mt-2 text-gray-600">
                  Add or activate delivery partners first.
                </p>

                <Link
                  href="/admin/delivery-partners"
                  className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
                >
                  Manage Partners
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Orders for Assignment
          </h2>

          {selectedDateOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No orders found
              </h3>

              <p className="mt-2 text-gray-600">
                Delivery orders for this date will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#fff7ed] text-[#7a1e13]">
                    <th className="border-b px-4 py-3">Order</th>
                    <th className="border-b px-4 py-3">Customer</th>
                    <th className="border-b px-4 py-3">Slot</th>
                    <th className="border-b px-4 py-3">Items</th>
                    <th className="border-b px-4 py-3">Status</th>
                    <th className="border-b px-4 py-3">Assigned Partner</th>
                    <th className="border-b px-4 py-3">Assign / Change</th>
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
                        <p className="mt-1 text-xs text-gray-500">
                          {getCustomerPhone(order)}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-gray-500">
                          {getCustomerAddress(order)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {getOrderDeliverySlot(order)}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {getOrderQuantity(order)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {order.status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {order.deliveryPartner ? (
                          <div>
                            <p className="font-bold text-gray-900">
                              {order.deliveryPartner.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.deliveryPartner.phone}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.deliveryPartner.vehicleType} •{" "}
                              {order.deliveryPartner.vehicleNumber}
                            </p>
                          </div>
                        ) : (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={order.deliveryPartner?.id || ""}
                          onChange={(event) =>
                            assignOrder(order.id, event.target.value)
                          }
                          className="w-full rounded border border-gray-300 px-3 py-2 text-xs outline-none focus:border-[#7a1e13]"
                        >
                          <option value="">Select Partner</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/invoice/${order.id}`}
                            className="rounded border border-[#7a1e13] px-3 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                          >
                            Invoice
                          </Link>

                          {order.deliveryPartner && (
                            <button
                              onClick={() => unassignOrder(order.id)}
                              className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              Remove
                            </button>
                          )}
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
