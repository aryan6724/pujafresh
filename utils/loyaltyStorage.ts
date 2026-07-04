export type LoyaltyTransaction = {
  id: string;
  orderId?: string;
  type: "Earned" | "Redeemed" | "Manual Adjustment";
  points: number;
  orderTotal?: number;
  reason: string;
  createdAt: string;
  updatedBy: string;
};

export type CustomerLoyalty = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalPoints: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lifetimeSpent: number;
  totalOrders: number;
  lastOrderId: string;
  lastUpdatedAt: string;
  history: LoyaltyTransaction[];
};

export const LOYALTY_POINTS_KEY = "pujafresh-loyalty-points";

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() || "";
const normalizePhone = (phone?: string) => phone?.replace(/\D/g, "") || "";

const emitLoyaltyUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pujafresh-loyalty-updated"));
};

const normalizeCustomerLoyalty = (
  loyalty: Partial<CustomerLoyalty>
): CustomerLoyalty => {
  return {
    id:
      loyalty.id ||
      normalizeEmail(loyalty.customerEmail) ||
      normalizePhone(loyalty.customerPhone) ||
      `LOY-${Date.now()}`,
    customerName: loyalty.customerName || "Customer",
    customerEmail: normalizeEmail(loyalty.customerEmail),
    customerPhone: normalizePhone(loyalty.customerPhone),
    totalPoints: Number(loyalty.totalPoints || 0),
    lifetimeEarned: Number(loyalty.lifetimeEarned || 0),
    lifetimeRedeemed: Number(loyalty.lifetimeRedeemed || 0),
    lifetimeSpent: Number(loyalty.lifetimeSpent || 0),
    totalOrders: Number(loyalty.totalOrders || 0),
    lastOrderId: loyalty.lastOrderId || "",
    lastUpdatedAt: loyalty.lastUpdatedAt || new Date().toISOString(),
    history: Array.isArray(loyalty.history) ? loyalty.history : [],
  };
};

export function getAllCustomerLoyalty(): CustomerLoyalty[] {
  if (typeof window === "undefined") return [];

  const savedLoyalty = localStorage.getItem(LOYALTY_POINTS_KEY);

  if (!savedLoyalty) return [];

  try {
    const parsedLoyalty = JSON.parse(savedLoyalty) as Partial<CustomerLoyalty>[];
    if (!Array.isArray(parsedLoyalty)) return [];
    return parsedLoyalty.map(normalizeCustomerLoyalty);
  } catch {
    return [];
  }
}

export function saveAllCustomerLoyalty(customers: CustomerLoyalty[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    LOYALTY_POINTS_KEY,
    JSON.stringify(customers.map(normalizeCustomerLoyalty))
  );

  emitLoyaltyUpdate();
}

export function getCustomerLoyalty(
  customerEmail?: string,
  customerPhone?: string
): CustomerLoyalty | null {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  if (!email && !phone) return null;

  return (
    getAllCustomerLoyalty().find((customer) => {
      const customerEmailValue = normalizeEmail(customer.customerEmail);
      const customerPhoneValue = normalizePhone(customer.customerPhone);

      if (email && customerEmailValue && email === customerEmailValue) return true;
      if (phone && customerPhoneValue && phone === customerPhoneValue) return true;

      return false;
    }) || null
  );
}

export function createEmptyCustomerLoyalty(params: {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): CustomerLoyalty {
  const email = normalizeEmail(params.customerEmail);
  const phone = normalizePhone(params.customerPhone);

  return {
    id: email || phone || `LOY-${Date.now()}`,
    customerName: params.customerName || "Customer",
    customerEmail: email,
    customerPhone: phone,
    totalPoints: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    lifetimeSpent: 0,
    totalOrders: 0,
    lastOrderId: "",
    lastUpdatedAt: new Date().toISOString(),
    history: [],
  };
}

export function upsertCustomerLoyalty(customerLoyalty: CustomerLoyalty) {
  const normalized = normalizeCustomerLoyalty(customerLoyalty);
  const customers = getAllCustomerLoyalty();

  const updatedCustomers = customers.some((customer) => customer.id === normalized.id)
    ? customers.map((customer) => (customer.id === normalized.id ? normalized : customer))
    : [normalized, ...customers];

  saveAllCustomerLoyalty(updatedCustomers);
  return normalized;
}

export function getRedeemValue(points: number) {
  return Math.floor(Number(points || 0));
}
