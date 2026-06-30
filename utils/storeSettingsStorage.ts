export type StoreSettings = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
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
  updatedAt?: string;
};

export const STORE_SETTINGS_STORAGE_KEY = "pujafresh-store-settings";

export const defaultStoreSettings: StoreSettings = {
  storeName: "PujaFresh",
  storeEmail: "support@pujafresh.com",
  storePhone: "+91 99999 99999",
  storeAddress: "Delhi NCR, India",
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

export function getStoreSettings() {
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

    return {
      ...defaultStoreSettings,
      ...parsedSettings,
    };
  } catch {
    localStorage.setItem(
      STORE_SETTINGS_STORAGE_KEY,
      JSON.stringify(defaultStoreSettings)
    );
    return defaultStoreSettings;
  }
}

export function saveStoreSettings(settings: StoreSettings) {
  localStorage.setItem(
    STORE_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      ...settings,
      updatedAt: new Date().toISOString(),
    })
  );
}

export function resetStoreSettingsToDefault() {
  localStorage.setItem(
    STORE_SETTINGS_STORAGE_KEY,
    JSON.stringify(defaultStoreSettings)
  );
  return defaultStoreSettings;
}
