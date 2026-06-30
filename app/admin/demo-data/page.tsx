"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Product } from "@/types";
import { getProducts, saveProducts } from "@/utils/productStorage";
import {
  addCouponNotification,
  addLoyaltyPointsNotification,
  addOrderStatusNotification,
  addPaymentStatusNotification,
} from "@/utils/customerNotificationStorage";
import {
  defaultDeliverySlots,
  getDeliverySlots,
  saveDeliverySlots,
} from "@/utils/deliverySlotStorage";
import {
  defaultDeliveryPartners,
  getDeliveryPartners,
  saveDeliveryPartners,
} from "@/utils/deliveryPartnerStorage";
import {
  defaultDeliveryAreas,
  getDeliveryAreas,
  saveDeliveryAreas,
} from "@/utils/pincodeStorage";
import {
  addDeliveryFeedback,
  createDeliveryFeedbackId,
} from "@/utils/deliveryFeedbackStorage";

type DemoStats = {
  products: number;
  orders: number;
  demoOrders: number;
  deliveryAreas: number;
  deliverySlots: number;
  deliveryPartners: number;
  notifications: number;
  feedbacks: number;
};

type DemoOrder = {
  id: string;
  customerEmail: string;
  customerName: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    landmark: string;
    pincode: string;
    deliveryDate: string;
    deliverySlot: string;
    deliverySlotDetails: {
      id: string;
      label: string;
    };
    paymentMethod: string;
    notes: string;
    deliveryArea?: {
      pincode: string;
      areaName: string;
      city: string;
    };
  };
  items: (Product & { quantity: number })[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  coupon: null | {
    code: string;
    label: string;
    type: string;
    value: number;
    discountAmount: number;
    deliveryDiscount: number;
  };
  total: number;
  paymentStatus: string;
  paymentReference: string;
  status: string;
  createdAt: string;
  statusHistory: {
    status: string;
    message: string;
    updatedAt: string;
    updatedBy: string;
  }[];
  deliveryPartner?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    assignedAt: string;
  };
  outForDeliveryAt?: string;
  deliveredAt?: string;
  deliveryFailureReason?: string;
  loyalty?: {
    pointsEarned: number;
    pointsRedeemed: number;
    redemptionAmount: number;
  };
  isDemoData?: boolean;
};

const ORDERS_STORAGE_KEY = "pujafresh-orders";
const NOTIFICATIONS_STORAGE_KEY = "pujafresh-customer-notifications";
const FEEDBACK_STORAGE_KEY = "pujafresh-delivery-feedback";

const demoCustomers = [
  {
    name: "Aarav Sharma",
    email: "aarav.demo@pujafresh.com",
    phone: "9876500001",
    address: "House 21, Samaypur Badli",
    landmark: "Near Metro Station",
    pincode: "110042",
    areaName: "Samaypur Badli",
  },
  {
    name: "Priya Verma",
    email: "priya.demo@pujafresh.com",
    phone: "9876500002",
    address: "Flat 302, Adarsh Nagar",
    landmark: "Near Main Market",
    pincode: "110033",
    areaName: "Adarsh Nagar",
  },
  {
    name: "Rohan Mehta",
    email: "rohan.demo@pujafresh.com",
    phone: "9876500003",
    address: "B-18, Rohini Sector 7",
    landmark: "Near Temple",
    pincode: "110085",
    areaName: "Rohini",
  },
];

const readJsonArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) return [];

    const parsedValue = JSON.parse(savedValue) as T[];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateWithOffset = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
};

const addMinutes = (date: Date, minutes: number) => {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate.toISOString();
};

const getItemStockQuantity = (product: Product) => {
  return Number(
    product.stockQuantity ??
      (product.stock === "Out of Stock" || product.stock === "Coming Soon"
        ? 0
        : 50)
  );
};

const getOrderSubtotal = (items: (Product & { quantity: number })[]) => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

