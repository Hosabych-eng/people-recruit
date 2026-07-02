import type { Metadata } from "next";
import { CareersHeader } from "@/components/careers/CareersHeader";
import "./careers.css";

export const metadata: Metadata = {
  title: "Careers | PeopleRecruit",
  description: "Open positions and career opportunities",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="careers-theme min-h-screen bg-background text-foreground">
      <CareersHeader />
      {children}
    </div>
  );
}
