export type DeliveryArea = {
  id: string;
  pincode: string;
  areaName: string;
  city: string;
  state: string;
  deliveryCharge: number;
  freeDeliveryAbove: number;
  minOrderValue: number;
  estimatedDelivery: string;
  expressAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

export const DELIVERY_AREAS_STORAGE_KEY = "pujafresh-delivery-areas";

const getNow = () => new Date().toISOString();

const createDefaultArea = (
  pincode: string,
  areaName: string,
  city = "Delhi",
  deliveryCharge = 49,
  freeDeliveryAbove = 499,
  minOrderValue = 149
): DeliveryArea => {
  const now = getNow();

  return {
    id: `area-${pincode}`,
    pincode,
    areaName,
    city,
    state: "Delhi",
    deliveryCharge,
    freeDeliveryAbove,
    minOrderValue,
    estimatedDelivery: "Next morning",
    expressAvailable: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
};

export const defaultDeliveryAreas: DeliveryArea[] = [
  createDefaultArea("110077", "Palam", "Delhi", 49, 499, 149),
  createDefaultArea("110033", "Adarsh Nagar", "Delhi", 49, 499, 149),
  createDefaultArea("110034", "Pitampura", "Delhi", 49, 499, 149),
  createDefaultArea("110085", "Rohini", "Delhi", 49, 499, 149),
  createDefaultArea("110086", "Sultanpuri", "Delhi", 49, 499, 149),
];

const normalizeDeliveryArea = (area: Partial<DeliveryArea>): DeliveryArea => {
  const fallback = defaultDeliveryAreas.find(
    (defaultArea) => defaultArea.pincode === area.pincode
  );

  const now = getNow();
  const pincode = String(area.pincode || fallback?.pincode || "").trim();

  return {
    id: String(area.id || fallback?.id || `area-${pincode || Date.now()}`),
    pincode,
    areaName: String(area.areaName || fallback?.areaName || "Service Area"),
    city: String(area.city || fallback?.city || "Delhi"),
    state: String(area.state || fallback?.state || "Delhi"),
    deliveryCharge: Number(
      area.deliveryCharge ?? fallback?.deliveryCharge ?? 49
    ),
    freeDeliveryAbove: Number(
      area.freeDeliveryAbove ?? fallback?.freeDeliveryAbove ?? 499
    ),
    minOrderValue: Number(
      area.minOrderValue ?? fallback?.minOrderValue ?? 149
    ),
    estimatedDelivery: String(
      area.estimatedDelivery || fallback?.estimatedDelivery || "Next morning"
    ),
    expressAvailable:
      area.expressAvailable ?? fallback?.expressAvailable ?? true,
    isActive: area.isActive !== false,
    createdAt: String(area.createdAt || fallback?.createdAt || now),
    updatedAt: String(area.updatedAt || now),
  };
};

export function getDeliveryAreas(): DeliveryArea[] {
  if (typeof window === "undefined") {
    return defaultDeliveryAreas;
  }

  const savedAreas = localStorage.getItem(DELIVERY_AREAS_STORAGE_KEY);

  if (!savedAreas) {
    localStorage.setItem(
      DELIVERY_AREAS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryAreas)
    );

    return defaultDeliveryAreas;
  }

  try {
    const parsedAreas = JSON.parse(savedAreas) as Partial<DeliveryArea>[];

    if (!Array.isArray(parsedAreas)) {
      localStorage.setItem(
        DELIVERY_AREAS_STORAGE_KEY,
        JSON.stringify(defaultDeliveryAreas)
      );

      return defaultDeliveryAreas;
    }

    const normalizedAreas = parsedAreas
      .filter((area) => String(area.pincode || "").trim().length > 0)
      .map(normalizeDeliveryArea);

    localStorage.setItem(
      DELIVERY_AREAS_STORAGE_KEY,
      JSON.stringify(normalizedAreas)
    );

    return normalizedAreas;
  } catch {
    localStorage.setItem(
      DELIVERY_AREAS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryAreas)
    );

    return defaultDeliveryAreas;
  }
}

export function saveDeliveryAreas(areas: DeliveryArea[]) {
  if (typeof window === "undefined") return;

  const normalizedAreas = areas.map((area) => ({
    ...normalizeDeliveryArea(area),
    updatedAt: getNow(),
  }));

  localStorage.setItem(
    DELIVERY_AREAS_STORAGE_KEY,
    JSON.stringify(normalizedAreas)
  );
}

export function resetDeliveryAreasToDefault() {
  if (typeof window === "undefined") {
    return defaultDeliveryAreas;
  }

  localStorage.setItem(
    DELIVERY_AREAS_STORAGE_KEY,
    JSON.stringify(defaultDeliveryAreas)
  );

  return defaultDeliveryAreas;
}

export function getActivePincodes() {
  return getDeliveryAreas()
    .filter((area) => area.isActive)
    .map((area) => area.pincode);
}

export function createDeliveryAreaId() {
  return `area-${Date.now()}`;
}

export function findDeliveryAreaByPincode(pincode: string) {
  const cleanPincode = pincode.trim();

  return getDeliveryAreas().find(
    (area) => area.pincode === cleanPincode && area.isActive
  );
}
