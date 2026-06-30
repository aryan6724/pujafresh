"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import {
  DeliveryArea,
  findDeliveryAreaByPincode,
  getDeliveryAreas,
} from "@/utils/deliveryAreaStorage";

export default function CheckDeliveryPage() {
  const [pincode, setPincode] = useState("");
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [matchedArea, setMatchedArea] = useState<DeliveryArea | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    setAreas(getDeliveryAreas());
  }, []);

  const activeAreas = useMemo(() => {
    return areas.filter((area) => area.isActive);
  }, [areas]);

  const popularAreas = useMemo(() => {
    return activeAreas.slice(0, 6);
  }, [activeAreas]);

  const handleCheckDelivery = (event: FormEvent) => {
    event.preventDefault();

    const cleanPincode = pincode.trim();

    if (!/^\d{6}$/.test(cleanPincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    const area = findDeliveryAreaByPincode(cleanPincode);

    setMatchedArea(area || null);
    setHasChecked(true);

    if (area) {
      toast.success("Delivery is available in your area");
    } else {
      toast.error("Delivery is not available for this pincode yet");
    }
  };

  const handleQuickCheck = (areaPincode: string) => {
    setPincode(areaPincode);

    const area = findDeliveryAreaByPincode(areaPincode);
    setMatchedArea(area || null);
    setHasChecked(true);

    if (area) {
      toast.success(`Delivery available in ${area.areaName}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Delivery
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Check Delivery Availability
          </h1>

          <p className="mt-4 max-w-3xl text-orange-50">
            Enter your pincode to check delivery charges, minimum order value,
            available slots and estimated delivery time.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              Enter Pincode
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              PujaFresh currently supports selected local service areas.
            </p>

            <form onSubmit={handleCheckDelivery} className="mt-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <input
                  value={pincode}
                  onChange={(event) =>
                    setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6-digit pincode"
                  className="rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                />

                <button
                  type="submit"
                  className="rounded bg-[#7a1e13] px-6 py-3 font-bold text-white hover:bg-[#5f160e]"
                >
                  Check
                </button>
              </div>
            </form>

            {hasChecked && matchedArea && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-green-700">
                      Delivery Available
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-gray-900">
                      {matchedArea.areaName}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {matchedArea.city}, {matchedArea.state} -{" "}
                      {matchedArea.pincode}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white">
                    Active Area
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded bg-white p-3">
                    <p className="text-xs font-bold text-gray-500">
                      Delivery Charge
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-900">
                      ₹{matchedArea.deliveryCharge}
                    </p>
                  </div>

                  <div className="rounded bg-white p-3">
                    <p className="text-xs font-bold text-gray-500">
                      Free Delivery Above
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-900">
                      ₹{matchedArea.freeDeliveryAbove}
                    </p>
                  </div>

                  <div className="rounded bg-white p-3">
                    <p className="text-xs font-bold text-gray-500">
                      Minimum Order
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-900">
                      ₹{matchedArea.minOrderValue}
                    </p>
                  </div>

                  <div className="rounded bg-white p-3">
                    <p className="text-xs font-bold text-gray-500">
                      Estimated Delivery
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-900">
                      {matchedArea.estimatedDelivery}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded bg-white p-4">
                  <p className="font-bold text-gray-900">
                    Available Delivery Slots
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {matchedArea.slots
                      .filter((slot) => slot.isActive)
                      .map((slot) => (
                        <span
                          key={slot.id}
                          className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#7a1e13]"
                        >
                          {slot.label}: {slot.timeRange}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
                  >
                    Start Shopping
                  </Link>

                  <Link
                    href="/support"
                    className="rounded border border-[#7a1e13] px-5 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                  >
                    Need Help?
                  </Link>
                </div>
              </div>
            )}

            {hasChecked && !matchedArea && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-black uppercase tracking-wide text-red-700">
                  Delivery Not Available
                </p>

                <h3 className="mt-2 text-2xl font-black text-gray-900">
                  We do not deliver here yet
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Please try another pincode or raise a support ticket. Our team
                  can notify you when PujaFresh starts service in your area.
                </p>

                <Link
                  href="/support"
                  className="mt-5 inline-block rounded bg-[#7a1e13] px-5 py-3 text-sm font-bold text-white"
                >
                  Contact Support
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-900">
              Active Service Areas
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Quick check using available demo pincodes.
            </p>

            <div className="mt-5 grid gap-3">
              {popularAreas.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No active delivery areas found.
                </p>
              ) : (
                popularAreas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => handleQuickCheck(area.pincode)}
                    className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-[#7a1e13] hover:bg-[#fff7ed]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          {area.areaName}
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {area.city} - {area.pincode}
                        </p>
                      </div>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        Available
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-black text-gray-900">
            Delivery rules are admin-managed
          </h2>

          <p className="mt-2 text-gray-600">
            Admin can add service areas, delivery charges, minimum order value
            and active slots from the delivery area panel.
          </p>
        </div>
      </section>
    </main>
  );
}
