"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  createDeliveryPartnerId,
  DeliveryPartner,
  DeliveryPartnerStatus,
  getDeliveryPartners,
  resetDeliveryPartnersToDefault,
  saveDeliveryPartners,
} from "@/utils/deliveryPartnerStorage";

type PartnerFormData = {
  name: string;
  phone: string;
  email: string;
  vehicleType: "Bike" | "Scooter" | "Cycle" | "Car";
  vehicleNumber: string;
  assignedAreas: string;
  maxOrdersPerDay: string;
  status: DeliveryPartnerStatus;
};

const emptyForm: PartnerFormData = {
  name: "",
  phone: "",
  email: "",
  vehicleType: "Bike",
  vehicleNumber: "",
  assignedAreas: "",
  maxOrdersPerDay: "25",
  status: "Active",
};

const statusOptions = ["All Partners", "Active", "Inactive", "On Leave"];

export default function AdminDeliveryPartnersPage() {
  const router = useRouter();

  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [formData, setFormData] = useState<PartnerFormData>(emptyForm);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Partners");

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    setPartners(getDeliveryPartners());
    setIsCheckingAuth(false);
  }, [router]);

  const stats = useMemo(() => {
    return {
      total: partners.length,
      active: partners.filter((partner) => partner.status === "Active").length,
      inactive: partners.filter((partner) => partner.status === "Inactive")
        .length,
      onLeave: partners.filter((partner) => partner.status === "On Leave")
        .length,
      capacity: partners
        .filter((partner) => partner.status === "Active")
        .reduce((sum, partner) => sum + Number(partner.maxOrdersPerDay || 0), 0),
    };
  }, [partners]);

  const filteredPartners = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return partners.filter((partner) => {
      const matchesSearch =
        search.length === 0 ||
        partner.name.toLowerCase().includes(search) ||
        partner.phone.includes(search) ||
        partner.email.toLowerCase().includes(search) ||
        partner.vehicleNumber.toLowerCase().includes(search) ||
        partner.assignedAreas.join(", ").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All Partners" || partner.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [partners, searchQuery, statusFilter]);

  const savePartnerList = (updatedPartners: DeliveryPartner[]) => {
    setPartners(updatedPartners);
    saveDeliveryPartners(updatedPartners);
  };

  const clearForm = () => {
    setFormData(emptyForm);
    setEditingPartnerId(null);
    setShowForm(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Partners");
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        phone: value.replace(/\D/g, "").slice(0, 10),
      }));
      return;
    }

    if (name === "maxOrdersPerDay") {
      setFormData((prev) => ({
        ...prev,
        maxOrdersPerDay: value.replace(/\D/g, ""),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSavePartner = (event: FormEvent) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.email.trim() ||
      !formData.vehicleNumber.trim()
    ) {
      toast.error("Please fill all required delivery partner details");
      return;
    }

    if (formData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (!formData.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (Number(formData.maxOrdersPerDay || 0) <= 0) {
      toast.error("Maximum orders must be greater than 0");
      return;
    }

    const duplicatePhone = partners.find(
      (partner) =>
        partner.phone === formData.phone && partner.id !== editingPartnerId
    );

    if (duplicatePhone) {
      toast.error("A delivery partner with this phone already exists");
      return;
    }

    const now = new Date().toISOString();
    const assignedAreas = formData.assignedAreas
      .split(",")
      .map((area) => area.trim())
      .filter(Boolean);

    if (editingPartnerId) {
      const updatedPartners = partners.map((partner) =>
        partner.id === editingPartnerId
          ? {
              ...partner,
              name: formData.name.trim(),
              phone: formData.phone.trim(),
              email: formData.email.trim(),
              vehicleType: formData.vehicleType,
              vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
              assignedAreas,
              maxOrdersPerDay: Number(formData.maxOrdersPerDay || 0),
              status: formData.status,
              updatedAt: now,
            }
          : partner
      );

      savePartnerList(updatedPartners);
      toast.success("Delivery partner updated successfully");
      clearForm();
      return;
    }

    const newPartner: DeliveryPartner = {
      id: createDeliveryPartnerId(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      assignedAreas,
      maxOrdersPerDay: Number(formData.maxOrdersPerDay || 0),
      status: formData.status,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    savePartnerList([newPartner, ...partners]);
    toast.success("Delivery partner added successfully");
    clearForm();
  };

  const handleEditPartner = (partner: DeliveryPartner) => {
    setEditingPartnerId(partner.id);
    setShowForm(true);

    setFormData({
      name: partner.name,
      phone: partner.phone,
      email: partner.email,
      vehicleType: partner.vehicleType,
      vehicleNumber: partner.vehicleNumber,
      assignedAreas: partner.assignedAreas.join(", "),
      maxOrdersPerDay: String(partner.maxOrdersPerDay),
      status: partner.status,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const updatePartnerStatus = (
    partnerId: string,
    status: DeliveryPartnerStatus
  ) => {
    const updatedPartners = partners.map((partner) =>
      partner.id === partnerId
        ? {
            ...partner,
            status,
            updatedAt: new Date().toISOString(),
          }
        : partner
    );

    savePartnerList(updatedPartners);
    toast.success("Delivery partner status updated");
  };

  const deletePartner = (partnerId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this delivery partner?"
    );

    if (!confirmDelete) return;

    const updatedPartners = partners.filter(
      (partner) => partner.id !== partnerId
    );

    savePartnerList(updatedPartners);
    toast.success("Delivery partner deleted successfully");
  };

  const handleResetPartners = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset delivery partners to default?"
    );

    if (!confirmReset) return;

    const defaultPartners = resetDeliveryPartnersToDefault();

    setPartners(defaultPartners);
    clearForm();
    toast.success("Delivery partners reset to default");
  };

  const handleExportCsv = () => {
    if (filteredPartners.length === 0) {
      toast.error("No delivery partners to export");
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Phone",
      "Email",
      "Vehicle Type",
      "Vehicle Number",
      "Areas",
      "Max Orders",
      "Status",
      "Joined At",
    ];

    const rows = filteredPartners.map((partner) => [
      partner.id,
      partner.name,
      partner.phone,
      partner.email,
      partner.vehicleType,
      partner.vehicleNumber,
      partner.assignedAreas.join(" | "),
      partner.maxOrdersPerDay,
      partner.status,
      new Date(partner.joinedAt).toLocaleString("en-IN"),
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
    link.download = `pujafresh-delivery-partners-${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Delivery partners CSV exported");
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
              Delivery Partners
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage delivery staff, vehicle details, assigned areas, workload
              capacity and active status.
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
              href="/admin/delivery-assignments"
              className="rounded border border-[#15803d] px-4 py-2 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Assign Orders
            </Link>

            <button
              onClick={handleExportCsv}
              className="rounded bg-[#f97316] px-4 py-2 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              Export CSV
            </button>

            <button
              onClick={handleResetPartners}
              className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset
            </button>

            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingPartnerId(null);
                setFormData(emptyForm);
              }}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
            >
              {showForm ? "Hide Form" : "Add Partner"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Partners
            </p>
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
            <p className="text-sm font-semibold text-gray-500">On Leave</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.onLeave}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Daily Capacity
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.capacity}
            </h2>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSavePartner}
            className="mt-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPartnerId
                    ? "Edit Delivery Partner"
                    : "Add Delivery Partner"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Active partners can be assigned to delivery orders.
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
                  Partner Name *
                </label>

                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Rahul Kumar"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Phone *
                </label>

                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Email *
                </label>

                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="partner@pujafresh.com"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Vehicle Type
                </label>

                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option>Bike</option>
                  <option>Scooter</option>
                  <option>Cycle</option>
                  <option>Car</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Vehicle Number *
                </label>

                <input
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 uppercase outline-none focus:border-[#7a1e13]"
                  placeholder="DL 01 AB 1234"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Max Orders Per Day
                </label>

                <input
                  name="maxOrdersPerDay"
                  value={formData.maxOrdersPerDay}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="25"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>On Leave</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Assigned Areas
                </label>

                <input
                  name="assignedAreas"
                  value={formData.assignedAreas}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="Rohini, Pitampura"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              {editingPartnerId ? "Update Partner" : "Save Partner"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_140px]">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Search Partners
              </label>

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, phone, email, vehicle or area..."
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
            Showing {filteredPartners.length} of {partners.length} delivery
            partner{partners.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {filteredPartners.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                No delivery partners found
              </h2>

              <p className="mt-2 text-gray-600">
                Add a new delivery partner or change filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                          {partner.id}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            partner.status === "Active"
                              ? "bg-green-50 text-green-700"
                              : partner.status === "On Leave"
                              ? "bg-orange-50 text-orange-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {partner.status}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {partner.vehicleType}
                        </span>
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {partner.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {partner.phone} • {partner.email}
                      </p>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-gray-500">Vehicle</p>
                          <p className="font-bold text-gray-900">
                            {partner.vehicleNumber}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Daily Capacity</p>
                          <p className="font-bold text-gray-900">
                            {partner.maxOrdersPerDay} orders
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Assigned Areas</p>
                          <p className="font-bold text-gray-900">
                            {partner.assignedAreas.length > 0
                              ? partner.assignedAreas.join(", ")
                              : "Not assigned"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEditPartner(partner)}
                        className="rounded bg-gray-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => updatePartnerStatus(partner.id, "Active")}
                        className="rounded bg-[#15803d] px-3 py-2 text-xs font-bold text-white"
                      >
                        Active
                      </button>

                      <button
                        onClick={() =>
                          updatePartnerStatus(partner.id, "On Leave")
                        }
                        className="rounded bg-[#f97316] px-3 py-2 text-xs font-bold text-white"
                      >
                        Leave
                      </button>

                      <button
                        onClick={() =>
                          updatePartnerStatus(partner.id, "Inactive")
                        }
                        className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        Inactive
                      </button>

                      <button
                        onClick={() => deletePartner(partner.id)}
                        className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
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
