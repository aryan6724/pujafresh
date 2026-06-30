export type DeliveryPartnerStatus = "Active" | "Inactive" | "On Leave";

export type DeliveryPartner = {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: "Bike" | "Scooter" | "Cycle" | "Car";
  vehicleNumber: string;
  assignedAreas: string[];
  maxOrdersPerDay: number;
  status: DeliveryPartnerStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt?: string;
};

export const DELIVERY_PARTNERS_STORAGE_KEY = "pujafresh-delivery-partners";

export const defaultDeliveryPartners: DeliveryPartner[] = [
  {
    id: "DP-1001",
    name: "Rahul Kumar",
    phone: "9876543210",
    email: "rahul.delivery@pujafresh.com",
    vehicleType: "Bike",
    vehicleNumber: "DL 01 AB 1234",
    assignedAreas: ["Samaypur Badli", "Adarsh Nagar"],
    maxOrdersPerDay: 25,
    status: "Active",
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "DP-1002",
    name: "Amit Sharma",
    phone: "9876543211",
    email: "amit.delivery@pujafresh.com",
    vehicleType: "Scooter",
    vehicleNumber: "DL 02 CD 5678",
    assignedAreas: ["Pitampura", "Rohini"],
    maxOrdersPerDay: 30,
    status: "Active",
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "DP-1003",
    name: "Mohit Verma",
    phone: "9876543212",
    email: "mohit.delivery@pujafresh.com",
    vehicleType: "Bike",
    vehicleNumber: "DL 03 EF 9012",
    assignedAreas: ["Sultanpuri", "Rohini"],
    maxOrdersPerDay: 22,
    status: "On Leave",
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function createDeliveryPartnerId() {
  return `DP-${Date.now()}`;
}

export function getDeliveryPartners() {
  if (typeof window === "undefined") return defaultDeliveryPartners;

  const savedPartners = localStorage.getItem(DELIVERY_PARTNERS_STORAGE_KEY);

  if (!savedPartners) {
    localStorage.setItem(
      DELIVERY_PARTNERS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryPartners)
    );

    return defaultDeliveryPartners;
  }

  try {
    const parsedPartners = JSON.parse(savedPartners) as DeliveryPartner[];

    if (Array.isArray(parsedPartners)) {
      return parsedPartners;
    }

    localStorage.setItem(
      DELIVERY_PARTNERS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryPartners)
    );

    return defaultDeliveryPartners;
  } catch {
    localStorage.setItem(
      DELIVERY_PARTNERS_STORAGE_KEY,
      JSON.stringify(defaultDeliveryPartners)
    );

    return defaultDeliveryPartners;
  }
}

export function saveDeliveryPartners(partners: DeliveryPartner[]) {
  localStorage.setItem(DELIVERY_PARTNERS_STORAGE_KEY, JSON.stringify(partners));
}

export function resetDeliveryPartnersToDefault() {
  localStorage.setItem(
    DELIVERY_PARTNERS_STORAGE_KEY,
    JSON.stringify(defaultDeliveryPartners)
  );

  return defaultDeliveryPartners;
}

export function getActiveDeliveryPartners() {
  return getDeliveryPartners().filter((partner) => partner.status === "Active");
}