const createDemoOrder = (
  orderId: string,
  status: string,
  customer: (typeof demoCustomers)[number],
  products: Product[],
  createdAt: string,
  deliveryDate: string,
  slot: { id: string; label: string },
  partner?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
  },
  options?: {
    paymentStatus?: string;
    couponCode?: string;
    deliveredAt?: string;
    outForDeliveryAt?: string;
    failureReason?: string;
    loyaltyPoints?: number;
  }
): DemoOrder => {
  const safeProducts = products.slice(0, 2);

  const items = safeProducts.map((product, index) => ({
    ...product,
    quantity: index === 0 ? 2 : 1,
  }));

  const subtotal = getOrderSubtotal(items);
  const couponDiscount = options?.couponCode ? 50 : 0;
  const deliveryCharge = subtotal >= 499 ? 0 : 49;
  const total = Math.max(subtotal + deliveryCharge - couponDiscount, 0);

  const history = [
    {
      status: "Pending",
      message: "Order placed by customer.",
      updatedAt: createdAt,
      updatedBy: "Customer",
    },
  ];

  if (status !== "Pending") {
    history.push({
      status: "Confirmed",
      message: "Order confirmed by admin.",
      updatedAt: addMinutes(new Date(createdAt), 20),
      updatedBy: "Admin",
    });
  }

  if (["Packed", "Out for Delivery", "Delivered", "Delivery Failed"].includes(status)) {
    history.push({
      status: "Packed",
      message: "Order packed for delivery.",
      updatedAt: addMinutes(new Date(createdAt), 45),
      updatedBy: "Admin",
    });
  }

  if (["Out for Delivery", "Delivered", "Delivery Failed"].includes(status)) {
    history.push({
      status: "Out for Delivery",
      message: "Order is out for delivery.",
      updatedAt: options?.outForDeliveryAt || addMinutes(new Date(createdAt), 90),
      updatedBy: partner?.name || "Delivery Partner",
    });
  }

  if (status === "Delivered") {
    history.push({
      status: "Delivered",
      message: "Order delivered successfully.",
      updatedAt: options?.deliveredAt || addMinutes(new Date(createdAt), 150),
      updatedBy: partner?.name || "Delivery Partner",
    });
  }

  if (status === "Delivery Failed") {
    history.push({
      status: "Delivery Failed",
      message: options?.failureReason || "Customer was not available.",
      updatedAt: addMinutes(new Date(createdAt), 150),
      updatedBy: partner?.name || "Delivery Partner",
    });
  }

  return {
    id: orderId,
    customerEmail: customer.email,
    customerName: customer.name,
    customer: {
      fullName: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      landmark: customer.landmark,
      pincode: customer.pincode,
      deliveryDate,
      deliverySlot: slot.label,
      deliverySlotDetails: {
        id: slot.id,
        label: slot.label,
      },
      paymentMethod:
        options?.paymentStatus === "Verification Pending"
          ? "UPI QR Payment"
          : "Cash on Delivery",
      notes: "Demo order for testing full delivery flow.",
      deliveryArea: {
        pincode: customer.pincode,
        areaName: customer.areaName,
        city: "Delhi",
      },
    },
    items,
    subtotal,
    deliveryCharge,
    discountAmount: couponDiscount,
    coupon: options?.couponCode
      ? {
          code: options.couponCode,
          label: "Demo Coupon",
          type: "Fixed Amount",
          value: couponDiscount,
          discountAmount: couponDiscount,
          deliveryDiscount: 0,
        }
      : null,
    total,
    paymentStatus: options?.paymentStatus || "Payment Pending",
    paymentReference:
      options?.paymentStatus === "Verification Pending" ? "DEMOUPI123456" : "",
    status,
    createdAt,
    statusHistory: history,
    deliveryPartner: partner
      ? {
          ...partner,
          assignedAt: addMinutes(new Date(createdAt), 60),
        }
      : undefined,
    outForDeliveryAt: options?.outForDeliveryAt,
    deliveredAt: options?.deliveredAt,
    deliveryFailureReason: options?.failureReason,
    loyalty: {
      pointsEarned: options?.loyaltyPoints || Math.floor(total / 100),
      pointsRedeemed: 0,
      redemptionAmount: 0,
    },
    isDemoData: true,
  };
};

