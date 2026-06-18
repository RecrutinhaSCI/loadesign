import { useState } from "react";
import { useRevealDelay } from "../hooks/useReveal";
import { colors, fonts, whatsappLink } from "../utils/design";

// ─── Step data ────────────────────────────────────────────────────────────────
const steps = [
  {
    number: "01",
    title: "Contato Inicial",
    shortTitle: "Contato",
    description:
      "Você nos envia uma mensagem pelo WhatsApp ou formulário. Agendamos uma conversa rápida para entender seu negócio, seus objetivos e onde você quer chegar.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Briefing Estratégico",
    shortTitle: "Briefing",
    description:
      "Mergulhamos fundo na sua marca: público-alvo, tom de voz, referências visuais e metas de crescimento. Daqui nasce a estratégia que guia cada entrega.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Criação do Conteúdo",
    shortTitle: "Criação",
    description:
      "Nossa equipe criativa entra em ação. Desenvolvemos artes, vídeos e estratégia de conteúdo com atenção obsessiva a cada detalhe visual da sua marca.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Aprovação & Ajustes",
    shortTitle: "Aprovação",
    description:
      "Enviamos tudo para sua revisão. Você aprova, pede ajustes ou solicita alterações — trabalhamos até o conteúdo estar exatamente como você imaginou.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    number: "05",
    title: "Entrega & Acompanhamento",
    shortTitle: "Entrega",
    description:
      "Conteúdo aprovado, entregamos tudo organizado e pronto para publicar. Continuamos ao seu lado monitorando resultados e refinando a estratégia.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

// ─── Single step card ─────────────────────────────────────────────────────────
function StepCard({ step, index, isLast }) {
  const ref = useRevealDelay(index * 110, 0.1);
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center" ref={ref}>

      {/* Connector line (desktop) */}
      {!isLast && (
        <div
          className="hidden lg:block absolute top-13 left-[calc(50%+52px)] right-[-calc(50%-52px)]"
          style={{
            height: "1px",
            width: "calc(100% - 104px)",
            background: `linear-gradient(to right, ${colors.primary}55, ${colors.primaryLt}22)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Icon circle */}
      <div
        className="relative z-10 w-25 h-25 rounded-full flex items-center justify-center mb-7 transition-all duration-500"
        style={{
          background: hovered
            ? colors.primary
            : `linear-gradient(135deg, #fff 0%, ${colors.bgDeep} 100%)`,
          boxShadow: hovered
            ? `0 20px 50px ${colors.primary}44`
            : `0 8px 32px ${colors.primary}14`,
          color: hovered ? "#fff" : colors.primary,
          transform: hovered ? "scale(1.06)" : "scale(1)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Step number badge */}
        <span
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium transition-all duration-300"
          style={{
            fontFamily: fonts.body,
            background: hovered ? "#fff" : colors.primary,
            color: hovered ? colors.primary : "#fff",
          }}
        >
          {index + 1}
        </span>
        {step.icon}
      </div>

      {/* Text */}
      <div className="text-center px-3">
        <h3
          className="text-[1.15rem] font-light mb-3"
          style={{ fontFamily: fonts.display, color: colors.ink }}
        >
          {step.title}
        </h3>
        <p
          className="text-[13px] leading-[1.85] font-light"
          style={{ fontFamily: fonts.body, color: colors.inkLight }}
        >
          {step.description}
        </p>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function HowItWorksSection() {
  const tagRef    = useRevealDelay(0);
  const headRef   = useRevealDelay(100);
  const subRef    = useRevealDelay(200);
  const ctaRef    = useRevealDelay(400);

  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden py-28 md:py-40"
      style={{ background: colors.bgAlt }}
    >
      {/* Background ornament */}
      <div
        className="absolute -top-32 -left-32 w-150 h-150 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${colors.primary}08 0%, transparent 68%)`,
        }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-100 h-100 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${colors.primaryLt}0A 0%, transparent 65%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* ── Header ── */}
        <div className="text-center mb-20">
          <div ref={tagRef} className="inline-flex items-center gap-3 mb-8">
            <span className="w-8 h-px" style={{ background: colors.primary }} />
            <span
              className="text-[10px] tracking-[0.38em] uppercase font-medium"
              style={{ color: colors.primary, fontFamily: fonts.body }}
            >
              Como Funciona
            </span>
            <span className="w-8 h-px" style={{ background: colors.primary }} />
          </div>

          <h2
            ref={headRef}
            className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.1] mb-6"
            style={{ fontFamily: fonts.display, color: colors.ink }}
          >
            Simples, rápido e<br />
            <em className="not-italic" style={{ color: colors.primary }}>completamente personalizado.</em>
          </h2>

          <p
            ref={subRef}
            className="text-[15px] leading-[1.85] font-light max-w-lg mx-auto"
            style={{ color: colors.inkMid, fontFamily: fonts.body }}
          >
            Da primeira mensagem à entrega final — um processo fluido, transparente e pensado para gerar os melhores resultados para o seu negócio.
          </p>
        </div>

        {/* ── Steps grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6 mb-20 relative">
          {steps.map((step, i) => (
            <StepCard
              key={step.number}
              step={step}
              index={i}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>

        {/* ── Bottom CTA card ── */}
        <div ref={ctaRef}>
          <div
            className="relative rounded-[3px] overflow-hidden px-8 py-12 md:px-16 md:py-14 flex flex-col md:flex-row items-center justify-between gap-8"
            style={{
              background: `linear-gradient(120deg, ${colors.ink} 0%, #5a3e36 100%)`,
            }}
          >
            {/* Decorative blob inside card */}
            <div
              className="absolute right-0 top-0 w-72 h-72 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 80% 20%, ${colors.primary}22 0%, transparent 65%)`,
              }}
            />

            <div className="relative z-10">
              <p
                className="text-[10px] tracking-[0.38em] uppercase mb-3"
                style={{ fontFamily: fonts.body, color: `${colors.primaryLt}99` }}
              >
                Pronto para começar?
              </p>
              <h3
                className="text-[clamp(1.5rem,3.5vw,2.4rem)] font-light text-white leading-[1.15]"
                style={{ fontFamily: fonts.display }}
              >
                Vamos criar sua presença<br />
                <em className="not-italic" style={{ color: colors.primaryLt }}>digital premium.</em>
              </h3>
            </div>

            <a
              href={whatsappLink("Olá! Quero começar meu projeto com a Loa Design Digital. Pode me contar mais sobre o processo?")}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 shrink-0 inline-flex items-center gap-3 px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium rounded-xs transition-all duration-400"
              style={{
                fontFamily: fonts.body,
                background: colors.primary,
                color: "#fff",
                boxShadow: `0 8px 32px ${colors.primary}44`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = colors.primary;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.primary;
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Começar meu projeto
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
