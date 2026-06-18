import { useEffect, useRef } from "react";

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(36px)";
    el.style.transition = "opacity 0.9s cubic-bezier(.22,1,.36,1), transform 0.9s cubic-bezier(.22,1,.36,1)";
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
  }, [threshold]);
  return ref;
}

function useRevealDelay(delay = 0, threshold = 0.15) {
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

const pillars = [
  {
    number: "01",
    title: "Estratégia",
    text: "Cada peça criada tem propósito. Unimos estética e dados para gerar resultados reais no seu negócio.",
  },
  {
    number: "02",
    title: "Criatividade",
    text: "Design que conta histórias. Conteúdo visual que prende atenção e converte seguidores em clientes.",
  },
  {
    number: "03",
    title: "Parceria",
    text: "Seu sucesso é o nosso sucesso. Acompanhamos cada etapa da sua jornada digital com dedicação total.",
  },
];

export default function AboutSection() {
  const tagRef = useReveal();
  const headRef = useRevealDelay(120);
  const textRef = useRevealDelay(240);
  const pillarsRef = useRevealDelay(360);
  const imageRef = useReveal();

  return (
    <section
      id="sobre"
      className="relative overflow-hidden py-28 md:py-40"
      style={{ background: "#fdf8f5" }}
    >
      {/* Decorative blob */}
      <div
        className="absolute top-0 right-0 w-150 h-150 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 80% 20%, rgba(176,139,125,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-2 gap-20 items-center">

          {/* ── Left visual ── */}
          <div ref={imageRef} className="relative order-2 md:order-1">
            <div
              className="relative rounded-[3px] overflow-hidden aspect-4/5"
              style={{
                background: "linear-gradient(145deg, #e8d8d1 0%, #d4bab0 40%, #c4a898 100%)",
                boxShadow: "0 40px 100px rgba(176,139,125,0.22)",
              }}
            >
              {/* Inner content mock */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
                <div
                  className="text-6xl font-light mb-4"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(255,255,255,0.9)" }}
                >
                  Loa
                </div>
                <div
                  className="text-[11px] tracking-[0.45em] uppercase mb-10"
                  style={{ fontFamily: "'Jost', sans-serif", color: "rgba(255,255,255,0.65)" }}
                >
                  Design Digital
                </div>
                <div className="w-12 h-px mb-10" style={{ background: "rgba(255,255,255,0.4)" }} />
                <p
                  className="text-center text-[13px] leading-[1.9] font-light"
                  style={{ fontFamily: "'Jost', sans-serif", color: "rgba(255,255,255,0.8)" }}
                >
                  "Crescendo junto<br />com você 🚀"
                </p>
              </div>

              {/* Corner ornament */}
              <div
                className="absolute top-5 left-5 w-10 h-10 border-t border-l"
                style={{ borderColor: "rgba(255,255,255,0.3)" }}
              />
              <div
                className="absolute bottom-5 right-5 w-10 h-10 border-b border-r"
                style={{ borderColor: "rgba(255,255,255,0.3)" }}
              />
            </div>

            {/* Floating stat card */}
            <div
              className="absolute -bottom-6 -right-6 bg-white px-6 py-5 rounded-xs"
              style={{ boxShadow: "0 12px 40px rgba(176,139,125,0.18)" }}
            >
              <div
                className="text-3xl font-light mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B08B7D" }}
              >
              </div>
              <div
                className="text-[10px] tracking-[0.22em] uppercase"
                style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
              >
                transformando marcas
              </div>
            </div>

            {/* Floating mini badge */}
            <div
              className="absolute -top-5 -left-5 bg-[#B08B7D] px-4 py-3 rounded-xs"
              style={{ boxShadow: "0 8px 24px rgba(176,139,125,0.28)" }}
            >
              <div
                className="text-[10px] tracking-[0.2em] uppercase text-white"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                ✦ Premium
              </div>
            </div>
          </div>

          {/* ── Right copy ── */}
          <div className="order-1 md:order-2">
            <div ref={tagRef} className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-px" style={{ background: "#B08B7D" }} />
              <span
                className="text-[10px] tracking-[0.38em] uppercase font-medium"
                style={{ color: "#B08B7D", fontFamily: "'Jost', sans-serif" }}
              >
                Quem somos
              </span>
            </div>

            <h2
              ref={headRef}
              className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.1] mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#3d2b24" }}
            >
              Design que conta<br />
              <em className="not-italic" style={{ color: "#B08B7D" }}>histórias</em> que vendem.
            </h2>

            <div ref={textRef}>
              <p
                className="text-[15px] leading-[1.9] font-light mb-6"
                style={{ color: "#7a5e57", fontFamily: "'Jost', sans-serif" }}
              >
                A Loa Design Digital é uma agência de marketing digital focada em criação de conteúdo visual e estratégico, ajudando negócios a se destacarem nas redes sociais e atraírem mais clientes.
              </p>
              <p
                className="text-[15px] leading-[1.9] font-light mb-12"
                style={{ color: "#7a5e57", fontFamily: "'Jost', sans-serif" }}
              >
                Acreditamos que toda marca tem uma história única para contar. Nossa missão é transformar essa história em conteúdo visual poderoso — elegante, estratégico e acessível.
              </p>
            </div>

            {/* Pillars */}
            <div ref={pillarsRef} className="flex flex-col gap-6">
              {pillars.map((p) => (
                <div key={p.number} className="flex gap-5 items-start group">
                  <span
                    className="text-[11px] tracking-[0.22em] pt-0.5 font-light shrink-0"
                    style={{ color: "#B08B7D", fontFamily: "'Jost', sans-serif" }}
                  >
                    {p.number}
                  </span>
                  <div className="flex-1 pb-6 border-b" style={{ borderColor: "#ede0d9" }}>
                    <h4
                      className="text-[15px] font-medium mb-1.5 transition-colors duration-300"
                      style={{ fontFamily: "'Jost', sans-serif", color: "#3d2b24" }}
                    >
                      {p.title}
                    </h4>
                    <p
                      className="text-[13px] leading-[1.8] font-light"
                      style={{ color: "#9a7d76", fontFamily: "'Jost', sans-serif" }}
                    >
                      {p.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
