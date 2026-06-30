"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Product } from "@/types";

type OrderItem = Product & {
  quantity: number;
};

type CustomerDetails = {
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  deliverySlotDetails?: {
    label?: string;
  };
};

type Order = {
  id: string;
  items: OrderItem[];
  customer: CustomerDetails;
  subtotal?: number;
  discountAmount?: number;
  deliveryCharge?: number;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
};

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  lastOrderStatus: string;
  preferredPaymentMethod: string;
  orders: Order[];
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";

const customerTypeOptions = [
  "All Customers",
  "New Customers",
  "Repeat Customers",
  "High Value Customers",
  "Active Order Customers",
];

export default function AdminCustomersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("All Customers");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders) as Order[];

        if (Array.isArray(parsedOrders)) {
          setOrders(parsedOrders);
        }
      } catch {
        setOrders([]);
      }
    }

    setIsCheckingAuth(false);
  }, [router]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCustomerName = (order: Order) => {
    return (
      order.customer?.fullName ||
      order.customer?.name ||
      order.customer?.email ||
      "Guest Customer"
    );
  };

  const getCustomerEmail = (order: Order) => {
    return order.customer?.email?.trim().toLowerCase() || "no-email";
  };

  const getCustomerPhone = (order: Order) => {
    return order.customer?.phone?.trim() || "Not provided";
  };

  const getCustomerAddress = (order: Order) => {
    const addressParts = [
      order.customer?.address,
      order.customer?.city,
      order.customer?.pincode,
    ].filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(", ") : "Not provided";
  };

  const getPreferredPaymentMethod = (customerOrders: Order[]) => {
    const paymentMap = new Map<string, number>();

    customerOrders.forEach((order) => {
      const method = order.paymentMethod || "Not provided";
      paymentMap.set(method, (paymentMap.get(method) || 0) + 1);
    });

    return (
      Array.from(paymentMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Not provided"
    );
  };

  const customerSummaries = useMemo<CustomerSummary[]>(() => {
    const customerMap = new Map<string, Order[]>();

    orders.forEach((order) => {
      const customerId = getCustomerEmail(order) || getCustomerPhone(order);

      const existingOrders = customerMap.get(customerId) || [];
      customerMap.set(customerId, [...existingOrders, order]);
    });

    return Array.from(customerMap.entries())
      .map(([customerId, customerOrders]) => {
        const sortedOrders = [...customerOrders].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const firstOrder = [...customerOrders].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];

        const latestOrder = sortedOrders[0];

        const deliveredOrders = customerOrders.filter(
          (order) => order.status === "Delivered" || order.status === "Closed"
        ).length;

        const cancelledOrders = customerOrders.filter(
          (order) => order.status === "Cancelled"
        ).length;

        const activeOrders = customerOrders.filter(
          (order) =>
            order.status !== "Delivered" &&
            order.status !== "Closed" &&
            order.status !== "Cancelled" &&
            order.status !== "Archived"
        ).length;

        const totalSpent = customerOrders
          .filter((order) => order.status !== "Cancelled")
          .reduce((sum, order) => sum + Number(order.total || 0), 0);

        return {
          id: customerId,
          name: getCustomerName(latestOrder),
          email:
            latestOrder.customer?.email?.trim() ||
            (customerId === "no-email" ? "Not provided" : customerId),
          phone: getCustomerPhone(latestOrder),
          address: getCustomerAddress(latestOrder),
          totalOrders: customerOrders.length,
          deliveredOrders,
          cancelledOrders,
          activeOrders,
          totalSpent,
          averageOrderValue:
            customerOrders.length > 0
              ? Math.round(totalSpent / customerOrders.length)
              : 0,
          firstOrderDate: firstOrder?.createdAt || latestOrder.createdAt,
          lastOrderDate: latestOrder.createdAt,
          lastOrderStatus: latestOrder.status,
          preferredPaymentMethod: getPreferredPaymentMethod(customerOrders),
          orders: sortedOrders,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return customerSummaries.filter((customer) => {
      const matchesSearch =
        search.length === 0 ||
        customer.name.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.phone.toLowerCase().includes(search) ||
        customer.address.toLowerCase().includes(search);

      const matchesType =
        customerTypeFilter === "All Customers" ||
        (customerTypeFilter === "New Customers" &&
          customer.totalOrders === 1) ||
        (customerTypeFilter === "Repeat Customers" &&
          customer.totalOrders > 1) ||
        (customerTypeFilter === "High Value Customers" &&
          customer.totalSpent >= 2000) ||
        (customerTypeFilter === "Active Order Customers" &&
          customer.activeOrders > 0);

      return matchesSearch && matchesType;
    });
  }, [customerSummaries, searchQuery, customerTypeFilter]);

  const selectedCustomer = useMemo(() => {
    return (
      customerSummaries.find((customer) => customer.id === selectedCustomerId) ||
      null
    );
  }, [customerSummaries, selectedCustomerId]);

  const stats = useMemo(() => {
    const repeatCustomers = customerSummaries.filter(
      (customer) => customer.totalOrders > 1
    ).length;

    const highValueCustomers = customerSummaries.filter(
      (customer) => customer.totalSpent >= 2000
    ).length;

    const activeOrderCustomers = customerSummaries.filter(
      (customer) => customer.activeOrders > 0
    ).length;

    const totalCustomerRevenue = customerSummaries.reduce(
      (sum, customer) => sum + customer.totalSpent,
      0
    );

    return {
      totalCustomers: customerSummaries.length,
      repeatCustomers,
      highValueCustomers,
      activeOrderCustomers,
      totalCustomerRevenue,
    };
  }, [customerSummaries]);

  const clearFilters = () => {
    setSearchQuery("");
    setCustomerTypeFilter("All Customers");
  };

  const handleExportCsv = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customers to export");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Address",
      "Total Orders",
      "Delivered Orders",
      "Cancelled Orders",
      "Active Orders",
      "Total Spent",
      "Average Order Value",
      "First Order Date",
      "Last Order Date",
      "Last Order Status",
      "Preferred Payment Method",
    ];

    const rows = filteredCustomers.map((customer) => [
      customer.name,
      customer.email,
      customer.phone,
      customer.address,
      customer.totalOrders,
      customer.deliveredOrders,
      customer.cancelledOrders,
      customer.activeOrders,
      customer.totalSpent,
      customer.averageOrderValue,
      formatDateTime(customer.firstOrderDate),
      formatDateTime(customer.lastOrderDate),
      customer.lastOrderStatus,
      customer.preferredPaymentMethod,
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
    link.download = `pujafresh-customers-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Customer CSV exported");
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
              Customer Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              View customer profiles, order history and customer value.
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
              onClick={handlePrint}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Print Customers
            </button>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-gray-900">
            PujaFresh Customer Report
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Printed on {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Customers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Repeat Customers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.repeatCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              High Value Customers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.highValueCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Order Customers
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.activeOrderCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Customer Revenue
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              ₹{stats.totalCustomerRevenue}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Customer
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, phone or address..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Customer Type
              </label>

              <select
                value={customerTypeFilter}
                onChange={(event) =>
                  setCustomerTypeFilter(event.target.value)
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {customerTypeOptions.map((type) => (
                  <option key={type}>{type}</option>
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
            Showing {filteredCustomers.length} of {customerSummaries.length}{" "}
            customer{customerSummaries.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {selectedCustomer && (
          <div className="mt-6 rounded-xl border border-[#7a1e13]/20 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedCustomer.name}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {selectedCustomer.email} • {selectedCustomer.phone}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {selectedCustomer.address}
                </p>
              </div>

              <button
                onClick={() => setSelectedCustomerId(null)}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Total Orders
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedCustomer.totalOrders}
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Total Spent
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{selectedCustomer.totalSpent}
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Avg. Order Value
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{selectedCustomer.averageOrderValue}
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="text-xs font-semibold text-gray-500">
                  Preferred Payment
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedCustomer.preferredPaymentMethod}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedCustomer.orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <span className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13]">
                          {order.id}
                        </span>
                      </td>

                      <td className="p-3 text-gray-700">
                        {formatDateTime(order.createdAt)}
                      </td>

                      <td className="p-3 text-gray-700">
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""}
                      </td>

                      <td className="p-3 text-gray-700">
                        {order.paymentMethod || "Not provided"}
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {order.status}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        ₹{order.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No customers found
              </h2>

              <p className="mt-2 text-gray-600">
                Customers will appear here after orders are placed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-[#fff7ed] text-gray-700">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Total Spent</th>
                    <th className="p-3">Avg. Value</th>
                    <th className="p-3">Last Order</th>
                    <th className="p-3">Last Status</th>
                    <th className="p-3 print:hidden">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <p className="font-bold text-gray-900">
                          {customer.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {customer.email}
                        </p>

                        <p className="text-xs text-gray-500">
                          {customer.phone}
                        </p>
                      </td>

                      <td className="p-3">
                        <p className="font-bold text-gray-900">
                          {customer.totalOrders}
                        </p>

                        <p className="text-xs text-gray-500">
                          Active: {customer.activeOrders} • Cancelled:{" "}
                          {customer.cancelledOrders}
                        </p>
                      </td>

                      <td className="p-3 font-bold text-green-700">
                        ₹{customer.totalSpent}
                      </td>

                      <td className="p-3 font-bold text-gray-900">
                        ₹{customer.averageOrderValue}
                      </td>

                      <td className="p-3 text-gray-700">
                        {formatDateTime(customer.lastOrderDate)}
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {customer.lastOrderStatus}
                        </span>
                      </td>

                      <td className="p-3 print:hidden">
                        <button
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className="rounded bg-[#7a1e13] px-3 py-2 text-xs font-bold text-white hover:bg-[#5f160e]"
                        >
                          View Details
                        </button>
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
