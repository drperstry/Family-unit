import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/context/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "FamilyHub - Connect, Share, Preserve",
    template: "%s | FamilyHub",
  },
  description: "A private, secure platform for families to connect, share memories, and preserve their heritage for generations.",
  keywords: ["family", "family tree", "genealogy", "memories", "photos", "events"],
  authors: [{ name: "FamilyHub" }],
  creator: "FamilyHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://familyhub.com",
    siteName: "FamilyHub",
    title: "FamilyHub - Connect, Share, Preserve",
    description: "A private, secure platform for families to connect, share memories, and preserve their heritage.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FamilyHub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FamilyHub - Connect, Share, Preserve",
    description: "A private, secure platform for families to connect, share memories, and preserve their heritage.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
