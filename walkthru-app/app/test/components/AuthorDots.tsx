const PALETTE = [
  "bg-amber-400",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-cyan-400",
  "bg-lime-400",
  "bg-fuchsia-400",
  "bg-orange-400",
  "bg-teal-400",
];

export function authorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function AuthorDots({ authors }: { authors: string[] }) {
  const shown = authors.slice(0, 7);
  const extra = authors.length - shown.length;
  return (
    <div className="flex items-center gap-1">
      {shown.map((a, i) => (
        <span
          key={`${a}-${i}`}
          className={`w-1.5 h-1.5 rounded-full ${authorColor(a)}`}
          title={a}
        />
      ))}
      {extra > 0 && (
        <span className="text-[9px] text-gray-400 ml-0.5">+{extra}</span>
      )}
    </div>
  );
}
