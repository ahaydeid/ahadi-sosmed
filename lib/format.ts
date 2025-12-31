export function formatRelativeTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit`;
  if (diffHours < 24) return `${diffHours} jam`;
  if (diffDays < 30) return `${diffDays} hari`;
  if (diffMonths < 12) return `${diffMonths} bulan`;
  return `${diffYears} tahun`;
}

export function getRandomColor(seed: string): string {
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
}

export function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return "U";
  if (p.length === 1) return p[0].slice(0, 1).toUpperCase();
  return (p[0].slice(0, 1) + p[p.length - 1].slice(0, 1)).toUpperCase();
}
