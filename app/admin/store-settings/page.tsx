"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  defaultStoreSettings,
  getStoreSettings,
  resetStoreSettingsToDefault,
  saveStoreSettings,
  StoreSettings,
} from "@/utils/storeSettingsStorage";

type StoreSettingsFormData = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  minimumOrderValue: string;
  deliveryCharge: string;
  freeDeliveryAbove: string;
  codEnabled: boolean;
  upiEnabled: boolean;
  bankTransferEnabled: boolean;
  cardPaymentEnabled: boolean;
  upiId: string;
  merchantName: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  supportStartTime: string;
  supportEndTime: string;
  orderCutoffTime: string;
};

const convertSettingsToFormData = (
  settings: StoreSettings
): StoreSettingsFormData => ({
  storeName: settings.storeName,
  storeEmail: settings.storeEmail,
  storePhone: settings.storePhone,
  storeAddress: settings.storeAddress,
  minimumOrderValue: String(settings.minimumOrderValue),
  deliveryCharge: String(settings.deliveryCharge),
  freeDeliveryAbove: String(settings.freeDeliveryAbove),
  codEnabled: settings.codEnabled,
  upiEnabled: settings.upiEnabled,
  bankTransferEnabled: settings.bankTransferEnabled,
  cardPaymentEnabled: settings.cardPaymentEnabled,
  upiId: settings.upiId,
  merchantName: settings.merchantName,
  bankName: settings.bankName,
  bankAccountName: settings.bankAccountName,
  bankAccountNumber: settings.bankAccountNumber,
  bankIfsc: settings.bankIfsc,
  supportStartTime: settings.supportStartTime,
  supportEndTime: settings.supportEndTime,
  orderCutoffTime: settings.orderCutoffTime,
});

