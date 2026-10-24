import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padel Americano",
  description: "Poäng och statistik för våra Americano-kvällar",
  applicationName: "Padel Americano",
  // Startad från hemskärmen på iPhone: helskärm utan Safaris adressfält.
  // Statusraden blir genomskinlig med vit text ovanpå den blå sidhuvudet.
  appleWebApp: {
    capable: true,
    title: "Padel",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#112c50",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
