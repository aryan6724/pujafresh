"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

type GuideSection = {
  id: string;
  title: string;
  category:
    | "Overview"
    | "Customer"
    | "Admin"
    | "Delivery"
    | "Marketing"
    | "Operations"
    | "Testing"
    | "Interview";
  description: string;
  points: string[];
  route?: string;
};

const techStack = [
  {
    title: "Frontend",
    value: "Next.js App Router, React, TypeScript, Tailwind CSS",
  },
  {
    title: "State & Storage",
    value: "React hooks, Context API, browser localStorage for demo data",
  },
  {
    title: "UI / UX",
    value: "Responsive layouts, dashboard cards, filters, tables and action buttons",
  },
  {
    title: "Business Modules",
    value:
      "Orders, checkout, delivery, payments, invoices, notifications, coupons, loyalty and support",
  },
];

const demoFlow = [
  "Customer browses products and adds items to cart.",
  "Customer checks out with pincode, delivery date, slot and payment method.",
  "Admin views order and verifies payment if required.",
  "Admin assigns order to delivery partner.",
  "Delivery partner logs in and updates Out for Delivery / Delivered status.",
  "Customer tracks order and receives notifications.",
  "Customer submits delivery feedback after delivery.",
  "Admin reviews feedback, audit trail, action center and reports.",
];

const guideSections: GuideSection[] = [
  {
    id: "project-overview",
    title: "Project Overview",
    category: "Overview",
    description:
      "PujaFresh is a full e-commerce demo platform for fresh pooja essentials with customer, admin and delivery workflows.",
    points: [
      "Built as a portfolio-ready full-stack style project using Next.js.",
      "Covers real business flows: product browsing, checkout, order management, delivery and feedback.",
      "Uses localStorage for demo persistence so the project can run without a backend during presentation.",
      "Includes admin tools for operations, marketing, reports, backups and deployment readiness.",
    ],
    route: "/",
  },
  {
    id: "customer-flow",
    title: "Customer Flow",
    category: "Customer",
    description:
      "Customer can shop, checkout, track orders, view notifications and submit feedback.",
    points: [
      "Product browsing, cart, wishlist and checkout flow.",
      "Pincode serviceability check and delivery slot selection.",
      "Track Order page for order status visibility.",
      "Customer Notification page for order, payment and delivery alerts.",
      "Delivery Feedback form after successful delivery.",
    ],
    route: "/track-order",
  },
  {
    id: "admin-flow",
    title: "Admin Operations",
    category: "Admin",
    description:
      "Admin can manage the complete business workflow from a grouped control center.",
    points: [
      "Admin dashboard with grouped modules for faster navigation.",
      "Order status updates with inventory restoration on cancellation.",
      "Customer management, reviews, support and newsletter modules.",
      "Backup, demo data, system health and deployment checklist for project safety.",
      "Audit Trail and Action Center for professional admin monitoring.",
    ],
    route: "/admin",
  },
  {
    id: "delivery-system",
    title: "Delivery Management",
    category: "Delivery",
    description:
      "Delivery module supports areas, slots, partners, assignments, calendar and performance tracking.",
    points: [
      "Admin can manage serviceable delivery areas and delivery slots.",
      "Orders can be assigned manually or automatically to delivery partners.",
      "Delivery partner portal supports status updates.",
      "Delivery performance and feedback dashboards help admin monitor service quality.",
    ],
    route: "/admin/delivery-assignments",
  },
  {
    id: "payments-invoices",
    title: "Payments & Invoices",
    category: "Operations",
    description:
      "Admin can verify payments and customers can generate invoices from their order ID.",
    points: [
      "Payment Verification page for pending, failed, received and refunded payments.",
      "UPI/manual payment reference tracking.",
      "Invoice page supports print and Save as PDF.",
      "Admin invoice dashboard includes filters, revenue stats and CSV export.",
    ],
    route: "/admin/payments",
  },
  {
    id: "marketing",
    title: "Marketing & Retention",
    category: "Marketing",
    description:
      "Marketing features include coupons, coupon usage, loyalty, newsletter and notification broadcast.",
    points: [
      "Coupon system with usage tracking and customer savings.",
      "Loyalty points earned and redeemed during checkout.",
      "Newsletter subscriber management.",
      "Admin Notification Broadcast for sending custom customer alerts.",
      "Notification logs for tracking all generated alerts.",
    ],
    route: "/admin/notification-broadcast",
  },
  {
    id: "testing-demo",
    title: "Testing & Demo Tools",
    category: "Testing",
    description:
      "Special admin tools make the project easier to test, present and recover.",
    points: [
      "Demo Data Seeder creates sample orders in multiple statuses.",
      "Backup & Restore exports and imports localStorage data as JSON.",
      "System Health checks if important modules are ready.",
      "Deployment Checklist tracks final testing tasks before presentation.",
    ],
    route: "/admin/deployment-checklist",
  },
  {
    id: "interview-points",
    title: "Interview Talking Points",
    category: "Interview",
    description:
      "These are strong points to explain during internship or fresher interviews.",
    points: [
      "I designed the project around real e-commerce business workflows, not only static UI.",
      "I separated customer, admin and delivery partner responsibilities.",
      "I used reusable utility files for storage, coupons, loyalty, notifications and delivery modules.",
      "I added operational modules like audit trail, action center, system health and backup to make the project more professional.",
      "The project can later be upgraded from localStorage to a real backend like MongoDB/PostgreSQL with authentication and APIs.",
    ],
  },
];

