"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  createDeliveryAreaId,
  DeliveryArea,
  getDeliveryAreas,
  resetDeliveryAreasToDefault,
  saveDeliveryAreas,
} from "@/utils/pincodeStorage";
import { ArrowLeft, Edit, MapPin, Plus, RotateCcw, Search, Trash2 } from "lucide-react";

const emptyForm = {
  pincode: "",
  areaName: "",
  city: "Delhi",
  isActive: true,
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

export default function AdminDeliveryAreasPage() {
  const router = useRouter();

  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn =
      localStorage.getItem("pujafresh-admin-auth") === "true";

    if (!isAdminLoggedIn) {
      router.push("/admin/login");
      return;
    }

    setAreas(getDeliveryAreas());
    setIsCheckingAuth(false);
  }, [router]);

  const filteredAreas = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    if (!search) return areas;

    return areas.filter((area) => {
      return (
        area.pincode.includes(search) ||
        area.areaName.toLowerCase().includes(search) ||
        area.city.toLowerCase().includes(search)
      );
    });
  }, [areas, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: areas.length,
      active: areas.filter((area) => area.isActive).length,
      inactive: areas.filter((area) => !area.isActive).length,
    };
  }, [areas]);

  const updateAreas = (updatedAreas: DeliveryArea[]) => {
    setAreas(updatedAreas);
    saveDeliveryAreas(updatedAreas);
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingAreaId(null);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = event.target;

    if (name === "pincode") {
      setFormData((prev) => ({
        ...prev,
        pincode: value.replace(/\D/g, "").slice(0, 6),
      }));
      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: event.target.checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const pincode = formData.pincode.trim();
    const areaName = formData.areaName.trim();
    const city = formData.city.trim();

    if (pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    if (!areaName) {
      toast.error("Please enter area name");
      return;
    }

    if (!city) {
      toast.error("Please enter city name");
      return;
    }

    const duplicateArea = areas.some(
      (area) => area.pincode === pincode && area.id !== editingAreaId
    );

    if (duplicateArea) {
      toast.error("This pincode already exists");
      return;
    }

    if (editingAreaId) {
      const updatedAreas = areas.map((area) => {
        if (area.id !== editingAreaId) return area;

        return {
          ...area,
          pincode,
          areaName,
          city,
          isActive: formData.isActive,
          updatedAt: new Date().toISOString(),
        };
      });

      updateAreas(updatedAreas);
      toast.success("Delivery area updated");
      resetForm();
      return;
    }

    const now = new Date().toISOString();

    const newArea = {
      id: createDeliveryAreaId(),
      pincode,
      areaName,
      city,
      isActive: formData.isActive,
      createdAt: now,
      updatedAt: now,
    } as DeliveryArea;

    updateAreas([newArea, ...areas]);
    toast.success("Delivery area added");
    resetForm();
  };

  const editArea = (area: DeliveryArea) => {
    setEditingAreaId(area.id);
    setFormData({
      pincode: area.pincode,
      areaName: area.areaName,
      city: area.city,
      isActive: area.isActive,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleAreaStatus = (areaId: string) => {
    const updatedAreas = areas.map((area) => {
      if (area.id !== areaId) return area;

      return {
        ...area,
        isActive: !area.isActive,
      };
    });

    updateAreas(updatedAreas);
    toast.success("Delivery area status updated");
  };

  const deleteArea = (areaId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this delivery area?"
    );

    if (!confirmDelete) return;

    const updatedAreas = areas.filter((area) => area.id !== areaId);
    updateAreas(updatedAreas);
    toast.success("Delivery area deleted");
  };

  const handleResetDefault = () => {
    const confirmReset = window.confirm(
      "This will reset delivery areas to default. Continue?"
    );

    if (!confirmReset) return;

    const defaultAreas = resetDeliveryAreasToDefault();
    setAreas(defaultAreas);
    resetForm();
    toast.success("Default delivery areas restored");
  };

  const handleLogout = () => {
    localStorage.removeItem("pujafresh-admin-auth");
    toast.success("Admin logged out");
    router.push("/admin/login");
  };

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-gray-700">
              Checking admin access...
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f97316]">
              Admin Delivery
            </p>

            <h1 className="mt-2 text-2xl font-black text-gray-900">
              Delivery Area Management
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Add, edit, activate and manage serviceable delivery pincodes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Admin
            </Link>

            <button
              onClick={handleResetDefault}
              className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-sm font-bold text-white hover:bg-black"
            >
              <RotateCcw size={16} />
              Reset Default
            </button>

            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Total Areas
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Areas
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#15803d]">
              {stats.active}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Inactive Areas
            </p>
            <h2 className="mt-2 text-3xl font-black text-red-600">
              {stats.inactive}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-xl bg-white p-5 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
              <Plus size={20} />
              {editingAreaId ? "Edit Area" : "Add Delivery Area"}
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Pincode *
                </label>

                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Example: 110042"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Area Name *
                </label>

                <input
                  name="areaName"
                  value={formData.areaName}
                  onChange={handleChange}
                  placeholder="Example: Rohini"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  City *
                </label>

                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Example: Delhi"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <label className="flex items-center gap-3 rounded bg-[#fff7ed] p-3 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Active Delivery Area
              </label>
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              {editingAreaId ? "Update Area" : "Add Area"}
            </button>

            {editingAreaId && (
              <button
                type="button"
                onClick={resetForm}
                className="mt-3 w-full rounded border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 hover:border-red-600 hover:text-red-600"
              >
                Cancel Edit
              </button>
            )}
          </form>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Serviceable Pincodes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredAreas.length} area
                  {filteredAreas.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="flex w-full items-center rounded border border-gray-300 px-3 py-2 md:w-80">
                <Search size={18} className="text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pincode, area, city..."
                  className="ml-2 w-full text-sm outline-none"
                />
              </div>
            </div>

            {filteredAreas.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="mx-auto text-gray-300" size={54} />

                <h3 className="mt-4 text-lg font-black text-gray-900">
                  No delivery areas found
                </h3>

                <p className="mt-2 text-gray-600">
                  Add delivery areas from the form.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredAreas.map((area) => (
                  <div
                    key={area.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="rounded bg-[#7a1e13] px-3 py-1 text-lg font-black tracking-wide text-white">
                            {area.pincode}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              area.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {area.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-3 font-bold text-gray-900">
                          {area.areaName}
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {area.city}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          Created: {formatDateTime(area.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleAreaStatus(area.id)}
                          className={`rounded px-3 py-2 text-xs font-bold text-white ${
                            area.isActive
                              ? "bg-gray-700 hover:bg-gray-900"
                              : "bg-[#15803d] hover:bg-[#166534]"
                          }`}
                        >
                          {area.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => editArea(area)}
                          className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          <Edit size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => deleteArea(area.id)}
                          className="flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}