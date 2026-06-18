const WHATSAPP_NUMBER = "5554999912694"; // Substitua pelo número real
const INSTAGRAM_URL = "https://instagram.com/loa.ddigital/"; // Substitua pela URL real
const EMAIL = "loadesigndigital@gmail.com"; // Substitua pelo e-mail real

const navLinks = [
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#serviços" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Pacotes", href: "#pacotes" },
  { label: "Contato", href: "#contato" },
];

const services = [
  "Criação de artes para redes sociais",
  "Gestão de Instagram",
  "Edição de vídeos & Reels",
  "Identidade visual & Branding",
  "Design estratégico",
  "Apresentações visuais",
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#3d2b24" }}>

      {/* ── CTA Banner ── */}
      <div
        className="px-6 md:px-12 py-16 md:py-20 text-center"
        style={{ background: "#B08B7D" }}
      >
        <p
          className="text-[10px] tracking-[0.4em] uppercase mb-5"
          style={{ fontFamily: "'Jost', sans-serif", color: "rgba(255,255,255,0.65)" }}
        >
          Pronta para crescer?
        </p>
        <h2
          className="text-[clamp(1.8rem,4vw,3rem)] font-light leading-[1.1] mb-8 text-white"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Sua marca merece uma presença<br />digital à sua altura.
        </h2>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá!%20Quero%20começar%20meu%20projeto%20com%20a%20Loa%20Design!`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 text-[11px] tracking-[0.24em] uppercase font-medium rounded-xs transition-all duration-300"
          style={{
            fontFamily: "'Jost', sans-serif",
            background: "#fff",
            color: "#B08B7D",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 14px 40px rgba(0,0,0,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Começar agora no WhatsApp
        </a>
      </div>

      {/* ── Main footer ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
        <div className="grid md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="mb-6">
              <div
                className="text-3xl font-light tracking-[0.18em] mb-0.5"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "#e8d8d1" }}
              >
                LOA
              </div>
              <div
                className="text-[9px] tracking-[0.42em] uppercase font-light"
                style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
              >
                DESIGN DIGITAL
              </div>
            </div>
            <p
              className="text-[13px] leading-[1.85] font-light mb-8"
              style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
            >
              Agência de marketing digital e design estratégico. Crescendo junto com você. 🚀
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.07)", color: "#9a7d76" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#B08B7D";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#9a7d76";
                }}
                aria-label="WhatsApp"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.07)", color: "#9a7d76" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#B08B7D";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#9a7d76";
                }}
                aria-label="Instagram"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" stroke="none" />
                </svg>
              </a>

              {/* Email */}
              <a
                href={`mailto:${EMAIL}`}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.07)", color: "#9a7d76" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#B08B7D";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#9a7d76";
                }}
                aria-label="E-mail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            </div>
          </div>

          {/* Nav links */}
          <div>
            <h4
              className="text-[10px] tracking-[0.35em] uppercase font-medium mb-6"
              style={{ fontFamily: "'Jost', sans-serif", color: "#B08B7D" }}
            >
              Navegação
            </h4>
            <ul className="flex flex-col gap-3.5">
              {navLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[13px] font-light transition-colors duration-300"
                    style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
                    onMouseEnter={(e) => (e.target.style.color = "#e8d8d1")}
                    onMouseLeave={(e) => (e.target.style.color = "#9a7d76")}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4
              className="text-[10px] tracking-[0.35em] uppercase font-medium mb-6"
              style={{ fontFamily: "'Jost', sans-serif", color: "#B08B7D" }}
            >
              Serviços
            </h4>
            <ul className="flex flex-col gap-3.5">
              {services.map((s) => (
                <li key={s}>
                  <span
                    className="text-[13px] font-light"
                    style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
                  >
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4
              className="text-[10px] tracking-[0.35em] uppercase font-medium mb-6"
              style={{ fontFamily: "'Jost', sans-serif", color: "#B08B7D" }}
            >
              Contato
            </h4>
            <div className="flex flex-col gap-5">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(176,139,125,0.15)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#B08B7D">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span
                  className="text-[13px] font-light transition-colors duration-300"
                  style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
                  onMouseEnter={(e) => (e.target.style.color = "#e8d8d1")}
                  onMouseLeave={(e) => (e.target.style.color = "#9a7d76")}
                >
                  WhatsApp
                </span>
              </a>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(176,139,125,0.15)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B08B7D" strokeWidth="1.8">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.7" fill="#B08B7D" stroke="none" />
                  </svg>
                </div>
                <span
                  className="text-[13px] font-light transition-colors duration-300"
                  style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
                  onMouseEnter={(e) => (e.target.style.color = "#e8d8d1")}
                  onMouseLeave={(e) => (e.target.style.color = "#9a7d76")}
                >
                  @loa.ddigital
                </span>
              </a>

              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(176,139,125,0.15)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B08B7D" strokeWidth="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <span
                  className="text-[13px] font-light transition-colors duration-300 break-all"
                  style={{ fontFamily: "'Jost', sans-serif", color: "#9a7d76" }}
                  onMouseEnter={(e) => (e.target.style.color = "#e8d8d1")}
                  onMouseLeave={(e) => (e.target.style.color = "#9a7d76")}
                >
                  {EMAIL}
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px mb-8" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            className="text-[11px] font-light text-center md:text-left"
            style={{ fontFamily: "'Jost', sans-serif", color: "#6a5550" }}
          >
            © {year} Loa Design Digital. Todos os direitos reservados.
          </p>
          <p
            className="text-[11px] font-light tracking-[0.06em]"
            style={{ fontFamily: "'Jost', sans-serif", color: "#6a5550" }}
          >
            Crescendo junto com você 🚀
          </p>
          <div className="flex gap-6">
            {["Política de Privacidade", "Termos de Uso"].map((t) => (
              <a
                key={t}
                href="#"
                className="text-[11px] font-light transition-colors duration-300"
                style={{ fontFamily: "'Jost', sans-serif", color: "#6a5550" }}
                onMouseEnter={(e) => (e.target.style.color = "#9a7d76")}
                onMouseLeave={(e) => (e.target.style.color = "#6a5550")}
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
