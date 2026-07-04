export type StoreSettings = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;

  // Admin settings page uses these support aliases.
  supportEmail: string;
  supportPhone: string;

  minimumOrderValue: number;
  deliveryCharge: number;
  freeDeliveryAbove: number;
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

  // Required string, because admin/settings calls formatDateTime(settings.updatedAt)
  updatedAt: string;
};

export const STORE_SETTINGS_STORAGE_KEY = "pujafresh-store-settings";

export const defaultStoreSettings: StoreSettings = {
  storeName: "PujaFresh",
  storeEmail: "support@pujafresh.com",
  storePhone: "+91 99999 99999",
  storeAddress: "Delhi NCR, India",

  supportEmail: "support@pujafresh.com",
  supportPhone: "+91 99999 99999",

  minimumOrderValue: 149,
  deliveryCharge: 49,
  freeDeliveryAbove: 499,
  codEnabled: true,
  upiEnabled: true,
  bankTransferEnabled: true,
  cardPaymentEnabled: false,
  upiId: "pujafresh@upi",
  merchantName: "PujaFresh",
  bankName: "HDFC Bank",
  bankAccountName: "PujaFresh",
  bankAccountNumber: "123456789012",
  bankIfsc: "HDFC0000001",
  supportStartTime: "08:00",
  supportEndTime: "21:00",
  orderCutoffTime: "21:00",
  updatedAt: new Date().toISOString(),
};

const emitStoreSettingsUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pujafresh-store-settings-updated"));
};

const normalizeStoreSettings = (
  settings?: Partial<StoreSettings>
): StoreSettings => {
  const now = new Date().toISOString();

  const storeEmail =
    settings?.storeEmail ||
    settings?.supportEmail ||
    defaultStoreSettings.storeEmail;

  const supportEmail =
    settings?.supportEmail ||
    settings?.storeEmail ||
    defaultStoreSettings.supportEmail;

  const storePhone =
    settings?.storePhone ||
    settings?.supportPhone ||
    defaultStoreSettings.storePhone;

  const supportPhone =
    settings?.supportPhone ||
    settings?.storePhone ||
    defaultStoreSettings.supportPhone;

  return {
    ...defaultStoreSettings,
    ...settings,
    storeEmail,
    supportEmail,
    storePhone,
    supportPhone,
    updatedAt: settings?.updatedAt || now,
  };
};

export function getStoreSettings(): StoreSettings {
  if (typeof window === "undefined") return defaultStoreSettings;

  const savedSettings = localStorage.getItem(STORE_SETTINGS_STORAGE_KEY);

  if (!savedSettings) {
    localStorage.setItem(
      STORE_SETTINGS_STORAGE_KEY,
      JSON.stringify(defaultStoreSettings)
    );

    return defaultStoreSettings;
  }

  try {
    const parsedSettings = JSON.parse(savedSettings) as Partial<StoreSettings>;
    const normalizedSettings = normalizeStoreSettings(parsedSettings);

    // Save once so older localStorage data also gets supportEmail/supportPhone/updatedAt.
    localStorage.setItem(
      STORE_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizedSettings)
    );

    return normalizedSettings;
  } catch {
    localStorage.setItem(
      STORE_SETTINGS_STORAGE_KEY,
      JSON.stringify(defaultStoreSettings)
    );

    return defaultStoreSettings;
  }
}

export function saveStoreSettings(settings: StoreSettings) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORE_SETTINGS_STORAGE_KEY,
    JSON.stringify(
      normalizeStoreSettings({
        ...settings,
        updatedAt: new Date().toISOString(),
      })
    )
  );

  emitStoreSettingsUpdate();
}

export function resetStoreSettingsToDefault() {
  if (typeof window === "undefined") return defaultStoreSettings;

  const resetSettings = {
    ...defaultStoreSettings,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(resetSettings));

  emitStoreSettingsUpdate();
  return resetSettings;
}

// Backward-compatible alias for older admin/settings imports.
export const resetStoreSettings = resetStoreSettingsToDefault;
