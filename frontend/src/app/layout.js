import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Eona Empire Hair",
  description:
    "Premium Ghana-first hair commerce for wigs, bundles, closures, and care essentials.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=5", sizes: "64x64" },
      { url: "/eona-purple-crown-v5.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=5",
    apple: "/apple-icon.png?v=5",
  },
  openGraph: {
    title: "Eona Empire Hair",
    description:
      "Premium Ghana-first hair commerce for wigs, bundles, closures, and care essentials.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
