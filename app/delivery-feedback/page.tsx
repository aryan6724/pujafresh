import { Suspense } from "react";
import DeliveryFeedbackClient from "./DeliveryFeedbackClient";

function DeliveryFeedbackFallback() {
  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Loading delivery feedback...
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Please wait while we prepare your feedback page.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function DeliveryFeedbackPage() {
  return (
    <Suspense fallback={<DeliveryFeedbackFallback />}>
      <DeliveryFeedbackClient />
    </Suspense>
  );
}