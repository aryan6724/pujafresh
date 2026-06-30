"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  addCustomerAddress,
  CustomerAddress,
  CustomerAddressLabel,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "@/utils/addressStorage";

type AddressFormData = {
  label: CustomerAddressLabel;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const defaultFormData: AddressFormData = {
  label: "Home",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "Delhi",
  state: "Delhi",
  pincode: "",
  isDefault: false,
};

const labelOptions: CustomerAddressLabel[] = ["Home", "Work", "Other"];

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

const formatDateTime = (date?: string) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AddressesPage() {
  const { user, isLoggedIn } = useAuth();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [formData, setFormData] = useState<AddressFormData>(defaultFormData);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("All Labels");

  const customerEmail = user?.email;
  const customerPhone = (user as any)?.phone;

  const loadAddresses = () => {
    if (!customerEmail && !customerPhone) {
      setAddresses([]);
      return;
    }

    setAddresses(getCustomerAddresses(customerEmail, customerPhone));
  };

  useEffect(() => {
    loadAddresses();
  }, [customerEmail, customerPhone]);

  useEffect(() => {
    if (user && !editingAddressId) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        phone: prev.phone || normalizePhone((user as any)?.phone),
      }));
    }
  }, [user, editingAddressId]);

  const filteredAddresses = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return addresses.filter((address) => {
      const matchesSearch =
        search.length === 0 ||
        address.fullName.toLowerCase().includes(search) ||
        address.phone.includes(search) ||
        address.addressLine1.toLowerCase().includes(search) ||
        address.addressLine2?.toLowerCase().includes(search) ||
        address.landmark?.toLowerCase().includes(search) ||
        address.city.toLowerCase().includes(search) ||
        address.state.toLowerCase().includes(search) ||
        address.pincode.includes(search) ||
        address.label.toLowerCase().includes(search);

      const matchesLabel =
        labelFilter === "All Labels" || address.label === labelFilter;

      return matchesSearch && matchesLabel;
    });
  }, [addresses, labelFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: addresses.length,
      defaultAddress: addresses.filter((address) => address.isDefault).length,
      home: addresses.filter((address) => address.label === "Home").length,
      work: addresses.filter((address) => address.label === "Work").length,
      other: addresses.filter((address) => address.label === "Other").length,
      pincodes: new Set(addresses.map((address) => address.pincode)).size,
    };
  }, [addresses]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;

    const checked =
      type === "checkbox" ? (event.target as HTMLInputElement).checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      ...defaultFormData,
      fullName: user?.fullName || "",
      phone: normalizePhone((user as any)?.phone),
    });
    setEditingAddressId(null);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error("Please enter full name");
      return false;
    }

    if (normalizePhone(formData.phone).length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return false;
    }

    if (!formData.addressLine1.trim()) {
      toast.error("Please enter address line 1");
      return false;
    }

    if (!formData.city.trim()) {
      toast.error("Please enter city");
      return false;
    }

    if (!formData.state.trim()) {
      toast.error("Please enter state");
      return false;
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      toast.error("Please enter a valid 6-digit pincode");
      return false;
    }

    return true;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!customerEmail && !customerPhone) {
      toast.error("Please login again to save address");
      return;
    }

    if (!validateForm()) return;

    const payload = {
      customerEmail,
      customerPhone: customerPhone || formData.phone,
      label: formData.label,
      fullName: formData.fullName.trim(),
      phone: normalizePhone(formData.phone),
      addressLine1: formData.addressLine1.trim(),
      addressLine2: formData.addressLine2.trim(),
      landmark: formData.landmark.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      isDefault: formData.isDefault,
    };

    if (editingAddressId) {
      updateCustomerAddress(editingAddressId, payload);
      toast.success("Address updated successfully");
    } else {
      addCustomerAddress(payload);
      toast.success("Address added successfully");
    }

    resetForm();
    loadAddresses();
  };

  const handleEdit = (address: CustomerAddress) => {
    setEditingAddressId(address.id);
    setFormData({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      landmark: address.landmark || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (addressId: string) => {
    const confirmDelete = window.confirm("Delete this saved address?");

    if (!confirmDelete) return;

    deleteCustomerAddress(addressId);
    loadAddresses();
    toast.success("Address deleted");
  };

  const handleSetDefault = (addressId: string) => {
    setDefaultCustomerAddress(addressId, customerEmail, customerPhone);
    loadAddresses();
    toast.success("Default address updated");
  };

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-gray-600">
              Please login to manage your saved addresses.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]"
              >
                Register
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Account
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Saved Addresses
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Save your home, work or other delivery addresses so checkout and
            repeat orders become faster.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rounded bg-white px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-orange-50"
            >
              Back to Profile
            </Link>

            <Link
              href="/checkout"
              className="rounded border border-white px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13]"
            >
              Go to Checkout
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Default</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.defaultAddress}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Home</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.home}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Work</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.work}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Other</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.other}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Pincodes</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.pincodes}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              {editingAddressId ? "Edit Address" : "Add New Address"}
            </h2>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Label</label>

                <select
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                >
                  {labelOptions.map((label) => (
                    <option key={label}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Full Name *
                </label>

                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Receiver name"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Phone *
                </label>

                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Address Line 1 *
                </label>

                <input
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="House no, street, building"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Address Line 2
                </label>

                <input
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Area, locality"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Landmark
                </label>

                <input
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="Nearby landmark"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    City *
                  </label>

                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    State *
                  </label>

                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Pincode *
                </label>

                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded bg-[#fff7ed] p-4">
                <input
                  name="isDefault"
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={handleChange}
                  className="h-4 w-4"
                />

                <span className="text-sm font-bold text-[#7a1e13]">
                  Set as default delivery address
                </span>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
              >
                {editingAddressId ? "Update Address" : "Save Address"}
              </button>

              {editingAddressId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-gray-400 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-900 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Address Book
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Showing {filteredAddresses.length} of {addresses.length} saved address
                  {addresses.length !== 1 ? "es" : ""}.
                </p>
              </div>

              <button
                onClick={loadAddresses}
                className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white hover:bg-[#166534]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Search Addresses
                </label>

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, phone, pincode, city..."
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Label</label>

                <select
                  value={labelFilter}
                  onChange={(event) => setLabelFilter(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                >
                  <option>All Labels</option>
                  {labelOptions.map((label) => (
                    <option key={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredAddresses.length === 0 ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-bold text-gray-900">
                  No saved addresses found
                </h3>

                <p className="mt-2 text-gray-600">
                  Add your first delivery address from the form.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {filteredAddresses.map((address) => (
                  <div
                    key={address.id}
                    className={`rounded-xl border p-4 ${
                      address.isDefault
                        ? "border-[#f97316] bg-[#fff7ed]"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#7a1e13] px-3 py-1 text-xs font-bold text-white">
                            {address.label}
                          </span>

                          {address.isDefault && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                              Default
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-lg font-black text-gray-900">
                          {address.fullName}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-gray-700">
                          {address.phone}
                        </p>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                          {address.landmark ? `, Landmark: ${address.landmark}` : ""}
                          <br />
                          {address.city}, {address.state} - {address.pincode}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-gray-500">
                          Updated: {formatDateTime(address.updatedAt || address.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefault(address.id)}
                            className="rounded border border-[#15803d] px-4 py-2 text-xs font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
                          >
                            Set Default
                          </button>
                        )}

                        <button
                          onClick={() => handleEdit(address)}
                          className="rounded border border-[#7a1e13] px-4 py-2 text-xs font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(address.id)}
                          className="rounded border border-red-600 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
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
        </div>
      </section>
    </main>
  );
}
