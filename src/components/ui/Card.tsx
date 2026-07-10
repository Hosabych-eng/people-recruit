import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "section" | "article" | "div";
};

export function Card({ children, className = "", as: Tag = "section", ...props }: CardProps) {
  return (
    <Tag
      className={`rounded-xl border border-border bg-card shadow-sm ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

type CardSectionProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardHeader({ children, className = "", ...props }: CardSectionProps) {
  return (
    <div className={`border-b border-border px-5 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "", ...props }: CardSectionProps) {
  return (
    <div className={`px-5 py-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
