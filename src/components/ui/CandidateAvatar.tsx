import { getAvatarColors, getInitials } from "@/lib/avatar-colors";

type CandidateAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-9 w-9 text-xs",
  md: "h-14 w-14 text-lg",
  lg: "h-16 w-16 text-xl",
} as const;

export function CandidateAvatar({
  name,
  avatarUrl,
  seed,
  size = "sm",
  className = "",
}: CandidateAvatarProps) {
  const colors = getAvatarColors(seed ?? name);
  const sizeClass = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${colors.bg} ${colors.text} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
