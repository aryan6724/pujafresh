export type DeliverySlot = {
  id: string;
  label: string;
  timeRange: string;
  isActive: boolean;
};

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
  slots: DeliverySlot[];
  createdAt: string;
  updatedAt?: string;
};

export const DELIVERY_AREAS_STORAGE_KEY = "pujafresh-delivery-areas";

export const defaultDeliverySlots: DeliverySlot[] = [
  {
    id: "SLOT-MORNING",
    label: "Early Morning",
    timeRange: "6:00 AM - 8:00 AM",
    isActive: true,
  },
  {
    id: "SLOT-REGULAR",
    label: "Morning",
    timeRange: "8:00 AM - 11:00 AM",
    isActive: true,
  },
  {
    id: "SLOT-EVENING",
    label: "Evening",
    timeRange: "5:00 PM - 8:00 PM",
    isActive: true,
  },
];

export const defaultDeliveryAreas: DeliveryArea[] = [
  {
    id: "AREA-110001",
    pincode: "110001",
    areaName: "Connaught Place",
    city: "New Delhi",
    state: "Delhi",
    deliveryCharge: 49,
    freeDeliveryAbove: 499,
    minOrderValue: 149,
    estimatedDelivery: "Same day / Next morning",
    expressAvailable: true,
    isActive: true,
    slots: defaultDeliverySlots,
    createdAt: new Date().toISOString(),
  },
  {
    id: "AREA-110092",
    pincode: "110092",
    areaName: "Laxmi Nagar",
    city: "New Delhi",
    state: "Delhi",
    deliveryCharge: 39,
    freeDeliveryAbove: 399,
    minOrderValue: 149,
    estimatedDelivery: "Next morning",
    expressAvailable: true,
    isActive: true,
    slots: defaultDeliverySlots,
    createdAt: new Date().toISOString(),
  },
  {
    id: "AREA-201301",
    pincode: "201301",
    areaName: "Noida Sector 18",
    city: "Noida",
    state: "Uttar Pradesh",
    deliveryCharge: 59,
    freeDeliveryAbove: 599,
    minOrderValue: 199,
    estimatedDelivery: "Next morning",
    expressAvailable: false,
    isActive: true,
    slots: defaultDeliverySlots,
    createdAt: new Date().toISOString(),
  },
];

export function getDeliveryAreas() {
  if (typeof window === "undefined") return defaultDeliveryAreas;

  const savedAreas = localStorage.getItem(DELIVERY_AREAS_STORAGE_KEY);

  if (!savedAreas) {
    localStorage.setItem(
      DELIVERY_AREAS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryAreas)
    );
    return defaultDeliveryAreas;
  }

  try {
    const parsedAreas = JSON.parse(savedAreas) as DeliveryArea[];

    if (Array.isArray(parsedAreas)) {
      return parsedAreas;
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
  localStorage.setItem(DELIVERY_AREAS_STORAGE_KEY, JSON.stringify(areas));
}

export function resetDeliveryAreasToDefault() {
  localStorage.setItem(
    DELIVERY_AREAS_STORAGE_KEY,
    JSON.stringify(defaultDeliveryAreas)
  );
  return defaultDeliveryAreas;
}

export function findDeliveryAreaByPincode(pincode: string) {
  const cleanPincode = pincode.trim();

  return getDeliveryAreas().find(
    (area) => area.pincode === cleanPincode && area.isActive
  );
}
