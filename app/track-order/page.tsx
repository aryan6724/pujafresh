import { Suspense } from "react";
import TrackOrderClient from "./TrackOrderClient";

function TrackOrderFallback() {
  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Loading track order...
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Please wait while we prepare your order tracking page.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<TrackOrderFallback />}>
      <TrackOrderClient />
    </Suspense>
  );
}
