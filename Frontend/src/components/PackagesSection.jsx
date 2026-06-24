import { useEffect, useRef, useState } from "react";

const WHATSAPP_NUMBER = "555499481393"; // Substitua pelo número real

function useRevealDelay(delay = 0, threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(36px)";
    el.style.transition = `opacity 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`;
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

const packages = [
  {
    name: "Básico",
    tag: "Para começar",
    description: "Ideal para quem está dando os primeiros passos no digital e quer consistência com investimento acessível.",
    items: [
      "2 Reels por mês",
      "3 Posts para feed",
      "Indicado para negócios que estão iniciando sua presença digital e precisam de uma comunicação visual organizada e profissional",
,
    ],
    featured: false,
    cta: "Começar agora",
    message: "Olá! Tenho interesse no Pacote Básico da Loa Design Digital. Pode me passar mais informações?",
  },
  {
    name: "Intermediário",
    tag: "Mais popular",
    description: "Para marcas que querem crescer com constância. Mais conteúdo, mais presença, mais resultados.",
    items: [
      "4 Reels por mês",
      "6 Posts para feed",
      "Indicado para negócios que já possuem presença digital e buscam mais consistência, engajamento e profissionalismo nas redes sociais"
    ],
    featured: true,
    cta: "Quero este pacote",
    message: "Olá! Tenho interesse no Pacote Intermediário da Loa Design Digital. Pode me passar mais informações?",
  },
  {
    name: "Avançado",
    tag: "Presença total",
    description: "Gestão completa de conteúdo para marcas que levam o digital a sério e querem dominar o mercado.",
    items: [
      "6 Reels por mês",
      "10 Posts para feed",
      "Indicado para négocios que buscam crescimento, posicionamento e maior impacto no digital.",
    ],
    featured: false,
    cta: "Falar com a Laura",
    message: "Olá! Tenho interesse no Pacote Avançado da Loa Design Digital. Pode me passar mais informações?",
  },
];

function PackageCard({ pkg, index }) {
  const ref = useRevealDelay(index * 120, 0.1);
  const [hovered, setHovered] = useState(false);

  const isActive = pkg.featured || hovered;

  return (
    <div
      ref={ref}
      className="relative flex flex-col rounded-[3px] overflow-hidden transition-all duration-500"
      style={{
        background: isActive ? "#B08B7D" : "#fff",
        boxShadow: isActive
          ? "0 32px 80px rgba(176,139,125,0.30)"
          : "0 4px 24px rgba(176,139,125,0.10)",
        transform: pkg.featured
          ? "translateY(-10px)"
          : hovered
          ? "translateY(-6px)"
          : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top bar for featured */}
      {pkg.featured && (
        <div
          className="absolute top-0 left-0 right-0 h-0.75"
          style={{ background: "rgba(255,255,255,0.5)" }}
        />
      )}

      <div className="p-8 flex flex-col flex-1">
        {/* Tag */}
        <span
          className="inline-block self-start px-3 py-1 rounded-full text-[9px] tracking-[0.2em] uppercase font-medium mb-6 transition-all duration-300"
          style={{
            fontFamily: "'Jost', sans-serif",
            background: isActive ? "rgba(255,255,255,0.2)" : "rgba(176,139,125,0.10)",
            color: isActive ? "rgba(255,255,255,0.9)" : "#B08B7D",
          }}
        >
          {pkg.tag}
        </span>

        {/* Name */}
        <h3
          className="text-[1.6rem] font-light mb-1 transition-colors duration-300"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: isActive ? "#fff" : "#3d2b24",
          }}
        >
          {pkg.name}
        </h3>

        {/* Divider */}
        <div
          className="w-full h-px mb-6 transition-all duration-300"
          style={{ background: isActive ? "rgba(255,255,255,0.2)" : "#ede0d9" }}
        />

        {/* Description */}
        <p
          className="text-[13px] leading-[1.85] font-light mb-7 transition-colors duration-300"
          style={{
            fontFamily: "'Jost', sans-serif",
            color: isActive ? "rgba(255,255,255,0.75)" : "#7a5e57",
          }}
        >
          {pkg.description}
        </p>

        {/* Items */}
        <ul className="flex flex-col gap-3 mb-8 flex-1">
          {pkg.items.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span
                className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : "rgba(176,139,125,0.12)",
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  stroke={isActive ? "#fff" : "#B08B7D"}
                  strokeWidth="1.8"
                >
                  <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span
                className="text-[13px] font-light transition-colors duration-300"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  color: isActive ? "rgba(255,255,255,0.85)" : "#7a5e57",
                }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(pkg.message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 text-[11px] tracking-[0.22em] uppercase font-medium rounded-xs transition-all duration-300"
          style={{
            fontFamily: "'Jost', sans-serif",
            background: isActive ? "#fff" : "#B08B7D",
            color: isActive ? "#B08B7D" : "#fff",
            boxShadow: isActive
              ? "0 4px 20px rgba(255,255,255,0.2)"
              : "0 4px 20px rgba(176,139,125,0.22)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {pkg.cta}
        </a>
      </div>
    </div>
  );
}

export default function PackagesSection() {
  const tagRef = useRevealDelay(0);
  const headRef = useRevealDelay(120);
  const subRef = useRevealDelay(240);
  const noteRef = useRevealDelay(600);

  return (
    <section
      id="pacotes"
      className="relative overflow-hidden py-28 md:py-40"
      style={{ background: "#fdf8f5" }}
    >
      {/* Blobs */}
      <div
        className="absolute bottom-0 left-0 w-125 h-125 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 90%, rgba(176,139,125,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div ref={tagRef} className="inline-flex items-center gap-3 mb-8">
            <span className="w-8 h-px" style={{ background: "#B08B7D" }} />
            <span
              className="text-[10px] tracking-[0.38em] uppercase font-medium"
              style={{ color: "#B08B7D", fontFamily: "'Jost', sans-serif" }}
            >
              Pacotes & Investimento
            </span>
            <span className="w-8 h-px" style={{ background: "#B08B7D" }} />
          </div>

          <h2
            ref={headRef}
            className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.1] mb-6"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#3d2b24" }}
          >
            Planos que cabem no seu<br />
            <em className="not-italic" style={{ color: "#B08B7D" }}>momento</em> e na sua meta.
          </h2>

          <p
            ref={subRef}
            className="text-[15px] leading-[1.85] font-light max-w-lg mx-auto"
            style={{ color: "#7a5e57", fontFamily: "'Jost', sans-serif" }}
          >
            Investimento transparente, sem surpresas. Escolha o pacote ideal e comece a transformar sua presença digital hoje.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.name} pkg={pkg} index={i} />
          ))}
        </div>

        {/* Bottom note */}
        <div ref={noteRef} className="text-center mt-14">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-6 h-px" style={{ background: "#d4bab0" }} />
            <span
              className="text-[11px] tracking-[0.2em] uppercase font-light"
              style={{ color: "#9a7d76", fontFamily: "'Jost', sans-serif" }}
            >
              Segurança e Transparência
            </span>
            <span className="w-6 h-px" style={{ background: "#d4bab0" }} />
          </div>
          <p
            className="text-[13px] leading-[1.85] font-light max-w-md mx-auto"
            style={{ color: "#9a7d76", fontFamily: "'Jost', sans-serif" }}
          >
            Todos os serviços são formalizados com{" "}
            <strong className="font-medium" style={{ color: "#B08B7D" }}>
              contrato profissional elaborado por advogados
            </strong>
            , garantindo segurança e transparência para você e para nós.
          </p>
        </div>
      </div>
    </section>
  );
}
