"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  Gift,
  Heart,
  HelpCircle,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

type NavbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
};

export default function Navbar({ searchValue, onSearchChange }: NavbarProps) {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { data: session, status } = useSession();

  const [menuOpen, setMenuOpen] = useState(false);

  const sessionUser = session?.user as SessionUser | undefined;
  const isLoggedIn = status === "authenticated" && !!sessionUser;
  const firstName =
    sessionUser?.fullName?.split(" ")[0] ||
    sessionUser?.name?.split(" ")[0] ||
    sessionUser?.email?.split("@")[0] ||
    "Account";

  const userRole = sessionUser?.role || "CUSTOMER";

  const searchInputProps =
    searchValue !== undefined
      ? {
          value: searchValue,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onSearchChange?.(event.target.value),
        }
      : {};

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenu();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#7a1e13] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded p-1 md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link href="/" onClick={closeMenu} className="min-w-fit">
          <h1 className="text-2xl font-bold tracking-tight">PujaFresh</h1>
          <p className="-mt-1 text-xs text-orange-100">
            Fresh Pooja Essentials
          </p>
        </Link>

        <div className="hidden flex-1 items-center rounded bg-white px-3 py-2 text-gray-700 md:flex">
          <Search size={20} className="mr-2 text-gray-500" />
          <input
            type="text"
            placeholder="Search for flowers, pooja samagri, murtis and festival kits"
            className="w-full outline-none"
            {...searchInputProps}
          />
        </div>

        <nav className="ml-auto flex items-center gap-3 text-sm font-semibold lg:gap-4">
          <Link
            href="/faq"
            className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 lg:flex"
          >
            <HelpCircle size={18} />
            FAQ
          </Link>

          <Link
            href="/support"
            className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 lg:flex"
          >
            <MessageCircle size={18} />
            Support
          </Link>

          {isLoggedIn && (
            <Link
              href="/loyalty"
              className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 lg:flex"
            >
              <Gift size={18} />
              Rewards
            </Link>
          )}

          {isLoggedIn && (
            <Link
              href="/notifications"
              className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 lg:flex"
            >
              <Bell size={18} />
              Alerts
            </Link>
          )}

          <Link
            href="/coupons"
            className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 xl:flex"
          >
            <Gift size={18} />
            Coupons
          </Link>

          {status === "loading" ? (
            <span className="hidden items-center gap-1 rounded px-2 py-1 text-orange-100 md:flex">
              <User size={18} />
              Loading...
            </span>
          ) : isLoggedIn ? (
            <Link
              href="/profile"
              className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 md:flex"
            >
              <User size={18} />
              {firstName}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 md:flex"
            >
              <User size={18} />
              Login
            </Link>
          )}

          <Link
            href="/wishlist"
            className="relative hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 md:flex"
          >
            <Heart size={18} />
            Wishlist

            {wishlistCount > 0 && (
              <span className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#7a1e13]">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href="/orders"
            className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 md:flex"
          >
            <Package size={18} />
            Orders
          </Link>

          <Link
            href="/cart"
            className="relative flex items-center gap-1 rounded bg-[#f97316] px-3 py-2 hover:bg-[#ea580c]"
          >
            <ShoppingCart size={18} />
            Cart

            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#7a1e13]">
                {cartCount}
              </span>
            )}
          </Link>

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-1 rounded border border-white px-3 py-2 text-sm font-bold text-white hover:bg-white hover:text-[#7a1e13] md:flex"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </nav>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <div className="flex items-center rounded bg-white px-3 py-2 text-gray-700">
          <Search size={20} className="mr-2 text-gray-500" />
          <input
            type="text"
            placeholder="Search pooja items..."
            className="w-full outline-none"
            {...searchInputProps}
          />
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/15 px-4 pb-4 md:hidden">
          <nav className="grid gap-2 text-sm font-bold">
            {status === "loading" ? (
              <div className="flex items-center gap-2 rounded bg-white/10 px-4 py-3">
                <User size={18} />
                Loading...
              </div>
            ) : isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded bg-white/10 px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    <User size={18} />
                    {firstName}
                  </span>

                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#7a1e13]">
                    {userRole}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded bg-white px-4 py-3 text-left font-bold text-[#7a1e13]"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
                >
                  <User size={18} />
                  Login
                </Link>

                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded bg-white px-4 py-3 text-[#7a1e13]"
                >
                  <User size={18} />
                  Register
                </Link>
              </>
            )}

            <Link
              href="/wishlist"
              onClick={closeMenu}
              className="flex items-center justify-between rounded bg-white/10 px-4 py-3"
            >
              <span className="flex items-center gap-2">
                <Heart size={18} />
                Wishlist
              </span>

              {wishlistCount > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#7a1e13]">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/orders"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
            >
              <Package size={18} />
              My Orders
            </Link>

            {isLoggedIn && (
              <Link
                href="/loyalty"
                onClick={closeMenu}
                className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
              >
                <Gift size={18} />
                My Rewards
              </Link>
            )}

            {isLoggedIn && (
              <Link
                href="/notifications"
                onClick={closeMenu}
                className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
              >
                <Bell size={18} />
                Notifications
              </Link>
            )}

            <Link
              href="/coupons"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
            >
              <Gift size={18} />
              Coupons
            </Link>

            <Link
              href="/faq"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
            >
              <HelpCircle size={18} />
              FAQ / Help Center
            </Link>

            <Link
              href="/support"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded bg-white/10 px-4 py-3"
            >
              <MessageCircle size={18} />
              Support Tickets
            </Link>

            <Link
              href="/cart"
              onClick={closeMenu}
              className="flex items-center justify-between rounded bg-[#f97316] px-4 py-3"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={18} />
                Cart
              </span>

              {cartCount > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#7a1e13]">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
