"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  defaultStoreSettings,
  getStoreSettings,
  resetStoreSettings,
  saveStoreSettings,
  StoreSettings,
} from "@/utils/storeSettingsStorage";
import {
  ArrowLeft,
  CreditCard,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Settings,
  Truck,
} from "lucide-react";

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdminStoreSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<StoreSettings>(defaultStoreSettings);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn =
      localStorage.getItem("pujafresh-admin-auth") === "true";

    if (!isAdminLoggedIn) {
      router.push("/admin/login");
      return;
    }

    setSettings(getStoreSettings());
    setIsCheckingAuth(false);
  }, [router]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    if (type === "checkbox") {
      setSettings((prev) => ({
        ...prev,
        [name]: checked,
      }));

      return;
    }

    if (
      name === "minimumOrderValue" ||
      name === "deliveryCharge" ||
      name === "freeDeliveryAbove"
    ) {
      setSettings((prev) => ({
        ...prev,
        [name]: Number(value),
      }));

      return;
    }

    if (name === "supportPhone") {
      setSettings((prev) => ({
        ...prev,
        supportPhone: value.replace(/\D/g, "").slice(0, 10),
      }));

      return;
    }

    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!settings.storeName.trim()) {
      toast.error("Store name is required");
      return;
    }

    if (!settings.merchantName.trim()) {
      toast.error("Merchant name is required");
      return;
    }

    if (!settings.upiId.trim()) {
      toast.error("UPI ID is required");
      return;
    }

    if (!settings.supportEmail.trim()) {
      toast.error("Support email is required");
      return;
    }

    if (settings.supportPhone.trim().length !== 10) {
      toast.error("Please enter valid 10-digit support phone number");
      return;
    }

    if (settings.minimumOrderValue < 0) {
      toast.error("Minimum order value cannot be negative");
      return;
    }

    if (settings.deliveryCharge < 0) {
      toast.error("Delivery charge cannot be negative");
      return;
    }

    if (settings.freeDeliveryAbove < 0) {
      toast.error("Free delivery value cannot be negative");
      return;
    }

    if (!settings.codEnabled && !settings.upiEnabled && !settings.bankTransferEnabled && !settings.cardPaymentEnabled) {
      toast.error("At least one payment method must be active");
      return;
    }

    const updatedSettings: StoreSettings = {
      ...settings,
      storeName: settings.storeName.trim(),
      merchantName: settings.merchantName.trim(),
      upiId: settings.upiId.trim(),
      supportEmail: settings.supportEmail.trim(),
      supportPhone: settings.supportPhone.trim(),
      bankAccountName: settings.bankAccountName.trim(),
      bankName: settings.bankName.trim(),
      bankAccountNumber: settings.bankAccountNumber.trim(),
      bankIfsc: settings.bankIfsc.trim(),
      updatedAt: new Date().toISOString(),
    };

    saveStoreSettings(updatedSettings);
    setSettings(updatedSettings);
    toast.success("Store settings saved successfully");
  };

  const handleReset = () => {
    const confirmReset = window.confirm(
      "This will reset all store settings to default. Continue?"
    );

    if (!confirmReset) return;

    const defaultSettings = resetStoreSettings();
    setSettings(defaultSettings);
    toast.success("Default settings restored");
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
              Admin Settings
            </p>

            <h1 className="mt-2 text-2xl font-black text-gray-900">
              Store Settings
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Control store name, payment methods, delivery charges and support
              details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded border border-[#7a1e13] bg-white px-4 py-2 text-sm font-bold text-[#7a1e13] transition-all duration-300 hover:-translate-y-1 hover:bg-[#7a1e13] hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Admin
            </Link>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded bg-[#111827] px-4 py-2 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-black"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
                <Settings size={22} className="text-[#7a1e13]" />
                Basic Store Details
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Store Name *
                  </label>

                  <input
                    name="storeName"
                    value={settings.storeName}
                    onChange={handleChange}
                    placeholder="PujaFresh"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Merchant Name *
                  </label>

                  <input
                    name="merchantName"
                    value={settings.merchantName}
                    onChange={handleChange}
                    placeholder="PujaFresh"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Support Email *
                  </label>

                  <input
                    name="supportEmail"
                    value={settings.supportEmail}
                    onChange={handleChange}
                    placeholder="support@pujafresh.com"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Support Phone *
                  </label>

                  <input
                    name="supportPhone"
                    value={settings.supportPhone}
                    onChange={handleChange}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="9999999999"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
                <Truck size={22} className="text-[#f97316]" />
                Delivery Settings
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Minimum Order Value
                  </label>

                  <input
                    type="number"
                    name="minimumOrderValue"
                    value={settings.minimumOrderValue}
                    onChange={handleChange}
                    min={0}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Delivery Charge
                  </label>

                  <input
                    type="number"
                    name="deliveryCharge"
                    value={settings.deliveryCharge}
                    onChange={handleChange}
                    min={0}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Free Delivery Above
                  </label>

                  <input
                    type="number"
                    name="freeDeliveryAbove"
                    value={settings.freeDeliveryAbove}
                    onChange={handleChange}
                    min={0}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
                <CreditCard size={22} className="text-[#15803d]" />
                Payment Method Settings
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded bg-[#fff7ed] p-4 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    name="codEnabled"
                    checked={settings.codEnabled}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  Cash on Delivery Active
                </label>

                <label className="flex items-center gap-3 rounded bg-[#fff7ed] p-4 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    name="upiEnabled"
                    checked={settings.upiEnabled}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  UPI QR Payment Active
                </label>

                <label className="flex items-center gap-3 rounded bg-[#fff7ed] p-4 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    name="bankTransferEnabled"
                    checked={settings.bankTransferEnabled}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  Bank Transfer Active
                </label>

                <label className="flex items-center gap-3 rounded bg-red-50 p-4 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    name="cardPaymentEnabled"
                    checked={settings.cardPaymentEnabled}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  Card Payment Active
                </label>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-gray-700">
                  UPI ID *
                </label>

                <input
                  name="upiId"
                  value={settings.upiId}
                  onChange={handleChange}
                  placeholder="yourupi@bank"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Bank Transfer Details
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Account Name
                  </label>

                  <input
                    name="bankAccountName"
                    value={settings.bankAccountName}
                    onChange={handleChange}
                    placeholder="PujaFresh"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Bank Name
                  </label>

                  <input
                    name="bankName"
                    value={settings.bankName}
                    onChange={handleChange}
                    placeholder="Bank Name"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Account Number
                  </label>

                  <input
                    name="bankAccountNumber"
                    value={settings.bankAccountNumber}
                    onChange={handleChange}
                    placeholder="XXXXXXXX1234"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#7a1e13]"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">
                    IFSC Code
                  </label>

                  <input
                    name="bankIfsc"
                    value={settings.bankIfsc}
                    onChange={handleChange}
                    placeholder="ABCD0000000"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-3 text-sm uppercase outline-none focus:border-[#7a1e13]"
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              Settings Preview
            </h2>

            <div className="mt-5 rounded-xl bg-[#fff7ed] p-4">
              <p className="text-sm font-semibold text-gray-500">Store</p>
              <p className="mt-1 text-xl font-black text-[#7a1e13]">
                {settings.storeName}
              </p>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[#7a1e13]" />
                  <span className="font-semibold text-gray-700">
                    {settings.supportEmail}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-[#7a1e13]" />
                  <span className="font-semibold text-gray-700">
                    {settings.supportPhone}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-700">
                Delivery Rules
              </p>

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>
                  Minimum Order:{" "}
                  <span className="font-black text-gray-900">
                    ₹{settings.minimumOrderValue}
                  </span>
                </p>

                <p>
                  Delivery Charge:{" "}
                  <span className="font-black text-gray-900">
                    ₹{settings.deliveryCharge}
                  </span>
                </p>

                <p>
                  Free Delivery Above:{" "}
                  <span className="font-black text-gray-900">
                    ₹{settings.freeDeliveryAbove}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-700">
                Active Payments
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                {settings.codEnabled && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                    COD
                  </span>
                )}

                {settings.upiEnabled && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                    UPI
                  </span>
                )}

                {settings.bankTransferEnabled && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                    Bank
                  </span>
                )}

                {settings.cardPaymentEnabled && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                    Card
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-bold text-gray-700">Last Updated</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatDateTime(settings.updatedAt)}
              </p>
            </div>

            <button
              type="submit"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#5f160e] hover:shadow-lg active:scale-95"
            >
              <Save size={17} />
              Save Store Settings
            </button>
          </aside>
        </form>
      </section>
    </main>
  );
}