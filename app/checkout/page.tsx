"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { getProducts, saveProducts } from "@/utils/productStorage";
import { Coupon, getCoupons, isCouponExpired } from "@/utils/couponStorage";
import { DeliveryArea, getDeliveryAreas } from "@/utils/pincodeStorage";
import { DeliverySlot, getDeliverySlots } from "@/utils/deliverySlotStorage";
import {
  defaultStoreSettings,
  getStoreSettings,
  StoreSettings,
} from "@/utils/storeSettingsStorage";
import {
  addCouponNotification,
  addLoyaltyPointsNotification,
  addOrderStatusNotification,
  addPaymentStatusNotification,
} from "@/utils/customerNotificationStorage";
import {
  CustomerAddress,
  getCustomerAddresses,
  getDefaultCustomerAddress,
} from "@/utils/addressStorage";

type AppliedCoupon = Coupon & {
  discountAmount: number;
};

type CheckoutItem = Product & {
  quantity: number;
};

type InventoryHistoryLog = {
  id: string;
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  productCategory: string;
  changeType: "Stock Reduced" | "Stock Restored" | "Manual Update";
  quantityChange: number;
  previousStock: number;
  updatedStock: number;
  reason: string;
  orderId?: string;
  createdAt: string;
  updatedBy: string;
};

type CouponUsageLog = {
  id: string;
  orderId: string;
  couponCode: string;
  couponLabel: string;
  couponType: string;
  couponValue: number;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  deliveryCharge: number;
  orderTotal: number;
  discountAmount: number;
  deliveryDiscount: number;
  totalSavings: number;
  usedAt: string;
};

type LoyaltyTransaction = {
  id: string;
  orderId?: string;
  type: "Earned" | "Redeemed" | "Manual Adjustment";
  points: number;
  orderTotal?: number;
  reason: string;
  createdAt: string;
  updatedBy: string;
};

type CustomerLoyalty = {
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

type ProfileData = {
  phone: string;
  address: string;
  landmark: string;
  pincode: string;
  deliverySlot: string;
};

const getProfileStorageKey = (email: string) => {
  return `pujafresh-profile-${email}`;
};

const mapProfileSlotToCheckoutSlot = (slot?: string) => {
  if (!slot) return "5:00 AM - 7:00 AM";

  if (slot === "Morning Slot") return "5:00 AM - 7:00 AM";
  if (slot === "Afternoon Slot") return "7:00 AM - 9:00 AM";
  if (slot === "Evening Slot") return "7:00 AM - 9:00 AM";

  return slot;
};

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return formatDateForInput(tomorrow);
};

const getInitialPaymentStatus = (paymentMethod: string) => {
  if (paymentMethod === "Cash on Delivery") {
    return "Payment Pending";
  }

  if (paymentMethod === "UPI QR Payment" || paymentMethod === "Bank Transfer") {
    return "Verification Pending";
  }

  if (paymentMethod === "Card Payment") {
    return "Payment Pending";
  }

  return "Payment Pending";
};

const LOYALTY_POINTS_KEY = "pujafresh-loyalty-points";

const calculateLoyaltyPoints = (orderTotal: number) => {
  return Math.floor(orderTotal / 100);
};

const saveLoyaltyPointsForOrder = ({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  orderTotal,
  pointsEarned,
  pointsRedeemed,
  redemptionAmount,
  createdAt,
}: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderTotal: number;
  pointsEarned: number;
  pointsRedeemed: number;
  redemptionAmount: number;
  createdAt: string;
}) => {
  if (pointsEarned <= 0 && pointsRedeemed <= 0) return;

  const savedLoyalty = localStorage.getItem(LOYALTY_POINTS_KEY);
  const previousLoyalty = savedLoyalty
    ? (JSON.parse(savedLoyalty) as CustomerLoyalty[])
    : [];

  const customerId = customerEmail.trim().toLowerCase();

  const existingCustomer = previousLoyalty.find(
    (customer) => customer.customerEmail.trim().toLowerCase() === customerId
  );

  const loyaltyTransactions: LoyaltyTransaction[] = [];

  if (pointsRedeemed > 0) {
    loyaltyTransactions.push({
      id: `LPT-${Date.now()}-${orderId}-redeemed`,
      orderId,
      type: "Redeemed",
      points: -pointsRedeemed,
      orderTotal,
      reason: `Points redeemed during checkout worth ₹${redemptionAmount}`,
      createdAt,
      updatedBy: "Customer",
    });
  }

  if (pointsEarned > 0) {
    loyaltyTransactions.push({
      id: `LPT-${Date.now()}-${orderId}-earned`,
      orderId,
      type: "Earned",
      points: pointsEarned,
      orderTotal,
      reason: "Points earned from order",
      createdAt,
      updatedBy: "System",
    });
  }

  const updatedLoyalty = existingCustomer
    ? previousLoyalty.map((customer) => {
        if (customer.customerEmail.trim().toLowerCase() !== customerId) {
          return customer;
        }

        const pointsAfterRedeem = Math.max(
          customer.totalPoints - pointsRedeemed,
          0
        );

        return {
          ...customer,
          customerName,
          customerPhone,
          totalPoints: pointsAfterRedeem + pointsEarned,
          lifetimeEarned: customer.lifetimeEarned + pointsEarned,
          lifetimeRedeemed: customer.lifetimeRedeemed + pointsRedeemed,
          lifetimeSpent: customer.lifetimeSpent + orderTotal,
          totalOrders: customer.totalOrders + 1,
          lastOrderId: orderId,
          lastUpdatedAt: createdAt,
          history: [...loyaltyTransactions, ...(customer.history || [])],
        };
      })
    : [
        {
          id: `LOY-${Date.now()}`,
          customerName,
          customerEmail,
          customerPhone,
          totalPoints: pointsEarned,
          lifetimeEarned: pointsEarned,
          lifetimeRedeemed: pointsRedeemed,
          lifetimeSpent: orderTotal,
          totalOrders: 1,
          lastOrderId: orderId,
          lastUpdatedAt: createdAt,
          history: loyaltyTransactions,
        },
        ...previousLoyalty,
      ];

  localStorage.setItem(LOYALTY_POINTS_KEY, JSON.stringify(updatedLoyalty));
};

const COUPON_USAGE_KEY = "pujafresh-coupon-usage";

