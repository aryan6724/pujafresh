"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please enter email and password");
      return;
    }

    const result = login(formData.email, formData.password);

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
            Login
          </h1>

          <p className="mt-2 text-center text-sm text-gray-600">
            Login to your PujaFresh account.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-[#7a1e13] py-3 font-bold text-white hover:bg-[#64180f]"
            >
              LOGIN
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            New user?{" "}
            <Link href="/register" className="font-bold text-[#7a1e13]">
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}