"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    registered ? "Account created successfully. Please login." : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push(callbackUrl);
      router.refresh();
    }
  }, [status, session, callbackUrl, router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (!result || result.error || result.ok === false) {
      setErrorMessage("Invalid email or password.");
      return;
    }

    setSuccessMessage("Login successful.");
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <Navbar />

      <section className="mx-auto flex min-h-[calc(100vh-90px)] max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7a1e13]">
            PujaFresh Login
          </p>

          <h1 className="mt-3 text-3xl font-black text-gray-900">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Login to manage your orders, profile, rewards and subscriptions.
          </p>

          {successMessage && (
            <div className="mt-5 rounded bg-green-50 p-3 text-sm font-bold text-green-700">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 rounded bg-red-50 p-3 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 grid gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Email</label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-4 py-3 outline-none focus:border-[#7a1e13]"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || status === "loading"}
              className="rounded bg-[#7a1e13] px-5 py-3 font-bold text-white hover:bg-[#64180f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            New customer?{" "}
            <Link href="/register" className="font-bold text-[#7a1e13]">
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f3ea]">
          <Navbar />
          <section className="mx-auto max-w-7xl px-4 py-10">
            <p className="font-bold text-gray-700">Loading login page...</p>
          </section>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}