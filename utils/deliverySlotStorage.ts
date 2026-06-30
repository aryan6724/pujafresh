export type DeliverySlot = {
  id: string;
  label: string;
  timeRange: string;
  maxOrders: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

export const DELIVERY_SLOTS_STORAGE_KEY = "pujafresh-delivery-slots";

export const defaultDeliverySlots: DeliverySlot[] = [
  {
    id: "SLOT-0500-0700",
    label: "5:00 AM - 7:00 AM",
    timeRange: "5:00 AM - 7:00 AM",
    maxOrders: 25,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "SLOT-0700-0900",
    label: "7:00 AM - 9:00 AM",
    timeRange: "7:00 AM - 9:00 AM",
    maxOrders: 35,
    sortOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "SLOT-1700-2000",
    label: "5:00 PM - 8:00 PM",
    timeRange: "5:00 PM - 8:00 PM",
    maxOrders: 20,
    sortOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export function getDeliverySlots() {
  if (typeof window === "undefined") return defaultDeliverySlots;

  const savedSlots = localStorage.getItem(DELIVERY_SLOTS_STORAGE_KEY);

  if (!savedSlots) {
    localStorage.setItem(
      DELIVERY_SLOTS_STORAGE_KEY,
      JSON.stringify(defaultDeliverySlots)
    );
    return defaultDeliverySlots;
  }

  try {
    const parsedSlots = JSON.parse(savedSlots) as DeliverySlot[];

    if (Array.isArray(parsedSlots)) {
      return parsedSlots.map((slot, index) => ({
        ...slot,
        timeRange: slot.timeRange || slot.label,
        maxOrders: Number(slot.maxOrders || 0),
        sortOrder: Number(slot.sortOrder || index + 1),
        isActive: Boolean(slot.isActive),
        createdAt: slot.createdAt || new Date().toISOString(),
      }));
    }

    localStorage.setItem(
      DELIVERY_SLOTS_STORAGE_KEY,
      JSON.stringify(defaultDeliverySlots)
    );
    return defaultDeliverySlots;
  } catch {
    localStorage.setItem(
      DELIVERY_SLOTS_STORAGE_KEY,
      JSON.stringify(defaultDeliverySlots)
    );
    return defaultDeliverySlots;
  }
}

export function saveDeliverySlots(slots: DeliverySlot[]) {
  localStorage.setItem(DELIVERY_SLOTS_STORAGE_KEY, JSON.stringify(slots));
}

export function resetDeliverySlotsToDefault() {
  localStorage.setItem(
    DELIVERY_SLOTS_STORAGE_KEY,
    JSON.stringify(defaultDeliverySlots)
  );
  return defaultDeliverySlots;
}
