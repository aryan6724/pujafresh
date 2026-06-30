import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";

type PolicySection = {
  title: string;
  content: string[];
};

type Policy = {
  slug: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: PolicySection[];
};

const policies: Policy[] = [
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    subtitle:
      "Understand PujaFresh delivery slots, service areas, order cut-off time and delivery handling.",
    lastUpdated: "27 June 2026",
    sections: [
      {
        title: "Delivery Areas",
        content: [
          "PujaFresh currently provides delivery in selected local service areas. Delivery availability may depend on pincode, product type and selected delivery slot.",
          "If delivery is not available for your location, the order may not be accepted or the customer support team may contact you for clarification.",
        ],
      },
      {
        title: "Delivery Slots",
        content: [
          "Customers can select available delivery slots during checkout. Slot availability may change based on capacity, festival demand and local delivery conditions.",
          "Early morning delivery is prioritized for daily pooja essentials, flowers and fresh items wherever available.",
        ],
      },
      {
        title: "Order Cut-off Time",
        content: [
          "Orders placed before the store cut-off time are usually processed for the next available delivery slot.",
          "Orders placed after the cut-off time may move to the next available delivery day or slot.",
        ],
      },
      {
        title: "Delivery Delays",
        content: [
          "Delivery may be delayed due to weather, high festival demand, traffic, address issues or product availability.",
          "Customers can track order status from the My Orders page. For urgent concerns, customers can raise a support ticket.",
        ],
      },
      {
        title: "Fresh Product Handling",
        content: [
          "Fresh flowers and perishable pooja items are packed carefully to maintain freshness during local delivery.",
          "Customers should check delivered items soon after receiving the order and report any issue through the Support page.",
        ],
      },
    ],
  },
  {
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    subtitle:
      "Learn when orders can be cancelled and how return, refund or replacement requests work.",
    lastUpdated: "27 June 2026",
    sections: [
      {
        title: "Customer Cancellation",
        content: [
          "Customers can cancel eligible orders from the My Orders page while the order is still in Pending or Confirmed status.",
          "Once an order moves to processing, out for delivery or delivered status, cancellation may not be available from the customer side.",
        ],
      },
      {
        title: "Admin Cancellation",
        content: [
          "PujaFresh admin may cancel an order due to stock unavailability, invalid address, failed payment verification, delivery restrictions or other operational reasons.",
          "If an order is cancelled, the order status history will be updated for transparency.",
        ],
      },
      {
        title: "Return, Refund and Replacement",
        content: [
          "After delivery, customers can submit a Return, Refund or Replacement request from the My Orders page.",
          "Admin will review the request and update its status as Requested, Approved, Rejected, Refunded or Completed.",
        ],
      },
      {
        title: "Refund Processing",
        content: [
          "Refund eligibility depends on order status, product condition, payment mode and admin review.",
          "For demo purposes, refund status and amount are managed inside the admin panel. In a real production system, refund processing would be connected with a payment gateway.",
        ],
      },
    ],
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    subtitle:
      "Important terms for using PujaFresh website, placing orders and accessing customer services.",
    lastUpdated: "27 June 2026",
    sections: [
      {
        title: "Use of Website",
        content: [
          "By using PujaFresh, customers agree to use the platform for lawful and genuine order purposes only.",
          "Customers are responsible for providing accurate name, contact number, email, delivery address and payment details.",
        ],
      },
      {
        title: "Product Information",
        content: [
          "Product images, descriptions, prices and availability are provided for customer convenience and may change based on stock, season and festival demand.",
          "Fresh flowers and pooja items may have slight natural variations in color, size or packaging.",
        ],
      },
      {
        title: "Orders and Payments",
        content: [
          "An order is considered placed when checkout is completed successfully and order details are saved.",
          "Payment status may require admin verification for UPI QR payment and bank transfer. Customers should provide valid payment reference details when required.",
        ],
      },
      {
        title: "Coupons and Loyalty",
        content: [
          "Coupons are valid only when active, within expiry date and eligible for the order value.",
          "Loyalty points may be earned and redeemed according to store rules. PujaFresh can update coupon or loyalty rules when needed.",
        ],
      },
      {
        title: "Limitation of Liability",
        content: [
          "PujaFresh is not responsible for delays or issues caused by incorrect customer details, unavoidable delivery conditions or third-party payment problems.",
          "Customers should report any order issue through the Support page for proper review.",
        ],
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    subtitle:
      "Understand how customer information is used inside the PujaFresh demo platform.",
    lastUpdated: "27 June 2026",
    sections: [
      {
        title: "Information Collected",
        content: [
          "PujaFresh may collect customer name, email, phone number, delivery address, order details, support tickets, newsletter subscriptions and loyalty activity.",
          "This project currently uses browser localStorage as demo storage, so data is stored in the user's browser for portfolio/demo purposes.",
        ],
      },
      {
        title: "How Information Is Used",
        content: [
          "Customer information is used to place orders, show order history, process support tickets, manage delivery details, apply loyalty points and improve the shopping experience.",
          "Newsletter email is used for demo subscription management and admin subscriber listing.",
        ],
      },
      {
        title: "Data Storage",
        content: [
          "In this demo project, data is saved in localStorage. It is not a production database and should not be used for real sensitive customer data without backend security.",
          "For a production version, authentication, database rules, encrypted storage and secure payment gateway integration should be added.",
        ],
      },
      {
        title: "Customer Control",
        content: [
          "Customers can update their profile details if the profile feature is available.",
          "Support tickets and newsletter entries can be managed from the admin side in this demo system.",
        ],
      },
    ],
  },
];

const getPolicyBySlug = (slug: string) => {
  return policies.find((policy) => policy.slug === slug);
};

export function generateStaticParams() {
  return policies.map((policy) => ({
    slug: policy.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicyBySlug(slug);

  if (!policy) {
    return {
      title: "Policy Not Found | PujaFresh",
    };
  }

  return {
    title: `${policy.title} | PujaFresh`,
    description: policy.subtitle,
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = getPolicyBySlug(slug);

  if (!policy) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-[#7a1e13] p-8 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
            PujaFresh Policy
          </p>

          <h1 className="mt-3 text-3xl font-black md:text-4xl">
            {policy.title}
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">{policy.subtitle}</p>

          <p className="mt-5 text-sm font-semibold text-orange-100">
            Last updated: {policy.lastUpdated}
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Quick Links</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            {policies.map((item) => (
              <Link
                key={item.slug}
                href={`/policies/${item.slug}`}
                className={`rounded border px-4 py-2 text-sm font-bold ${
                  item.slug === policy.slug
                    ? "border-[#7a1e13] bg-[#7a1e13] text-white"
                    : "border-[#7a1e13] text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          {policy.sections.map((section, index) => (
            <div key={section.title} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-sm font-black text-[#7a1e13]">
                  {index + 1}
                </span>

                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {section.title}
                  </h2>

                  <div className="mt-3 grid gap-3">
                    {section.content.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm leading-7 text-gray-600"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Need more help?</h2>

          <p className="mt-2 text-gray-600">
            Raise a support ticket and the admin team can respond from the
            support panel.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="rounded bg-[#7a1e13] px-6 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Contact Support
            </Link>

            <Link
              href="/orders"
              className="rounded border border-[#7a1e13] px-6 py-3 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
            >
              My Orders
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
