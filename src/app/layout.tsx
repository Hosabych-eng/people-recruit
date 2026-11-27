import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProviders } from "@/components/auth/AuthProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PeopleRecruit | Простір для рекрутингу",
    template: "%s | PeopleRecruit",
  },
  description:
    "Система управління наймом: воронка кандидатів, вакансії та аналітика персоналу",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}
