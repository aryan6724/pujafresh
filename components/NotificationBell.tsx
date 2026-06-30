"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  CustomerNotification,
  getCustomerNotifications,
} from "@/utils/customerNotificationStorage";

type NotificationBellProps = {
  customerEmail?: string;
  customerPhone?: string;
};

export default function NotificationBell({
  customerEmail,
  customerPhone,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const loadNotifications = () => {
    if (!customerEmail && !customerPhone) {
      setNotifications([]);
      return;
    }

    setNotifications(getCustomerNotifications(customerEmail, customerPhone));
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("pujafresh-notifications-updated", handleUpdate);

    const intervalId = window.setInterval(loadNotifications, 5000);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("pujafresh-notifications-updated", handleUpdate);
      window.clearInterval(intervalId);
    };
  }, [customerEmail, customerPhone]);

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.isRead).length;
  }, [notifications]);

  if (!customerEmail && !customerPhone) return null;

  return (
    <Link
      href="/notifications"
      className="relative hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 md:flex"
      title="Notifications"
    >
      <Bell size={18} />
      Alerts

      {unreadCount > 0 && (
        <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-[#7a1e13]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
