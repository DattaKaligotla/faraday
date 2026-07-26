const palette = {
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
} as const;

interface AlertBannerProps {
  message?: string;
  variant?: keyof typeof palette;
}

export function AlertBanner({ message = "This is an alert.", variant = "info" }: AlertBannerProps) {
  const c = palette[variant];
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: 8,
        padding: "12px 16px",
        fontWeight: 500,
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}