const importantRoutes = [
  { label: "Store Home", href: "/" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout", href: "/checkout" },
  { label: "Track Order", href: "/track-order" },
  { label: "Notifications", href: "/notifications" },
  { label: "Invoice", href: "/invoice" },
  { label: "Admin Dashboard", href: "/admin" },
  { label: "Action Center", href: "/admin/action-center" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Invoices", href: "/admin/invoices" },
  { label: "Delivery Assignments", href: "/admin/delivery-assignments" },
  { label: "Partner Portal", href: "/delivery-partner" },
  { label: "Audit Trail", href: "/admin/audit-log" },
  { label: "System Health", href: "/admin/system-health" },
  { label: "Deployment Checklist", href: "/admin/deployment-checklist" },
];

const categoryFilters = [
  "All",
  "Overview",
  "Customer",
  "Admin",
  "Delivery",
  "Marketing",
  "Operations",
  "Testing",
  "Interview",
];

const getCategoryBadgeClass = (category: string) => {
  if (category === "Customer") return "bg-green-50 text-green-700";
  if (category === "Admin") return "bg-indigo-50 text-indigo-700";
  if (category === "Delivery") return "bg-blue-50 text-blue-700";
  if (category === "Marketing") return "bg-[#fff7ed] text-[#7a1e13]";
  if (category === "Operations") return "bg-orange-50 text-orange-700";
  if (category === "Testing") return "bg-purple-50 text-purple-700";
  if (category === "Interview") return "bg-pink-50 text-pink-700";

  return "bg-gray-100 text-gray-700";
};

export default function AdminProjectGuidePage() {
  const router = useRouter();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  const filteredSections = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return guideSections.filter((section) => {
      const matchesCategory =
        categoryFilter === "All" || section.category === categoryFilter;

      const matchesSearch =
        search.length === 0 ||
        section.title.toLowerCase().includes(search) ||
        section.description.toLowerCase().includes(search) ||
        section.category.toLowerCase().includes(search) ||
        section.points.some((point) => point.toLowerCase().includes(search));

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchQuery]);

  const copyInterviewSummary = async () => {
    const summary = `PujaFresh is a Next.js e-commerce project for fresh pooja essentials. It includes customer shopping, cart, checkout, order tracking, notifications, invoices and delivery feedback. On the admin side, it includes product management, order management, payment verification, delivery partner assignment, reports, coupons, loyalty points, support tickets, backup/restore, audit trail, action center, system health and deployment checklist. I used TypeScript, Tailwind CSS, React hooks, Context API and browser localStorage for demo persistence.`;

    try {
      await navigator.clipboard.writeText(summary);
      alert("Interview summary copied");
    } catch {
      alert("Could not copy summary");
    }
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
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Documentation
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Project Guide
          </h1>

          <p className="mt-4 max-w-4xl text-orange-50">
            Use this page during demo, portfolio explanation or interview
            preparation to explain what the project does, what modules it has
            and how the full workflow works.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Back to Admin
            </Link>

            <button
              onClick={copyInterviewSummary}
              className="rounded border border-white px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
            >
              Copy Interview Summary
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {techStack.map((item) => (
            <div key={item.title} className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7a1e13]">
                {item.title}
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-700">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              Complete Demo Flow
            </h2>

            <div className="mt-5 grid gap-3">
              {demoFlow.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7a1e13] text-sm font-black text-white">
                    {index + 1}
                  </span>

                  <p className="text-sm font-semibold leading-6 text-gray-700">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              Important Routes
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Open these pages while testing or presenting the project.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {importantRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="rounded border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  {route.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_130px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Guide
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search customer, admin, delivery, interview..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              />
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
                {categoryFilters.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All");
                }}
                className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredSections.map((section) => (
            <div
              key={section.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryBadgeClass(
                      section.category
                    )}`}
                  >
                    {section.category}
                  </span>

                  <h2 className="mt-3 text-xl font-black text-gray-900">
                    {section.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {section.description}
                  </p>

                  <ul className="mt-4 grid gap-2 text-sm leading-6 text-gray-700">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#f97316]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {section.route && (
                  <Link
                    href={section.route}
                    className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
                  >
                    Open Module
                  </Link>
                )}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                No guide section found
              </h2>

              <p className="mt-2 text-gray-600">
                Try changing search or category filter.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
