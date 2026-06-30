"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  addCustomerNotification,
  CustomerNotificationPriority,
  CustomerNotificationType,
  getAllCustomerNotifications,
} from "@/utils/customerNotificationStorage";

type Recipient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: "Orders" | "Loyalty" | "Newsletter" | "Support";
};

type Order = {
  id: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
};

type LoyaltyCustomer = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

type NewsletterSubscriber = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type SupportTicket = {
  id?: string;
  customerName?: string;
  name?: string;
  customerEmail?: string;
  email?: string;
  customerPhone?: string;
  phone?: string;
};

type BroadcastFormData = {
  audience: string;
  type: CustomerNotificationType;
  priority: CustomerNotificationPriority;
  title: string;
  message: string;
  actionHref: string;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const LOYALTY_POINTS_KEY = "pujafresh-loyalty-points";
const NEWSLETTER_STORAGE_KEY = "pujafresh-newsletter-subscribers";
const SUPPORT_TICKETS_KEY = "pujafresh-support-tickets";

const notificationTypes: CustomerNotificationType[] = [
  "System",
  "Order",
  "Payment",
  "Delivery",
  "Support",
  "Loyalty",
  "Coupon",
  "Refund",
];

const priorityOptions: CustomerNotificationPriority[] = [
  "Low",
  "Normal",
  "High",
];

const defaultFormData: BroadcastFormData = {
  audience: "All Customers",
  type: "System",
  priority: "Normal",
  title: "",
  message: "",
  actionHref: "",
};

const normalizeEmail = (email?: string) => {
  return email?.trim().toLowerCase() || "";
};

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

const getRecipientKey = (recipient: Recipient) => {
  return normalizeEmail(recipient.email) || normalizePhone(recipient.phone);
};

const readJsonArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue) as T[];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdminNotificationBroadcastPage() {
  const router = useRouter();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [formData, setFormData] = useState<BroadcastFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [latestNotificationsCount, setLatestNotificationsCount] = useState(0);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadRecipients();
    setIsCheckingAuth(false);
  }, [router]);

  const loadRecipients = () => {
    const collectedRecipients: Recipient[] = [];

    const orders = readJsonArray<Order>(ORDERS_STORAGE_KEY);
    orders.forEach((order) => {
      const email = order.customerEmail || order.customer?.email;
      const phone = order.customerPhone || order.customer?.phone;

      if (!email && !phone) return;

      collectedRecipients.push({
        id: `order-${order.id}`,
        name:
          order.customerName ||
          order.customer?.fullName ||
          order.customer?.name ||
          email ||
          phone ||
          "Customer",
        email,
        phone,
        source: "Orders",
      });
    });

    const loyaltyCustomers = readJsonArray<LoyaltyCustomer>(LOYALTY_POINTS_KEY);
    loyaltyCustomers.forEach((customer, index) => {
      if (!customer.customerEmail && !customer.customerPhone) return;

      collectedRecipients.push({
        id: `loyalty-${index}`,
        name:
          customer.customerName ||
          customer.customerEmail ||
          customer.customerPhone ||
          "Loyalty Customer",
        email: customer.customerEmail,
        phone: customer.customerPhone,
        source: "Loyalty",
      });
    });

    const newsletterSubscribers = readJsonArray<NewsletterSubscriber>(
      NEWSLETTER_STORAGE_KEY
    );
    newsletterSubscribers.forEach((subscriber, index) => {
      if (!subscriber.email && !subscriber.phone) return;

      collectedRecipients.push({
        id: subscriber.id || `newsletter-${index}`,
        name:
          subscriber.name ||
          subscriber.email ||
          subscriber.phone ||
          "Newsletter Subscriber",
        email: subscriber.email,
        phone: subscriber.phone,
        source: "Newsletter",
      });
    });

    const supportTickets = readJsonArray<SupportTicket>(SUPPORT_TICKETS_KEY);
    supportTickets.forEach((ticket, index) => {
      const email = ticket.customerEmail || ticket.email;
      const phone = ticket.customerPhone || ticket.phone;

      if (!email && !phone) return;

      collectedRecipients.push({
        id: ticket.id || `support-${index}`,
        name:
          ticket.customerName ||
          ticket.name ||
          email ||
          phone ||
          "Support Customer",
        email,
        phone,
        source: "Support",
      });
    });

    const uniqueRecipientMap = new Map<string, Recipient>();

    collectedRecipients.forEach((recipient) => {
      const key = getRecipientKey(recipient);

      if (!key) return;

      const existingRecipient = uniqueRecipientMap.get(key);

      if (!existingRecipient) {
        uniqueRecipientMap.set(key, recipient);
        return;
      }

      const sourceSet = new Set([
        ...existingRecipient.source.split(", "),
        recipient.source,
      ]);

      uniqueRecipientMap.set(key, {
        ...existingRecipient,
        name: existingRecipient.name || recipient.name,
        email: existingRecipient.email || recipient.email,
        phone: existingRecipient.phone || recipient.phone,
        source: Array.from(sourceSet).join(", ") as Recipient["source"],
      });
    });

    setRecipients(Array.from(uniqueRecipientMap.values()));
    setLatestNotificationsCount(getAllCustomerNotifications().length);
  };

  const audienceOptions = useMemo(() => {
    return [
      "All Customers",
      "Order Customers",
      "Loyalty Customers",
      "Newsletter Subscribers",
      "Support Customers",
    ];
  }, []);

  const selectedAudienceRecipients = useMemo(() => {
    return recipients.filter((recipient) => {
      if (formData.audience === "All Customers") return true;
      if (formData.audience === "Order Customers") {
        return recipient.source.includes("Orders");
      }
      if (formData.audience === "Loyalty Customers") {
        return recipient.source.includes("Loyalty");
      }
      if (formData.audience === "Newsletter Subscribers") {
        return recipient.source.includes("Newsletter");
      }
      if (formData.audience === "Support Customers") {
        return recipient.source.includes("Support");
      }

      return true;
    });
  }, [formData.audience, recipients]);

  const filteredRecipients = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return selectedAudienceRecipients.filter((recipient) => {
      return (
        search.length === 0 ||
        recipient.name.toLowerCase().includes(search) ||
        recipient.email?.toLowerCase().includes(search) ||
        recipient.phone?.includes(search) ||
        recipient.source.toLowerCase().includes(search)
      );
    });
  }, [searchQuery, selectedAudienceRecipients]);

  const stats = useMemo(() => {
    return {
      totalRecipients: recipients.length,
      selectedAudience: selectedAudienceRecipients.length,
      orderCustomers: recipients.filter((recipient) =>
        recipient.source.includes("Orders")
      ).length,
      loyaltyCustomers: recipients.filter((recipient) =>
        recipient.source.includes("Loyalty")
      ).length,
      newsletterCustomers: recipients.filter((recipient) =>
        recipient.source.includes("Newsletter")
      ).length,
      supportCustomers: recipients.filter((recipient) =>
        recipient.source.includes("Support")
      ).length,
    };
  }, [recipients, selectedAudienceRecipients.length]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const sendBroadcast = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Please enter notification title and message");
      return;
    }

    if (selectedAudienceRecipients.length === 0) {
      toast.error("No recipients found for selected audience");
      return;
    }

    const confirmSend = window.confirm(
      `Send this notification to ${selectedAudienceRecipients.length} customer(s)?`
    );

    if (!confirmSend) return;

    let sentCount = 0;

    selectedAudienceRecipients.forEach((recipient) => {
      const createdNotification = addCustomerNotification({
        customerEmail: recipient.email,
        customerPhone: recipient.phone,
        type: formData.type,
        priority: formData.priority,
        title: formData.title.trim(),
        message: formData.message.trim(),
        actionHref: formData.actionHref.trim() || undefined,
      });

      if (createdNotification) {
        sentCount += 1;
      }
    });

    setLatestNotificationsCount(getAllCustomerNotifications().length);
    setFormData(defaultFormData);
    toast.success(`Broadcast sent to ${sentCount} customer(s)`);
  };

  const loadTemplate = (
    title: string,
    message: string,
    type: CustomerNotificationType,
    actionHref: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      title,
      message,
      type,
      actionHref,
    }));
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
              Notification Broadcast
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Send custom notifications to customers for offers, festival
              reminders, delivery updates and support announcements.
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
              href="/notifications"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Customer View
            </Link>

            <button
              onClick={loadRecipients}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Recipients</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalRecipients}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Selected</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.selectedAudience}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.orderCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Loyalty</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.loyaltyCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Newsletter</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.newsletterCustomers}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Alerts
            </p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {latestNotificationsCount}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={sendBroadcast}
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900">
              Create Broadcast
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Audience
                </label>

                <select
                  name="audience"
                  value={formData.audience}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  {audienceOptions.map((audience) => (
                    <option key={audience}>{audience}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Notification Type
                </label>

                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  {notificationTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Priority
                </label>

                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Action Link
                </label>

                <input
                  name="actionHref"
                  value={formData.actionHref}
                  onChange={handleChange}
                  placeholder="/products or /support"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-bold text-gray-700">
                  Title *
                </label>

                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Example: Special Monday Puja Offer"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-bold text-gray-700">
                  Message *
                </label>

                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write notification message..."
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-8 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              Send Broadcast
            </button>
          </form>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Quick Templates
            </h2>

            <div className="mt-5 grid gap-3">
              <button
                onClick={() =>
                  loadTemplate(
                    "Festival offer is live",
                    "Fresh flowers, pooja samagri and festival kits are available with special festive pricing.",
                    "Coupon",
                    "/products"
                  )
                }
                className="rounded border border-gray-200 p-4 text-left hover:border-[#7a1e13]"
              >
                <p className="font-bold text-gray-900">Festival Offer</p>
                <p className="mt-1 text-sm text-gray-600">
                  Send offer alert to customers.
                </p>
              </button>

              <button
                onClick={() =>
                  loadTemplate(
                    "Morning delivery reminder",
                    "Place your order today to receive fresh pooja essentials in the morning delivery slot.",
                    "Delivery",
                    "/products"
                  )
                }
                className="rounded border border-gray-200 p-4 text-left hover:border-[#7a1e13]"
              >
                <p className="font-bold text-gray-900">Delivery Reminder</p>
                <p className="mt-1 text-sm text-gray-600">
                  Encourage morning delivery orders.
                </p>
              </button>

              <button
                onClick={() =>
                  loadTemplate(
                    "Support update",
                    "Our support team is available to help with orders, delivery and product queries.",
                    "Support",
                    "/support"
                  )
                }
                className="rounded border border-gray-200 p-4 text-left hover:border-[#7a1e13]"
              >
                <p className="font-bold text-gray-900">Support Update</p>
                <p className="mt-1 text-sm text-gray-600">
                  Notify customers about support help.
                </p>
              </button>

              <button
                onClick={() =>
                  loadTemplate(
                    "Rewards reminder",
                    "You can use your loyalty points on eligible PujaFresh orders and save more.",
                    "Loyalty",
                    "/loyalty"
                  )
                }
                className="rounded border border-gray-200 p-4 text-left hover:border-[#7a1e13]"
              >
                <p className="font-bold text-gray-900">Rewards Reminder</p>
                <p className="mt-1 text-sm text-gray-600">
                  Push loyalty engagement.
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Audience Preview
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Showing {filteredRecipients.length} of{" "}
                {selectedAudienceRecipients.length} selected recipient
                {selectedAudienceRecipients.length !== 1 ? "s" : ""}.
              </p>
            </div>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search recipients..."
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13] md:w-80"
            />
          </div>

          {filteredRecipients.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                No recipients found
              </h3>

              <p className="mt-2 text-gray-600">
                Customers will appear here after orders, newsletter signups,
                support tickets or loyalty activity.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#fff7ed] text-[#7a1e13]">
                    <th className="border-b px-4 py-3">Customer</th>
                    <th className="border-b px-4 py-3">Email</th>
                    <th className="border-b px-4 py-3">Phone</th>
                    <th className="border-b px-4 py-3">Source</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecipients.map((recipient) => (
                    <tr key={getRecipientKey(recipient)} className="border-b">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {recipient.name}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {recipient.email || "N/A"}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {recipient.phone || "N/A"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {recipient.source}
                        </span>
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
