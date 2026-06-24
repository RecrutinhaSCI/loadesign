import { useEffect, useState } from "react";

const WHATSAPP_NUMBER = "555499481393";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = ["Sobre", "Serviços", "Como Funciona", "Pacotes", "Contato"];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#fdf8f5]/95 backdrop-blur-md shadow-[0_1px_24px_rgba(176,139,125,0.10)]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-20">

        {/* Logo */}
        <a href="#" className="flex flex-col leading-none select-none">
          <span
            className="text-2xl tracking-[0.18em] font-light"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "#B08B7D",
            }}
          >
            LOA
          </span>

          <span
            className="text-[10px] tracking-[0.38em] uppercase font-light"
            style={{
              color: "#c4a898",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            DESIGN
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <li key={l}>
              <a
                href={`#${l.toLowerCase().replace(" ", "-")}`}
                className="text-[13px] tracking-[0.18em] uppercase font-light transition-colors duration-300"
                style={{
                  color: "#8a6e65",
                  fontFamily: "'Jost', sans-serif",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "#B08B7D")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "#8a6e65")
                }
              >
                {l}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA desktop */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 text-[11px] tracking-[0.22em] uppercase font-medium transition-all duration-300 border"
          style={{
            fontFamily: "'Jost', sans-serif",
            color: "#B08B7D",
            borderColor: "#B08B7D",
            borderRadius: "2px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#B08B7D";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#B08B7D";
          }}
        >
          Fale Conosco
        </a>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: "#B08B7D",
              transform: menuOpen
                ? "rotate(45deg) translate(4px,4px)"
                : "none",
            }}
          />

          <span
            className="block w-4 h-px transition-all duration-300"
            style={{
              background: "#B08B7D",
              opacity: menuOpen ? 0 : 1,
            }}
          />

          <span
            className="block w-6 h-px transition-all duration-300"
            style={{
              background: "#B08B7D",
              transform: menuOpen
                ? "rotate(-45deg) translate(4px,-4px)"
                : "none",
            }}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-500"
        style={{ maxHeight: menuOpen ? "300px" : "0" }}
      >
        <div className="bg-[#fdf8f5]/98 backdrop-blur-md px-6 pb-6 flex flex-col gap-5 pt-2">

          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(" ", "-")}`}
              className="text-[12px] tracking-[0.22em] uppercase font-light"
              style={{
                color: "#8a6e65",
                fontFamily: "'Jost', sans-serif",
              }}
              onClick={() => setMenuOpen(false)}
            >
              {l}
            </a>
          ))}

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-center py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
            style={{
              color: "#B08B7D",
              borderColor: "#B08B7D",
              fontFamily: "'Jost', sans-serif",
              borderRadius: "2px",
            }}
          >
            Fale Conosco
          </a>
        </div>
      </div>
    </header>
  );
}