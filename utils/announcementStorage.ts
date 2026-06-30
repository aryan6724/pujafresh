export type AnnouncementType = "Info" | "Offer" | "Festival" | "Warning";

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  linkText?: string;
  linkHref?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  priority: number;
  createdAt: string;
  updatedAt?: string;
};

export const ANNOUNCEMENTS_STORAGE_KEY = "pujafresh-announcements";

export const announcementTypes: AnnouncementType[] = [
  "Info",
  "Offer",
  "Festival",
  "Warning",
];

export const defaultAnnouncements: Announcement[] = [
  {
    id: "ANN-WELCOME",
    title: "Fresh Pooja Essentials Delivered Daily",
    message:
      "Order fresh flowers, pooja samagri and daily pooja packs with convenient delivery slots.",
    type: "Info",
    linkText: "Shop Now",
    linkHref: "/",
    isActive: true,
    startDate: "2020-01-01",
    endDate: "2099-12-31",
    priority: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "ANN-COUPON",
    title: "Use WELCOME10",
    message:
      "Apply WELCOME10 at checkout and get 10% off on eligible PujaFresh orders.",
    type: "Offer",
    linkText: "View Coupons",
    linkHref: "/faq",
    isActive: true,
    startDate: "2020-01-01",
    endDate: "2099-12-31",
    priority: 2,
    createdAt: new Date().toISOString(),
  },
];

export function getAnnouncements() {
  if (typeof window === "undefined") return defaultAnnouncements;

  const savedAnnouncements = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);

  if (!savedAnnouncements) {
    localStorage.setItem(
      ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(defaultAnnouncements)
    );
    return defaultAnnouncements;
  }

  try {
    const parsedAnnouncements = JSON.parse(
      savedAnnouncements
    ) as Announcement[];

    if (Array.isArray(parsedAnnouncements)) {
      return parsedAnnouncements;
    }

    localStorage.setItem(
      ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(defaultAnnouncements)
    );
    return defaultAnnouncements;
  } catch {
    localStorage.setItem(
      ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(defaultAnnouncements)
    );
    return defaultAnnouncements;
  }
}

export function saveAnnouncements(announcements: Announcement[]) {
  localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(announcements));
}

export function resetAnnouncementsToDefault() {
  localStorage.setItem(
    ANNOUNCEMENTS_STORAGE_KEY,
    JSON.stringify(defaultAnnouncements)
  );
  return defaultAnnouncements;
}

export function isAnnouncementCurrentlyVisible(announcement: Announcement) {
  if (!announcement.isActive) return false;

  const today = new Date().toISOString().slice(0, 10);

  const isAfterStart = !announcement.startDate || announcement.startDate <= today;
  const isBeforeEnd = !announcement.endDate || announcement.endDate >= today;

  return isAfterStart && isBeforeEnd;
}