export default function AdminStoreSettingsPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<StoreSettingsFormData>(
    convertSettingsToFormData(defaultStoreSettings)
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>(
    defaultStoreSettings.updatedAt
  );

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    const savedSettings = getStoreSettings();

    setFormData(convertSettingsToFormData(savedSettings));
    setLastUpdatedAt(savedSettings.updatedAt);
    setIsCheckingAuth(false);
  }, [router]);

  const activePaymentMethods = useMemo(() => {
    return [
      formData.codEnabled ? "Cash on Delivery" : null,
      formData.upiEnabled ? "UPI QR Payment" : null,
      formData.bankTransferEnabled ? "Bank Transfer" : null,
      formData.cardPaymentEnabled ? "Card Payment" : null,
    ].filter(Boolean);
  }, [
    formData.bankTransferEnabled,
    formData.cardPaymentEnabled,
    formData.codEnabled,
    formData.upiEnabled,
  ]);

  const formatDateTime = (date?: string) => {
    if (!date) return "Not updated yet";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (
      name === "minimumOrderValue" ||
      name === "deliveryCharge" ||
      name === "freeDeliveryAbove"
    ) {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, ""),
      }));
      return;
    }

    if (
      name === "codEnabled" ||
      name === "upiEnabled" ||
      name === "bankTransferEnabled" ||
      name === "cardPaymentEnabled"
    ) {
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

  const handleSaveSettings = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.storeName || !formData.storeEmail || !formData.storePhone) {
      toast.error("Please fill store name, email and phone");
      return;
    }

    if (!formData.storeEmail.includes("@")) {
      toast.error("Please enter a valid store email");
      return;
    }

    if (activePaymentMethods.length === 0) {
      toast.error("At least one payment method must be active");
      return;
    }

    if (formData.upiEnabled && !formData.upiId.trim()) {
      toast.error("UPI ID is required when UPI is enabled");
      return;
    }

    if (
      formData.bankTransferEnabled &&
      (!formData.bankName ||
        !formData.bankAccountName ||
        !formData.bankAccountNumber ||
        !formData.bankIfsc)
    ) {
      toast.error("Bank details are required when bank transfer is enabled");
      return;
    }

    const updatedSettings: StoreSettings = {
      storeName: formData.storeName.trim(),
      storeEmail: formData.storeEmail.trim(),
      storePhone: formData.storePhone.trim(),
      supportEmail: formData.storeEmail.trim(),
      supportPhone: formData.storePhone.trim(),
      storeAddress: formData.storeAddress.trim(),
      minimumOrderValue: Number(formData.minimumOrderValue || 0),
      deliveryCharge: Number(formData.deliveryCharge || 0),
      freeDeliveryAbove: Number(formData.freeDeliveryAbove || 0),
      codEnabled: formData.codEnabled,
      upiEnabled: formData.upiEnabled,
      bankTransferEnabled: formData.bankTransferEnabled,
      cardPaymentEnabled: formData.cardPaymentEnabled,
      upiId: formData.upiId.trim(),
      merchantName: formData.merchantName.trim(),
      bankName: formData.bankName.trim(),
      bankAccountName: formData.bankAccountName.trim(),
      bankAccountNumber: formData.bankAccountNumber.trim(),
      bankIfsc: formData.bankIfsc.trim().toUpperCase(),
      supportStartTime: formData.supportStartTime,
      supportEndTime: formData.supportEndTime,
      orderCutoffTime: formData.orderCutoffTime,
      updatedAt: new Date().toISOString(),
    };

    saveStoreSettings(updatedSettings);
    setLastUpdatedAt(updatedSettings.updatedAt);
    toast.success("Store settings updated successfully");
  };

  const handleResetSettings = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset store settings to default?"
    );

    if (!confirmReset) return;

    const defaultSettings = resetStoreSettingsToDefault();

    setFormData(convertSettingsToFormData(defaultSettings));
    setLastUpdatedAt(defaultSettings.updatedAt);
    toast.success("Store settings reset to default");
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
              Store Settings
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Control checkout rules, payment methods, UPI, bank transfer and
              store contact details.
            </p>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Last updated: {formatDateTime(lastUpdatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <button
              onClick={handleResetSettings}
              className="rounded border border-red-600 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Reset Default
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Minimum Order
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              ₹{formData.minimumOrderValue || 0}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Delivery Charge
            </p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              ₹{formData.deliveryCharge || 0}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Free Delivery Above
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              ₹{formData.freeDeliveryAbove || 0}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Active Payments
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {activePaymentMethods.length}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="mt-6 grid gap-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Store Information
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Store Name *
                </label>

                <input
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Store Email *
                </label>

                <input
                  name="storeEmail"
                  value={formData.storeEmail}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Store Phone *
                </label>

                <input
                  name="storePhone"
                  value={formData.storePhone}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Merchant Name
                </label>

                <input
                  name="merchantName"
                  value={formData.merchantName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Store Address
                </label>

                <textarea
                  name="storeAddress"
                  value={formData.storeAddress}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Checkout Rules
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Minimum Order Value
                </label>

                <input
                  name="minimumOrderValue"
                  value={formData.minimumOrderValue}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Delivery Charge
                </label>

                <input
                  name="deliveryCharge"
                  value={formData.deliveryCharge}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Free Delivery Above
                </label>

                <input
                  name="freeDeliveryAbove"
                  value={formData.freeDeliveryAbove}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Order Cutoff Time
                </label>

                <input
                  type="time"
                  name="orderCutoffTime"
                  value={formData.orderCutoffTime}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Support Start Time
                </label>

                <input
                  type="time"
                  name="supportStartTime"
                  value={formData.supportStartTime}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Support End Time
                </label>

                <input
                  type="time"
                  name="supportEndTime"
                  value={formData.supportEndTime}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Payment Methods
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Cash on Delivery
                </label>

                <select
                  name="codEnabled"
                  value={String(formData.codEnabled)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  UPI QR Payment
                </label>

                <select
                  name="upiEnabled"
                  value={String(formData.upiEnabled)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Bank Transfer
                </label>

                <select
                  name="bankTransferEnabled"
                  value={String(formData.bankTransferEnabled)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Card Payment
                </label>

                <select
                  name="cardPaymentEnabled"
                  value={String(formData.cardPaymentEnabled)}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>

            <div className="mt-5 rounded bg-[#fff7ed] p-4">
              <p className="text-sm font-bold text-gray-900">
                Active Payment Methods
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {activePaymentMethods.map((method) => (
                  <span
                    key={method}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7a1e13]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              UPI & Bank Details
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  UPI ID
                </label>

                <input
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  placeholder="pujafresh@upi"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Bank Name
                </label>

                <input
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Account Holder Name
                </label>

                <input
                  name="bankAccountName"
                  value={formData.bankAccountName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Account Number
                </label>

                <input
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  IFSC Code
                </label>

                <input
                  name="bankIfsc"
                  value={formData.bankIfsc}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 uppercase outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 text-right shadow-sm">
            <button
              type="submit"
              className="rounded bg-[#7a1e13] px-8 py-3 font-bold text-white hover:bg-[#64180f]"
            >
              Save Store Settings
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