export default function AdminDemoDataPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DemoStats>({
    products: 0,
    orders: 0,
    demoOrders: 0,
    deliveryAreas: 0,
    deliverySlots: 0,
    deliveryPartners: 0,
    notifications: 0,
    feedbacks: 0,
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("pujafresh-admin-auth");

    if (isAdminLoggedIn !== "true") {
      router.push("/admin/login");
      return;
    }

    refreshData();
    setIsCheckingAuth(false);
  }, [router]);

  const refreshData = () => {
    const latestProducts = getProducts();
    setProducts(latestProducts);

    const orders = readJsonArray<DemoOrder>(ORDERS_STORAGE_KEY);
    const notifications = readJsonArray<unknown>(NOTIFICATIONS_STORAGE_KEY);
    const feedbacks = readJsonArray<unknown>(FEEDBACK_STORAGE_KEY);

    setStats({
      products: latestProducts.length,
      orders: orders.length,
      demoOrders: orders.filter((order) => order.isDemoData).length,
      deliveryAreas: getDeliveryAreas().length,
      deliverySlots: getDeliverySlots().length,
      deliveryPartners: getDeliveryPartners().length,
      notifications: notifications.length,
      feedbacks: feedbacks.length,
    });
  };

  const ensureDemoProductsHaveStock = () => {
    const latestProducts = getProducts();

    const updatedProducts = latestProducts.map((product, index) => {
      if (index > 5) return product;

      const stockQuantity = getItemStockQuantity(product);

      return {
        ...product,
        stockQuantity: stockQuantity <= 10 ? 50 : stockQuantity,
        stock:
          stockQuantity <= 0 || product.stock === "Out of Stock"
            ? "In Stock"
            : product.stock,
      };
    });

    saveProducts(updatedProducts);
    setProducts(updatedProducts);

    return updatedProducts;
  };

  const seedDeliverySetup = () => {
    const currentAreas = getDeliveryAreas();
    const currentSlots = getDeliverySlots();
    const currentPartners = getDeliveryPartners();

    if (currentAreas.length === 0) {
      saveDeliveryAreas(defaultDeliveryAreas);
    }

    if (currentSlots.length === 0) {
      saveDeliverySlots(defaultDeliverySlots);
    }

    if (currentPartners.length === 0) {
      saveDeliveryPartners(defaultDeliveryPartners);
    }

    toast.success("Delivery setup checked");
    refreshData();
  };

  const seedDemoOrders = () => {
    const demoProducts = ensureDemoProductsHaveStock();

    if (demoProducts.length === 0) {
      toast.error("No products found. Add products first.");
      return;
    }

    const deliverySlots = getDeliverySlots().filter((slot) => slot.isActive);
    const deliveryPartners = getDeliveryPartners().filter(
      (partner) => partner.status === "Active"
    );

    if (deliverySlots.length === 0) {
      saveDeliverySlots(defaultDeliverySlots);
    }

    if (deliveryPartners.length === 0) {
      saveDeliveryPartners(defaultDeliveryPartners);
    }

    const slots = getDeliverySlots().filter((slot) => slot.isActive);
    const partners = getDeliveryPartners().filter(
      (partner) => partner.status === "Active"
    );

    if (slots.length === 0 || partners.length === 0) {
      toast.error("Please add active delivery slots and partners first");
      return;
    }

    const now = new Date();
    const today = getDateWithOffset(0);
    const tomorrow = getDateWithOffset(1);

    const partnerOne = partners[0];
    const partnerTwo = partners[1] || partners[0];

    const demoOrders = [
      createDemoOrder(
        "PF-DEMO-PENDING",
        "Pending",
        demoCustomers[0],
        demoProducts,
        addMinutes(now, -180),
        today,
        slots[0],
        undefined,
        {
          paymentStatus: "Verification Pending",
          couponCode: "DEMO50",
          loyaltyPoints: 4,
        }
      ),
      createDemoOrder(
        "PF-DEMO-CONFIRMED",
        "Confirmed",
        demoCustomers[1],
        demoProducts,
        addMinutes(now, -150),
        today,
        slots[0],
        partnerOne,
        {
          paymentStatus: "Payment Received",
          loyaltyPoints: 5,
        }
      ),
      createDemoOrder(
        "PF-DEMO-OUT",
        "Out for Delivery",
        demoCustomers[2],
        demoProducts,
        addMinutes(now, -120),
        today,
        slots[1] || slots[0],
        partnerTwo,
        {
          paymentStatus: "Payment Pending",
          outForDeliveryAt: addMinutes(now, -35),
          couponCode: "DEMO50",
          loyaltyPoints: 6,
        }
      ),
      createDemoOrder(
        "PF-DEMO-DELIVERED",
        "Delivered",
        demoCustomers[0],
        demoProducts,
        addMinutes(now, -260),
        tomorrow,
        slots[1] || slots[0],
        partnerOne,
        {
          paymentStatus: "Payment Received",
          outForDeliveryAt: addMinutes(now, -160),
          deliveredAt: addMinutes(now, -90),
          loyaltyPoints: 8,
        }
      ),
      createDemoOrder(
        "PF-DEMO-FAILED",
        "Delivery Failed",
        demoCustomers[1],
        demoProducts,
        addMinutes(now, -220),
        tomorrow,
        slots[2] || slots[0],
        partnerTwo,
        {
          paymentStatus: "Payment Received",
          outForDeliveryAt: addMinutes(now, -130),
          failureReason: "Customer was not available at delivery address.",
          loyaltyPoints: 5,
        }
      ),
    ];

    const savedOrders = readJsonArray<DemoOrder>(ORDERS_STORAGE_KEY);
    const nonDemoOrders = savedOrders.filter((order) => !order.isDemoData);
    const updatedOrders = [...demoOrders, ...nonDemoOrders];

    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    localStorage.setItem(
      "pujafresh-last-order",
      JSON.stringify(demoOrders[0])
    );

    demoOrders.forEach((order) => {
      addOrderStatusNotification(order, order.status);
      addPaymentStatusNotification(order, order.paymentStatus);

      if (order.coupon) {
        addCouponNotification(
          order,
          order.coupon.code,
          order.discountAmount + (order.coupon.deliveryDiscount || 0)
        );
      }

      addLoyaltyPointsNotification(order, order.loyalty?.pointsEarned || 0);
    });

    const deliveredOrder = demoOrders.find((order) => order.status === "Delivered");

    if (deliveredOrder) {
      addDeliveryFeedback({
        id: createDeliveryFeedbackId(),
        orderId: deliveredOrder.id,
        customerName: deliveredOrder.customer.fullName,
        customerPhone: deliveredOrder.customer.phone,
        customerEmail: deliveredOrder.customer.email,
        deliveryPartnerId: deliveredOrder.deliveryPartner?.id,
        deliveryPartnerName: deliveredOrder.deliveryPartner?.name,
        deliveryPartnerPhone: deliveredOrder.deliveryPartner?.phone,
        orderRating: 5,
        deliveryRating: 5,
        packagingRating: 4,
        issueType: "None",
        comment: "Demo feedback: delivery was smooth and packaging was good.",
        wouldRecommend: true,
        createdAt: new Date().toISOString(),
      });
    }

    refreshData();
    toast.success("Demo orders, notifications and feedback seeded");
  };

  const seedFullDemoData = () => {
    seedDeliverySetup();
    seedDemoOrders();
  };

  const clearDemoData = () => {
    const confirmClear = window.confirm(
      "Clear demo orders, demo notifications and demo feedback? Real customer data will be preserved as much as possible."
    );

    if (!confirmClear) return;

    const savedOrders = readJsonArray<DemoOrder>(ORDERS_STORAGE_KEY);
    const updatedOrders = savedOrders.filter((order) => !order.isDemoData);

    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));

    const savedNotifications = readJsonArray<any>(NOTIFICATIONS_STORAGE_KEY);
    const updatedNotifications = savedNotifications.filter((notification) => {
      return !String(notification.orderId || "").startsWith("PF-DEMO");
    });

    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(updatedNotifications)
    );

    const savedFeedbacks = readJsonArray<any>(FEEDBACK_STORAGE_KEY);
    const updatedFeedbacks = savedFeedbacks.filter((feedback) => {
      return !String(feedback.orderId || "").startsWith("PF-DEMO");
    });

    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedFeedbacks));

    const lastOrder = readLocalStorageObject("pujafresh-last-order");

    if (lastOrder?.id && String(lastOrder.id).startsWith("PF-DEMO")) {
      localStorage.removeItem("pujafresh-last-order");
    }

    refreshData();
    toast.success("Demo data cleared");
  };

  const readLocalStorageObject = (key: string) => {
    try {
      const savedValue = localStorage.getItem(key);
      return savedValue ? JSON.parse(savedValue) : null;
    } catch {
      return null;
    }
  };

  const demoProductsPreview = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Checking admin access...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Demo Data Seeder
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Quickly create demo orders, delivery partners, notifications and
              feedback to test the complete PujaFresh workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              Back to Admin
            </Link>

            <Link
              href="/admin/backup"
              className="rounded border border-[#15803d] px-5 py-3 text-sm font-bold text-[#15803d] hover:bg-[#15803d] hover:text-white"
            >
              Backup First
            </Link>

            <button
              onClick={refreshData}
              className="rounded bg-[#15803d] px-5 py-3 text-sm font-bold text-white hover:bg-[#166534]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Products</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.products}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-[#7a1e13]">
              {stats.orders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Demo Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-600">
              {stats.demoOrders}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Areas</p>
            <h2 className="mt-2 text-3xl font-bold text-blue-700">
              {stats.deliveryAreas}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Slots</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-700">
              {stats.deliverySlots}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Partners</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {stats.deliveryPartners}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Alerts</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.notifications}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">Feedback</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {stats.feedbacks}
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Seed Demo Workflow
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Use this when you want sample data for testing. It creates demo
              orders in different statuses, assigns partners, generates customer
              notifications and adds one delivered-order feedback.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <button
                onClick={seedDeliverySetup}
                className="rounded-xl border border-[#15803d] bg-green-50 p-5 text-left hover:bg-green-100"
              >
                <h3 className="font-black text-green-800">
                  1. Seed Delivery Setup
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  Adds default service areas, delivery slots and partners if
                  missing.
                </p>
              </button>

              <button
                onClick={seedDemoOrders}
                className="rounded-xl border border-[#7a1e13] bg-[#fff7ed] p-5 text-left hover:bg-orange-100"
              >
                <h3 className="font-black text-[#7a1e13]">
                  2. Seed Demo Orders
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Creates pending, confirmed, out-for-delivery, delivered and
                  failed demo orders.
                </p>
              </button>

              <button
                onClick={seedFullDemoData}
                className="rounded-xl border border-[#f97316] bg-orange-50 p-5 text-left hover:bg-orange-100"
              >
                <h3 className="font-black text-orange-800">
                  One Click Full Demo
                </h3>
                <p className="mt-2 text-sm text-orange-700">
                  Runs setup and demo orders together.
                </p>
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-black text-red-700">
                Clear Demo Data
              </h3>

              <p className="mt-2 text-sm leading-6 text-red-700">
                This removes only demo orders and demo data with IDs starting
                from PF-DEMO. Normal orders are preserved.
              </p>

              <button
                onClick={clearDemoData}
                className="mt-4 rounded bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Clear Demo Data
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                Demo Test Routes
              </h2>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/admin/delivery-assignments"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Delivery Assignments
                </Link>

                <Link
                  href="/delivery-partner"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Partner Portal
                </Link>

                <Link
                  href="/track-order"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Track Order
                </Link>

                <Link
                  href="/delivery-feedback"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Delivery Feedback
                </Link>

                <Link
                  href="/notifications"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Customer Notifications
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <h2 className="text-xl font-bold text-orange-800">
                Recommended
              </h2>

              <p className="mt-2 text-sm leading-6 text-orange-800">
                Before clearing or restoring data, download a backup from the
                Backup & Restore page. Demo data is useful for presentations,
                screenshots and interview project explanation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Product Preview Used for Demo Orders
          </h2>

          {demoProductsPreview.length === 0 ? (
            <div className="py-10 text-center">
              <h3 className="font-bold text-gray-900">
                No products found
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Add products first before seeding demo orders.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {demoProductsPreview.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="relative h-32 overflow-hidden rounded-lg bg-[#fff7ed]">
                    <Image
                      src={product.image || "/basic-pooja-pack.jpg"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <h3 className="mt-3 line-clamp-1 font-bold text-gray-900">
                    {product.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {product.category}
                  </p>

                  <p className="mt-2 text-sm font-black text-[#7a1e13]">
                    ₹{product.price} • Stock{" "}
                    {product.stockQuantity ?? getItemStockQuantity(product)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
