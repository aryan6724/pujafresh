"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Announcement,
  getAnnouncements,
  isAnnouncementCurrentlyVisible,
} from "@/utils/announcementStorage";

const getDismissStorageKey = (announcementId: string) => {
  return `pujafresh-announcement-dismissed-${announcementId}`;
};

const getAnnouncementStyle = (type: Announcement["type"]) => {
  if (type === "Offer") {
    return "bg-[#f97316] text-white";
  }

  if (type === "Festival") {
    return "bg-[#7a1e13] text-white";
  }

  if (type === "Warning") {
    return "bg-red-600 text-white";
  }

  return "bg-[#15803d] text-white";
};

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const savedAnnouncements = getAnnouncements();
    setAnnouncements(savedAnnouncements);

    const dismissedAnnouncementIds = savedAnnouncements
      .filter((announcement) =>
        localStorage.getItem(getDismissStorageKey(announcement.id))
      )
      .map((announcement) => announcement.id);

    setDismissedIds(dismissedAnnouncementIds);
  }, []);

  const activeAnnouncement = useMemo(() => {
    return announcements
      .filter(isAnnouncementCurrentlyVisible)
      .filter((announcement) => !dismissedIds.includes(announcement.id))
      .sort((a, b) => a.priority - b.priority)[0];
  }, [announcements, dismissedIds]);

  const dismissAnnouncement = () => {
    if (!activeAnnouncement) return;

    localStorage.setItem(getDismissStorageKey(activeAnnouncement.id), "true");
    setDismissedIds((prev) => [...prev, activeAnnouncement.id]);
  };

  if (!activeAnnouncement) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 text-sm font-semibold ${getAnnouncementStyle(
        activeAnnouncement.type
      )}`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 text-center">
        <span className="font-bold">{activeAnnouncement.title}</span>

        <span className="opacity-95">{activeAnnouncement.message}</span>

        {activeAnnouncement.linkText && activeAnnouncement.linkHref && (
          <Link
            href={activeAnnouncement.linkHref}
            className="rounded bg-white px-3 py-1 text-xs font-bold text-[#7a1e13]"
          >
            {activeAnnouncement.linkText}
          </Link>
        )}

        <button
          type="button"
          onClick={dismissAnnouncement}
          className="rounded border border-white/50 px-2 py-0.5 text-xs font-bold text-white hover:bg-white hover:text-[#7a1e13]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
