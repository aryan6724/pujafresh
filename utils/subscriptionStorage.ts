export type SubscriptionFrequency = "Daily" | "Weekly" | "Monthly" | "Custom";

export type SubscriptionStatus =
  | "Pending Approval"
  | "Active"
  | "Paused"
  | "Cancelled"
  | "Completed";

export type SubscriptionPaymentMode =
  | "Cash on Delivery"
  | "UPI"
  | "Monthly Billing";

export type SubscriptionItem = {
  productId: number | string;
  slug?: string;
  name: string;
  image?: string;
  category?: string;
  price: number;
  quantity: number;
};

export type SubscriptionHistory = {
  status: SubscriptionStatus;
  message: string;
  updatedAt: string;
  updatedBy: string;
};

export type CustomerSubscription = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: SubscriptionItem[];
  frequency: SubscriptionFrequency;
  customFrequencyNote?: string;
  preferredDeliverySlot: string;
  startDate: string;
  endDate?: string;
  nextDeliveryDate: string;
  addressSummary: string;
  pincode: string;
  paymentMode: SubscriptionPaymentMode;
  notes?: string;
  status: SubscriptionStatus;
  totalPerDelivery: number;
  createdAt: string;
  updatedAt: string;
  history: SubscriptionHistory[];
};

export type NewSubscriptionInput = Omit<
  CustomerSubscription,
  "id" | "createdAt" | "updatedAt" | "history" | "totalPerDelivery"
>;

export const SUBSCRIPTIONS_STORAGE_KEY = "pujafresh-subscriptions";

const normalizeEmail = (email?: string) => {
  return email?.trim().toLowerCase() || "";
};

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

const safeParseSubscriptions = (value: string | null): CustomerSubscription[] => {
  if (!value) return [];

  try {
    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue) ? (parsedValue as CustomerSubscription[]) : [];
  } catch {
    return [];
  }
};

export const createSubscriptionId = () => {
  return `SUB-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export const calculateSubscriptionTotal = (items: SubscriptionItem[]) => {
  return items.reduce((sum, item) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);

    return sum + price * quantity;
  }, 0);
};

export const calculateNextDeliveryDate = (
  startDate: string,
  frequency: SubscriptionFrequency
) => {
  const baseDate = startDate ? new Date(startDate) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const nextDate = new Date(baseDate);

  if (frequency === "Daily") {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (frequency === "Weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === "Monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  return nextDate.toISOString().slice(0, 10);
};

export function getAllSubscriptions(): CustomerSubscription[] {
  if (typeof window === "undefined") return [];

  const savedSubscriptions = window.localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);

  return safeParseSubscriptions(savedSubscriptions);
}

export function saveAllSubscriptions(subscriptions: CustomerSubscription[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    SUBSCRIPTIONS_STORAGE_KEY,
    JSON.stringify(subscriptions)
  );
}

export function getCustomerSubscriptions(
  customerEmail?: string,
  customerPhone?: string
): CustomerSubscription[] {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  return getAllSubscriptions()
    .filter((subscription) => {
      const subscriptionEmail = normalizeEmail(subscription.customerEmail);
      const subscriptionPhone = normalizePhone(subscription.customerPhone);

      if (email && subscriptionEmail && email === subscriptionEmail) return true;
      if (phone && subscriptionPhone && phone === subscriptionPhone) return true;

      return false;
    })
    .sort((a, b) => {
      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    });
}

export function addSubscription(
  subscription: NewSubscriptionInput
): CustomerSubscription {
  const now = new Date().toISOString();

  const newSubscription: CustomerSubscription = {
    ...subscription,
    id: createSubscriptionId(),
    customerEmail: normalizeEmail(subscription.customerEmail),
    customerPhone: normalizePhone(subscription.customerPhone),
    totalPerDelivery: calculateSubscriptionTotal(subscription.items),
    createdAt: now,
    updatedAt: now,
    history: [
      {
        status: subscription.status,
        message: `Subscription created with ${subscription.status} status.`,
        updatedAt: now,
        updatedBy: "Customer",
      },
    ],
  };

  const previousSubscriptions = getAllSubscriptions();

  saveAllSubscriptions([newSubscription, ...previousSubscriptions]);

  return newSubscription;
}

export function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  updatedBy = "Admin",
  message?: string
): CustomerSubscription | null {
  const now = new Date().toISOString();

  let updatedSubscription: CustomerSubscription | null = null;

  const updatedSubscriptions = getAllSubscriptions().map((subscription) => {
    if (subscription.id !== subscriptionId) return subscription;

    updatedSubscription = {
      ...subscription,
      status,
      updatedAt: now,
      history: [
        {
          status,
          message: message || `Subscription status changed to ${status}.`,
          updatedAt: now,
          updatedBy,
        },
        ...(subscription.history || []),
      ],
    };

    return updatedSubscription;
  });

  saveAllSubscriptions(updatedSubscriptions);

  return updatedSubscription;
}

export function updateSubscriptionNextDelivery(
  subscriptionId: string,
  nextDeliveryDate: string,
  updatedBy = "Admin"
): CustomerSubscription | null {
  const now = new Date().toISOString();

  let updatedSubscription: CustomerSubscription | null = null;

  const updatedSubscriptions = getAllSubscriptions().map((subscription) => {
    if (subscription.id !== subscriptionId) return subscription;

    updatedSubscription = {
      ...subscription,
      nextDeliveryDate,
      updatedAt: now,
      history: [
        {
          status: subscription.status,
          message: `Next delivery date updated to ${nextDeliveryDate}.`,
          updatedAt: now,
          updatedBy,
        },
        ...(subscription.history || []),
      ],
    };

    return updatedSubscription;
  });

  saveAllSubscriptions(updatedSubscriptions);

  return updatedSubscription;
}

export function deleteSubscription(subscriptionId: string) {
  const updatedSubscriptions = getAllSubscriptions().filter((subscription) => {
    return subscription.id !== subscriptionId;
  });

  saveAllSubscriptions(updatedSubscriptions);
}
