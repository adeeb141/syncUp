export const LoadingScreen = () => {
  return (
    <div className="sync-shell flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="relative h-14 w-14 animate-[fadeIn_0.5s_ease_both]">
        <div className="absolute inset-0 rounded-full border-[3px] border-[color:var(--surface-border)]" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-r-[color:var(--accent-solid)] border-t-[color:#5c8eab] animate-[spin_1s_linear_infinite]" />
      </div>
      <span className="sync-title animate-[fadeIn_0.5s_ease_0.2s_both] text-[0.94rem] uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">
        SyncUp
      </span>
    </div>
  );
};
