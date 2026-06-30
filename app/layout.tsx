import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";
import "./globals.css";
import AnnouncementBar from "@/components/AnnouncementBar";

export const metadata: Metadata = {
  title: "PujaFresh | Fresh Pooja Essentials Delivered Every Morning",
  description:
    "Order fresh flowers, pooja samagri, festival kits and murtis online. Get early morning delivery at affordable prices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AnnouncementBar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
