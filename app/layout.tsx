import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import RegisterSW from "./register-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STOCK-HUB — Gestion de stock",
  description:
    "Plateforme ultramoderne de gestion de stock, ventes et facturation multi-entreprise.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STOCK-HUB",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Le zoom pincé reste permis : exigence d'accessibilité (WCAG 1.4.4)
  maximumScale: 5,
  userScalable: true,
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <RegisterSW />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
