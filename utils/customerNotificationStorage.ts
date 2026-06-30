export type CustomerNotificationType =
  | "Order"
  | "Payment"
  | "Delivery"
  | "Support"
  | "Loyalty"
  | "Coupon"
  | "Refund"
  | "System";

export type CustomerNotificationPriority = "Low" | "Normal" | "High";

export type CustomerNotification = {
  id: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  type: CustomerNotificationType;
  priority: CustomerNotificationPriority;
  title: string;
  message: string;
  actionHref?: string;
  isRead: boolean;
  createdAt: string;
};

export const CUSTOMER_NOTIFICATIONS_STORAGE_KEY =
  "pujafresh-customer-notifications";

const createNotificationId = () => {
  return `NOTIF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const normalizeEmail = (email?: string) => {
  return email?.trim().toLowerCase() || "";
};

const normalizePhone = (phone?: string) => {
  return phone?.replace(/\D/g, "") || "";
};

const emitNotificationUpdate = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event("pujafresh-notifications-updated"));
};

export function getAllCustomerNotifications() {
  if (typeof window === "undefined") return [];

  const savedNotifications = localStorage.getItem(
    CUSTOMER_NOTIFICATIONS_STORAGE_KEY
  );

  if (!savedNotifications) return [];

  try {
    const parsedNotifications = JSON.parse(
      savedNotifications
    ) as CustomerNotification[];

    if (Array.isArray(parsedNotifications)) {
      return parsedNotifications;
    }

    return [];
  } catch {
    return [];
  }
}

export function saveAllCustomerNotifications(
  notifications: CustomerNotification[]
) {
  localStorage.setItem(
    CUSTOMER_NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(notifications)
  );

  emitNotificationUpdate();
}

export function getCustomerNotifications(
  customerEmail?: string,
  customerPhone?: string
) {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  return getAllCustomerNotifications()
    .filter((notification) => {
      const notificationEmail = normalizeEmail(notification.customerEmail);
      const notificationPhone = normalizePhone(notification.customerPhone);

      if (email && notificationEmail && notificationEmail === email) return true;
      if (phone && notificationPhone && notificationPhone === phone) return true;

      return false;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function addCustomerNotification(
  notification: Omit<CustomerNotification, "id" | "isRead" | "createdAt"> & {
    createdAt?: string;
    isRead?: boolean;
  }
) {
  if (typeof window === "undefined") return null;

  const customerEmail = normalizeEmail(notification.customerEmail);
  const customerPhone = normalizePhone(notification.customerPhone);

  if (!customerEmail && !customerPhone) return null;

  const savedNotifications = getAllCustomerNotifications();

  const newNotification: CustomerNotification = {
    id: createNotificationId(),
    ...notification,
    customerEmail: customerEmail || notification.customerEmail,
    customerPhone: customerPhone || notification.customerPhone,
    isRead: notification.isRead ?? false,
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  const isDuplicate = savedNotifications.some((savedNotification) => {
    return (
      savedNotification.orderId === newNotification.orderId &&
      savedNotification.type === newNotification.type &&
      savedNotification.title === newNotification.title &&
      savedNotification.message === newNotification.message
    );
  });

  if (isDuplicate) {
    return null;
  }

  saveAllCustomerNotifications([newNotification, ...savedNotifications]);

  return newNotification;
}

const getOrderCustomerEmail = (order: any) => {
  return (
    order?.customerEmail ||
    order?.customer?.email ||
    order?.customer?.customerEmail ||
    ""
  );
};

const getOrderCustomerPhone = (order: any) => {
  return order?.customer?.phone || order?.customerPhone || "";
};

const getOrderId = (order: any) => {
  return order?.id || "";
};

const getOrderActionHref = (order: any) => {
  return `/track-order`;
};

const getOrderTotal = (order: any) => {
  return Number(order?.total || 0);
};

const orderStatusMessages: Record<
  string,
  {
    type: CustomerNotificationType;
    priority: CustomerNotificationPriority;
    title: string;
    message: string;
  }
> = {
  Pending: {
    type: "Order",
    priority: "Normal",
    title: "Order placed successfully",
    message: "Your order has been placed and is waiting for confirmation.",
  },
  Confirmed: {
    type: "Order",
    priority: "Normal",
    title: "Order confirmed",
    message: "Your order has been confirmed by PujaFresh.",
  },
  Processing: {
    type: "Order",
    priority: "Normal",
    title: "Order is being prepared",
    message: "Your pooja essentials are being prepared for delivery.",
  },
  Packed: {
    type: "Order",
    priority: "Normal",
    title: "Order packed",
    message: "Your order has been packed and is ready for dispatch.",
  },
  "Ready for Delivery": {
    type: "Order",
    priority: "Normal",
    title: "Order ready for delivery",
    message: "Your order is ready to be picked up by our delivery partner.",
  },
  "Out for Delivery": {
    type: "Delivery",
    priority: "High",
    title: "Out for delivery",
    message: "Your order is on the way with our delivery partner.",
  },
  Delivered: {
    type: "Delivery",
    priority: "High",
    title: "Order delivered",
    message:
      "Your order has been delivered successfully. You can now share feedback.",
  },
  "Delivery Failed": {
    type: "Delivery",
    priority: "High",
    title: "Delivery attempt failed",
    message:
      "We could not complete the delivery attempt. Please check tracking or contact support.",
  },
  Cancelled: {
    type: "Order",
    priority: "High",
    title: "Order cancelled",
    message: "Your order has been cancelled.",
  },
  Refunded: {
    type: "Refund",
    priority: "High",
    title: "Refund updated",
    message: "Refund status has been updated for your order.",
  },
};

const paymentStatusMessages: Record<
  string,
  {
    priority: CustomerNotificationPriority;
    title: string;
    message: string;
  }
> = {
  "Payment Pending": {
    priority: "Normal",
    title: "Payment pending",
    message: "Your payment is pending for this order.",
  },
  "Verification Pending": {
    priority: "High",
    title: "Payment verification pending",
    message: "We have received your payment reference and will verify it soon.",
  },
  "Payment Received": {
    priority: "High",
    title: "Payment received",
    message: "Your payment has been marked as received.",
  },
  "Payment Failed": {
    priority: "High",
    title: "Payment failed",
    message: "Payment failed for this order. Please contact support.",
  },
  Refunded: {
    priority: "High",
    title: "Refund processed",
    message: "Refund status has been updated for this order.",
  },
};

export function addOrderStatusNotification(
  order: any,
  status: string,
  updatedBy = "PujaFresh"
) {
  const notificationMeta = orderStatusMessages[status];

  if (!notificationMeta) return null;

  const orderId = getOrderId(order);

  return addCustomerNotification({
    customerEmail: getOrderCustomerEmail(order),
    customerPhone: getOrderCustomerPhone(order),
    orderId,
    type: notificationMeta.type,
    priority: notificationMeta.priority,
    title: notificationMeta.title,
    message: `${notificationMeta.message} Order ID: ${orderId}.`,
    actionHref: getOrderActionHref(order),
  });
}

export function addPaymentStatusNotification(order: any, paymentStatus: string) {
  const notificationMeta = paymentStatusMessages[paymentStatus];

  if (!notificationMeta) return null;

  const orderId = getOrderId(order);

  return addCustomerNotification({
    customerEmail: getOrderCustomerEmail(order),
    customerPhone: getOrderCustomerPhone(order),
    orderId,
    type: paymentStatus === "Refunded" ? "Refund" : "Payment",
    priority: notificationMeta.priority,
    title: notificationMeta.title,
    message: `${notificationMeta.message} Order ID: ${orderId}.`,
    actionHref: getOrderActionHref(order),
  });
}

export function addCouponNotification(
  order: any,
  couponCode: string,
  savingsAmount: number
) {
  const orderId = getOrderId(order);

  return addCustomerNotification({
    customerEmail: getOrderCustomerEmail(order),
    customerPhone: getOrderCustomerPhone(order),
    orderId,
    type: "Coupon",
    priority: "Normal",
    title: "Coupon applied",
    message: `${couponCode} coupon applied successfully. You saved ₹${savingsAmount}.`,
    actionHref: getOrderActionHref(order),
  });
}

export function addLoyaltyPointsNotification(order: any, points: number) {
  if (points <= 0) return null;

  const orderId = getOrderId(order);

  return addCustomerNotification({
    customerEmail: getOrderCustomerEmail(order),
    customerPhone: getOrderCustomerPhone(order),
    orderId,
    type: "Loyalty",
    priority: "Normal",
    title: "Loyalty points earned",
    message: `You earned ${points} loyalty point${
      points !== 1 ? "s" : ""
    } on order ${orderId}.`,
    actionHref: "/loyalty",
  });
}

export function addSupportReplyNotification(params: {
  customerEmail?: string;
  customerPhone?: string;
  ticketId: string;
  replyPreview?: string;
}) {
  return addCustomerNotification({
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    type: "Support",
    priority: "High",
    title: "Support reply received",
    message: `You have received a reply on support ticket ${
      params.ticketId
    }. ${params.replyPreview || ""}`.trim(),
    actionHref: "/support",
  });
}

export function markCustomerNotificationAsRead(notificationId: string) {
  const updatedNotifications = getAllCustomerNotifications().map((notification) =>
    notification.id === notificationId
      ? {
          ...notification,
          isRead: true,
        }
      : notification
  );

  saveAllCustomerNotifications(updatedNotifications);
}

export function markAllCustomerNotificationsAsRead(
  customerEmail?: string,
  customerPhone?: string
) {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  const updatedNotifications = getAllCustomerNotifications().map(
    (notification) => {
      const notificationEmail = normalizeEmail(notification.customerEmail);
      const notificationPhone = normalizePhone(notification.customerPhone);

      const belongsToCustomer =
        (email && notificationEmail && email === notificationEmail) ||
        (phone && notificationPhone && phone === notificationPhone);

      return belongsToCustomer
        ? {
            ...notification,
            isRead: true,
          }
        : notification;
    }
  );

  saveAllCustomerNotifications(updatedNotifications);
}

export function deleteCustomerNotification(notificationId: string) {
  const updatedNotifications = getAllCustomerNotifications().filter(
    (notification) => notification.id !== notificationId
  );

  saveAllCustomerNotifications(updatedNotifications);
}

export function clearReadCustomerNotifications(
  customerEmail?: string,
  customerPhone?: string
) {
  const email = normalizeEmail(customerEmail);
  const phone = normalizePhone(customerPhone);

  const updatedNotifications = getAllCustomerNotifications().filter(
    (notification) => {
      const notificationEmail = normalizeEmail(notification.customerEmail);
      const notificationPhone = normalizePhone(notification.customerPhone);

      const belongsToCustomer =
        (email && notificationEmail && email === notificationEmail) ||
        (phone && notificationPhone && phone === notificationPhone);

      if (!belongsToCustomer) return true;

      return !notification.isRead;
    }
  );

  saveAllCustomerNotifications(updatedNotifications);
}
