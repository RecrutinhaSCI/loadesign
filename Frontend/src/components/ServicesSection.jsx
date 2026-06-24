import { useEffect, useRef, useState } from "react";

function useRevealDelay(delay = 0, threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(36px)";
    el.style.transition = `opacity 0.85s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.85s cubic-bezier(.22,1,.36,1) ${delay}ms`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);
  return ref;
}

const services = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
    title: "Criação de Artes",
    subtitle: "Posts & Stories",
    description:
      "Artes únicas e personalizadas para feed, stories, reels e banners. Design que reflete a identidade da sua marca e engaja seu público.",
    tags: ["Feed", "Stories", "Banners", "Reels"],
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    title: "Edição de Vídeos",
    subtitle: "Reels & Conteúdo",
    description:
      "Edição profissional de vídeos para reels, stories e campanhas. Conteúdo dinâmico com transições suaves e trilha sonora estratégica.",
    tags: ["Reels", "Shorts", "Transições", "Motion"],
  },

  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: "Gestão de Redes",
    subtitle: "Instagram & Redes",
    description:
      "Planejamento, criação e publicação de conteúdo estratégico para Instagram e demais redes. Consistência que gera engajamento e crescimento.",
    tags: ["Planejamento", "Calendário", "Publicação", "Métricas"],
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="10" />
        <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
      </svg>
    ),
    title: "Design Estratégico",
    subtitle: "Conversão & Resultado",
    description:
      "Design pensado para converter. Cada elemento visual é criado com propósito: atrair, engajar e transformar seguidores em clientes.",
    tags: ["Conversão", "CTA", "Engajamento", "ROI"],
  },
];

function ServiceCard({ service, index }) {
  const ref = useRevealDelay(index * 100, 0.1);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      className="relative p-8 rounded-[3px] cursor-default transition-all duration-500"
      style={{
        background: hovered ? "#B08B7D" : "#fff",
        boxShadow: hovered
          ? "0 24px 60px rgba(176,139,125,0.25)"
          : "0 2px 20px rgba(176,139,125,0.08)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Number */}
      <span
        className="absolute top-6 right-7 text-[11px] tracking-[0.22em] font-light transition-colors duration-300"
        style={{
          fontFamily: "'Jost', sans-serif",
          color: hovered ? "rgba(255,255,255,0.45)" : "#d4bab0",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Icon */}
      <div
        className="mb-7 transition-colors duration-300"
        style={{ color: hovered ? "rgba(255,255,255,0.9)" : "#B08B7D" }}
      >
        {service.icon}
      </div>

      {/* Subtitle */}
      <p
        className="text-[10px] tracking-[0.3em] uppercase mb-2 transition-colors duration-300"
        style={{
          fontFamily: "'Jost', sans-serif",
          color: hovered ? "rgba(255,255,255,0.65)" : "#c4a898",
        }}
      >
        {service.subtitle}
      </p>

      {/* Title */}
      <h3
        className="text-[1.25rem] font-light mb-4 transition-colors duration-300"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          color: hovered ? "#fff" : "#3d2b24",
        }}
      >
        {service.title}
      </h3>

      {/* Description */}
      <p
        className="text-[13px] leading-[1.85] font-light mb-7 transition-colors duration-300"
        style={{
          fontFamily: "'Jost', sans-serif",
          color: hovered ? "rgba(255,255,255,0.75)" : "#9a7d76",
        }}
      >
        {service.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {service.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 text-[9px] tracking-[0.18em] uppercase font-medium rounded-full transition-all duration-300"
            style={{
              fontFamily: "'Jost', sans-serif",
              background: hovered ? "rgba(255,255,255,0.15)" : "rgba(176,139,125,0.09)",
              color: hovered ? "rgba(255,255,255,0.85)" : "#B08B7D",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ServicesSection() {
  const tagRef = useRevealDelay(0);
  const headRef = useRevealDelay(120);
  const subRef = useRevealDelay(240);

  return (
    <section
      id="serviços"
      className="relative overflow-hidden py-28 md:py-40"
      style={{ background: "#f5ede7" }}
    >
      {/* Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #8a6e65 0px, transparent 1px, transparent 40px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-20">
          <div ref={tagRef} className="inline-flex items-center gap-3 mb-8">
            <span className="w-8 h-px" style={{ background: "#B08B7D" }} />
            <span
              className="text-[10px] tracking-[0.38em] uppercase font-medium"
              style={{ color: "#B08B7D", fontFamily: "'Jost', sans-serif" }}
            >
              O que fazemos
            </span>
            <span className="w-8 h-px" style={{ background: "#B08B7D" }} />
          </div>

          <h2
            ref={headRef}
            className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.1] mb-6"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#3d2b24" }}
          >
            Serviços feitos para<br />
            <em className="not-italic" style={{ color: "#B08B7D" }}>transformar</em> sua marca.
          </h2>

          <p
            ref={subRef}
            className="text-[15px] leading-[1.85] font-light max-w-xl mx-auto"
            style={{ color: "#7a5e57", fontFamily: "'Jost', sans-serif" }}
          >
            Do design estratégico à gestão completa de conteúdo — tudo que sua marca precisa para se destacar no digital.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {services.map((service, i) => (
            <ServiceCard key={service.title} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
