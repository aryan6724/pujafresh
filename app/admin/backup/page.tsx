"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type BackupItem = {
  key: string;
  label: string;
  category: string;
  description: string;
  value: unknown;
  count: number;
  exists: boolean;
};

type BackupPayload = {
  appName: "PujaFresh";
  version: "1.0";
  exportedAt: string;
  exportedBy: "Admin";
  items: {
    key: string;
    label: string;
    category: string;
    value: unknown;
  }[];
};

const backupDefinitions = [
  {
    key: "pujafresh-orders",
    label: "Orders",
    category: "Orders",
    description: "Customer orders, payment status, delivery status and totals.",
  },
  {
    key: "pujafresh-subscriptions",
    label: "Subscriptions",
    category: "Subscriptions",
    description: "Repeat delivery subscriptions, frequency, status and next delivery dates.",
  },
  {
    key: "pujafresh-products",
    label: "Products",
    category: "Products",
    description: "Product catalogue, categories, stock and pricing.",
  },
  {
    key: "pujafresh-inventory-history",
    label: "Inventory History",
    category: "Inventory",
    description: "Stock reduce, restore and manual update logs.",
  },
  {
    key: "pujafresh-coupons",
    label: "Coupons",
    category: "Marketing",
    description: "Coupon codes, discount rules and expiry dates.",
  },
  {
    key: "pujafresh-coupon-usage",
    label: "Coupon Usage",
    category: "Marketing",
    description: "Coupon usage logs and customer savings.",
  },
  {
    key: "pujafresh-loyalty-points",
    label: "Loyalty Points",
    category: "Marketing",
    description: "Customer loyalty balances and transaction history.",
  },
  {
    key: "pujafresh-newsletter-subscribers",
    label: "Newsletter",
    category: "Marketing",
    description: "Newsletter subscriber list.",
  },
  {
    key: "pujafresh-support-tickets",
    label: "Support Tickets",
    category: "Support",
    description: "Customer support tickets and replies.",
  },
  {
    key: "pujafresh-faqs",
    label: "FAQs",
    category: "Content",
    description: "FAQ / help center questions and answers.",
  },
  {
    key: "pujafresh-announcements",
    label: "Announcements",
    category: "Content",
    description: "Announcement and offer bar records.",
  },
  {
    key: "pujafresh-delivery-areas",
    label: "Delivery Areas",
    category: "Delivery",
    description: "Serviceable pincodes and delivery area rules.",
  },
  {
    key: "pujafresh-delivery-slots",
    label: "Delivery Slots",
    category: "Delivery",
    description: "Delivery slots, capacity and sort order.",
  },
  {
    key: "pujafresh-delivery-partners",
    label: "Delivery Partners",
    category: "Delivery",
    description: "Delivery staff, vehicles, status and workload capacity.",
  },
  {
    key: "pujafresh-delivery-feedback",
    label: "Delivery Feedback",
    category: "Delivery",
    description: "Customer delivery ratings and issue reports.",
  },
  {
    key: "pujafresh-customer-notifications",
    label: "Customer Notifications",
    category: "Notifications",
    description: "Customer alert history, read/unread status and broadcasts.",
  },
  {
    key: "pujafresh-store-settings",
    label: "Store Settings",
    category: "Settings",
    description: "Checkout rules, payment methods and store details.",
  },
  {
    key: "pujafresh-admin-auth",
    label: "Admin Session",
    category: "Settings",
    description: "Current admin login session flag.",
  },
  {
    key: "pujafresh-last-order",
    label: "Last Order",
    category: "Orders",
    description: "Latest order used by order success page.",
  },
];

const readLocalStorageValue = (key: string) => {
  if (typeof window === "undefined") return null;

  const rawValue = localStorage.getItem(key);

  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
};

const getItemCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return 1;
  if (typeof value === "string" && value.length > 0) return 1;
  return 0;
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

