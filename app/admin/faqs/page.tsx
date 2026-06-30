"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  FAQ,
  faqCategories,
  getFaqs,
  resetFaqsToDefault,
  saveFaqs,
} from "@/utils/faqStorage";

type FAQFormData = {
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
};

const emptyForm: FAQFormData = {
  question: "",
  answer: "",
  category: "Orders",
  isActive: true,
  isFeatured: false,
  sortOrder: "1",
};

const statusOptions = ["All FAQs", "Active", "Inactive", "Featured"];

export default function AdminFAQPage() {
  const router = useRouter();

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [formData, setFormData] = useState<FAQFormData>(emptyForm);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All FAQs");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setFaqs(getFaqs());
    setIsCheckingAuth(false);
  }, [router]);

  const saveFAQList = (updatedFaqs: FAQ[]) => {
    const sortedFaqs = [...updatedFaqs].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    setFaqs(sortedFaqs);
    saveFaqs(sortedFaqs);
  };

  const stats = useMemo(() => {
    return {
      total: faqs.length,
      active: faqs.filter((faq) => faq.isActive).length,
      inactive: faqs.filter((faq) => !faq.isActive).length,
      featured: faqs.filter((faq) => faq.isFeatured).length,
    };
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesSearch =
        search.length === 0 ||
        faq.question.toLowerCase().includes(search) ||
        faq.answer.toLowerCase().includes(search) ||
        faq.category.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" || faq.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All FAQs" ||
        (statusFilter === "Active" && faq.isActive) ||
        (statusFilter === "Inactive" && !faq.isActive) ||
        (statusFilter === "Featured" && faq.isFeatured);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [faqs, searchQuery, categoryFilter, statusFilter]);

  const clearForm = () => {
    setFormData(emptyForm);
    setEditingFaqId(null);
    setShowForm(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setStatusFilter("All FAQs");
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    if (name === "sortOrder") {
      setFormData((prev) => ({
        ...prev,
        sortOrder: value.replace(/\D/g, ""),
      }));
      return;
    }

    if (name === "isActive" || name === "isFeatured") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "true",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveFAQ = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.question || !formData.answer) {
      toast.error("Please fill question and answer");
      return;
    }

    const now = new Date().toISOString();

    if (editingFaqId) {
      const updatedFaqs = faqs.map((faq) =>
        faq.id === editingFaqId
          ? {
              ...faq,
              question: formData.question,
              answer: formData.answer,
              category: formData.category,
              isActive: formData.isActive,
              isFeatured: formData.isFeatured,
              sortOrder: Number(formData.sortOrder || 1),
              updatedAt: now,
            }
          : faq
      );

      saveFAQList(updatedFaqs);
      toast.success("FAQ updated successfully");
      clearForm();
      return;
    }

    const newFaq: FAQ = {
      id: `FAQ-${Date.now()}`,
      question: formData.question,
      answer: formData.answer,
      category: formData.category,
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
      sortOrder: Number(formData.sortOrder || faqs.length + 1),
      createdAt: now,
      updatedAt: now,
    };

    saveFAQList([newFaq, ...faqs]);
    toast.success("FAQ added successfully");
    clearForm();
  };

  const handleEditFAQ = (faq: FAQ) => {
    setEditingFaqId(faq.id);
    setShowForm(true);

    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isActive: faq.isActive,
      isFeatured: faq.isFeatured,
      sortOrder: String(faq.sortOrder),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleFAQStatus = (faqId: string) => {
    const updatedFaqs = faqs.map((faq) =>
      faq.id === faqId
        ? {
            ...faq,
            isActive: !faq.isActive,
            updatedAt: new Date().toISOString(),
          }
        : faq
    );

    saveFAQList(updatedFaqs);
    toast.success("FAQ status updated");
  };

  const toggleFeatured = (faqId: string) => {
    const updatedFaqs = faqs.map((faq) =>
      faq.id === faqId
        ? {
            ...faq,
            isFeatured: !faq.isFeatured,
            updatedAt: new Date().toISOString(),
          }
        : faq
    );

    saveFAQList(updatedFaqs);
    toast.success("Featured status updated");
  };

  const deleteFAQ = (faqId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this FAQ?"
    );

    if (!confirmDelete) return;

    const updatedFaqs = faqs.filter((faq) => faq.id !== faqId);
    saveFAQList(updatedFaqs);
    toast.success("FAQ deleted successfully");
  };

  const handleResetFaqs = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset FAQs to default?"
    );

    if (!confirmReset) return;

    const defaultFaqList = resetFaqsToDefault();
    setFaqs(defaultFaqList);
    clearForm();
    toast.success("FAQs reset to default");
  };

  const handleExportCsv = () => {
    if (filteredFaqs.length === 0) {
      toast.error("No FAQs to export");
      return;
    }

    const headers = [
      "Question",
      "Answer",
      "Category",
      "Active",
      "Featured",
      "Sort Order",
      "Created At",
      "Updated At",
    ];

    const rows = filteredFaqs.map((faq) => [
      faq.question,
      faq.answer,
      faq.category,
      faq.isActive ? "Yes" : "No",
      faq.isFeatured ? "Yes" : "No",
      faq.sortOrder,
      faq.createdAt,
      faq.updatedAt || "",
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
    link.download = `pujafresh-faqs-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("FAQ CSV exported");
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
              FAQ Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Add, edit and publish help center FAQs for customers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <Link
              href="/faq"
              className="rounded border border-[#15803d] px-4 py-2 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              View FAQ Page
            </Link>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-4 py-2 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleResetFaqs}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset Defaults
            </button>

            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingFaqId(null);
                setFormData(emptyForm);
              }}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              {showForm ? "Hide Form" : "Add FAQ"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total FAQs</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.active}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Inactive</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.inactive}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Featured</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.featured}
            </h2>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSaveFAQ}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingFaqId ? "Edit FAQ" : "Add New FAQ"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Active FAQs will be visible on the public FAQ page.
                </p>
              </div>

              <button
                type="button"
                onClick={clearForm}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Question *
                </label>

                <input
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Example: How can I track my order?"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Answer *
                </label>

                <textarea
                  name="answer"
                  value={formData.answer}
                  onChange={handleChange}
                  rows={5}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Write complete answer..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Category
                </label>

                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  {faqCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Sort Order
                </label>

                <input
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Status
                </label>

                <select
                  name="isActive"
                  value={String(formData.isActive)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Featured
                </label>

                <select
                  name="isFeatured"
                  value={String(formData.isFeatured)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              {editingFaqId ? "Update FAQ" : "Save FAQ"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_180px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search FAQs
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
            Showing {filteredFaqs.length} of {faqs.length} FAQ
            {faqs.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No FAQs found
              </h2>

              <p className="mt-2 text-gray-600">
                Add a new FAQ or change filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {faq.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            faq.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {faq.isActive ? "Active" : "Inactive"}
                        </span>

                        {faq.isFeatured && (
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                            Featured
                          </span>
                        )}

                        <span className="rounded bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          Order: {faq.sortOrder}
                        </span>
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {faq.question}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditFAQ(faq)}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleFAQStatus(faq.id)}
                        className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white"
                      >
                        {faq.isActive ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => toggleFeatured(faq.id)}
                        className="rounded bg-[#15803d] px-3 py-2 text-xs font-bold text-white"
                      >
                        {faq.isFeatured ? "Unfeature" : "Feature"}
                      </button>

                      <button
                        onClick={() => deleteFAQ(faq.id)}
                        className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white"
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
