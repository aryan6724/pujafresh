"use client";

import {
  Flame,
  Flower2,
  Gift,
  Landmark,
  PackageCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type CategoryBarProps = {
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
};

const categories = [
  {
    name: "All Products",
    value: "All",
    icon: Sparkles,
  },
  {
    name: "Fresh Flowers",
    value: "Fresh Flowers",
    icon: Flower2,
  },
  {
    name: "Pooja Samagri",
    value: "Pooja Samagri",
    icon: Flame,
  },
  {
    name: "Daily Packs",
    value: "Daily Pooja Packs",
    icon: PackageCheck,
  },
  {
    name: "Festival Kits",
    value: "Festival Kits",
    icon: Gift,
  },
  {
    name: "Murtis",
    value: "Murtis",
    icon: Landmark,
  },
  {
    name: "Subscriptions",
    value: "Subscriptions",
    icon: RefreshCw,
  },
];

export default function CategoryBar({
  selectedCategory = "All",
  onCategoryChange,
}: CategoryBarProps) {
  return (
    <section className="bg-white shadow-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-4 md:grid-cols-7">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.value;

          return (
            <button
              key={category.value}
              onClick={() => onCategoryChange?.(category.value)}
              className={`group flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                isActive
                  ? "border-[#7a1e13] bg-[#fff7ed]"
                  : "border-gray-200 bg-white hover:border-[#7a1e13]"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-[#7a1e13] text-white"
                    : "bg-[#fff7ed] text-[#7a1e13] group-hover:bg-[#7a1e13] group-hover:text-white"
                }`}
              >
                <Icon size={25} strokeWidth={2.2} />
              </div>

              <span className="mt-3 text-sm font-bold text-gray-900">
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}