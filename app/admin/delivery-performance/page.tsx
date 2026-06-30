"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  DeliveryPartner,
  getDeliveryPartners,
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
  deliveredAt?: string;
  outForDeliveryAt?: string;
  deliveryFailureReason?: string;
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
    price?: number;
  }[];
};

type PartnerPerformance = {
  partner: DeliveryPartner;
  assigned: number;
  delivered: number;
  failed: number;
  outForDelivery: number;
  pending: number;
  revenue: number;
  items: number;
  successRate: number;
  averageDeliveryMinutes: number;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDaysAgoDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateForInput(date);
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

const getOrderQuantity = (order: Order) => {
  return (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
};

const getDeliveryMinutes = (order: Order) => {
  if (!order.outForDeliveryAt || !order.deliveredAt) return null;

  const startTime = new Date(order.outForDeliveryAt).getTime();
  const endTime = new Date(order.deliveredAt).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
    return null;
  }

  return Math.round((endTime - startTime) / (1000 * 60));
};

const getSuccessRate = (delivered: number, failed: number) => {
  const completed = delivered + failed;

  if (completed === 0) return 0;

  return Math.round((delivered / completed) * 100);
};

export default function AdminDeliveryPerformancePage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [dateFrom, setDateFrom] = useState(getDaysAgoDate(7));
  const [dateTo, setDateTo] = useState(formatDateForInput(new Date()));
  const [partnerFilter, setPartnerFilter] = useState("All Partners");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadPerformanceData();
    setIsCheckingAuth(false);
  }, [router]);

  const loadPerformanceData = () => {
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      const parsedOrders = savedOrders ? (JSON.parse(savedOrders) as Order[]) : [];

      setOrders(Array.isArray(parsedOrders) ? parsedOrders : []);
      setPartners(getDeliveryPartners());
    } catch {
      setOrders([]);
      setPartners(getDeliveryPartners());
    }
  };

  const filteredOrders = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const deliveryDate = getOrderDeliveryDate(order);

      const matchesDate =
        deliveryDate &&
        deliveryDate >= dateFrom &&
        deliveryDate <= dateTo;

      const matchesPartner =
        partnerFilter === "All Partners" ||
        order.deliveryPartner?.id === partnerFilter;

      const matchesStatus =
        statusFilter === "All Status" || order.status === statusFilter;

      const matchesSearch =
        search.length === 0 ||
        order.id.toLowerCase().includes(search) ||
        getCustomerName(order).toLowerCase().includes(search) ||
        getCustomerPhone(order).includes(search) ||
        order.deliveryPartner?.name.toLowerCase().includes(search) ||
        getOrderDeliverySlot(order).toLowerCase().includes(search);

      return matchesDate && matchesPartner && matchesStatus && matchesSearch;
    });
  }, [orders, dateFrom, dateTo, partnerFilter, statusFilter, searchQuery]);

  const assignedOrders = useMemo(() => {
    return filteredOrders.filter((order) => Boolean(order.deliveryPartner));
  }, [filteredOrders]);

  const stats = useMemo(() => {
    const delivered = assignedOrders.filter(
      (order) => order.status === "Delivered"
    );
    const failed = assignedOrders.filter(
      (order) => order.status === "Delivery Failed"
    );
    const outForDelivery = assignedOrders.filter(
      (order) => order.status === "Out for Delivery"
    );
    const pending = assignedOrders.filter(
      (order) =>
        order.status !== "Delivered" &&
        order.status !== "Delivery Failed" &&
        order.status !== "Out for Delivery"
    );
    const unassigned = filteredOrders.filter((order) => !order.deliveryPartner);

    const deliveryMinutes = delivered
      .map(getDeliveryMinutes)
      .filter((value): value is number => value !== null);

    const averageMinutes =
      deliveryMinutes.length > 0
        ? Math.round(
            deliveryMinutes.reduce((sum, value) => sum + value, 0) /
              deliveryMinutes.length
          )
        : 0;

    return {
      totalOrders: filteredOrders.length,
      assigned: assignedOrders.length,
      unassigned: unassigned.length,
      delivered: delivered.length,
      failed: failed.length,
      outForDelivery: outForDelivery.length,
      pending: pending.length,
      revenue: delivered.reduce((sum, order) => sum + Number(order.total || 0), 0),
      items: filteredOrders.reduce((sum, order) => sum + getOrderQuantity(order), 0),
      successRate: getSuccessRate(delivered.length, failed.length),
      averageMinutes,
    };
  }, [assignedOrders, filteredOrders]);

  const partnerPerformance = useMemo<PartnerPerformance[]>(() => {
    return partners.map((partner) => {
      const partnerOrders = filteredOrders.filter(
        (order) => order.deliveryPartner?.id === partner.id
      );

      const deliveredOrders = partnerOrders.filter(
        (order) => order.status === "Delivered"
      );
      const failedOrders = partnerOrders.filter(
        (order) => order.status === "Delivery Failed"
      );
      const outForDeliveryOrders = partnerOrders.filter(
        (order) => order.status === "Out for Delivery"
      );
      const pendingOrders = partnerOrders.filter(
        (order) =>
          order.status !== "Delivered" &&
          order.status !== "Delivery Failed" &&
          order.status !== "Out for Delivery"
      );

      const deliveryMinutes = deliveredOrders
        .map(getDeliveryMinutes)
        .filter((value): value is number => value !== null);

      const averageDeliveryMinutes =
        deliveryMinutes.length > 0
          ? Math.round(
              deliveryMinutes.reduce((sum, value) => sum + value, 0) /
                deliveryMinutes.length
            )
          : 0;

      return {
        partner,
        assigned: partnerOrders.length,
        delivered: deliveredOrders.length,
        failed: failedOrders.length,
        outForDelivery: outForDeliveryOrders.length,
        pending: pendingOrders.length,
        revenue: deliveredOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        ),
        items: partnerOrders.reduce(
          (sum, order) => sum + getOrderQuantity(order),
          0
        ),
        successRate: getSuccessRate(deliveredOrders.length, failedOrders.length),
        averageDeliveryMinutes,
      };
    });
  }, [filteredOrders, partners]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(orders.map((order) => order.status).filter(Boolean))
    ) as string[];

    return ["All Status", ...statuses];
  }, [orders]);

  const setQuickRange = (range: "today" | "7days" | "30days" | "all") => {
    const today = formatDateForInput(new Date());

    if (range === "today") {
      setDateFrom(today);
      setDateTo(today);
      return;
    }

    if (range === "7days") {
      setDateFrom(getDaysAgoDate(7));
      setDateTo(today);
      return;
    }

    if (range === "30days") {
      setDateFrom(getDaysAgoDate(30));
      setDateTo(today);
      return;
    }

    setDateFrom("2000-01-01");
    setDateTo(today);
  };

  const clearFilters = () => {
    setQuickRange("7days");
    setPartnerFilter("All Partners");
    setStatusFilter("All Status");
    setSearchQuery("");
  };

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      toast.error("No delivery performance data to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer",
      "Phone",
      "Delivery Date",
      "Delivery Slot",
      "Status",
      "Payment Status",
      "Partner",
      "Partner Phone",
      "Vehicle",
      "Out For Delivery At",
      "Delivered At",
      "Delivery Minutes",
      "Failure Reason",
      "Total",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      getCustomerName(order),
      getCustomerPhone(order),
      getOrderDeliveryDate(order),
      getOrderDeliverySlot(order),
      order.status || "Pending",
      order.paymentStatus || "Payment Pending",
      order.deliveryPartner?.name || "Unassigned",
      order.deliveryPartner?.phone || "",
      order.deliveryPartner
        ? `${order.deliveryPartner.vehicleType} - ${order.deliveryPartner.vehicleNumber}`
        : "",
      formatDateTime(order.outForDeliveryAt),
      formatDateTime(order.deliveredAt),
      getDeliveryMinutes(order) ?? "",
      order.deliveryFailureReason || "",
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
    link.download = `pujafresh-delivery-performance-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Delivery performance CSV exported");
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
              Delivery Performance
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Analyze partner-wise delivery success rate, failed deliveries,
              revenue, workload and average delivery time.
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
              onClick={loadPerformanceData}
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
          <div className="grid gap-4 xl:grid-cols-[160px_160px_1fr_220px_200px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                From Date
              </label>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">To Date</label>

              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Search</label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order, customer, phone, partner or slot..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
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

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setQuickRange("today")}
              className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-[#7a1e13] hover:text-white"
            >
              Today
            </button>

            <button
              onClick={() => setQuickRange("7days")}
              className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-[#7a1e13] hover:text-white"
            >
              Last 7 Days
            </button>

            <button
              onClick={() => setQuickRange("30days")}
              className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-[#7a1e13] hover:text-white"
            >
              Last 30 Days
            </button>

            <button
              onClick={() => setQuickRange("all")}
              className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-[#7a1e13] hover:text-white"
            >
              All Time
            </button>
          </div>

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Showing {filteredOrders.length} order
            {filteredOrders.length !== 1 ? "s" : ""} between {dateFrom} and{" "}
            {dateTo}.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Assigned</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.assigned}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Delivered</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.delivered}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Failed</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.failed}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Success Rate
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.successRate}%
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Out for Delivery
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.outForDelivery}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-yellow-600">
              {stats.pending}
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
              Delivered Revenue
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              ₹{stats.revenue}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Avg. Delivery
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.averageMinutes}m
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Partner Performance
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#fff7ed] text-[#7a1e13]">
                  <th className="border-b px-4 py-3">Partner</th>
                  <th className="border-b px-4 py-3">Assigned</th>
                  <th className="border-b px-4 py-3">Delivered</th>
                  <th className="border-b px-4 py-3">Failed</th>
                  <th className="border-b px-4 py-3">Out</th>
                  <th className="border-b px-4 py-3">Pending</th>
                  <th className="border-b px-4 py-3">Success Rate</th>
                  <th className="border-b px-4 py-3">Avg Time</th>
                  <th className="border-b px-4 py-3">Revenue</th>
                </tr>
              </thead>

              <tbody>
                {partnerPerformance.map((item) => (
                  <tr key={item.partner.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">
                        {item.partner.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.partner.phone} • {item.partner.vehicleType}
                      </p>
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {item.assigned}
                    </td>

                    <td className="px-4 py-3 font-semibold text-green-700">
                      {item.delivered}
                    </td>

                    <td className="px-4 py-3 font-semibold text-red-600">
                      {item.failed}
                    </td>

                    <td className="px-4 py-3 font-semibold text-orange-600">
                      {item.outForDelivery}
                    </td>

                    <td className="px-4 py-3 font-semibold text-yellow-700">
                      {item.pending}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.successRate >= 80
                            ? "bg-green-50 text-green-700"
                            : item.successRate >= 50
                            ? "bg-orange-50 text-orange-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {item.successRate}%
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {item.averageDeliveryMinutes}m
                    </td>

                    <td className="px-4 py-3 font-bold text-gray-900">
                      ₹{item.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {partnerPerformance.length === 0 && (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No partner data found
              </h3>

              <p className="mt-2 text-gray-600">
                Add delivery partners to view performance.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Delivery Orders
          </h2>

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No delivery orders found
              </h3>

              <p className="mt-2 text-gray-600">
                Change date range or filters to view delivery performance.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#fff7ed] text-[#7a1e13]">
                    <th className="border-b px-4 py-3">Order</th>
                    <th className="border-b px-4 py-3">Customer</th>
                    <th className="border-b px-4 py-3">Delivery</th>
                    <th className="border-b px-4 py-3">Partner</th>
                    <th className="border-b px-4 py-3">Status</th>
                    <th className="border-b px-4 py-3">Out Time</th>
                    <th className="border-b px-4 py-3">Delivered Time</th>
                    <th className="border-b px-4 py-3">Duration</th>
                    <th className="border-b px-4 py-3">Amount</th>
                    <th className="border-b px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
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
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <p>{getOrderDeliveryDate(order) || "N/A"}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {getOrderDeliverySlot(order)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {order.deliveryPartner ? (
                          <div>
                            <p className="font-semibold text-gray-900">
                              {order.deliveryPartner.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.deliveryPartner.phone}
                            </p>
                          </div>
                        ) : (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {order.status || "Pending"}
                        </span>

                        {order.deliveryFailureReason && (
                          <p className="mt-2 max-w-[200px] text-xs text-red-600">
                            {order.deliveryFailureReason}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {formatDateTime(order.outForDeliveryAt)}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {formatDateTime(order.deliveredAt)}
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {getDeliveryMinutes(order) !== null
                          ? `${getDeliveryMinutes(order)}m`
                          : "N/A"}
                      </td>

                      <td className="px-4 py-3 font-bold text-gray-900">
                        ₹{order.total || 0}
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
