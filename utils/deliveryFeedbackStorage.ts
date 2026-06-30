export type DeliveryFeedbackIssue =
  | "None"
  | "Late Delivery"
  | "Damaged Item"
  | "Wrong Item"
  | "Missing Item"
  | "Partner Behaviour"
  | "Packaging Issue"
  | "Other";

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
  createdAt: string;
};

export const DELIVERY_FEEDBACK_STORAGE_KEY = "pujafresh-delivery-feedback";

export function createDeliveryFeedbackId() {
  return `DF-${Date.now()}`;
}

export function getDeliveryFeedbacks() {
  if (typeof window === "undefined") return [];

  const savedFeedbacks = localStorage.getItem(DELIVERY_FEEDBACK_STORAGE_KEY);

  if (!savedFeedbacks) return [];

  try {
    const parsedFeedbacks = JSON.parse(savedFeedbacks) as DeliveryFeedback[];

    if (Array.isArray(parsedFeedbacks)) {
      return parsedFeedbacks;
    }

    return [];
  } catch {
    return [];
  }
}

export function saveDeliveryFeedbacks(feedbacks: DeliveryFeedback[]) {
  localStorage.setItem(
    DELIVERY_FEEDBACK_STORAGE_KEY,
    JSON.stringify(feedbacks)
  );
}

export function addDeliveryFeedback(feedback: DeliveryFeedback) {
  const savedFeedbacks = getDeliveryFeedbacks();
  const filteredFeedbacks = savedFeedbacks.filter(
    (item) => item.orderId !== feedback.orderId
  );

  saveDeliveryFeedbacks([feedback, ...filteredFeedbacks]);
}

export function deleteDeliveryFeedback(feedbackId: string) {
  const savedFeedbacks = getDeliveryFeedbacks();
  const filteredFeedbacks = savedFeedbacks.filter(
    (feedback) => feedback.id !== feedbackId
  );

  saveDeliveryFeedbacks(filteredFeedbacks);
}

export function getFeedbackByOrderId(orderId: string) {
  return getDeliveryFeedbacks().find(
    (feedback) => feedback.orderId.toLowerCase() === orderId.toLowerCase()
  );
}
