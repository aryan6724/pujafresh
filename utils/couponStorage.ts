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
  updatedAt?: string;
};

export type CouponApplyResult = {
  ok: boolean;
  message: string;
  coupon?: Coupon;
  discountAmount: number;
  deliveryDiscount: number;
};

export const COUPONS_STORAGE_KEY = "pujafresh-coupons";

const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const defaultCoupons: Coupon[] = [
  {
    id: "CPN-WELCOME10",
    code: "WELCOME10",
    label: "10% off on your order",
    type: "Percentage",
    value: 10,
    minOrderValue: 199,
    maxDiscountAmount: 100,
    expiryDate: getFutureDate(90),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "CPN-FRESH50",
    code: "FRESH50",
    label: "₹50 off on pooja essentials",
    type: "Fixed Amount",
    value: 50,
    minOrderValue: 399,
    maxDiscountAmount: 0,
    expiryDate: getFutureDate(60),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "CPN-FREEDEL",
    code: "FREEDEL",
    label: "Free delivery coupon",
    type: "Free Delivery",
    value: 0,
    minOrderValue: 299,
    maxDiscountAmount: 0,
    expiryDate: getFutureDate(45),
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const normalizeCouponCode = (code?: string) => {
  return String(code || "").trim().toUpperCase().replace(/\s/g, "");
};

const emitCouponUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pujafresh-coupons-updated"));
};

const normalizeCoupon = (coupon: Partial<Coupon>): Coupon => {
  return {
    id: String(coupon.id || `CPN-${Date.now()}-${Math.floor(Math.random() * 100000)}`),
    code: normalizeCouponCode(coupon.code),
    label: String(coupon.label || coupon.code || "Coupon"),
    type: coupon.type || "Fixed Amount",
    value: Number(coupon.value || 0),
    minOrderValue: Number(coupon.minOrderValue || 0),
    maxDiscountAmount: Number(coupon.maxDiscountAmount || 0),
    expiryDate: coupon.expiryDate || getFutureDate(30),
    isActive: coupon.isActive !== false,
    createdAt: coupon.createdAt || new Date().toISOString(),
    updatedAt: coupon.updatedAt,
  };
};

export function isCouponExpired(coupon: Coupon) {
  if (!coupon.expiryDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(`${coupon.expiryDate}T23:59:59`);
  return expiryDate.getTime() < today.getTime();
}

export function getCoupons(): Coupon[] {
  if (typeof window === "undefined") return defaultCoupons;

  const savedCoupons = localStorage.getItem(COUPONS_STORAGE_KEY);

  if (!savedCoupons) {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
    return defaultCoupons;
  }

  try {
    const parsedCoupons = JSON.parse(savedCoupons) as Partial<Coupon>[];

    if (!Array.isArray(parsedCoupons)) {
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
      return defaultCoupons;
    }

    return parsedCoupons
      .map(normalizeCoupon)
      .sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  } catch {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
    return defaultCoupons;
  }
}

export function saveCoupons(coupons: Coupon[]) {
  if (typeof window === "undefined") return;

  const normalizedCoupons = coupons.map((coupon) => ({
    ...normalizeCoupon(coupon),
    updatedAt: new Date().toISOString(),
  }));

  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(normalizedCoupons));
  emitCouponUpdate();
}

export function resetCouponsToDefault() {
  if (typeof window === "undefined") return defaultCoupons;

  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(defaultCoupons));
  emitCouponUpdate();
  return defaultCoupons;
}

export function getActiveCoupons() {
  return getCoupons().filter((coupon) => coupon.isActive && !isCouponExpired(coupon));
}

export function findCouponByCode(code: string) {
  const normalizedCode = normalizeCouponCode(code);
  return getCoupons().find((coupon) => coupon.code === normalizedCode) || null;
}

export function calculateCouponDiscount(params: {
  code: string;
  subtotal: number;
  deliveryCharge?: number;
}): CouponApplyResult {
  const coupon = findCouponByCode(params.code);
  const subtotal = Number(params.subtotal || 0);
  const deliveryCharge = Number(params.deliveryCharge || 0);

  if (!coupon) {
    return { ok: false, message: "Coupon not found", discountAmount: 0, deliveryDiscount: 0 };
  }

  if (!coupon.isActive) {
    return { ok: false, message: "Coupon is inactive", coupon, discountAmount: 0, deliveryDiscount: 0 };
  }

  if (isCouponExpired(coupon)) {
    return { ok: false, message: "Coupon has expired", coupon, discountAmount: 0, deliveryDiscount: 0 };
  }

  if (subtotal < Number(coupon.minOrderValue || 0)) {
    return {
      ok: false,
      message: `Minimum order value for this coupon is ₹${coupon.minOrderValue}`,
      coupon,
      discountAmount: 0,
      deliveryDiscount: 0,
    };
  }

  if (coupon.type === "Free Delivery") {
    return {
      ok: true,
      message: "Free delivery coupon applied",
      coupon,
      discountAmount: 0,
      deliveryDiscount: deliveryCharge,
    };
  }

  if (coupon.type === "Fixed Amount") {
    const discountAmount = Math.min(Number(coupon.value || 0), subtotal);
    return { ok: true, message: "Coupon applied successfully", coupon, discountAmount, deliveryDiscount: 0 };
  }

  const rawDiscount = Math.round((subtotal * Number(coupon.value || 0)) / 100);
  const maxDiscount = Number(coupon.maxDiscountAmount || 0);
  const discountAmount =
    maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount, subtotal) : Math.min(rawDiscount, subtotal);

  return { ok: true, message: "Coupon applied successfully", coupon, discountAmount, deliveryDiscount: 0 };
}

export function getCouponDisplayText(coupon: Coupon) {
  if (coupon.type === "Percentage") {
    return `${coupon.value}% OFF${
      coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0
        ? ` up to ₹${coupon.maxDiscountAmount}`
        : ""
    }`;
  }

  if (coupon.type === "Fixed Amount") return `₹${coupon.value} OFF`;
  return "Free Delivery";
}
