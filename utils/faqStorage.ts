export type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
};

export const FAQ_STORAGE_KEY = "pujafresh-faqs";

export const faqCategories = [
  "Orders",
  "Delivery",
  "Payments",
  "Returns & Refunds",
  "Coupons & Loyalty",
  "Products",
  "Account",
  "Other",
];

export const defaultFaqs: FAQ[] = [
  {
    id: "FAQ-ORDERS-1",
    question: "How can I track my PujaFresh order?",
    answer:
      "You can track your order from the My Orders page or Track Order page. Order status, delivery date, delivery slot, payment status and invoice link are available there.",
    category: "Orders",
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "FAQ-DELIVERY-1",
    question: "When will my pooja items be delivered?",
    answer:
      "Delivery depends on the selected delivery date and slot during checkout. Admin can manage delivery areas, slots and the daily delivery list from the admin panel.",
    category: "Delivery",
    isActive: true,
    isFeatured: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "FAQ-PAYMENT-1",
    question: "Can I pay using UPI or Cash on Delivery?",
    answer:
      "Yes. PujaFresh supports Cash on Delivery, UPI QR Payment, Bank Transfer and Card Payment depending on active store settings.",
    category: "Payments",
    isActive: true,
    isFeatured: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "FAQ-RETURNS-1",
    question: "How do I request a return or refund?",
    answer:
      "After an order is delivered, you can open My Orders or Return/Refund page and submit a Return, Refund or Replacement request. Admin will review and update the request status.",
    category: "Returns & Refunds",
    isActive: true,
    isFeatured: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: "FAQ-COUPONS-1",
    question: "How do coupons and loyalty points work?",
    answer:
      "Coupons can be applied during checkout if they are active, valid and eligible for your order value. Loyalty points are earned automatically and can be adjusted by admin.",
    category: "Coupons & Loyalty",
    isActive: true,
    isFeatured: true,
    sortOrder: 5,
    createdAt: new Date().toISOString(),
  },
];

const emitFaqUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pujafresh-faqs-updated"));
};

const normalizeFaq = (faq: Partial<FAQ>, index = 0): FAQ => {
  return {
    id: String(faq.id || `FAQ-${Date.now()}-${index}`),
    question: String(faq.question || "Question"),
    answer: String(faq.answer || "Answer not available."),
    category: String(faq.category || "Other"),
    isActive: faq.isActive !== false,
    isFeatured: Boolean(faq.isFeatured),
    sortOrder: Number(faq.sortOrder ?? index + 1),
    createdAt: faq.createdAt || new Date().toISOString(),
    updatedAt: faq.updatedAt,
  };
};

export function getFaqs() {
  if (typeof window === "undefined") return defaultFaqs;

  const savedFaqs = localStorage.getItem(FAQ_STORAGE_KEY);

  if (!savedFaqs) {
    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(defaultFaqs));
    return defaultFaqs;
  }

  try {
    const parsedFaqs = JSON.parse(savedFaqs) as Partial<FAQ>[];

    if (Array.isArray(parsedFaqs)) return parsedFaqs.map(normalizeFaq);

    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(defaultFaqs));
    return defaultFaqs;
  } catch {
    localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(defaultFaqs));
    return defaultFaqs;
  }
}

export function saveFaqs(faqs: FAQ[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(faqs.map(normalizeFaq)));
  emitFaqUpdate();
}

export function resetFaqsToDefault() {
  if (typeof window === "undefined") return defaultFaqs;

  localStorage.setItem(FAQ_STORAGE_KEY, JSON.stringify(defaultFaqs));
  emitFaqUpdate();
  return defaultFaqs;
}
