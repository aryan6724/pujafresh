"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

type SupportTicket = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId?: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  subject: string;
  message: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
};

type TicketFormData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  subject: string;
  message: string;
};

const SUPPORT_TICKETS_KEY = "pujafresh-support-tickets";

const emptyForm: TicketFormData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  orderId: "",
  category: "Order Related",
  priority: "Medium",
  subject: "",
  message: "",
};

const categories = [
  "Order Related",
  "Payment Issue",
  "Delivery Issue",
  "Return / Refund",
  "Product Quality",
  "Coupon / Loyalty",
  "Other",
];

export default function SupportPage() {
  const { isLoggedIn, user } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [formData, setFormData] = useState<TicketFormData>(emptyForm);
  const [statusFilter, setStatusFilter] = useState("All Tickets");

  useEffect(() => {
    const savedTickets = localStorage.getItem(SUPPORT_TICKETS_KEY);

    if (savedTickets) {
      try {
        const parsedTickets = JSON.parse(savedTickets) as SupportTicket[];

        if (Array.isArray(parsedTickets)) {
          setTickets(parsedTickets);
        }
      } catch {
        setTickets([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    setFormData((prev) => ({
      ...prev,
      customerName: prev.customerName || user.fullName || "",
      customerEmail: prev.customerEmail || user.email || "",
    }));
  }, [isLoggedIn, user]);

  const customerTickets = useMemo(() => {
    if (!isLoggedIn || !user) return [];

    return tickets
      .filter(
        (ticket) =>
          ticket.customerEmail.trim().toLowerCase() ===
          user.email.trim().toLowerCase()
      )
      .filter(
        (ticket) =>
          statusFilter === "All Tickets" || ticket.status === statusFilter
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [tickets, isLoggedIn, user, statusFilter]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const saveTickets = (updatedTickets: SupportTicket[]) => {
    setTickets(updatedTickets);
    localStorage.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(updatedTickets));
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    if (name === "customerPhone") {
      setFormData((prev) => ({
        ...prev,
        customerPhone: value.replace(/\D/g, "").slice(0, 10),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitTicket = (event: FormEvent) => {
    event.preventDefault();

    if (
      !formData.customerName ||
      !formData.customerEmail ||
      !formData.customerPhone ||
      !formData.subject ||
      !formData.message
    ) {
      toast.error("Please fill all required support details");
      return;
    }

    if (formData.customerPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (!formData.customerEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    const now = new Date().toISOString();

    const newTicket: SupportTicket = {
      id: `SUP-${Date.now()}`,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      orderId: formData.orderId.trim(),
      category: formData.category,
      priority: formData.priority,
      subject: formData.subject,
      message: formData.message,
      status: "Open",
      createdAt: now,
      updatedAt: now,
    };

    saveTickets([newTicket, ...tickets]);

    setFormData((prev) => ({
      ...emptyForm,
      customerName: prev.customerName,
      customerEmail: prev.customerEmail,
      customerPhone: prev.customerPhone,
    }));

    toast.success("Support ticket submitted successfully");
  };

  const getStatusClass = (status: string) => {
    if (status === "Open") return "bg-orange-50 text-orange-700";
    if (status === "In Progress") return "bg-blue-50 text-blue-700";
    if (status === "Resolved") return "bg-green-50 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const getPriorityClass = (priority: string) => {
    if (priority === "High") return "bg-red-50 text-red-700";
    if (priority === "Medium") return "bg-orange-50 text-orange-700";
    return "bg-green-50 text-green-700";
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Help & Support
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Raise a support ticket for order, delivery, payment, refund or
              product issues.
            </p>
          </div>

          <Link
            href="/orders"
            className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
          >
            My Orders
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={handleSubmitTicket}
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Create Support Ticket
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Our team will review your request and respond from admin panel.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Full Name *
                </label>

                <input
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Email *
                </label>

                <input
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Phone *
                </label>

                <input
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="10-digit phone number"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Order ID
                </label>

                <input
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Optional: PF-..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Category *
                </label>

                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Priority *
                </label>

                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Subject *
                </label>

                <input
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Briefly describe your issue"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Message *
                </label>

                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Write complete issue details..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              Submit Ticket
            </button>
          </form>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Support Guidelines
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="font-bold text-gray-900">Order Issue</p>
                <p className="mt-1">
                  Mention your order ID for faster resolution.
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="font-bold text-gray-900">Payment Issue</p>
                <p className="mt-1">
                  Include UTR/reference number if payment is already done.
                </p>
              </div>

              <div className="rounded-lg bg-[#fff7ed] p-3">
                <p className="font-bold text-gray-900">Return / Refund</p>
                <p className="mt-1">
                  You can also request return/refund directly from My Orders.
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoggedIn && user && (
          <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  My Support Tickets
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Track your submitted support tickets and admin replies.
                </p>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Tickets</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>
            </div>

            {customerTickets.length === 0 ? (
              <div className="py-10 text-center">
                <h3 className="font-bold text-gray-900">
                  No support tickets found
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Submit your first ticket using the form above.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {customerTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                            {ticket.id}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>

                        <h3 className="mt-3 font-bold text-gray-900">
                          {ticket.subject}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          {ticket.category}
                          {ticket.orderId ? ` • ${ticket.orderId}` : ""}
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-gray-500">
                        {formatDateTime(ticket.createdAt)}
                      </p>
                    </div>

                    <p className="mt-3 text-sm text-gray-700">
                      {ticket.message}
                    </p>

                    {ticket.adminReply && (
                      <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                        <p className="font-bold">Admin Reply</p>
                        <p className="mt-1">{ticket.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