const saveCouponUsageLog = (log: CouponUsageLog) => {
  const savedUsage = localStorage.getItem(COUPON_USAGE_KEY);
  const previousUsage = savedUsage
    ? (JSON.parse(savedUsage) as CouponUsageLog[])
    : [];

  localStorage.setItem(
    COUPON_USAGE_KEY,
    JSON.stringify([log, ...previousUsage])
  );
};

const INVENTORY_HISTORY_KEY = "pujafresh-inventory-history";

const saveInventoryHistoryLogs = (logs: InventoryHistoryLog[]) => {
  if (logs.length === 0) return;

  const savedHistory = localStorage.getItem(INVENTORY_HISTORY_KEY);
  const previousHistory = savedHistory
    ? (JSON.parse(savedHistory) as InventoryHistoryLog[])
    : [];

  localStorage.setItem(
    INVENTORY_HISTORY_KEY,
    JSON.stringify([...logs, ...previousHistory])
  );
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { user, isLoggedIn } = useAuth();

  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [storeSettings, setStoreSettings] =
    useState<StoreSettings>(defaultStoreSettings);
  const [savedProfileAvailable, setSavedProfileAvailable] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    landmark: "",
    pincode: "",
    deliveryDate: "",
    deliverySlot: "5:00 AM - 7:00 AM",
    paymentMethod: "Cash on Delivery",
    paymentReference: "",
    notes: "",
  });

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null
  );
  const [currentLoyalty, setCurrentLoyalty] =
    useState<CustomerLoyalty | null>(null);
  const [redeemPointsInput, setRedeemPointsInput] = useState("");
  const [appliedRedeemPoints, setAppliedRedeemPoints] = useState(0);

  useEffect(() => {
    setLatestProducts(getProducts());
    setCoupons(getCoupons());
    setDeliveryAreas(getDeliveryAreas());
    setDeliverySlots(getDeliverySlots());
    setStoreSettings(getStoreSettings());
  }, []);

  useEffect(() => {
    if (!user) {
      setCurrentLoyalty(null);
      return;
    }

    const savedLoyalty = localStorage.getItem(LOYALTY_POINTS_KEY);

    if (!savedLoyalty) {
      setCurrentLoyalty(null);
      return;
    }

    try {
      const parsedLoyalty = JSON.parse(savedLoyalty) as CustomerLoyalty[];

      const customerLoyalty =
        parsedLoyalty.find(
          (customer) =>
            customer.customerEmail.trim().toLowerCase() ===
            user.email.trim().toLowerCase()
        ) || null;

      setCurrentLoyalty(customerLoyalty);
    } catch {
      setCurrentLoyalty(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const savedProfile = localStorage.getItem(getProfileStorageKey(user.email));

    if (!savedProfile) {
      setSavedProfileAvailable(false);

      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      }));

      return;
    }

    try {
      const parsedProfile = JSON.parse(savedProfile) as ProfileData;

      setSavedProfileAvailable(true);

      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName,
        phone: parsedProfile.phone || user.phone || "",
        email: user.email,
        address: parsedProfile.address || "",
        landmark: parsedProfile.landmark || "",
        pincode: parsedProfile.pincode || "",
        deliverySlot: mapProfileSlotToCheckoutSlot(parsedProfile.deliverySlot),
      }));
    } catch {
      setSavedProfileAvailable(false);

      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      setSelectedSavedAddressId("");
      return;
    }

    const customerAddresses = getCustomerAddresses(
      user.email,
      (user as any)?.phone
    );

    setSavedAddresses(customerAddresses);

    const defaultAddress = getDefaultCustomerAddress(
      user.email,
      (user as any)?.phone
    );

    setSelectedSavedAddressId(defaultAddress?.id || customerAddresses[0]?.id || "");
  }, [user]);

  const updatedCartItems = useMemo(() => {
    return cartItems.map((item) => {
      const latestProduct = latestProducts.find(
        (product) => product.id === item.id || product.slug === item.slug
      );

      return {
        ...(latestProduct || item),
        quantity: item.quantity,
      } as CheckoutItem;
    });
  }, [cartItems, latestProducts]);

  const getAvailableStock = (item: CheckoutItem) => {
    return Number(
      item.stockQuantity ??
        (item.stock === "Out of Stock" || item.stock === "Coming Soon"
          ? 0
          : 999)
    );
  };

  const isCustomKit = (item: CheckoutItem) => {
    return (
      item.category === "Custom Kit" ||
      item.slug?.startsWith("custom-pooja-kit") ||
      item.badge === "Custom Kit"
    );
  };

  const getCustomKitItems = (item: CheckoutItem) => {
    const description = String((item as any).description || "");

    if (!isCustomKit(item) || !description) return [];

    return description
      .split(",")
      .map((kitItem) => kitItem.trim())
      .filter(Boolean);
  };

  const isUnavailableProduct = (item: CheckoutItem) => {
    if (isCustomKit(item)) return false;

    return (
      item.stock === "Out of Stock" ||
      item.stock === "Coming Soon" ||
      getAvailableStock(item) <= 0
    );
  };

  const isOverStockLimit = (item: CheckoutItem) => {
    if (isCustomKit(item)) return false;

    return !isUnavailableProduct(item) && item.quantity > getAvailableStock(item);
  };

  const availableCartItems = updatedCartItems.filter(
    (item) => !isUnavailableProduct(item)
  );

  const unavailableCartItems = updatedCartItems.filter((item) =>
    isUnavailableProduct(item)
  );

  const stockLimitIssueItems = availableCartItems.filter((item) =>
    isOverStockLimit(item)
  );

  const hasUnavailableItems = unavailableCartItems.length > 0;
  const hasStockLimitIssues = stockLimitIssueItems.length > 0;

  const updatedCartTotal = availableCartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const activeDeliveryAreas = useMemo(() => {
    return deliveryAreas.filter((area) => area.isActive);
  }, [deliveryAreas]);

  const activeDeliverySlots = useMemo(() => {
    return deliverySlots
      .filter((slot) => slot.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [deliverySlots]);

  const selectedDeliverySlot = useMemo(() => {
    return (
      activeDeliverySlots.find((slot) => slot.label === formData.deliverySlot) ||
      null
    );
  }, [activeDeliverySlots, formData.deliverySlot]);

  useEffect(() => {
    if (activeDeliverySlots.length === 0) return;

    const selectedSlotExists = activeDeliverySlots.some(
      (slot) => slot.label === formData.deliverySlot
    );

    if (!selectedSlotExists) {
      setFormData((prev) => ({
        ...prev,
        deliverySlot: activeDeliverySlots[0].label,
      }));
    }
  }, [activeDeliverySlots, formData.deliverySlot]);

  const enteredPincode = formData.pincode.trim();
  const isPincodeSixDigits = enteredPincode.length === 6;

  const selectedDeliveryArea = useMemo(() => {
    return activeDeliveryAreas.find((area) => area.pincode === enteredPincode);
  }, [activeDeliveryAreas, enteredPincode]);

  const isPincodeServiceable = Boolean(selectedDeliveryArea);

  const minimumDeliveryDate = getTomorrowDate();
  const minimumOrderValue = storeSettings.minimumOrderValue;

  const baseDeliveryCharge =
    updatedCartTotal >= storeSettings.freeDeliveryAbove || updatedCartTotal === 0
      ? 0
      : storeSettings.deliveryCharge;

  const activeCoupons = useMemo(() => {
    return coupons.filter(
      (coupon) => coupon.isActive && !isCouponExpired(coupon)
    );
  }, [coupons]);

  const calculateCouponDiscount = (coupon: Coupon) => {
    if (coupon.type === "Percentage") {
      const percentageDiscount = Math.round(
        updatedCartTotal * (coupon.value / 100)
      );

      const discountWithLimit =
        coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0
          ? Math.min(percentageDiscount, coupon.maxDiscountAmount)
          : percentageDiscount;

      return Math.min(discountWithLimit, updatedCartTotal);
    }

    if (coupon.type === "Fixed Amount") {
      return Math.min(coupon.value, updatedCartTotal);
    }

    return 0;
  };

  useEffect(() => {
    if (!appliedCoupon) return;

    const latestCoupon = coupons.find(
      (coupon) => coupon.code === appliedCoupon.code
    );

    if (!latestCoupon || !latestCoupon.isActive) {
      setAppliedCoupon(null);
      setCouponInput("");
      toast.error("Applied coupon is no longer active");
      return;
    }

    if (isCouponExpired(latestCoupon)) {
      setAppliedCoupon(null);
      setCouponInput("");
      toast.error("Applied coupon has expired");
      return;
    }

    if (updatedCartTotal > 0 && updatedCartTotal < latestCoupon.minOrderValue) {
      setAppliedCoupon(null);
      setCouponInput("");
      toast.error(
        `${latestCoupon.code} requires minimum order value of ₹${latestCoupon.minOrderValue}`
      );
    }
  }, [appliedCoupon, coupons, updatedCartTotal]);

  const couponDiscount = appliedCoupon
    ? calculateCouponDiscount(appliedCoupon)
    : 0;

  const deliveryCharge =
    appliedCoupon?.type === "Free Delivery" ? 0 : baseDeliveryCharge;

  const orderTotalBeforeLoyalty = Math.max(
    updatedCartTotal + deliveryCharge - couponDiscount,
    0
  );

  const availableLoyaltyPoints = currentLoyalty?.totalPoints || 0;

  const maxRedeemablePoints = Math.min(
    availableLoyaltyPoints,
    orderTotalBeforeLoyalty
  );

  const loyaltyDiscount = Math.min(
    appliedRedeemPoints,
    maxRedeemablePoints,
    orderTotalBeforeLoyalty
  );

  const finalTotal = Math.max(orderTotalBeforeLoyalty - loyaltyDiscount, 0);

  const loyaltyPointsEarned = calculateLoyaltyPoints(finalTotal);

  useEffect(() => {
    if (appliedRedeemPoints > maxRedeemablePoints) {
      const adjustedPoints = Math.max(maxRedeemablePoints, 0);
      setAppliedRedeemPoints(adjustedPoints);
      setRedeemPointsInput(adjustedPoints > 0 ? String(adjustedPoints) : "");
    }
  }, [appliedRedeemPoints, maxRedeemablePoints]);

  const isDeliveryDateSelected = formData.deliveryDate.trim().length > 0;
  const isDeliveryDateValid =
    isDeliveryDateSelected && formData.deliveryDate >= minimumDeliveryDate;

  const isSelectedPaymentMethodInactive =
    (formData.paymentMethod === "Cash on Delivery" &&
      !storeSettings.codEnabled) ||
    (formData.paymentMethod === "UPI QR Payment" && !storeSettings.upiEnabled) ||
    (formData.paymentMethod === "Bank Transfer" &&
      !storeSettings.bankTransferEnabled) ||
    (formData.paymentMethod === "Card Payment" &&
      !storeSettings.cardPaymentEnabled);

  const requiresPaymentReference =
    formData.paymentMethod === "UPI QR Payment" ||
    formData.paymentMethod === "Bank Transfer";

  const isPaymentReferenceValid =
    !requiresPaymentReference || formData.paymentReference.trim().length >= 6;

  const isPlaceOrderDisabled =
    updatedCartTotal < minimumOrderValue ||
    hasUnavailableItems ||
    hasStockLimitIssues ||
    isSelectedPaymentMethodInactive ||
    activeDeliverySlots.length === 0 ||
    !selectedDeliverySlot ||
    !isPincodeSixDigits ||
    !isPincodeServiceable ||
    !isDeliveryDateValid ||
    !isPaymentReferenceValid;

  const upiId = storeSettings.upiId;
  const merchantName = storeSettings.merchantName;

  const upiPaymentUrl = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent(
    merchantName
  )}&am=${finalTotal}&cu=INR&tn=${encodeURIComponent("PujaFresh Order")}`;

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    if (name === "pincode") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 6);

      setFormData((prev) => ({
        ...prev,
        pincode: onlyNumbers,
      }));

      return;
    }

    if (name === "phone") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 10);

      setFormData((prev) => ({
        ...prev,
        phone: onlyNumbers,
      }));

      return;
    }

    if (name === "paymentMethod") {
      const isInactive =
        (value === "Cash on Delivery" && !storeSettings.codEnabled) ||
        (value === "UPI QR Payment" && !storeSettings.upiEnabled) ||
        (value === "Bank Transfer" && !storeSettings.bankTransferEnabled) ||
        (value === "Card Payment" && !storeSettings.cardPaymentEnabled);

      if (isInactive) {
        toast.error("This payment method is not active right now");
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "paymentMethod" &&
      value !== "UPI QR Payment" &&
      value !== "Bank Transfer"
        ? { paymentReference: "" }
        : {}),
    }));
  };

  const applySavedAddressToCheckout = (address: CustomerAddress) => {
    const fullAddress = [address.addressLine1, address.addressLine2]
      .filter(Boolean)
      .join(", ");

    setFormData((prev) => ({
      ...prev,
      fullName: address.fullName,
      phone: address.phone,
      email: user?.email || prev.email,
      address: fullAddress,
      landmark: address.landmark || "",
      pincode: address.pincode,
    }));

    setSelectedSavedAddressId(address.id);
    toast.success(`${address.label} address applied`);
  };

  const handleUseSelectedSavedAddress = () => {
    if (savedAddresses.length === 0) {
      toast.error("No saved address found");
      return;
    }

    const selectedAddress =
      savedAddresses.find((address) => address.id === selectedSavedAddressId) ||
      savedAddresses[0];

    applySavedAddressToCheckout(selectedAddress);
  };

  const handleSavedAddressChange = (addressId: string) => {
    setSelectedSavedAddressId(addressId);

    const selectedAddress = savedAddresses.find(
      (address) => address.id === addressId
    );

    if (selectedAddress) {
      applySavedAddressToCheckout(selectedAddress);
    }
  };

  const handleUseSavedProfile = () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    const savedProfile = localStorage.getItem(getProfileStorageKey(user.email));

    if (!savedProfile) {
      toast.error("No saved profile address found");
      return;
    }

    try {
      const parsedProfile = JSON.parse(savedProfile) as ProfileData;

      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName,
        phone: parsedProfile.phone || user.phone || "",
        email: user.email,
        address: parsedProfile.address || "",
        landmark: parsedProfile.landmark || "",
        pincode: parsedProfile.pincode || "",
        deliverySlot: mapProfileSlotToCheckoutSlot(parsedProfile.deliverySlot),
      }));

      toast.success("Saved address applied");
    } catch {
      toast.error("Unable to load saved address");
    }
  };

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    if (appliedCoupon?.code === code) {
      toast.error("This coupon is already applied");
      return;
    }

    if (updatedCartTotal < minimumOrderValue) {
      toast.error(`Minimum order value is ₹${minimumOrderValue}`);
      return;
    }

    const selectedCoupon = coupons.find((coupon) => coupon.code === code);

    if (!selectedCoupon) {
      toast.error("Invalid coupon code");
      return;
    }

    if (!selectedCoupon.isActive) {
      toast.error("This coupon is currently inactive");
      return;
    }

    if (isCouponExpired(selectedCoupon)) {
      toast.error("This coupon has expired");
      return;
    }

    if (updatedCartTotal < selectedCoupon.minOrderValue) {
      toast.error(
        `${selectedCoupon.code} is valid on orders above ₹${selectedCoupon.minOrderValue}`
      );
      return;
    }

    if (selectedCoupon.type === "Free Delivery" && baseDeliveryCharge === 0) {
      toast.error("Delivery is already free on this order");
      return;
    }

    const discountAmount = calculateCouponDiscount(selectedCoupon);

    if (selectedCoupon.type !== "Free Delivery" && discountAmount <= 0) {
      toast.error("This coupon is not applicable on this order");
      return;
    }

    setAppliedCoupon({
      ...selectedCoupon,
      discountAmount,
    });

    setCouponInput(code);
    toast.success(`${selectedCoupon.code} applied successfully`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    toast.success("Coupon removed");
  };

  const handleApplyLoyaltyPoints = () => {
    const pointsToRedeem = Number(redeemPointsInput || 0);

    if (availableLoyaltyPoints <= 0) {
      toast.error("You do not have loyalty points to redeem");
      return;
    }

    if (!Number.isFinite(pointsToRedeem) || pointsToRedeem <= 0) {
      toast.error("Enter valid loyalty points");
      return;
    }

    if (pointsToRedeem > availableLoyaltyPoints) {
      toast.error(`You only have ${availableLoyaltyPoints} loyalty points`);
      return;
    }

    if (pointsToRedeem > maxRedeemablePoints) {
      toast.error(`You can redeem up to ${maxRedeemablePoints} points on this order`);
      return;
    }

    setAppliedRedeemPoints(pointsToRedeem);
    toast.success(`${pointsToRedeem} loyalty points applied`);
  };

  const handleRemoveLoyaltyPoints = () => {
    setAppliedRedeemPoints(0);
    setRedeemPointsInput("");
    toast.success("Loyalty points removed");
  };

  const reduceProductStockAfterOrder = (
    orderedItems: CheckoutItem[],
    orderId: string
  ) => {
    const latestProductList = getProducts();
    const historyLogs: InventoryHistoryLog[] = [];
    const now = new Date().toISOString();

    const updatedProducts = latestProductList.map((product) => {
      const orderedItem = orderedItems.find(
        (item) => item.id === product.id || item.slug === product.slug
      );

      if (!orderedItem) {
        return product;
      }

      const currentStockQuantity = Number(
        product.stockQuantity ??
          (product.stock === "Out of Stock" || product.stock === "Coming Soon"
            ? 0
            : 999)
      );

      const updatedStockQuantity = Math.max(
        currentStockQuantity - orderedItem.quantity,
        0
      );

      const updatedStock =
        updatedStockQuantity <= 0
          ? "Out of Stock"
          : updatedStockQuantity <= 5
          ? "Limited Stock"
          : "In Stock";

      historyLogs.push({
        id: `INV-${Date.now()}-${product.id}`,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productImage: product.image,
        productCategory: product.category,
        changeType: "Stock Reduced",
        quantityChange: -orderedItem.quantity,
        previousStock: currentStockQuantity,
        updatedStock: updatedStockQuantity,
        reason: "Order placed by customer",
        orderId,
        createdAt: now,
        updatedBy: "Customer",
      });

      return {
        ...product,
        stockQuantity: updatedStockQuantity,
        stock: updatedStock,
      };
    });

    saveProducts(updatedProducts);
    saveInventoryHistoryLogs(historyLogs);
    setLatestProducts(updatedProducts);
  };

  const handlePlaceOrder = (event: FormEvent) => {
    event.preventDefault();

    if (!isLoggedIn || !user) {
      toast.error("Please login before checkout");
      router.push("/login");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (hasUnavailableItems) {
      toast.error("Remove unavailable products from cart before checkout");
      return;
    }

    if (hasStockLimitIssues) {
      const firstIssueItem = stockLimitIssueItems[0];
      toast.error(
        `Only ${getAvailableStock(firstIssueItem)} unit(s) available for ${firstIssueItem.name}`
      );
      return;
    }

    if (availableCartItems.length === 0) {
      toast.error("No available product in cart");
      return;
    }

    if (
      !formData.fullName ||
      !formData.phone ||
      !formData.address ||
      !formData.pincode
    ) {
      toast.error("Please fill required details");
      return;
    }

    if (formData.phone.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (!isPincodeSixDigits) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    if (!isPincodeServiceable) {
      toast.error("Sorry, delivery is not available in this pincode yet");
      return;
    }

    if (!isDeliveryDateSelected) {
      toast.error("Please select delivery date");
      return;
    }

    if (!isDeliveryDateValid) {
      toast.error("Delivery date must be tomorrow or later");
      return;
    }

    if (activeDeliverySlots.length === 0 || !selectedDeliverySlot) {
      toast.error("No delivery slot is active right now");
      return;
    }

    if (isSelectedPaymentMethodInactive) {
      toast.error("Selected payment method is not active right now");
      return;
    }

    if (requiresPaymentReference && formData.paymentReference.trim().length < 6) {
      toast.error("Please enter a valid payment reference or UTR number");
      return;
    }

    if (updatedCartTotal < minimumOrderValue) {
      toast.error(`Minimum order value is ₹${minimumOrderValue}`);
      return;
    }

    if (appliedRedeemPoints > availableLoyaltyPoints) {
      toast.error("Redeemed loyalty points are more than your available points");
      setAppliedRedeemPoints(0);
      setRedeemPointsInput("");
      return;
    }

    if (appliedRedeemPoints > maxRedeemablePoints) {
      toast.error(`You can redeem up to ${maxRedeemablePoints} points on this order`);
      setAppliedRedeemPoints(maxRedeemablePoints);
      setRedeemPointsInput(String(maxRedeemablePoints));
      return;
    }

    if (appliedCoupon) {
      const latestCoupon = coupons.find(
        (coupon) => coupon.code === appliedCoupon.code
      );

      if (!latestCoupon || !latestCoupon.isActive) {
        toast.error("Applied coupon is no longer valid");
        setAppliedCoupon(null);
        setCouponInput("");
        return;
      }

      if (isCouponExpired(latestCoupon)) {
        toast.error("Applied coupon has expired");
        setAppliedCoupon(null);
        setCouponInput("");
        return;
      }

      if (updatedCartTotal < latestCoupon.minOrderValue) {
        toast.error(
          `${latestCoupon.code} requires minimum order value of ₹${latestCoupon.minOrderValue}`
        );
        setAppliedCoupon(null);
        setCouponInput("");
        return;
      }
    }

    const now = new Date().toISOString();

    const order = {
      id: `PF-${Date.now()}`,
      customerEmail: user.email,
      customerName: user.fullName,
      customer: {
        ...formData,
        email: user.email,
        deliveryArea: selectedDeliveryArea
          ? {
              pincode: selectedDeliveryArea.pincode,
              areaName: selectedDeliveryArea.areaName,
              city: selectedDeliveryArea.city,
            }
          : null,
        deliverySlotDetails: selectedDeliverySlot
          ? {
              id: selectedDeliverySlot.id,
              label: selectedDeliverySlot.label,
            }
          : null,
      },
      items: availableCartItems,
      subtotal: updatedCartTotal,
      deliveryCharge,
      discountAmount: couponDiscount,
      coupon: appliedCoupon
        ? {
            code: appliedCoupon.code,
            label: appliedCoupon.label,
            type: appliedCoupon.type,
            value: appliedCoupon.value,
            minOrderValue: appliedCoupon.minOrderValue,
            maxDiscountAmount: appliedCoupon.maxDiscountAmount ?? 0,
            expiryDate: appliedCoupon.expiryDate,
            discountAmount: couponDiscount,
            deliveryDiscount:
              appliedCoupon.type === "Free Delivery" ? baseDeliveryCharge : 0,
          }
        : null,
      storeSettings: {
        minimumOrderValue,
        freeDeliveryAbove: storeSettings.freeDeliveryAbove,
        paymentMethod: formData.paymentMethod,
      },
      total: finalTotal,
      loyalty: {
        pointsEarned: loyaltyPointsEarned,
        pointsRedeemed: appliedRedeemPoints,
        redemptionAmount: loyaltyDiscount,
        earnRate: "1 point per ₹100 order value",
        redeemRate: "1 point = ₹1 discount",
      },
      paymentStatus: getInitialPaymentStatus(formData.paymentMethod),
      paymentReference: requiresPaymentReference
        ? formData.paymentReference.trim()
        : "",
      status: "Pending",
      createdAt: now,
      statusHistory: [
        {
          status: "Pending",
          message: "Order placed by customer.",
          updatedAt: now,
          updatedBy: "Customer",
        },
      ],
    };

    const previousOrders = JSON.parse(
      localStorage.getItem("pujafresh-orders") || "[]"
    );

    localStorage.setItem(
      "pujafresh-orders",
      JSON.stringify([order, ...previousOrders])
    );

    localStorage.setItem("pujafresh-last-order", JSON.stringify(order));

    addOrderStatusNotification(order, "Pending");
    addPaymentStatusNotification(order, order.paymentStatus);

    if (appliedCoupon) {
      const deliveryDiscount =
        appliedCoupon.type === "Free Delivery" ? baseDeliveryCharge : 0;

      saveCouponUsageLog({
        id: `CPU-${Date.now()}`,
        orderId: order.id,
        couponCode: appliedCoupon.code,
        couponLabel: appliedCoupon.label,
        couponType: appliedCoupon.type,
        couponValue: appliedCoupon.value,
        customerName: user.fullName,
        customerEmail: user.email,
        subtotal: updatedCartTotal,
        deliveryCharge,
        orderTotal: finalTotal,
        discountAmount: couponDiscount,
        deliveryDiscount,
        totalSavings: couponDiscount + deliveryDiscount,
        usedAt: now,
      });

      addCouponNotification(
        order,
        appliedCoupon.code,
        couponDiscount + deliveryDiscount
      );
    }

    addLoyaltyPointsNotification(order, loyaltyPointsEarned);

    saveLoyaltyPointsForOrder({
      orderId: order.id,
      customerName: user.fullName,
      customerEmail: user.email,
      customerPhone: formData.phone,
      orderTotal: finalTotal,
      pointsEarned: loyaltyPointsEarned,
      pointsRedeemed: appliedRedeemPoints,
      redemptionAmount: loyaltyDiscount,
      createdAt: now,
    });

    reduceProductStockAfterOrder(availableCartItems, order.id);

    clearCart();
    toast.success("Order placed successfully");
    router.push("/order-success");
  };

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Login Required
            </h1>

            <p className="mt-2 text-gray-600">
              Please login or create an account before checkout.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded border border-[#7a1e13] px-5 py-3 font-bold text-[#7a1e13]"
              >
                Register
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f3ea]">
        <Navbar />

        <section className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Your cart is empty
            </h1>

            <p className="mt-2 text-gray-600">Add products before checkout.</p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded bg-[#7a1e13] px-6 py-3 font-bold text-white"
            >
              Continue Shopping
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
          Logged in as {user.fullName} ({user.email})
        </div>

        {savedAddresses.length > 0 ? (
          <div className="mt-4 rounded-lg border border-[#f97316]/30 bg-[#fff7ed] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#7a1e13]">
                  Use Saved Address Book
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Select a saved Home, Work or Other address to auto-fill checkout.
                </p>
              </div>

              <Link
                href="/addresses"
                className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
              >
                Manage Addresses
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
              <select
                value={selectedSavedAddressId}
                onChange={(event) => handleSavedAddressChange(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
              >
                {savedAddresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label}
                    {address.isDefault ? " - Default" : ""} • {address.fullName} •{" "}
                    {address.pincode}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleUseSelectedSavedAddress}
                className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white hover:bg-[#64180f]"
              >
                Apply Address
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <div>
              <p className="font-bold">No address book address found</p>
              <p className="mt-1">
                Add a saved address once, then checkout will become faster.
              </p>
            </div>

            <Link
              href="/addresses"
              className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white"
            >
              Add Address
            </Link>
          </div>
        )}

        {savedProfileAvailable ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <div>
              <p className="font-bold">Saved address loaded from profile</p>
              <p className="mt-1">
                You can edit details below or use your saved profile address
                again.
              </p>
            </div>

            <button
              type="button"
              onClick={handleUseSavedProfile}
              className="rounded bg-[#15803d] px-4 py-2 text-sm font-bold text-white"
            >
              Use Saved Address
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <div>
              <p className="font-bold">No saved address found</p>
              <p className="mt-1">
                Save your address in profile to auto-fill checkout next time.
              </p>
            </div>

            <Link
              href="/profile"
              className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white"
            >
              Go to Profile
            </Link>
          </div>
        )}

        {hasUnavailableItems && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">Checkout blocked</p>
            <p className="mt-1">
              Some products in your cart are Out of Stock or Coming Soon. Please
              go back to cart and remove them before placing order.
            </p>

            <Link
              href="/cart"
              className="mt-3 inline-block rounded bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Go to Cart
            </Link>
          </div>
        )}

        {hasStockLimitIssues && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <p className="font-bold">Stock limit issue</p>
            <p className="mt-1">
              Some products in your cart have quantity higher than available
              stock. Please reduce quantity from cart before placing order.
            </p>

            <Link
              href="/cart"
              className="mt-3 inline-block rounded bg-orange-600 px-4 py-2 text-sm font-bold text-white"
            >
              Go to Cart
            </Link>
          </div>
        )}

        <form
          onSubmit={handlePlaceOrder}
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]"
        >
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Delivery Details
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Full Name *
                  </label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength={10}
                    inputMode="numeric"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter mobile number"
                  />

                  {formData.phone.length > 0 && formData.phone.length < 10 && (
                    <p className="mt-1 text-xs font-semibold text-orange-600">
                      Please enter complete 10-digit phone number.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    name="email"
                    value={formData.email}
                    readOnly
                    className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 outline-none"
                    placeholder="Email from your account"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Pincode *
                  </label>
                  <input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    maxLength={6}
                    inputMode="numeric"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter pincode"
                  />

                  {formData.pincode.length > 0 &&
                    formData.pincode.length < 6 && (
                      <p className="mt-1 text-xs font-semibold text-orange-600">
                        Please enter complete 6-digit pincode.
                      </p>
                    )}

                  {isPincodeSixDigits && selectedDeliveryArea && (
                    <p className="mt-1 text-xs font-semibold text-[#15803d]">
                      Delivery available in {selectedDeliveryArea.areaName},{" "}
                      {selectedDeliveryArea.city}.
                    </p>
                  )}

                  {isPincodeSixDigits && !isPincodeServiceable && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Sorry, delivery is not available in this pincode yet.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 rounded-lg bg-[#fff7ed] p-3 text-sm text-gray-700">
                  <p className="font-bold text-gray-900">
                    Serviceable Delivery Areas
                  </p>

                  {activeDeliveryAreas.length === 0 ? (
                    <p className="mt-1 text-red-600">
                      Delivery is temporarily unavailable. Admin needs to
                      activate delivery areas.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeDeliveryAreas.map((area) => (
                        <span
                          key={area.id}
                          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700"
                        >
                          {area.pincode} - {area.areaName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Full Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="House no, street, area, city"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Landmark
                  </label>
                  <input
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Near temple, school, metro station etc."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Delivery Slot
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    min={minimumDeliveryDate}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                  />

                  {!isDeliveryDateSelected && (
                    <p className="mt-1 text-xs font-semibold text-orange-600">
                      Please select a delivery date.
                    </p>
                  )}

                  {isDeliveryDateSelected && !isDeliveryDateValid && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Delivery date must be tomorrow or later.
                    </p>
                  )}

                  {isDeliveryDateValid && (
                    <p className="mt-1 text-xs font-semibold text-[#15803d]">
                      Delivery date selected successfully.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Delivery Slot
                  </label>
                  <select
                    name="deliverySlot"
                    value={formData.deliverySlot}
                    onChange={handleChange}
                    disabled={activeDeliverySlots.length === 0}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13] disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {activeDeliverySlots.length === 0 ? (
                      <option value={formData.deliverySlot}>
                        No active delivery slot available
                      </option>
                    ) : (
                      activeDeliverySlots.map((slot) => (
                        <option key={slot.id} value={slot.label}>
                          {slot.label}
                        </option>
                      ))
                    )}
                  </select>

                  {activeDeliverySlots.length === 0 && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      No delivery slot is active right now. Admin needs to
                      activate at least one slot.
                    </p>
                  )}

                  {selectedDeliverySlot && activeDeliverySlots.length > 0 && (
                    <p className="mt-1 text-xs font-semibold text-[#15803d]">
                      Selected slot: {selectedDeliverySlot.label}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm font-medium text-[#15803d]">
                Minimum delivery date is tomorrow. Order before 9 PM for next
                morning delivery.
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Payment Method
              </h2>

              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className={`mt-4 w-full rounded border px-3 py-2 outline-none ${
                  isSelectedPaymentMethodInactive
                    ? "border-red-300 bg-red-50 focus:border-red-600"
                    : "border-gray-300 focus:border-[#7a1e13]"
                }`}
              >
                <option disabled={!storeSettings.codEnabled}>
                  Cash on Delivery
                </option>
                <option disabled={!storeSettings.upiEnabled}>
                  UPI QR Payment
                </option>
                <option disabled={!storeSettings.bankTransferEnabled}>
                  Bank Transfer
                </option>
                <option disabled={!storeSettings.cardPaymentEnabled}>
                  Card Payment
                </option>
              </select>

              {isSelectedPaymentMethodInactive && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <h3 className="font-bold text-red-700">
                    Payment Method Not Active
                  </h3>

                  <p className="mt-2 text-sm text-gray-700">
                    This payment method is disabled by admin. Please choose
                    another active payment method.
                  </p>
                </div>
              )}

              {formData.paymentMethod === "UPI QR Payment" &&
                storeSettings.upiEnabled && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                    <h3 className="font-bold text-gray-900">
                      Scan & Pay with UPI
                    </h3>

                    <div className="mt-4 flex flex-col items-center rounded-lg bg-white p-4">
                      <QRCodeSVG value={upiPaymentUrl} size={180} />

                      <p className="mt-3 text-sm text-gray-600">
                        Payable Amount
                      </p>

                      <p className="text-2xl font-bold text-[#15803d]">
                        ₹{finalTotal}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        UPI ID: {upiId}
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-gray-600">
                      After payment, place the order. Payment confirmation will
                      be verified manually.
                    </p>
                  </div>
                )}

              {formData.paymentMethod === "Bank Transfer" &&
                storeSettings.bankTransferEnabled && (
                  <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h3 className="font-bold text-gray-900">
                      Bank Transfer Details
                    </h3>

                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <p>
                        <span className="font-semibold">Account Name:</span>{" "}
                        {storeSettings.bankAccountName}
                      </p>
                      <p>
                        <span className="font-semibold">Bank Name:</span>{" "}
                        {storeSettings.bankName}
                      </p>
                      <p>
                        <span className="font-semibold">Account Number:</span>{" "}
                        {storeSettings.bankAccountNumber}
                      </p>
                      <p>
                        <span className="font-semibold">IFSC:</span>{" "}
                        {storeSettings.bankIfsc}
                      </p>
                      <p>
                        <span className="font-semibold">Amount:</span> ₹
                        {finalTotal}
                      </p>
                    </div>
                  </div>
                )}

              {formData.paymentMethod === "Card Payment" &&
                storeSettings.cardPaymentEnabled && (
                  <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <h3 className="font-bold text-gray-900">
                      Card Payment Enabled
                    </h3>

                    <p className="mt-2 text-sm text-gray-700">
                      Card payment is enabled from admin settings. In this demo
                      project, payment gateway integration can be added later
                      using Razorpay or Cashfree.
                    </p>
                  </div>
                )}

              {requiresPaymentReference && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <label className="text-sm font-bold text-gray-900">
                    Payment Reference / UTR Number *
                  </label>

                  <input
                    name="paymentReference"
                    value={formData.paymentReference}
                    onChange={handleChange}
                    className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 outline-none focus:border-[#7a1e13]"
                    placeholder="Enter UPI transaction ID or bank UTR number"
                  />

                  <p className="mt-2 text-xs font-semibold text-blue-700">
                    After payment, enter your transaction ID/UTR number here.
                    Admin will verify it manually.
                  </p>

                  {formData.paymentReference.trim().length > 0 &&
                    formData.paymentReference.trim().length < 6 && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Please enter a valid reference number.
                      </p>
                    )}
                </div>
              )}

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-4 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Order notes: example, leave at gate, call before delivery..."
              />
            </div>
          </div>

          <aside className="h-fit rounded-xl bg-white p-5 shadow-sm">
            <h2 className="border-b pb-3 text-lg font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="mt-4 space-y-3">
              {updatedCartItems.map((item) => {
                const customKit = isCustomKit(item);
                const customKitItems = getCustomKitItems(item);
                const isUnavailable = isUnavailableProduct(item);
                const availableStock = getAvailableStock(item);
                const hasStockIssue = isOverStockLimit(item);

                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded bg-[#fff7ed]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className={`object-cover ${
                          isUnavailable ? "opacity-60 grayscale" : ""
                        }`}
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="line-clamp-1 text-sm font-bold">
                        {item.name}
                      </h3>

                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>

                      {customKit && customKitItems.length > 0 ? (
                        <div className="mt-2 rounded bg-[#fff7ed] p-2">
                          <p className="text-[11px] font-black uppercase text-[#7a1e13]">
                            Kit includes
                          </p>

                          <div className="mt-1 flex flex-wrap gap-1">
                            {customKitItems.slice(0, 4).map((kitItem) => (
                              <span
                                key={kitItem}
                                className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-gray-700"
                              >
                                {kitItem}
                              </span>
                            ))}

                            {customKitItems.length > 4 && (
                              <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-gray-700">
                                +{customKitItems.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p
                          className={`text-xs font-semibold ${
                            hasStockIssue ? "text-orange-600" : "text-gray-500"
                          }`}
                        >
                          Available Stock: {availableStock} units
                        </p>
                      )}

                      {hasStockIssue && (
                        <p className="mt-1 rounded bg-orange-50 p-1 text-xs font-semibold text-orange-700">
                          Reduce quantity to {availableStock}
                        </p>
                      )}

                      {isUnavailable ? (
                        <p className="text-xs font-bold text-red-600">
                          {item.stock}
                        </p>
                      ) : (
                        <p className="text-sm font-bold">
                          ₹{item.price * item.quantity}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasUnavailableItems && (
              <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
                <p className="font-bold">Unavailable items found</p>
                <p className="mt-1">
                  Remove these items from cart before placing the order.
                </p>
              </div>
            )}

            <div className="mt-5 rounded-lg bg-[#fff7ed] p-4">
              <h3 className="font-bold text-gray-900">Apply Coupon</h3>

              <div className="mt-3 flex gap-2">
                <input
                  value={couponInput}
                  onChange={(event) =>
                    setCouponInput(event.target.value.toUpperCase())
                  }
                  placeholder="Enter coupon"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:border-[#7a1e13]"
                />

                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white"
                >
                  Apply
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {activeCoupons.length === 0 ? (
                  <span className="rounded bg-white px-2 py-1 font-semibold text-gray-500">
                    No active coupons
                  </span>
                ) : (
                  activeCoupons.slice(0, 8).map((coupon) => (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => setCouponInput(coupon.code)}
                      className="rounded bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-[#7a1e13] hover:text-white"
                    >
                      {coupon.code}
                    </button>
                  ))
                )}
              </div>

              {appliedCoupon && (
                <div className="mt-3 rounded bg-green-50 p-3 text-sm text-green-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{appliedCoupon.code}</p>
                      <p>{appliedCoupon.label}</p>

                      {appliedCoupon.type === "Free Delivery" ? (
                        <p className="mt-1 text-xs font-semibold">
                          Delivery discount: ₹{baseDeliveryCharge}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-semibold">
                          Discount: ₹{couponDiscount}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-lg bg-orange-50 p-4">
              <h3 className="font-bold text-gray-900">
                Redeem Loyalty Points
              </h3>

              <p className="mt-1 text-xs font-semibold text-gray-600">
                Available: {availableLoyaltyPoints} points • 1 point = ₹1
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  value={redeemPointsInput}
                  onChange={(event) =>
                    setRedeemPointsInput(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Points"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#7a1e13]"
                />

                <button
                  type="button"
                  onClick={handleApplyLoyaltyPoints}
                  disabled={availableLoyaltyPoints <= 0 || maxRedeemablePoints <= 0}
                  className="rounded bg-[#f97316] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Apply
                </button>
              </div>

              {availableLoyaltyPoints > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRedeemPointsInput(String(maxRedeemablePoints))}
                    className="rounded bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-[#f97316] hover:text-white"
                  >
                    Max {maxRedeemablePoints}
                  </button>

                  {[25, 50, 100].map((points) => (
                    <button
                      key={points}
                      type="button"
                      onClick={() =>
                        setRedeemPointsInput(
                          String(Math.min(points, maxRedeemablePoints))
                        )
                      }
                      disabled={maxRedeemablePoints < points}
                      className="rounded bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-[#f97316] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {points}
                    </button>
                  ))}
                </div>
              )}

              {appliedRedeemPoints > 0 && (
                <div className="mt-3 rounded bg-green-50 p-3 text-sm text-green-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {appliedRedeemPoints} points applied
                      </p>
                      <p className="text-xs font-semibold">
                        Loyalty discount: ₹{loyaltyDiscount}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveLoyaltyPoints}
                      className="text-xs font-bold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{updatedCartTotal}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="font-bold text-[#15803d]">FREE</span>
                  ) : (
                    `₹${deliveryCharge}`
                  )}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#15803d]">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              {appliedCoupon?.type === "Free Delivery" &&
                baseDeliveryCharge > 0 && (
                  <div className="flex justify-between text-[#15803d]">
                    <span>Delivery Coupon</span>
                    <span>-₹{baseDeliveryCharge}</span>
                  </div>
                )}

              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Loyalty Points Redeemed</span>
                  <span>-₹{loyaltyDiscount}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>Loyalty Points Earned</span>
                <span>{loyaltyPointsEarned} points</span>
              </div>

              {isDeliveryDateValid && (
                <div className="flex justify-between text-gray-700">
                  <span>Delivery Date</span>
                  <span>{formData.deliveryDate}</span>
                </div>
              )}

              {selectedDeliverySlot && (
                <div className="flex justify-between text-gray-700">
                  <span>Delivery Slot</span>
                  <span>{selectedDeliverySlot.label}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>Payment Status</span>
                <span>{getInitialPaymentStatus(formData.paymentMethod)}</span>
              </div>

              {requiresPaymentReference && formData.paymentReference.trim() && (
                <div className="flex justify-between gap-3 text-gray-700">
                  <span>Payment Reference</span>
                  <span className="text-right">{formData.paymentReference}</span>
                </div>
              )}

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>

              {updatedCartTotal < minimumOrderValue && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Minimum order value is ₹{minimumOrderValue}.
                </p>
              )}

              {hasUnavailableItems && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Remove Out of Stock or Coming Soon products before checkout.
                </p>
              )}

              {hasStockLimitIssues && (
                <p className="rounded bg-orange-50 p-2 text-xs font-semibold text-orange-700">
                  Some product quantities are higher than available stock.
                  Please reduce quantity in cart.
                </p>
              )}

              {activeDeliverySlots.length === 0 && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  No delivery slot is active right now.
                </p>
              )}

              {isSelectedPaymentMethodInactive && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Selected payment method is not active right now. Please choose
                  another payment method.
                </p>
              )}

              {formData.pincode &&
                isPincodeSixDigits &&
                !isPincodeServiceable && (
                  <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                    Delivery is not available for this pincode.
                  </p>
                )}

              {!isDeliveryDateSelected && (
                <p className="rounded bg-orange-50 p-2 text-xs font-semibold text-orange-600">
                  Please select delivery date.
                </p>
              )}

              {isDeliveryDateSelected && !isDeliveryDateValid && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Delivery date must be tomorrow or later.
                </p>
              )}

              {requiresPaymentReference && !isPaymentReferenceValid && (
                <p className="rounded bg-red-50 p-2 text-xs font-semibold text-red-600">
                  Enter payment reference / UTR number for this payment method.
                </p>
              )}

              <button
                type="submit"
                disabled={isPlaceOrderDisabled}
                className={`w-full rounded py-3 font-bold text-white ${
                  isPlaceOrderDisabled
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#15803d] hover:bg-[#166534]"
                }`}
              >
                PLACE ORDER
              </button>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}