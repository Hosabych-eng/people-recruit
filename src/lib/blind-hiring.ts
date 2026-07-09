export function maskCandidateName(name: string, candidateId: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `ID ${candidateId.slice(0, 6)}`;
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return `Candidate ${initials}`;
}

export function maskCandidateId(candidateId: string) {
  return candidateId.slice(0, 8).toUpperCase();
}
