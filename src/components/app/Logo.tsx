export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid size-8 place-items-center rounded-lg bg-brand text-primary-foreground shadow-card">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 17l5-6 4 3 7-9" />
          <circle cx="20" cy="5" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <span className="font-display text-base font-semibold tracking-tight">
        UTMify <span className="text-brand">Angola</span>
      </span>
    </div>
  );
}
