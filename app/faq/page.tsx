"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { FAQ, faqCategories, getFaqs } from "@/utils/faqStorage";

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  useEffect(() => {
    setFaqs(getFaqs());
  }, []);

  const activeFaqs = useMemo(() => {
    return faqs
      .filter((faq) => faq.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [faqs]);

  const featuredFaqs = useMemo(() => {
    return activeFaqs.filter((faq) => faq.isFeatured).slice(0, 4);
  }, [activeFaqs]);

  const filteredFaqs = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return activeFaqs.filter((faq) => {
      const matchesSearch =
        search.length === 0 ||
        faq.question.toLowerCase().includes(search) ||
        faq.answer.toLowerCase().includes(search) ||
        faq.category.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" || faq.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [activeFaqs, searchQuery, categoryFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
  };

  const toggleFaq = (faqId: string) => {
    setOpenFaqId((currentFaqId) => (currentFaqId === faqId ? null : faqId));
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-[#7a1e13] p-8 text-white shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
              PujaFresh Help Center
            </p>

            <h1 className="mt-3 text-3xl font-black md:text-4xl">
              Frequently Asked Questions
            </h1>

            <p className="mt-3 text-white/80">
              Find quick answers about orders, delivery, payments, coupons,
              loyalty points, returns and support.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/support"
                className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13]"
              >
                Contact Support
              </Link>

              <Link
                href="/orders"
                className="rounded border border-white/40 px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
              >
                My Orders
              </Link>
            </div>
          </div>
        </div>

        {featuredFaqs.length > 0 && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {featuredFaqs.map((faq) => (
              <button
                key={faq.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(faq.category);
                  setOpenFaqId(faq.id);
                }}
                className="rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                  {faq.category}
                </span>

                <h2 className="mt-3 font-bold text-gray-900">
                  {faq.question}
                </h2>

                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {faq.answer}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search FAQ
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by question, answer or category..."
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
                <option>All Categories</option>
                {faqCategories.map((category) => (
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
            Showing {filteredFaqs.length} FAQ
            {filteredFaqs.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No FAQ found
              </h2>

              <p className="mt-2 text-gray-600">
                Try changing your search or category filter.
              </p>

              <Link
                href="/support"
                className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
              >
                Raise Support Ticket
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;

                return (
                  <div key={faq.id} className="py-4">
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <div>
                        <span className="rounded bg-[#fff7ed] px-2 py-1 text-xs font-bold text-[#7a1e13]">
                          {faq.category}
                        </span>

                        <h3 className="mt-2 text-lg font-bold text-gray-900">
                          {faq.question}
                        </h3>
                      </div>

                      <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-lg font-bold text-[#7a1e13]">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-600">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Still need help?
          </h2>

          <p className="mt-2 text-gray-600">
            Submit a support ticket and our team will respond from the admin
            panel.
          </p>

          <Link
            href="/support"
            className="mt-5 inline-block rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#5f160e]"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </main>
  );
}
