import type { HTMLAttributes, ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3;

const levelStyles: Record<HeadingLevel, string> = {
  1: "text-2xl font-bold tracking-tight text-foreground",
  2: "text-lg font-semibold text-foreground",
  3: "text-sm font-semibold text-foreground",
};

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: HeadingLevel;
  children: ReactNode;
  subtitle?: ReactNode;
};

export function Heading({
  level = 1,
  children,
  subtitle,
  className = "",
  ...props
}: HeadingProps) {
  const Tag = (`h${level}` as const) satisfies `h${HeadingLevel}`;

  return (
    <div className={className}>
      <Tag className={levelStyles[level]} {...props}>
        {children}
      </Tag>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
