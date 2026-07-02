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
  title: "PeopleRecruit | HR Workspace",
  description: "Recruiting pipeline and workforce insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}
