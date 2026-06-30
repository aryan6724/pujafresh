"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();

    const adminEmail = "admin@pujafresh.com";
    const adminPassword = "admin123";

    if (formData.email === adminEmail && formData.password === adminPassword) {
      localStorage.setItem("pujafresh-admin-auth", "true");
      toast.success("Admin login successful");
      router.push("/admin");
      return;
    }

    toast.error("Invalid admin credentials");
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <section className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-xl bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#7a1e13]">PujaFresh</h1>
            <p className="mt-1 text-sm text-gray-600">
              Admin Dashboard Login
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Admin Email
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
                placeholder="admin@pujafresh.com"
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
                placeholder="admin123"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-[#7a1e13] py-3 font-bold text-white hover:bg-[#64180f]"
            >
              LOGIN AS ADMIN
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm font-semibold text-[#7a1e13]">
              Back to Store
            </Link>
          </div>

          <div className="mt-6 rounded bg-[#fff7ed] p-3 text-xs text-gray-600">
            <p className="font-semibold">Demo Credentials:</p>
            <p>Email: admin@pujafresh.com</p>
            <p>Password: admin123</p>
          </div>
        </div>
      </section>
    </main>
  );
}