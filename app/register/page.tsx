"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegister = (event: FormEvent) => {
    event.preventDefault();

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error("Please fill all details");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const result = register({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.push("/profile");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto flex max-w-md items-center px-4 py-10">
        <div className="w-full rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-center text-3xl font-bold text-[#7a1e13]">
            Create Account
          </h1>

          <p className="mt-2 text-center text-sm text-gray-600">
            Register to manage orders, wishlist and profile.
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Full Name
              </label>
              <input
                value={formData.fullName}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    fullName: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Phone
              </label>
              <input
                value={formData.phone}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-[#7a1e13]"
                placeholder="Confirm password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-[#7a1e13] py-3 font-bold text-white hover:bg-[#64180f]"
            >
              REGISTER
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#7a1e13]">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}