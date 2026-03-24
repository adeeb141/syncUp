"use client";
import React, { useEffect, useRef, useState } from "react";
import { useNotificationStore } from "@/stores/notificationStore";

/* ─── Icons ─────────────────────────────────────────────────────────── */
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const ErrorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const WarnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ─── Per-type config — all proper React.CSSProperties objects ────────── */
type TypeConfig = {
  icon: React.ReactElement;
  iconColor: string;
  stripeStyle: React.CSSProperties;
  timerStyle: React.CSSProperties;
  bgColor: string;
  borderColor: string;
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  success: {
    icon: <CheckIcon />,
    iconColor: "#2a8a5e",
    stripeStyle: { background: "linear-gradient(180deg, #2a8a5e, #3db87f)" },
    timerStyle: { background: "linear-gradient(90deg, #2a8a5e, #3db87f)" },
    bgColor: "color-mix(in oklab, #2a8a5e 10%, var(--surface-1))",
    borderColor: "color-mix(in oklab, #2a8a5e 30%, var(--surface-border))",
  },
  error: {
    icon: <ErrorIcon />,
    iconColor: "var(--destructive)",
    stripeStyle: { background: "var(--destructive)" },
    timerStyle: { background: "var(--destructive)" },
    bgColor: "color-mix(in oklab, var(--destructive) 10%, var(--surface-1))",
    borderColor: "color-mix(in oklab, var(--destructive) 30%, var(--surface-border))",
  },
  warning: {
    icon: <WarnIcon />,
    iconColor: "#b88a2e",
    stripeStyle: { background: "linear-gradient(180deg, #b88a2e, #e0b04a)" },
    timerStyle: { background: "linear-gradient(90deg, #b88a2e, #e0b04a)" },
    bgColor: "color-mix(in oklab, #b88a2e 10%, var(--surface-1))",
    borderColor: "color-mix(in oklab, #b88a2e 30%, var(--surface-border))",
  },
  info: {
    icon: <InfoIcon />,
    iconColor: "var(--accent-solid)",
    stripeStyle: { background: "var(--accent-gradient)" },
    timerStyle: { background: "var(--accent-gradient)" },
    bgColor: "color-mix(in oklab, var(--accent-solid) 10%, var(--surface-1))",
    borderColor: "color-mix(in oklab, var(--accent-solid) 30%, var(--surface-border))",
  },
};

const DURATION = 4000;

/* ─── Single Toast ───────────────────────────────────────────────────── */
function Toast({ id, message, type }: { id: string; message: string; type: string }) {
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => removeNotification(id), 340);
  };

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        position: "relative",
        overflow: "hidden",
        paddingTop: "0.85rem",
        paddingBottom: "0.85rem",
        paddingLeft: "1.1rem",
        paddingRight: "0.9rem",
        borderRadius: "var(--radius)",
        border: `1px solid ${cfg.borderColor}`,
        background: cfg.bgColor,
        boxShadow: "var(--shadow-soft)",
        backdropFilter: "blur(16px)",
        minWidth: "300px",
        maxWidth: "380px",
        cursor: "default",
        animation: exiting
          ? "toastSlideOut 340ms cubic-bezier(0.4,0,1,1) forwards"
          : "toastSlideIn 360ms cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {/* Left colour stripe */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "3.5px",
        height: "100%",
        ...cfg.stripeStyle,
      }} />

      {/* Icon */}
      <span style={{ flexShrink: 0, marginTop: "1px", color: cfg.iconColor, display: "flex" }}>
        {cfg.icon}
      </span>

      {/* Message */}
      <p style={{
        flex: 1,
        margin: 0,
        fontSize: "0.875rem",
        lineHeight: 1.55,
        fontWeight: 500,
        color: "var(--text-primary)",
        wordBreak: "break-word",
      }}>
        {message}
      </p>

      {/* Close button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          marginTop: "1px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "22px",
          height: "22px",
          borderRadius: "6px",
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          transition: "background 160ms ease, color 160ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklab, var(--text-muted) 14%, transparent)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
        }}
      >
        <CloseIcon />
      </button>

      {/* Timer shrink bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: "2.5px",
        width: "100%",
        opacity: 0.6,
        transformOrigin: "left",
        animation: `toastTimer ${DURATION}ms linear forwards`,
        ...cfg.timerStyle,
      }} />
    </div>
  );
}

/* ─── Keyframes (injected once) ──────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(28px) scale(0.96); }
    to   { opacity: 1; transform: translateX(0)    scale(1);    }
  }
  @keyframes toastSlideOut {
    from { opacity: 1; transform: translateX(0)    scale(1);    }
    to   { opacity: 0; transform: translateX(32px)  scale(0.95); }
  }
  @keyframes toastTimer {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }
`;

/* ─── Container ──────────────────────────────────────────────────────── */
export const NotificationToast = () => {
  const notifications = useNotificationStore((s) => s.notifications);

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        alignItems: "flex-end",
        pointerEvents: notifications.length ? "auto" : "none",
      }}>
        {notifications.map((n) => (
          <Toast key={n.id} id={n.id} message={n.message} type={n.type} />
        ))}
      </div>
    </>
  );
};
