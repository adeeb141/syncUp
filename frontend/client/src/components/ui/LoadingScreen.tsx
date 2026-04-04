export const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface">
      <div className="relative h-14 w-14 animate-[fadeIn_0.5s_ease_both]">
        <div className="absolute inset-0 rounded-full border-[3px] border-surface-container-high" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-r-primary border-t-tertiary animate-[spin_1s_linear_infinite]" />
      </div>
      <span className="font-headline animate-[fadeIn_0.5s_ease_0.2s_both] text-[0.94rem] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
        SyncUp
      </span>
    </div>
  );
};
