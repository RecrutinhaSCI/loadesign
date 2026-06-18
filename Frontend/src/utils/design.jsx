// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — single source of truth for the Loa Design brand
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  primary:    "#B08B7D",
  primaryDk:  "#9a7568",
  primaryLt:  "#c4a898",
  bg:         "#fdf8f5",
  bgAlt:      "#f5ede7",
  bgDeep:     "#ede0d9",
  ink:        "#3d2b24",
  inkMid:     "#7a5e57",
  inkLight:   "#9a7d76",
  border:     "#e8d8d1",
  borderSoft: "#f0e4df",
  darkBg:     "#3d2b24",
};

export const fonts = {
  display: "'Cormorant Garamond', serif",
  body:    "'Jost', sans-serif",
};

// ─── Reusable section header component ───────────────────────────────────────
export function SectionTag({ children, ref: forwardRef }) {
  return (
    <div className="inline-flex items-center gap-3 mb-8">
      <span className="w-8 h-px" style={{ background: colors.primary }} />
      <span
        className="text-[10px] tracking-[0.38em] uppercase font-medium"
        style={{ color: colors.primary, fontFamily: fonts.body }}
      >
        {children}
      </span>
      <span className="w-8 h-px" style={{ background: colors.primary }} />
    </div>
  );
}

export function SectionHeading({ children, style }) {
  return (
    <h2
      className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.1] mb-6"
      style={{ fontFamily: fonts.display, color: colors.ink, ...style }}
    >
      {children}
    </h2>
  );
}

export function SectionSubtext({ children, className = "" }) {
  return (
    <p
      className={`text-[15px] leading-[1.85] font-light ${className}`}
      style={{ color: colors.inkMid, fontFamily: fonts.body }}
    >
      {children}
    </p>
  );
}

// ─── WhatsApp CTA link ────────────────────────────────────────────────────────
export const WHATSAPP_NUMBER = "5554999912694"; // ← substituir pelo número real
export const INSTAGRAM_URL   = "https://instagram.com/loa.ddigital/"; // ← substituir
export const EMAIL           = "loadesigndigital@gmail.com"; // ← substituir

export function whatsappLink(msg = "") {
  return `https://wa.me/${WHATSAPP_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}
