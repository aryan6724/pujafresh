"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Heart,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  Globe,
  Gift,
  HelpCircle,
  MessageCircle,
} from "lucide-react";

type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  status: "Subscribed" | "Unsubscribed";
  subscribedAt: string;
  updatedAt?: string;
};

const NEWSLETTER_STORAGE_KEY = "pujafresh-newsletter-subscribers";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = newsletterEmail.trim().toLowerCase();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      toast.error("Please enter a valid email address");
      return;
    }

    const savedSubscribers = JSON.parse(
      localStorage.getItem(NEWSLETTER_STORAGE_KEY) || "[]"
    ) as NewsletterSubscriber[];

    const now = new Date().toISOString();

    const normalizedSubscribers = savedSubscribers.map((subscriber: any) => ({
      id: subscriber.id || `NEWS-${Date.now()}`,
      email: subscriber.email,
      source: subscriber.source || "Footer",
      status: subscriber.status || "Subscribed",
      subscribedAt: subscriber.subscribedAt || subscriber.createdAt || now,
      updatedAt: subscriber.updatedAt || subscriber.createdAt || now,
    })) as NewsletterSubscriber[];

    const existingSubscriber = normalizedSubscribers.find(
      (subscriber) => subscriber.email.toLowerCase() === email
    );

    if (existingSubscriber?.status === "Subscribed") {
      toast.error("This email is already subscribed");
      return;
    }

    if (existingSubscriber) {
      const updatedSubscribers = normalizedSubscribers.map((subscriber) =>
        subscriber.id === existingSubscriber.id
          ? {
              ...subscriber,
              status: "Subscribed" as const,
              source: "Footer Newsletter",
              updatedAt: now,
            }
          : subscriber
      );

      localStorage.setItem(
        NEWSLETTER_STORAGE_KEY,
        JSON.stringify(updatedSubscribers)
      );

      setNewsletterEmail("");
      toast.success("Subscribed successfully");
      return;
    }

    const newSubscriber: NewsletterSubscriber = {
      id: `NEWS-${Date.now()}`,
      email,
      source: "Footer Newsletter",
      status: "Subscribed",
      subscribedAt: now,
      updatedAt: now,
    };

    localStorage.setItem(
      NEWSLETTER_STORAGE_KEY,
      JSON.stringify([newSubscriber, ...normalizedSubscribers])
    );

    setNewsletterEmail("");
    toast.success("Subscribed successfully");
  };

  return (
    <footer className="pf-footer">
      <style>{`
        .pf-footer {
          margin-top: 70px !important;
          background: #111111 !important;
          color: #ffffff !important;
          width: 100% !important;
          font-family: inherit !important;
        }

        .pf-trust-strip {
          background: #1b1b1b !important;
          border-bottom: 1px solid rgba(255,255,255,0.10) !important;
        }

        .pf-container {
          max-width: 1280px !important;
          margin: 0 auto !important;
          padding-left: 28px !important;
          padding-right: 28px !important;
        }

        .pf-trust-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 28px !important;
          padding-top: 26px !important;
          padding-bottom: 26px !important;
        }

        .pf-trust-item {
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
        }

        .pf-icon-box {
          width: 42px !important;
          height: 42px !important;
          border-radius: 999px !important;
          background: rgba(249,115,22,0.12) !important;
          border: 1px solid rgba(249,115,22,0.35) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #f97316 !important;
          flex-shrink: 0 !important;
        }

        .pf-trust-title {
          color: #ffffff !important;
          font-size: 14px !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
        }

        .pf-trust-text {
          color: #9ca3af !important;
          font-size: 12px !important;
          margin-top: 3px !important;
        }

        .pf-main {
          background: #111111 !important;
        }

        .pf-main-grid {
          display: grid !important;
          grid-template-columns: 1.5fr 0.8fr 0.9fr 0.95fr 1.25fr !important;
          gap: 52px !important;
          padding-top: 58px !important;
          padding-bottom: 58px !important;
          align-items: start !important;
        }

        .pf-brand {
          color: #ffffff !important;
          font-size: 34px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: -0.03em !important;
        }

        .pf-tagline {
          color: #f97316 !important;
          font-size: 14px !important;
          font-weight: 800 !important;
          margin-top: 8px !important;
        }

        .pf-description {
          color: #a3a3a3 !important;
          font-size: 14px !important;
          line-height: 1.75 !important;
          margin-top: 24px !important;
          max-width: 390px !important;
        }

        .pf-heading {
          color: #888888 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.18em !important;
          margin-bottom: 22px !important;
        }

        .pf-link-list {
          display: grid !important;
          gap: 14px !important;
        }

        .pf-link {
          color: #ffffff !important;
          font-size: 14px !important;
          font-weight: 750 !important;
          text-decoration: none !important;
          line-height: 1.3 !important;
          transition: color 0.2s ease, transform 0.2s ease !important;
          width: fit-content !important;
        }

        .pf-link:hover {
          color: #f97316 !important;
          transform: translateX(3px) !important;
        }

        .pf-contact {
          border-left: 1px solid rgba(255,255,255,0.10) !important;
          padding-left: 34px !important;
        }

        .pf-contact-list {
          display: grid !important;
          gap: 18px !important;
        }

        .pf-contact-item {
          display: flex !important;
          gap: 12px !important;
          align-items: flex-start !important;
        }

        .pf-contact-icon {
          color: #f97316 !important;
          margin-top: 3px !important;
          flex-shrink: 0 !important;
        }

        .pf-contact-main {
          color: #ffffff !important;
          font-size: 14px !important;
          font-weight: 800 !important;
          line-height: 1.4 !important;
        }

        .pf-contact-sub {
          color: #9ca3af !important;
          font-size: 12px !important;
          margin-top: 3px !important;
          line-height: 1.5 !important;
        }

        .pf-newsletter {
          margin-top: 30px !important;
        }

        .pf-newsletter-box {
          display: flex !important;
          overflow: hidden !important;
          border-radius: 10px !important;
          background: #ffffff !important;
          margin-top: 14px !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
        }

        .pf-newsletter-input {
          flex: 1 !important;
          border: none !important;
          outline: none !important;
          padding: 14px 15px !important;
          color: #111111 !important;
          font-size: 14px !important;
          background: #ffffff !important;
        }

        .pf-newsletter-input::placeholder {
          color: #6b7280 !important;
        }

        .pf-newsletter-button {
          border: none !important;
          background: #f97316 !important;
          color: #ffffff !important;
          padding: 0 18px !important;
          font-weight: 900 !important;
          cursor: pointer !important;
        }

        .pf-newsletter-button:hover {
          background: #ea580c !important;
        }

        .pf-action-strip {
          background: #191919 !important;
          border-top: 1px solid rgba(255,255,255,0.10) !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }

        .pf-action-row {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 22px !important;
          padding-top: 22px !important;
          padding-bottom: 22px !important;
        }

        .pf-action-links {
          display: flex !important;
          align-items: center !important;
          flex-wrap: wrap !important;
          gap: 14px !important;
        }

        .pf-action-link {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          color: #ffffff !important;
          text-decoration: none !important;
          font-size: 14px !important;
          font-weight: 850 !important;
          padding: 9px 12px !important;
          border-radius: 999px !important;
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          transition: all 0.2s ease !important;
        }

        .pf-action-link:hover {
          background: rgba(249,115,22,0.14) !important;
          border-color: rgba(249,115,22,0.38) !important;
          color: #f97316 !important;
        }

        .pf-action-link svg {
          color: #f97316 !important;
          flex-shrink: 0 !important;
        }

        .pf-payment-list {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }

        .pf-payment-badge {
          background: #ffffff !important;
          color: #111111 !important;
          border-radius: 6px !important;
          padding: 8px 13px !important;
          font-size: 12px !important;
          font-weight: 950 !important;
          min-width: 58px !important;
          text-align: center !important;
        }

        .pf-legal {
          background: #080808 !important;
        }

        .pf-legal-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 20px !important;
          padding-top: 18px !important;
          padding-bottom: 18px !important;
          color: #8b8b8b !important;
          font-size: 12px !important;
        }

        .pf-legal-links {
          display: flex !important;
          align-items: center !important;
          gap: 18px !important;
        }

        .pf-legal-link {
          color: #b5b5b5 !important;
          text-decoration: none !important;
          font-weight: 700 !important;
        }

        .pf-legal-link:hover {
          color: #ffffff !important;
        }

        @media (max-width: 1100px) {
          .pf-main-grid {
            grid-template-columns: 1.4fr 1fr 1fr !important;
          }

          .pf-contact {
            border-left: none !important;
            padding-left: 0 !important;
          }
        }

        @media (max-width: 760px) {
          .pf-container {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }

          .pf-trust-grid {
            grid-template-columns: 1fr !important;
          }

          .pf-main-grid {
            grid-template-columns: 1fr !important;
            gap: 34px !important;
            padding-top: 42px !important;
            padding-bottom: 42px !important;
          }

          .pf-action-row {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .pf-legal-row {
            align-items: flex-start !important;
            flex-direction: column !important;
          }
        }
      `}</style>

      <section className="pf-trust-strip">
        <div className="pf-container">
          <div className="pf-trust-grid">
            <div className="pf-trust-item">
              <div className="pf-icon-box">
                <Truck size={20} />
              </div>
              <div>
                <p className="pf-trust-title">Early Morning Delivery</p>
                <p className="pf-trust-text">Order before 9 PM</p>
              </div>
            </div>

            <div className="pf-trust-item">
              <div className="pf-icon-box">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="pf-trust-title">Fresh & Clean Packing</p>
                <p className="pf-trust-text">Quality checked items</p>
              </div>
            </div>

            <div className="pf-trust-item">
              <div className="pf-icon-box">
                <Package size={20} />
              </div>
              <div>
                <p className="pf-trust-title">Festival Ready Kits</p>
                <p className="pf-trust-text">For daily pooja & festivals</p>
              </div>
            </div>

            <div className="pf-trust-item">
              <div className="pf-icon-box">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="pf-trust-title">Secure Checkout</p>
                <p className="pf-trust-text">COD, UPI & bank transfer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pf-main">
        <div className="pf-container">
          <div className="pf-main-grid">
            <div>
              <Link href="/" className="inline-block">
                <h2 className="pf-brand">PujaFresh</h2>
                <p className="pf-tagline">Fresh Pooja Essentials</p>
              </Link>

              <p className="pf-description">
                Fresh flowers, pooja samagri, daily pooja packs, murtis and
                festival kits delivered early morning for your home mandir.
              </p>
            </div>

            <div>
              <h3 className="pf-heading">Company</h3>

              <div className="pf-link-list">
                <Link href="/" className="pf-link">
                  Home
                </Link>
                <Link href="/#products" className="pf-link">
                  All Products
                </Link>
                <Link href="/profile" className="pf-link">
                  My Profile
                </Link>
                 <Link href="/my-subscriptions" className="pf-link">
                 My Subscriptions
                </Link>
                <Link href="/orders" className="pf-link">
                  My Orders
                </Link>
                <Link href="/track-order" className="pf-link">
                  Track Order
                </Link>
                <Link href="/wishlist" className="pf-link">
                  Wishlist
                </Link>
                <Link href="/loyalty" className="pf-link">
                  Rewards
                </Link>
              </div>
            </div>

            <div>
              <h3 className="pf-heading">Categories</h3>

              <div className="pf-link-list">
                <Link href="/categories/fresh-flowers" className="pf-link">
                  Fresh Flowers
                </Link>

                <Link href="/categories/pooja-samagri" className="pf-link">
                  Pooja Samagri
                </Link>

                <Link href="/categories/daily-packs" className="pf-link">
                  Daily Packs
                </Link>

                <Link href="/categories/festival-kits" className="pf-link">
                  Festival Kits
                </Link>

                <Link href="/categories/murtis" className="pf-link">
                  Murtis
                </Link>

                <Link href="/subscriptions" className="pf-link">
                 Subscriptions
                 </Link>
              </div>
            </div>

            <div>
              <h3 className="pf-heading">Help & Policy</h3>

              <div className="pf-link-list">
                <Link href="/cart" className="pf-link">
                  Cart
                </Link>

                <Link href="/checkout" className="pf-link">
                  Checkout
                </Link>

                <Link href="/faq" className="pf-link">
                  FAQ
                </Link>

                <Link href="/support" className="pf-link">
                  Support Tickets
                </Link>

                <Link href="/policies/shipping-policy" className="pf-link">
                  Shipping Policy
                </Link>

                <Link href="/policies/cancellation-policy" className="pf-link">
                  Cancellation Policy
                </Link>

                <Link href="/policies/terms-and-conditions" className="pf-link">
                  Terms & Conditions
                </Link>

                <Link href="/policies/privacy-policy" className="pf-link">
                  Privacy Policy
                </Link>
              </div>
            </div>

            <div className="pf-contact">
              <h3 className="pf-heading">Contact</h3>

              <div className="pf-contact-list">
                <div className="pf-contact-item">
                  <Phone size={17} className="pf-contact-icon" />
                  <div>
                    <p className="pf-contact-main">+91 99999 99999</p>
                    <p className="pf-contact-sub">Customer support</p>
                  </div>
                </div>

                <div className="pf-contact-item">
                  <Mail size={17} className="pf-contact-icon" />
                  <div>
                    <p className="pf-contact-main">support@pujafresh.com</p>
                    <p className="pf-contact-sub">Email support</p>
                  </div>
                </div>

                <div className="pf-contact-item">
                  <MapPin size={17} className="pf-contact-icon" />
                  <p className="pf-contact-sub">
                    Delhi NCR delivery available in selected local service
                    areas.
                  </p>
                </div>
              </div>

              <div className="pf-newsletter">
                <h4 className="pf-heading">Subscribe For Offers</h4>

                <form
                  onSubmit={handleNewsletterSubmit}
                  className="pf-newsletter-box"
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(event) => setNewsletterEmail(event.target.value)}
                    placeholder="Enter email address"
                    className="pf-newsletter-input"
                  />
                  <button type="submit" className="pf-newsletter-button">
                    Join
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pf-action-strip">
        <div className="pf-container">
          <div className="pf-action-row">
            <div className="pf-action-links">
              <Link href="/profile" className="pf-action-link">
                <User size={16} />
                Account
              </Link>

              <Link href="/orders" className="pf-action-link">
                <Package size={16} />
                Orders
              </Link>

              <Link href="/track-order" className="pf-action-link">
                <Truck size={16} />
                Track Order
              </Link>

              <Link href="/wishlist" className="pf-action-link">
                <Heart size={16} />
                Wishlist
              </Link>

              <Link href="/cart" className="pf-action-link">
                <ShoppingCart size={16} />
                Cart
              </Link>

              <Link href="/support" className="pf-action-link">
                <MessageCircle size={16} />
                Support
              </Link>

              <Link href="/faq" className="pf-action-link">
                <HelpCircle size={16} />
                FAQ
              </Link>

              <Link href="/loyalty" className="pf-action-link">
                <Gift size={16} />
                Rewards
              </Link>
            </div>

            <div className="pf-payment-list">
              <span className="pf-payment-badge">COD</span>
              <span className="pf-payment-badge">UPI</span>
              <span className="pf-payment-badge">BANK</span>
              <span className="pf-payment-badge">SECURE</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pf-legal">
        <div className="pf-container">
          <div className="pf-legal-row">
            <p>
              © {currentYear} PujaFresh. All rights reserved. Fresh pooja
              essentials delivery platform.
            </p>

            <div className="pf-legal-links">
              <a href="https://pujafresh.com" className="pf-legal-link">
                <Globe size={13} style={{ display: "inline", marginRight: 5 }} />
                Website
              </a>

              <Link href="/support" className="pf-legal-link">
                Support
              </Link>

              <Link href="/admin/login" className="pf-legal-link">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}