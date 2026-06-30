"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  Announcement,
  AnnouncementType,
  announcementTypes,
  getAnnouncements,
  isAnnouncementCurrentlyVisible,
  resetAnnouncementsToDefault,
  saveAnnouncements,
} from "@/utils/announcementStorage";

type AnnouncementFormData = {
  title: string;
  message: string;
  type: AnnouncementType;
  linkText: string;
  linkHref: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  priority: string;
};

const emptyForm: AnnouncementFormData = {
  title: "",
  message: "",
  type: "Info",
  linkText: "",
  linkHref: "",
  isActive: true,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "2099-12-31",
  priority: "1",
};

const statusOptions = ["All Announcements", "Visible Now", "Active", "Inactive", "Expired"];

export default function AdminAnnouncementsPage() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [formData, setFormData] = useState<AnnouncementFormData>(emptyForm);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    string | null
  >(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Announcements");
  const [typeFilter, setTypeFilter] = useState("All Types");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setAnnouncements(getAnnouncements());
    setIsCheckingAuth(false);
  }, [router]);

  const saveAnnouncementList = (updatedAnnouncements: Announcement[]) => {
    const sortedAnnouncements = [...updatedAnnouncements].sort(
      (a, b) => a.priority - b.priority
    );

    setAnnouncements(sortedAnnouncements);
    saveAnnouncements(sortedAnnouncements);
  };

  const today = new Date().toISOString().slice(0, 10);

  const isExpired = (announcement: Announcement) => {
    return Boolean(announcement.endDate && announcement.endDate < today);
  };

  const stats = useMemo(() => {
    return {
      total: announcements.length,
      visibleNow: announcements.filter(isAnnouncementCurrentlyVisible).length,
      active: announcements.filter((announcement) => announcement.isActive)
        .length,
      inactive: announcements.filter((announcement) => !announcement.isActive)
        .length,
      expired: announcements.filter(isExpired).length,
    };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const matchesSearch =
        search.length === 0 ||
        announcement.title.toLowerCase().includes(search) ||
        announcement.message.toLowerCase().includes(search) ||
        announcement.type.toLowerCase().includes(search) ||
        announcement.linkText?.toLowerCase().includes(search) ||
        announcement.linkHref?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Announcements" ||
        (statusFilter === "Visible Now" &&
          isAnnouncementCurrentlyVisible(announcement)) ||
        (statusFilter === "Active" && announcement.isActive) ||
        (statusFilter === "Inactive" && !announcement.isActive) ||
        (statusFilter === "Expired" && isExpired(announcement));

      const matchesType =
        typeFilter === "All Types" || announcement.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [announcements, searchQuery, statusFilter, typeFilter]);

  const clearForm = () => {
    setFormData(emptyForm);
    setEditingAnnouncementId(null);
    setShowForm(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Announcements");
    setTypeFilter("All Types");
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    if (name === "priority") {
      setFormData((prev) => ({
        ...prev,
        priority: value.replace(/\D/g, ""),
      }));
      return;
    }

    if (name === "isActive") {
      setFormData((prev) => ({
        ...prev,
        isActive: value === "true",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveAnnouncement = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.title || !formData.message || !formData.startDate || !formData.endDate) {
      toast.error("Please fill all required announcement details");
      return;
    }

    if (formData.endDate < formData.startDate) {
      toast.error("End date cannot be before start date");
      return;
    }

    const now = new Date().toISOString();

    if (editingAnnouncementId) {
      const updatedAnnouncements = announcements.map((announcement) =>
        announcement.id === editingAnnouncementId
          ? {
              ...announcement,
              title: formData.title,
              message: formData.message,
              type: formData.type,
              linkText: formData.linkText,
              linkHref: formData.linkHref,
              isActive: formData.isActive,
              startDate: formData.startDate,
              endDate: formData.endDate,
              priority: Number(formData.priority || 1),
              updatedAt: now,
            }
          : announcement
      );

      saveAnnouncementList(updatedAnnouncements);
      toast.success("Announcement updated successfully");
      clearForm();
      return;
    }

    const newAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      title: formData.title,
      message: formData.message,
      type: formData.type,
      linkText: formData.linkText,
      linkHref: formData.linkHref,
      isActive: formData.isActive,
      startDate: formData.startDate,
      endDate: formData.endDate,
      priority: Number(formData.priority || announcements.length + 1),
      createdAt: now,
      updatedAt: now,
    };

    saveAnnouncementList([newAnnouncement, ...announcements]);
    toast.success("Announcement added successfully");
    clearForm();
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setShowForm(true);

    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      linkText: announcement.linkText || "",
      linkHref: announcement.linkHref || "",
      isActive: announcement.isActive,
      startDate: announcement.startDate,
      endDate: announcement.endDate,
      priority: String(announcement.priority),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleAnnouncementStatus = (announcementId: string) => {
    const updatedAnnouncements = announcements.map((announcement) =>
      announcement.id === announcementId
        ? {
            ...announcement,
            isActive: !announcement.isActive,
            updatedAt: new Date().toISOString(),
          }
        : announcement
    );

    saveAnnouncementList(updatedAnnouncements);
    toast.success("Announcement status updated");
  };

  const deleteAnnouncement = (announcementId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this announcement?"
    );

    if (!confirmDelete) return;

    const updatedAnnouncements = announcements.filter(
      (announcement) => announcement.id !== announcementId
    );

    saveAnnouncementList(updatedAnnouncements);
    toast.success("Announcement deleted successfully");
  };

  const handleResetAnnouncements = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset announcements to default?"
    );

    if (!confirmReset) return;

    const defaultAnnouncementList = resetAnnouncementsToDefault();
    setAnnouncements(defaultAnnouncementList);
    clearForm();
    toast.success("Announcements reset to default");
  };

  const handleExportCsv = () => {
    if (filteredAnnouncements.length === 0) {
      toast.error("No announcements to export");
      return;
    }

    const headers = [
      "Title",
      "Message",
      "Type",
      "Link Text",
      "Link URL",
      "Active",
      "Visible Now",
      "Start Date",
      "End Date",
      "Priority",
    ];

    const rows = filteredAnnouncements.map((announcement) => [
      announcement.title,
      announcement.message,
      announcement.type,
      announcement.linkText || "",
      announcement.linkHref || "",
      announcement.isActive ? "Yes" : "No",
      isAnnouncementCurrentlyVisible(announcement) ? "Yes" : "No",
      announcement.startDate,
      announcement.endDate,
      announcement.priority,
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
    link.download = `pujafresh-announcements-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Announcements CSV exported");
  };

  const getTypeClass = (type: AnnouncementType) => {
    if (type === "Offer") return "bg-orange-50 text-orange-700";
    if (type === "Festival") return "bg-[#fff7ed] text-[#7a1e13]";
    if (type === "Warning") return "bg-red-50 text-red-700";
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
              Announcement Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Create offer bars, festival notices and important customer updates.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-4 py-2 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleResetAnnouncements}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset Defaults
            </button>

            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingAnnouncementId(null);
                setFormData(emptyForm);
              }}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              {showForm ? "Hide Form" : "Add Announcement"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Visible Now</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.visibleNow}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Active</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.active}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Inactive</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.inactive}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Expired</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.expired}
            </h2>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSaveAnnouncement}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAnnouncementId
                    ? "Edit Announcement"
                    : "Add New Announcement"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Highest priority announcement will show first on the
                  AnnouncementBar component.
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
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Title *
                </label>

                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Example: Festival Offer"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Type
                </label>

                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  {announcementTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Message *
                </label>

                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Write short announcement message..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Link Text
                </label>

                <input
                  name="linkText"
                  value={formData.linkText}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Shop Now"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Link URL
                </label>

                <input
                  name="linkHref"
                  value={formData.linkHref}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="/"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Start Date *
                </label>

                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  End Date *
                </label>

                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Priority
                </label>

                <input
                  name="priority"
                  value={formData.priority}
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
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              {editingAnnouncementId
                ? "Update Announcement"
                : "Save Announcement"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_180px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Announcements
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, message, link or type..."
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
              <label className="text-sm font-bold text-gray-700">Type</label>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                <option>All Types</option>
                {announcementTypes.map((type) => (
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
            Showing {filteredAnnouncements.length} of {announcements.length}{" "}
            announcement{announcements.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredAnnouncements.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No announcements found
              </h2>

              <p className="mt-2 text-gray-600">
                Add a new announcement or change filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeClass(
                            announcement.type
                          )}`}
                        >
                          {announcement.type}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            announcement.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {announcement.isActive ? "Active" : "Inactive"}
                        </span>

                        {isAnnouncementCurrentlyVisible(announcement) && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            Visible Now
                          </span>
                        )}

                        <span className="rounded bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          Priority: {announcement.priority}
                        </span>
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {announcement.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {announcement.message}
                      </p>

                      {(announcement.linkText || announcement.linkHref) && (
                        <p className="mt-2 text-xs font-semibold text-[#7a1e13]">
                          Link: {announcement.linkText || "No text"} →{" "}
                          {announcement.linkHref || "No URL"}
                        </p>
                      )}

                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        {announcement.startDate} to {announcement.endDate}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditAnnouncement(announcement)}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleAnnouncementStatus(announcement.id)}
                        className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white"
                      >
                        {announcement.isActive ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => deleteAnnouncement(announcement.id)}
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
