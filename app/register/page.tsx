"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!formData.password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.push("/login?registered=true");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto flex min-h-[calc(100vh-90px)] max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7a1e13]">
            Create Account
          </p>

          <h1 className="mt-3 text-3xl font-black text-gray-900">
            Join PujaFresh
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Create your account to manage orders, addresses, rewards and pooja
            subscriptions.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Full Name
              </label>

              <input
                type="text"
                value={formData.fullName}
                onChange={(event) =>
                  handleChange("fullName", event.target.value)
                }
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                placeholder="Aryan Sharma"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Email</label>

              <input
                type="email"
                value={formData.email}
                onChange={(event) => handleChange("email", event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Phone Number
              </label>

              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                placeholder="9999999999"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={formData.password}
                onChange={(event) =>
                  handleChange("password", event.target.value)
                }
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white hover:bg-[#64180f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-5 w-full text-center text-sm font-bold text-[#7a1e13]"
          >
            Already have an account? Login
          </button>
        </div>
      </section>
    </main>
  );
}