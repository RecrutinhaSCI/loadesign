/**
 * App.jsx — Loa Design Digital | Landing Page Completa
 * ─────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
// Ajuste dos caminhos de importação para a estrutura correta:
import { SEO } from "./components/SEO";
import { useFadeIn } from "./hooks/useReveal";
import { colors, fonts, whatsappLink, INSTAGRAM_URL } from "./utils/design.jsx";

import AboutSection        from "./components/AboutSection";
import ServicesSection     from "./components/ServicesSection";
import HowItWorksSection   from "./components/HowItWorksSection";
import PackagesSection     from "./components/PackagesSection";
import ContactSection      from "./components/ContactSection";
import Footer              from "./components/Footer";

// ─── Smooth scroll helper ──────────────────────────────────────────────────
function scrollTo(id, offset = 80) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - offset,
    behavior: "smooth",
  });
}

// ─── Nav config ───────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Sobre",         id: "sobre" },
  { label: "Serviços",      id: "serviços" },
  { label: "Como Funciona", id: "como-funciona" },
  { label: "Pacotes",       id: "pacotes" },
  { label: "Contato",       id: "contato" },
];

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleNav = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    scrollTo(id);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(253,248,245,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? `0 1px 24px ${colors.primary}14` : "none",
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-20">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="flex flex-col leading-none select-none"
        >
          <span className="text-2xl tracking-[0.18em] font-light"
            style={{ fontFamily: fonts.display, color: colors.primary }}>LOA</span>
          <span className="text-[10px] tracking-[0.23em] uppercase font-light"
            style={{ color: colors.primaryLt, fontFamily: fonts.body }}>DESIGN DIGITAL</span>
        </a>

        <ul className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map(({ label, id }) => (
            <li key={id}>
              <a href={`#${id}`} onClick={(e) => handleNav(e, id)}
                className="text-[12px] tracking-[0.18em] uppercase font-light transition-colors duration-300"
                style={{ color: "#8a6e65", fontFamily: fonts.body }}
                onMouseEnter={(e) => (e.target.style.color = colors.primary)}
                onMouseLeave={(e) => (e.target.style.color = "#8a6e65")}>
                {label}
              </a>
            </li>
          ))}
        </ul>

        <a href={whatsappLink("Olá! Gostaria de saber mais sobre os serviços da Loa Design Digital.")}
          target="_blank" rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 text-[11px] tracking-[0.22em] uppercase font-medium border transition-all duration-300"
          style={{ fontFamily: fonts.body, color: colors.primary, borderColor: colors.primary, borderRadius: "2px" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.primary; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.primary; }}>
          Fale Conosco
        </a>

        <button className="md:hidden flex flex-col gap-1.25 p-2"
          onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-px transition-all duration-300"
              style={{
                background: colors.primary,
                width: i === 1 ? "16px" : "24px",
                opacity: i === 1 && menuOpen ? 0 : 1,
                transform: i === 0 && menuOpen ? "rotate(45deg) translate(4px,4px)"
                        : i === 2 && menuOpen ? "rotate(-45deg) translate(4px,-4px)"
                        : "none",
              }} />
          ))}
        </button>
      </nav>

      <div className="md:hidden overflow-hidden transition-all duration-500"
        style={{ maxHeight: menuOpen ? "360px" : "0" }}>
        <div className="bg-[#fdf8f5]/98 backdrop-blur-md px-6 pb-7 flex flex-col gap-5 pt-2">
          {NAV_LINKS.map(({ label, id }) => (
            <a key={id} href={`#${id}`}
              className="text-[12px] tracking-[0.22em] uppercase font-light"
              style={{ color: "#8a6e65", fontFamily: fonts.body }}
              onClick={(e) => handleNav(e, id)}>{label}</a>
          ))}
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
            className="mt-2 text-center py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
            style={{ color: colors.primary, borderColor: colors.primary, fontFamily: fonts.body, borderRadius: "2px" }}>
            Fale Conosco
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function HeroSection() {
  const tagRef    = useFadeIn(200);
  const h1Ref     = useFadeIn(400);
  const subRef    = useFadeIn(580);
  const btnRef    = useFadeIn(760);
  const socialRef = useFadeIn(940);
  const imgRef    = useFadeIn(280);

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fdf8f5 0%, #f5ede7 55%, #ede0d9 100%)" }}>

      <div className="absolute -top-30 -right-30 w-130 h-130 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${colors.primary}16 0%, transparent 70%)`, filter: "blur(2px)" }} />
      <div className="absolute -bottom-20 -left-20 w-95 h-95 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${colors.primaryLt}14 0%, transparent 70%)` }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,#8a6e65 0px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#8a6e65 0px,transparent 1px,transparent 60px)" }} />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full py-32 md:py-0 grid md:grid-cols-2 gap-16 items-center min-h-screen">
        <div className="flex flex-col justify-center">
          <div ref={tagRef} className="inline-flex items-center gap-2 mb-8 self-start">
            <span className="w-8 h-px" style={{ background: colors.primary }} />
            <span className="text-[10px] tracking-[0.38em] uppercase font-medium"
              style={{ color: colors.primary, fontFamily: fonts.body }}>Agência de Marketing Digital</span>
          </div>

          <h1 ref={h1Ref}
            className="text-[clamp(2.6rem,6vw,4.8rem)] font-light leading-[1.08] tracking-[-0.01em] mb-7"
            style={{ fontFamily: fonts.display, color: colors.ink }}>
            Sua marca merece<br />
            <em className="not-italic" style={{ color: colors.primary }}>brilhar</em> no digital.
          </h1>

          <p ref={subRef} className="text-[15px] leading-[1.85] font-light max-w-105 mb-10"
            style={{ color: colors.inkMid, fontFamily: fonts.body }}>
            Design estratégico e conteúdo visual que transforma seguidores em clientes reais. Crescendo junto com você.
          </p>

          <div ref={btnRef} className="flex flex-col sm:flex-row gap-4 mb-14">
            <a href={whatsappLink("Olá! Tenho interesse nos serviços da Loa Design Digital.")}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium transition-all duration-300"
              style={{ background: colors.primary, color: "#fff", borderRadius: "2px", fontFamily: fonts.body, boxShadow: `0 8px 32px ${colors.primary}30` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.primaryDk; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.primary; e.currentTarget.style.transform = "translateY(0)"; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Quero começar agora
            </a>

            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium border transition-all duration-300"
              style={{ color: colors.primary, borderColor: colors.primary, borderRadius: "2px", fontFamily: fonts.body }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${colors.primary}0A`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
              Ver portfólio
            </a>
          </div>

        </div>

        {/* Visual card */}
        <div ref={imgRef} className="hidden md:flex items-center justify-center relative">
          <div className="relative w-85 rounded-[3px] overflow-hidden"
            style={{ boxShadow: `0 32px 80px ${colors.primary}28, 0 8px 32px rgba(0,0,0,0.06)` }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: colors.primary }}>
              <span className="text-white text-[12px] tracking-[0.22em] uppercase font-light"
                style={{ fontFamily: fonts.body }}>Loa Design Digital</span>
              <div className="flex gap-1.5">
                {["rgba(255,255,255,0.3)","rgba(255,255,255,0.5)","rgba(255,255,255,0.8)"].map((c,i)=>(
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="px-6 py-8" style={{ background: colors.bg }}>
              <div className="mb-6 rounded-xs overflow-hidden aspect-square flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${colors.bgDeep} 0%, ${colors.primaryLt} 100%)` }}>
                <div className="text-center">
                  <div className="text-3xl font-light mb-1" style={{ fontFamily: fonts.display, color: "#fff" }}>Sua marca,</div>
                  <div className="text-3xl font-light" style={{ fontFamily: fonts.display, color: "rgba(255,255,255,0.75)" }}>seu impacto.</div>
                </div>
              </div>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-[10px] tracking-[0.22em] uppercase font-medium transition-all duration-300"
                style={{ background: colors.primary, color: "#fff", borderRadius: "2px", fontFamily: fonts.body }}
                onMouseEnter={(e)=>(e.currentTarget.style.background=colors.primaryDk)}
                onMouseLeave={(e)=>(e.currentTarget.style.background=colors.primary)}>
                Falar no WhatsApp ↗
              </a>
            </div>
          </div>
          <div className="absolute -top-5 -right-1 bg-white px-4 py-2.5 rounded-xs flex items-center gap-2"
            style={{ boxShadow: `0 8px 28px ${colors.primary}20`, animation: "floatBadge 3.5s ease-in-out infinite" }}>
            <span style={{ fontSize: "16px" }}>🚀</span>
            <div>
              <p className="text-[10px] font-medium tracking-[0.06em]" style={{ color: colors.ink, fontFamily: fonts.body }}>Crescendo junto</p>
              <p className="text-[9px]" style={{ color: colors.inkLight, fontFamily: fonts.body }}>com você</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-6 bg-white px-4 py-2.5 rounded-xs"
            style={{ boxShadow: `0 8px 28px ${colors.primary}20`, animation: "floatBadge 4s ease-in-out infinite reverse" }}>
            <p className="text-[10px] tracking-[0.08em] font-medium" style={{ color: colors.primary, fontFamily: fonts.body }}>✦ Design Premium</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ animation: "scrollBounce 2s ease-in-out infinite" }}>
        <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: colors.primary, fontFamily: fonts.body }}>Scroll</span>
        <div className="w-px h-8" style={{ background: `linear-gradient(to bottom, ${colors.primary}, transparent)` }} />
      </div>

      <style>{`
        @keyframes floatBadge   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-8px)} }
        @keyframes scrollBounce { 0%,100%{opacity:.5;transform:translateX(-50%) translateY(0)} 50%{opacity:1;transform:translateX(-50%) translateY(6px)} }
      `}</style>
    </section>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <SEO />
      <div className="antialiased" style={{ background: colors.bg }}>
        <Navbar />
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <HowItWorksSection />
        <PackagesSection />
        <ContactSection />
        <Footer />
      </div>
    </>
  );
}