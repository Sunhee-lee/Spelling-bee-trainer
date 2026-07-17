import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://spelling-bee-evan.vercel.app";
const KO_DESCRIPTION = "뜻을 보고 영어 단어를 말하고 스펠링을 연습하는 어린이용 학습 앱";
const EN_DESCRIPTION = "A friendly spelling practice app for young learners.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Spelling Bee",
  title: {
    default: "Spelling Bee",
    template: "%s · Spelling Bee",
  },
  description: KO_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Spelling Bee",
    statusBarStyle: "default",
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    siteName: "Spelling Bee",
    title: "Spelling Bee",
    description: KO_DESCRIPTION,
    url: SITE_URL,
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spelling Bee",
    description: EN_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FDE68A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
