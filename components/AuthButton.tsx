"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-500">
        Loading...
      </span>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded border border-[#7a1e13] px-4 py-2 text-sm font-bold text-[#7a1e13] hover:bg-[#7a1e13] hover:text-white"
        >
          Login
        </Link>

        <Link
          href="/register"
          className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white hover:bg-[#64180f]"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right text-xs md:block">
        <p className="font-black text-gray-900">
          {session.user.fullName || session.user.name || session.user.email}
        </p>

        <p className="font-bold text-[#7a1e13]">{session.user.role}</p>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded bg-[#7a1e13] px-4 py-2 text-sm font-bold text-white hover:bg-[#64180f]"
      >
        Logout
      </button>
    </div>
  );
}