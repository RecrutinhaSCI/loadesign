import { useEffect, useRef } from "react";

const WHATSAPP_NUMBER = "5554999912694";
const INSTAGRAM_URL = "https://instagram.com/loa.ddigital/";

function useFadeIn(delay = 0) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";

    el.style.transition = `opacity 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms,
    transform 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`;

    const timer = setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 80);

    return () => clearTimeout(timer);
  }, [delay]);

  return ref;
}

export default function HeroSection() {
  const tagRef = useFadeIn(200);
  const h1Ref = useFadeIn(420);
  const subRef = useFadeIn(620);
  const btnRef = useFadeIn(820);
  const socialRef = useFadeIn(1000);
  const imgRef = useFadeIn(300);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #fdf8f5 0%, #f5ede7 55%, #ede0d9 100%)",
      }}
    >
      {/* Background blobs */}
      <div
        className="absolute top-0 right-0 w-125 h-125 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(176,139,125,0.14) 0%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      <div
        className="absolute bottom-0 left-0 w-95 h-95 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(196,168,152,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #8a6e65 0px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #8a6e65 0px, transparent 1px, transparent 60px)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full py-32 md:py-0 grid md:grid-cols-2 gap-16 items-center min-h-screen">

        {/* LEFT */}
        <div className="flex flex-col justify-center">

          {/* Tag */}
          <div
            ref={tagRef}
            className="inline-flex items-center gap-2 mb-8 self-start"
          >
            <span
              className="w-8 h-px"
              style={{ background: "#B08B7D" }}
            />

            <span
              className="text-[10px] tracking-[0.38em] uppercase font-medium"
              style={{
                color: "#B08B7D",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              Agência de Marketing Digital
            </span>
          </div>

          {/* Headline */}
          <h1
            ref={h1Ref}
            className="text-[clamp(2.6rem,6vw,4.8rem)] font-light leading-[1.08] tracking-[-0.01em] mb-7"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "#3d2b24",
            }}
          >
            Sua marca merece
            <br />

            <em
              className="not-italic"
              style={{ color: "#B08B7D" }}
            >
              brilhar
            </em>{" "}
            no digital.
          </h1>

          {/* Subtitle */}
          <p
            ref={subRef}
            className="text-[15px] leading-[1.85] font-light max-w-150 mb-10"
            style={{
              color: "#7a5e57",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            Design estratégico e conteúdo visual que transforma
            seguidores em clientes reais. Crescendo junto com você —
            do primeiro post ao seu maior projeto.
          </p>

          {/* Buttons */}
          <div
            ref={btnRef}
            className="flex flex-col sm:flex-row gap-4 mb-14"
          >

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium transition-all duration-300"
              style={{
                background: "#B08B7D",
                color: "#fff",
                borderRadius: "2px",
                fontFamily: "'Jost', sans-serif",
                boxShadow: "0 8px 32px rgba(176,139,125,0.28)",
              }}
            >
              Quero começar agora
            </a>

            {/* Instagram */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium border transition-all duration-300"
              style={{
                color: "#B08B7D",
                borderColor: "#B08B7D",
                borderRadius: "2px",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              Ver portfólio
            </a>
          </div>

          {/* Social proof */}
          <div
            ref={socialRef}
            className="flex items-center gap-6"
          >
            <div className="flex -space-x-2">
              {["L", "A", "M", "J"].map((letter, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-[#fdf8f5] flex items-center justify-center text-[10px] font-medium text-white"
                  style={{
                    background: ["#c4a898", "#d4bab0", "#e2cdc8", "#c9ada3"][i],
                    zIndex: 4 - i,
                  }}
                >
                  {letter}
                </div>
              ))}
            </div>

            <div>
              <div className="flex gap-0.5 mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="#B08B7D"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              <p
                className="text-[11px] tracking-[0.06em]"
                style={{
                  color: "#9a7d76",
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                +40 clientes satisfeitos
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT CARD */}
        <div
          ref={imgRef}
          className="hidden md:flex items-center justify-center relative"
        >

          <div
            className="relative w-85 rounded-[3px] overflow-hidden"
            style={{
              boxShadow:
                "0 32px 80px rgba(176,139,125,0.22), 0 8px 32px rgba(0,0,0,0.06)",
            }}
          >

            {/* Header */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: "#B08B7D" }}
            >
              <span
                className="text-white text-[12px] tracking-[0.22em] uppercase font-light"
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                Loa Design Digital
              </span>

              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/60"
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="bg-[#fdf8f5] px-6 py-8">

              <div
                className="mb-6 aspect-square flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #e8d8d1 0%, #d4bab0 50%, #c4a898 100%)",
                }}
              >
                <div className="text-center">
                  <div
                    className="text-3xl font-light mb-1"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "#fff",
                    }}
                  >
                    Sua marca,
                  </div>

                  <div
                    className="text-3xl font-light"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    seu impacto.
                  </div>
                </div>
              </div>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-3 text-[10px] tracking-[0.22em] uppercase font-medium"
                style={{
                  background: "#B08B7D",
                  color: "#fff",
                  borderRadius: "2px",
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                Falar no WhatsApp ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@200;300;400;500&display=swap');
      `}</style>
    </section>
  );
}