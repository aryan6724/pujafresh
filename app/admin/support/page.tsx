"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { addSupportReplyNotification, addSupportStatusNotification } from "@/utils/customerNotificationStorage";

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

const SUPPORT_TICKETS_KEY = "pujafresh-support-tickets";

const statusOptions = ["All Tickets", "Open", "In Progress", "Resolved", "Closed"];
const priorityOptions = ["All Priorities", "High", "Medium", "Low"];
const categoryOptions = [
  "All Categories",
  "Order Related",
  "Payment Issue",
  "Delivery Issue",
  "Return / Refund",
  "Product Quality",
  "Coupon / Loyalty",
  "Other",
];

const dispatchSupportTicketsUpdated = () => {
  window.dispatchEvent(new Event("pujafresh-support-tickets-updated"));
};

export default function AdminSupportPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Tickets");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadTickets();
    setIsCheckingAuth(false);

    window.addEventListener("storage", loadTickets);
    window.addEventListener("pujafresh-support-tickets-updated", loadTickets);

    return () => {
      window.removeEventListener("storage", loadTickets);
      window.removeEventListener("pujafresh-support-tickets-updated", loadTickets);
    };
  }, [router]);

  const loadTickets = () => {
    const savedTickets = localStorage.getItem(SUPPORT_TICKETS_KEY);

    if (!savedTickets) {
      setTickets([]);
      return;
    }

    try {
      const parsedTickets = JSON.parse(savedTickets) as SupportTicket[];

      setTickets(Array.isArray(parsedTickets) ? parsedTickets : []);
    } catch {
      setTickets([]);
    }
  };

  const saveTickets = (updatedTickets: SupportTicket[]) => {
    setTickets(updatedTickets);
    localStorage.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(updatedTickets));
    dispatchSupportTicketsUpdated();
  };

  const filteredTickets = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        search.length === 0 ||
        ticket.id.toLowerCase().includes(search) ||
        ticket.customerName.toLowerCase().includes(search) ||
        ticket.customerEmail.toLowerCase().includes(search) ||
        ticket.customerPhone.toLowerCase().includes(search) ||
        ticket.orderId?.toLowerCase().includes(search) ||
        ticket.subject.toLowerCase().includes(search) ||
        ticket.message.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Tickets" || ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All Priorities" ||
        ticket.priority === priorityFilter;

      const matchesCategory =
        categoryFilter === "All Categories" ||
        ticket.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "Open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "In Progress").length,
      resolved: tickets.filter((ticket) => ticket.status === "Resolved").length,
      highPriority: tickets.filter((ticket) => ticket.priority === "High").length,
    };
  }, [tickets]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket["status"]) => {
    const updatedTickets = tickets.map((ticket) =>
      ticket.id === ticketId
        ? {
            ...ticket,
            status,
            updatedAt: new Date().toISOString(),
          }
        : ticket
    );

    const updatedTicket = updatedTickets.find((ticket) => ticket.id === ticketId);

    saveTickets(updatedTickets);

    if (updatedTicket) {
      addSupportStatusNotification({
        customerEmail: updatedTicket.customerEmail,
        customerPhone: updatedTicket.customerPhone,
        ticketId: updatedTicket.id,
        status,
      });
    }

    toast.success(`Ticket marked as ${status}`);
  };

  const replyToTicket = (ticket: SupportTicket) => {
    const reply = window.prompt("Write admin reply", ticket.adminReply || "");

    if (!reply || reply.trim().length < 3) {
      toast.error("Please enter a valid reply");
      return;
    }

    const updatedTickets = tickets.map((item) =>
      item.id === ticket.id
        ? {
            ...item,
            adminReply: reply.trim(),
            status: item.status === "Open" ? "In Progress" : item.status,
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    const updatedTicket = updatedTickets.find((item) => item.id === ticket.id);

    saveTickets(updatedTickets);

    if (updatedTicket) {
      addSupportReplyNotification({
        customerEmail: updatedTicket.customerEmail,
        customerPhone: updatedTicket.customerPhone,
        ticketId: updatedTicket.id,
        replyPreview: reply.trim().slice(0, 100),
      });
    }

    toast.success("Reply saved successfully");
  };

  const deleteTicket = (ticketId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this support ticket?"
    );

    if (!confirmDelete) return;

    const updatedTickets = tickets.filter((ticket) => ticket.id !== ticketId);
    saveTickets(updatedTickets);
    toast.success("Ticket deleted successfully");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Tickets");
    setPriorityFilter("All Priorities");
    setCategoryFilter("All Categories");
  };

  const handleExportCsv = () => {
    if (filteredTickets.length === 0) {
      toast.error("No support tickets to export");
      return;
    }

    const headers = [
      "Ticket ID",
      "Customer",
      "Email",
      "Phone",
      "Order ID",
      "Category",
      "Priority",
      "Status",
      "Subject",
      "Message",
      "Admin Reply",
      "Created At",
      "Updated At",
    ];

    const rows = filteredTickets.map((ticket) => [
      ticket.id,
      ticket.customerName,
      ticket.customerEmail,
      ticket.customerPhone,
      ticket.orderId || "",
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.subject,
      ticket.message,
      ticket.adminReply || "",
      formatDateTime(ticket.createdAt),
      ticket.updatedAt ? formatDateTime(ticket.updatedAt) : "",
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
    link.download = `pujafresh-support-tickets-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Support tickets CSV exported");
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
              Support Tickets
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage customer support requests, replies and ticket statuses.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadTickets}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Tickets
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Open</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.open}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              In Progress
            </p>
            <h2 className="mt-2 text-3xl font-bold text-blue-600">
              {stats.inProgress}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Resolved</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.resolved}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              High Priority
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.highPriority}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_220px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Tickets
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by ticket ID, customer, order ID or subject..."
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
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Priority
              </label>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Category
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {categoryOptions.map((category) => (
                  <option key={category}>{category}</option>
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
            Showing {filteredTickets.length} of {tickets.length} ticket
            {tickets.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No support tickets found
              </h2>

              <p className="mt-2 text-gray-600">
                Customer support tickets will appear here after submission.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
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

                        <span className="rounded bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {ticket.category}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-gray-900">
                        {ticket.subject}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {ticket.customerName} • {ticket.customerEmail} •{" "}
                        {ticket.customerPhone}
                      </p>

                      {ticket.orderId && (
                        <p className="mt-1 text-sm font-semibold text-[#7a1e13]">
                          Order ID: {ticket.orderId}
                        </p>
                      )}

                      <p className="mt-3 text-sm text-gray-700">
                        {ticket.message}
                      </p>

                      {ticket.adminReply && (
                        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                          <p className="font-bold">Admin Reply</p>
                          <p className="mt-1">{ticket.adminReply}</p>
                        </div>
                      )}

                      <p className="mt-3 text-xs font-semibold text-gray-500">
                        Created: {formatDateTime(ticket.createdAt)}
                        {ticket.updatedAt
                          ? ` • Updated: ${formatDateTime(ticket.updatedAt)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap content-start gap-2">
                      <button
                        onClick={() => updateTicketStatus(ticket.id, "In Progress")}
                        disabled={ticket.status === "In Progress"}
                        className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        In Progress
                      </button>

                      <button
                        onClick={() => updateTicketStatus(ticket.id, "Resolved")}
                        disabled={ticket.status === "Resolved"}
                        className="rounded bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Resolve
                      </button>

                      <button
                        onClick={() => updateTicketStatus(ticket.id, "Closed")}
                        disabled={ticket.status === "Closed"}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        Close
                      </button>

                      <button
                        onClick={() => replyToTicket(ticket)}
                        className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white hover:bg-[#ea580c]"
                      >
                        Reply
                      </button>

                      <button
                        onClick={() => deleteTicket(ticket.id)}
                        className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
