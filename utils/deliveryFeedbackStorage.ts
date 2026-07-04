export type DeliveryFeedbackIssue =
  | "None"
  | "Late Delivery"
  | "Damaged Item"
  | "Wrong Item"
  | "Missing Item"
  | "Partner Behaviour"
  | "Packaging Issue"
  | "Other";

export type DeliveryFeedbackStatus =
  | "New"
  | "Reviewed"
  | "Action Needed"
  | "Resolved"
  | "Archived";

export type DeliveryFeedback = {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  orderRating: number;
  deliveryRating: number;
  packagingRating: number;
  issueType: DeliveryFeedbackIssue;
  comment: string;
  wouldRecommend: boolean;
  status?: DeliveryFeedbackStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
};

export const DELIVERY_FEEDBACK_STORAGE_KEY = "pujafresh-delivery-feedback";
export const DELIVERY_FEEDBACK_ADMIN_STORAGE_KEY = "pujafresh-delivery-feedbacks";

export function createDeliveryFeedbackId() {
  return `DF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

const emitFeedbackUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pujafresh-delivery-feedback-updated"));
};

const normalizeFeedback = (feedback: Partial<DeliveryFeedback>): DeliveryFeedback => {
  return {
    id: String(feedback.id || createDeliveryFeedbackId()),
    orderId: String(feedback.orderId || ""),
    customerName: String(feedback.customerName || "Customer"),
    customerPhone: String(feedback.customerPhone || ""),
    customerEmail: feedback.customerEmail || "",
    deliveryPartnerId: feedback.deliveryPartnerId,
    deliveryPartnerName: feedback.deliveryPartnerName,
    deliveryPartnerPhone: feedback.deliveryPartnerPhone,
    orderRating: Number(feedback.orderRating || 0),
    deliveryRating: Number(feedback.deliveryRating || 0),
    packagingRating: Number(feedback.packagingRating || 0),
    issueType: feedback.issueType || "None",
    comment: String(feedback.comment || ""),
    wouldRecommend: Boolean(feedback.wouldRecommend),
    status: feedback.status || "New",
    adminNote: feedback.adminNote || "",
    createdAt: feedback.createdAt || new Date().toISOString(),
    updatedAt: feedback.updatedAt,
  };
};

export function getDeliveryFeedbacks(): DeliveryFeedback[] {
  if (typeof window === "undefined") return [];

  const feedbackMap = new Map<string, DeliveryFeedback>();

  [DELIVERY_FEEDBACK_STORAGE_KEY, DELIVERY_FEEDBACK_ADMIN_STORAGE_KEY].forEach(
    (storageKey) => {
      try {
        const savedFeedbacks = localStorage.getItem(storageKey);
        if (!savedFeedbacks) return;

        const parsedFeedbacks = JSON.parse(savedFeedbacks) as Partial<DeliveryFeedback>[];
        if (!Array.isArray(parsedFeedbacks)) return;

        parsedFeedbacks.forEach((feedback) => {
          const normalized = normalizeFeedback(feedback);
          feedbackMap.set(normalized.id, normalized);
        });
      } catch {
        // Ignore invalid storage data.
      }
    }
  );

  return Array.from(feedbackMap.values()).sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );
}

export function saveDeliveryFeedbacks(feedbacks: DeliveryFeedback[]) {
  if (typeof window === "undefined") return;

  const normalizedFeedbacks = feedbacks.map(normalizeFeedback);

  localStorage.setItem(
    DELIVERY_FEEDBACK_STORAGE_KEY,
    JSON.stringify(normalizedFeedbacks)
  );

  localStorage.setItem(
    DELIVERY_FEEDBACK_ADMIN_STORAGE_KEY,
    JSON.stringify(normalizedFeedbacks)
  );

  emitFeedbackUpdate();
}

export function addDeliveryFeedback(feedback: DeliveryFeedback) {
  const savedFeedbacks = getDeliveryFeedbacks();
  const normalizedFeedback = normalizeFeedback(feedback);

  const filteredFeedbacks = savedFeedbacks.filter(
    (item) => item.orderId.toLowerCase() !== normalizedFeedback.orderId.toLowerCase()
  );

  saveDeliveryFeedbacks([normalizedFeedback, ...filteredFeedbacks]);

  return normalizedFeedback;
}

export function deleteDeliveryFeedback(feedbackId: string) {
  const filteredFeedbacks = getDeliveryFeedbacks().filter(
    (feedback) => feedback.id !== feedbackId
  );

  saveDeliveryFeedbacks(filteredFeedbacks);
}

export function getFeedbackByOrderId(orderId: string) {
  const cleanOrderId = orderId.trim().toLowerCase();

  return getDeliveryFeedbacks().find(
    (feedback) => feedback.orderId.toLowerCase() === cleanOrderId
  );
}
