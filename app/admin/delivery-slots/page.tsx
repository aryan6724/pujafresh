"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  DeliverySlot,
  getDeliverySlots,
  resetDeliverySlotsToDefault,
  saveDeliverySlots,
} from "@/utils/deliverySlotStorage";

type SlotFormData = {
  label: string;
  timeRange: string;
  maxOrders: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: SlotFormData = {
  label: "",
  timeRange: "",
  maxOrders: "25",
  sortOrder: "1",
  isActive: true,
};

const statusOptions = ["All Slots", "Active", "Inactive"];

const createSlotId = () => {
  return `SLOT-${Date.now()}`;
};

export default function AdminDeliverySlotsPage() {
  const router = useRouter();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [formData, setFormData] = useState<SlotFormData>(emptyForm);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Slots");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setSlots(getDeliverySlots());
    setIsCheckingAuth(false);
  }, [router]);

  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [slots]);

  const filteredSlots = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return sortedSlots.filter((slot) => {
      const matchesSearch =
        search.length === 0 ||
        slot.label.toLowerCase().includes(search) ||
        slot.timeRange.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Slots" ||
        (statusFilter === "Active" && slot.isActive) ||
        (statusFilter === "Inactive" && !slot.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [sortedSlots, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: slots.length,
      active: slots.filter((slot) => slot.isActive).length,
      inactive: slots.filter((slot) => !slot.isActive).length,
      capacity: slots
        .filter((slot) => slot.isActive)
        .reduce((sum, slot) => sum + Number(slot.maxOrders || 0), 0),
    };
  }, [slots]);

  const saveSlotList = (updatedSlots: DeliverySlot[]) => {
    const sortedUpdatedSlots = [...updatedSlots].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    setSlots(sortedUpdatedSlots);
    saveDeliverySlots(sortedUpdatedSlots);
  };

  const clearForm = () => {
    setFormData(emptyForm);
    setEditingSlotId(null);
    setShowForm(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Slots");
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (name === "maxOrders" || name === "sortOrder") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, ""),
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

  const handleSaveSlot = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.label.trim() || !formData.timeRange.trim()) {
      toast.error("Please fill slot label and time range");
      return;
    }

    if (Number(formData.maxOrders || 0) <= 0) {
      toast.error("Maximum orders must be greater than 0");
      return;
    }

    if (Number(formData.sortOrder || 0) <= 0) {
      toast.error("Sort order must be greater than 0");
      return;
    }

    const duplicateSlot = slots.find(
      (slot) =>
        slot.label.trim().toLowerCase() ===
          formData.label.trim().toLowerCase() && slot.id !== editingSlotId
    );

    if (duplicateSlot) {
      toast.error("A delivery slot with this label already exists");
      return;
    }

    const now = new Date().toISOString();

    if (editingSlotId) {
      const updatedSlots = slots.map((slot) =>
        slot.id === editingSlotId
          ? {
              ...slot,
              label: formData.label.trim(),
              timeRange: formData.timeRange.trim(),
              maxOrders: Number(formData.maxOrders || 0),
              sortOrder: Number(formData.sortOrder || 1),
              isActive: formData.isActive,
              updatedAt: now,
            }
          : slot
      );

      saveSlotList(updatedSlots);
      toast.success("Delivery slot updated successfully");
      clearForm();
      return;
    }

    const newSlot: DeliverySlot = {
      id: createSlotId(),
      label: formData.label.trim(),
      timeRange: formData.timeRange.trim(),
      maxOrders: Number(formData.maxOrders || 0),
      sortOrder: Number(formData.sortOrder || 1),
      isActive: formData.isActive,
      createdAt: now,
      updatedAt: now,
    };

    saveSlotList([newSlot, ...slots]);
    toast.success("Delivery slot added successfully");
    clearForm();
  };

  const handleEditSlot = (slot: DeliverySlot) => {
    setEditingSlotId(slot.id);
    setShowForm(true);

    setFormData({
      label: slot.label,
      timeRange: slot.timeRange,
      maxOrders: String(slot.maxOrders),
      sortOrder: String(slot.sortOrder),
      isActive: slot.isActive,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleSlotStatus = (slotId: string) => {
    const updatedSlots = slots.map((slot) =>
      slot.id === slotId
        ? {
            ...slot,
            isActive: !slot.isActive,
            updatedAt: new Date().toISOString(),
          }
        : slot
    );

    saveSlotList(updatedSlots);
    toast.success("Delivery slot status updated");
  };

  const deleteSlot = (slotId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this delivery slot?"
    );

    if (!confirmDelete) return;

    const updatedSlots = slots.filter((slot) => slot.id !== slotId);

    saveSlotList(updatedSlots);
    toast.success("Delivery slot deleted successfully");
  };

  const handleResetSlots = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset delivery slots to default?"
    );

    if (!confirmReset) return;

    const defaultSlots = resetDeliverySlotsToDefault();

    setSlots(defaultSlots);
    clearForm();
    toast.success("Delivery slots reset to default");
  };

  const handleExportCsv = () => {
    if (filteredSlots.length === 0) {
      toast.error("No delivery slots to export");
      return;
    }

    const headers = [
      "Label",
      "Time Range",
      "Maximum Orders",
      "Sort Order",
      "Active",
      "Created At",
    ];

    const rows = filteredSlots.map((slot) => [
      slot.label,
      slot.timeRange,
      slot.maxOrders,
      slot.sortOrder,
      slot.isActive ? "Yes" : "No",
      new Date(slot.createdAt).toLocaleString("en-IN"),
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
    link.download = `pujafresh-delivery-slots-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Delivery slots CSV exported");
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
              Delivery Slots
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage checkout delivery slots, slot capacity, display order and
              active status.
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
              onClick={handleResetSlots}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset
            </button>

            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingSlotId(null);
                setFormData({
                  ...emptyForm,
                  sortOrder: String(slots.length + 1),
                });
              }}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              {showForm ? "Hide Form" : "Add Slot"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total Slots</p>
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
            <p className="text-sm font-semibold text-gray-500">
              Active Capacity
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.capacity}
            </h2>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSaveSlot}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSlotId ? "Edit Delivery Slot" : "Add Delivery Slot"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Active slots are shown on checkout page.
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
                  Slot Label *
                </label>

                <input
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="5:00 AM - 7:00 AM"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Time Range *
                </label>

                <input
                  name="timeRange"
                  value={formData.timeRange}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="5:00 AM - 7:00 AM"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Maximum Orders
                </label>

                <input
                  name="maxOrders"
                  value={formData.maxOrders}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="25"
                />
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
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              {editingSlotId ? "Update Slot" : "Save Slot"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Slots
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by label or time range..."
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
            Showing {filteredSlots.length} of {slots.length} delivery slot
            {slots.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredSlots.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No delivery slots found
              </h2>

              <p className="mt-2 text-gray-600">
                Add a new slot or change filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          Order #{slot.sortOrder}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            slot.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {slot.isActive ? "Active" : "Inactive"}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          Capacity {slot.maxOrders}
                        </span>
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {slot.label}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {slot.timeRange}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditSlot(slot)}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleSlotStatus(slot.id)}
                        className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white"
                      >
                        {slot.isActive ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => deleteSlot(slot.id)}
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