export default function AdminBackupPage() {
  const router = useRouter();

  const [backupItems, setBackupItems] = useState<BackupItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [restorePreview, setRestorePreview] = useState<BackupPayload | null>(
    null
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    loadBackupItems();
    setIsCheckingAuth(false);
  }, [router]);

  const loadBackupItems = () => {
    const items = backupDefinitions.map((definition) => {
      const value = readLocalStorageValue(definition.key);
      const exists = value !== null;

      return {
        ...definition,
        value,
        exists,
        count: getItemCount(value),
      };
    });

    setBackupItems(items);
    setSelectedKeys(items.filter((item) => item.exists).map((item) => item.key));
  };

  const categories = useMemo(() => {
    return [
      "All Categories",
      ...Array.from(new Set(backupDefinitions.map((item) => item.category))),
    ];
  }, []);

  const filteredItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return backupItems.filter((item) => {
      const matchesCategory =
        categoryFilter === "All Categories" || item.category === categoryFilter;

      const matchesSearch =
        search.length === 0 ||
        item.label.toLowerCase().includes(search) ||
        item.key.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [backupItems, categoryFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      totalModules: backupItems.length,
      availableModules: backupItems.filter((item) => item.exists).length,
      selectedModules: selectedKeys.length,
      totalRecords: backupItems.reduce((sum, item) => sum + item.count, 0),
    };
  }, [backupItems, selectedKeys.length]);

  const toggleSelection = (key: string) => {
    setSelectedKeys((prevKeys) =>
      prevKeys.includes(key)
        ? prevKeys.filter((itemKey) => itemKey !== key)
        : [...prevKeys, key]
    );
  };

  const selectAllAvailable = () => {
    setSelectedKeys(backupItems.filter((item) => item.exists).map((item) => item.key));
  };

  const clearSelection = () => {
    setSelectedKeys([]);
  };

  const createBackupPayload = () => {
    const selectedItems = backupItems.filter(
      (item) => selectedKeys.includes(item.key) && item.exists
    );

    const payload: BackupPayload = {
      appName: "PujaFresh",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "Admin",
      items: selectedItems.map((item) => ({
        key: item.key,
        label: item.label,
        category: item.category,
        value: item.value,
      })),
    };

    return payload;
  };

  const downloadBackup = () => {
    if (selectedKeys.length === 0) {
      toast.error("Please select at least one module");
      return;
    }

    const payload = createBackupPayload();

    if (payload.items.length === 0) {
      toast.error("Selected modules do not have data");
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pujafresh-backup-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("Backup JSON downloaded");
  };

  const handleRestoreFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsedBackup = JSON.parse(String(reader.result)) as BackupPayload;

        if (
          parsedBackup.appName !== "PujaFresh" ||
          !Array.isArray(parsedBackup.items)
        ) {
          toast.error("Invalid PujaFresh backup file");
          return;
        }

        setRestorePreview(parsedBackup);
        toast.success("Backup file loaded for preview");
      } catch {
        toast.error("Could not read this backup file");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const restoreBackup = () => {
    if (!restorePreview) {
      toast.error("Please upload a backup file first");
      return;
    }

    const confirmRestore = window.confirm(
      `Restore ${restorePreview.items.length} module(s)? This will overwrite matching local data.`
    );

    if (!confirmRestore) return;

    restorePreview.items.forEach((item) => {
      localStorage.setItem(item.key, JSON.stringify(item.value));
    });

    setRestorePreview(null);
    loadBackupItems();
    toast.success("Backup restored successfully");
  };

  const clearModuleData = (key: string, label: string) => {
    const confirmClear = window.confirm(
      `Clear all local data for ${label}? This action cannot be undone.`
    );

    if (!confirmClear) return;

    localStorage.removeItem(key);
    loadBackupItems();
    toast.success(`${label} data cleared`);
  };

  const clearSelectedData = () => {
    if (selectedKeys.length === 0) {
      toast.error("Please select modules to clear");
      return;
    }

    const confirmClear = window.confirm(
      `Clear ${selectedKeys.length} selected module(s)? This action cannot be undone.`
    );

    if (!confirmClear) return;

    selectedKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    loadBackupItems();
    toast.success("Selected data cleared");
  };

  const resetFilters = () => {
    setCategoryFilter("All Categories");
    setSearchQuery("");
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
              Backup & Restore
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Export, restore and manage all local PujaFresh demo data safely.
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
              onClick={loadBackupItems}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>

            <button
              onClick={downloadBackup}
              className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
            >
              Download Backup
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Modules</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalModules}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">With Data</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.availableModules}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Selected</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.selectedModules}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Records</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.totalRecords}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Backup Modules
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Select modules and download data as JSON.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={selectAllAvailable}
                  className="rounded border border-[#15803d] px-4 py-2 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
                >
                  Select All
                </button>

                <button
                  onClick={clearSelection}
                  className="rounded border border-gray-400 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-900 hover:text-white"
                >
                  Clear Selection
                </button>

                <button
                  onClick={clearSelectedData}
                  className="rounded border border-red-600 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Clear Selected
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px_130px]">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Search Modules
                </label>

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search orders, products, delivery, coupons..."
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
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-xl border p-4 ${
                    item.exists ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <label className="flex cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(item.key)}
                        disabled={!item.exists}
                        onChange={() => toggleSelection(item.key)}
                        className="mt-1 h-4 w-4"
                      />

                      <div>
                        <div className="flex flex-wrap gap-2">
                          <h3 className="font-bold text-gray-900">
                            {item.label}
                          </h3>

                          <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]">
                            {item.category}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.exists
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.exists ? `${item.count} record(s)` : "No data"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-600">
                          {item.description}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          Key: {item.key}
                        </p>
                      </div>
                    </label>

                    {item.exists && (
                      <button
                        onClick={() => clearModuleData(item.key, item.label)}
                        className="rounded border border-red-600 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-bold text-gray-900">
                    No modules found
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Try changing category or search value.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                Restore Backup
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Upload a PujaFresh backup JSON file and restore selected data.
                Restore will overwrite matching localStorage modules.
              </p>

              <label className="mt-5 block cursor-pointer rounded-xl border border-dashed border-[#7a1e13] bg-[#fff7ed] p-5 text-center">
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />

                <span className="font-bold text-[#7a1e13]">
                  Upload Backup JSON
                </span>

                <p className="mt-1 text-sm text-gray-600">
                  Click to select backup file
                </p>
              </label>

              {restorePreview && (
                <div className="mt-5 rounded-xl bg-gray-50 p-4">
                  <p className="font-bold text-gray-900">
                    Backup Preview
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    Exported: {formatDateTime(restorePreview.exportedAt)}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Modules: {restorePreview.items.length}
                  </p>

                  <div className="mt-3 max-h-52 overflow-y-auto rounded bg-white p-3">
                    {restorePreview.items.map((item) => (
                      <p
                        key={item.key}
                        className="border-b py-2 text-xs font-semibold text-gray-600 last:border-b-0"
                      >
                        {item.label} — {item.key}
                      </p>
                    ))}
                  </div>

                  <button
                    onClick={restoreBackup}
                    className="mt-4 w-full rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#64180f]"
                  >
                    Restore Backup
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <h2 className="text-xl font-bold text-orange-800">
                Important
              </h2>

              <div className="mt-3 grid gap-2 text-sm leading-6 text-orange-800">
                <p>
                  This project currently uses browser localStorage as demo data
                  storage.
                </p>

                <p>
                  Backup JSON is useful before testing new features, clearing
                  data or switching browsers.
                </p>

                <p>
                  Restore overwrites matching modules, so download a fresh
                  backup before restoring old data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
