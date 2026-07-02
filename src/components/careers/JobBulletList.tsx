type JobBulletListProps = {
  items: string[];
};

export function JobBulletList({ items }: JobBulletListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-7 text-foreground/90">
          <span
            aria-hidden
            className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-career-accent"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
