export type CouponType = "Percentage" | "Fixed Amount" | "Free Delivery";

export type Coupon = {
  id: string;
  code: string;
  label: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
};

export const COUPONS_STORAGE_KEY = "pujafresh-coupons";

export const defaultCoupons: Coupon[] = [
  {
    id: "CPN-WELCOME10",
    code: "WELCOME10",
    label: "10% off on your first PujaFresh order",
    type: "Percentage",
    value: 10,
    minOrderValue: 299,
    maxDiscountAmount: 100,
    expiryDate: "2099-12-31",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "CPN-FRESH50",
    code: "FRESH50",
    label: "Flat ₹50 off on fresh pooja essentials",
    type: "Fixed Amount",
    value: 50,
    minOrderValue: 499,
    maxDiscountAmount: 0,
    expiryDate: "2099-12-31",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "CPN-FREEDEL",
    code: "FREEDEL",
    label: "Free delivery on eligible orders",
    type: "Free Delivery",
    value: 0,
    minOrderValue: 399,
    maxDiscountAmount: 0,
    expiryDate: "2099-12-31",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export function getCoupons() {
  if (typeof window === "undefined") return defaultCoupons;

  const savedCoupons = localStorage.getItem(COUPONS_STORAGE_KEY);

  if (!savedCoupons) {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
    return defaultCoupons;
  }

  try {
    const parsedCoupons = JSON.parse(savedCoupons) as Coupon[];

    if (Array.isArray(parsedCoupons)) {
      return parsedCoupons;
    }

    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
    return defaultCoupons;
  } catch {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
    return defaultCoupons;
  }
}

export function saveCoupons(coupons: Coupon[]) {
  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
}

export function resetCouponsToDefault() {
  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
  return defaultCoupons;
}

export function isCouponExpired(coupon: Coupon) {
  if (!coupon.expiryDate) return false;

  const today = new Date().toISOString().slice(0, 10);
  return coupon.expiryDate < today;
}
