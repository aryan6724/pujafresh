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

const createDefaultArea = (
  pincode: string,
  areaName: string,
  city = "Delhi",
  deliveryCharge = 49,
  freeDeliveryAbove = 499,
  minOrderValue = 149
): DeliveryArea => {
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
    createdAt: new Date().toISOString(),
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

  return {
    id: area.id || `area-${area.pincode || Date.now()}`,
    pincode: area.pincode || "",
    areaName: area.areaName || fallback?.areaName || "Service Area",
    city: area.city || fallback?.city || "Delhi",
    state: area.state || fallback?.state || "Delhi",
    deliveryCharge: Number(area.deliveryCharge ?? fallback?.deliveryCharge ?? 49),
    freeDeliveryAbove: Number(
      area.freeDeliveryAbove ?? fallback?.freeDeliveryAbove ?? 499
    ),
    minOrderValue: Number(area.minOrderValue ?? fallback?.minOrderValue ?? 149),
    estimatedDelivery:
      area.estimatedDelivery || fallback?.estimatedDelivery || "Next morning",
    expressAvailable: area.expressAvailable ?? fallback?.expressAvailable ?? true,
    isActive: area.isActive !== false,
    createdAt: area.createdAt || new Date().toISOString(),
    updatedAt: area.updatedAt,
  };
};

export function getDeliveryAreas() {
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

    if (Array.isArray(parsedAreas)) {
      const normalizedAreas = parsedAreas
        .filter((area) => area.pincode)
        .map(normalizeDeliveryArea);

      localStorage.setItem(
        DELIVERY_AREAS_STORAGE_KEY,
        JSON.stringify(normalizedAreas)
      );

      return normalizedAreas;
    }

    localStorage.setItem(
      DELIVERY_AREAS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryAreas)
    );
    return defaultDeliveryAreas;
  } catch {
    localStorage.setItem(
      DELIVERY_AREAS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryAreas)
    );
    return defaultDeliveryAreas;
  }
}

export function saveDeliveryAreas(areas: DeliveryArea[]) {
  localStorage.setItem(
    DELIVERY_AREAS_STORAGE_KEY,
    JSON.stringify(areas.map(normalizeDeliveryArea))
  );
}

export function resetDeliveryAreasToDefault() {
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
