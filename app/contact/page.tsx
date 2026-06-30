"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Mail, MapPin, Phone, ShieldCheck, Truck } from "lucide-react";

type SupportMessage = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "Open";
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        phone: value.replace(/\D/g, "").slice(0, 10),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.subject.trim() ||
      !formData.message.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      toast.error("Phone number must be 10 digits");
      return;
    }

    const newMessage: SupportMessage = {
      id: `SUP-${Date.now()}`,
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      createdAt: new Date().toISOString(),
      status: "Open",
    };

    const previousMessages = JSON.parse(
      localStorage.getItem("pujafresh-support-messages") || "[]"
    ) as SupportMessage[];

    localStorage.setItem(
      "pujafresh-support-messages",
      JSON.stringify([newMessage, ...previousMessages])
    );

    setFormData({
      fullName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });

    toast.success("Support request submitted successfully");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#7a1e13] to-[#f97316] p-8 text-white shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-100">
            PujaFresh Support
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Contact Us
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-orange-50">
            Need help with your order, delivery, product availability or payment?
            Submit your query and our support team will help you.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="text-2xl font-black text-gray-900">
              Send Support Request
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Fill the form below. Your message will be saved for admin support
              review.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Full Name *
                </label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Email *
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Phone
                </label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter mobile number"
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Subject *
                </label>
                <input
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Order issue, payment, delivery..."
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-bold text-gray-700">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Write your issue or question..."
                  className="mt-1 w-full rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#7a1e13]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 rounded bg-[#7a1e13] px-6 py-3 text-sm font-bold text-white hover:bg-[#5f160e]"
            >
              Submit Request
            </button>
          </form>

          <aside className="space-y-5">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Customer Care
              </h2>

              <div className="mt-5 grid gap-4 text-sm text-gray-700">
                <div className="flex gap-3">
                  <Phone className="text-[#7a1e13]" size={20} />
                  <div>
                    <p className="font-black text-gray-900">+91 99999 99999</p>
                    <p className="text-gray-500">Customer support</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="text-[#7a1e13]" size={20} />
                  <div>
                    <p className="font-black text-gray-900">
                      support@pujafresh.com
                    </p>
                    <p className="text-gray-500">Email support</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin className="text-[#7a1e13]" size={20} />
                  <div>
                    <p className="font-black text-gray-900">Delhi NCR</p>
                    <p className="text-gray-500">
                      Selected local service areas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Quick Help
              </h2>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/orders"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Track My Order
                </Link>

                <Link
                  href="/policies/shipping-policy"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Shipping Policy
                </Link>

                <Link
                  href="/policies/cancellation-policy"
                  className="rounded border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:border-[#7a1e13] hover:text-[#7a1e13]"
                >
                  Cancellation Policy
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-[#fff7ed] p-6">
              <div className="flex gap-3">
                <Truck className="text-[#f97316]" size={22} />
                <div>
                  <p className="font-black text-gray-900">
                    Early Morning Delivery
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Order before 9 PM for next morning delivery.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <ShieldCheck className="text-[#15803d]" size={22} />
                <div>
                  <p className="font-black text-gray-900">
                    Clean & Trusted Packing
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Pooja items are packed carefully before delivery.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}