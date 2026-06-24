// src/components/ContactSection.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Formulário de contato com integração completa ao backend.
// Estados: idle → sending → success | error
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRevealDelay } from "../hooks/useReveal";
import { colors, fonts, INSTAGRAM_URL, EMAIL } from "../utils/design";
import { submitContact } from "../api/contact";

// ─── Field components ─────────────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[10px] tracking-[0.28em] uppercase font-medium flex items-center gap-1"
        style={{ fontFamily: fonts.body, color: colors.inkLight }}
      >
        {label}
        {required && <span style={{ color: colors.primary }}>*</span>}
      </label>
      {children}
      {error && (
        <span
          className="text-[11px] font-light"
          style={{ fontFamily: fonts.body, color: "#c0392b" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

function Input({ name, type = "text", placeholder, value, onChange, hasError }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full px-4 py-3.5 text-[14px] font-light outline-none rounded-xs transition-all duration-300 placeholder:text-[#c4a898]"
      style={{
        fontFamily: fonts.body,
        color: colors.ink,
        background: "#fff",
        border: `1.5px solid ${hasError ? "#c0392b" : focused ? colors.primary : colors.border}`,
        boxShadow: focused && !hasError ? `0 0 0 4px ${colors.primary}10` : "none",
      }}
    />
  );
}

function Textarea({ name, placeholder, value, onChange, hasError, rows = 5 }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full px-4 py-3.5 text-[14px] font-light outline-none rounded-xs resize-none transition-all duration-300 placeholder:text-[#c4a898]"
      style={{
        fontFamily: fonts.body,
        color: colors.ink,
        background: "#fff",
        border: `1.5px solid ${hasError ? "#c0392b" : focused ? colors.primary : colors.border}`,
        boxShadow: focused && !hasError ? `0 0 0 4px ${colors.primary}10` : "none",
      }}
    />
  );
}

function StyledSelect({ name, value, onChange, hasError }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full px-4 py-3.5 text-[14px] font-light outline-none rounded-xs transition-all duration-300 cursor-pointer appearance-none"
      style={{
        fontFamily: fonts.body,
        color: value ? colors.ink : "#c4a898",
        background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23B08B7D' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 16px center`,
        border: `1.5px solid ${hasError ? "#c0392b" : focused ? colors.primary : colors.border}`,
        boxShadow: focused && !hasError ? `0 0 0 4px ${colors.primary}10` : "none",
      }}
    >
      <option value="">Selecione o serviço desejado</option>
      <option value="Pacote Básico">Pacote Básico</option>
      <option value="Pacote Intermediário">Pacote Intermediário</option>
      <option value="Pacote Avançado">Pacote Avançado</option>
      <option value="Identidade Visual">Identidade Visual & Branding</option>
      <option value="Projeto Avulso">Projeto Avulso</option>
      <option value="Não sei ainda">Não sei ainda — quero orientação</option>
    </select>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessMessage({ onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-7"
        style={{ background: `${colors.primary}14` }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke={colors.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 className="text-[2rem] font-light mb-3"
        style={{ fontFamily: fonts.display, color: colors.ink }}>
        Mensagem enviada! ✨
      </h3>
      <p className="text-[14px] font-light max-w-xs leading-[1.8] mb-8"
        style={{ fontFamily: fonts.body, color: colors.inkLight }}>
        Sua mensagem foi recebida com sucesso. Entraremos em contato em até 2 horas úteis.
      </p>
      <button
        onClick={onReset}
        className="text-[11px] tracking-[0.2em] uppercase font-medium transition-colors duration-300"
        style={{ fontFamily: fonts.body, color: colors.inkLight }}
        onMouseEnter={(e) => (e.target.style.color = colors.primary)}
        onMouseLeave={(e) => (e.target.style.color = colors.inkLight)}
      >
        Enviar nova mensagem
      </button>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, details }) {
  return (
    <div
      className="rounded-xs px-5 py-4 mb-4"
      style={{ background: "rgba(192,57,43,0.07)", border: "1.5px solid rgba(192,57,43,0.25)" }}
    >
      <p className="text-[13px] font-medium mb-1"
        style={{ fontFamily: fonts.body, color: "#c0392b" }}>
        {message}
      </p>
      {details && details.length > 0 && (
        <ul className="mt-1">
          {details.map((d, i) => (
            <li key={i} className="text-[12px] font-light"
              style={{ fontFamily: fonts.body, color: "#c0392b" }}>
              • {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Channel link ─────────────────────────────────────────────────────────────

function ChannelLink({ href, icon, label, sub, external = true }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-4 p-5 rounded-[3px] transition-all duration-300"
      style={{ background: "#fff", boxShadow: `0 2px 16px ${colors.primary}0C` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 32px ${colors.primary}18`;
        e.currentTarget.style.transform = "translateX(5px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 16px ${colors.primary}0C`;
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${colors.primary}14`, color: colors.primary }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] tracking-[0.15em] uppercase font-medium mb-0.5"
          style={{ fontFamily: fonts.body, color: colors.ink }}>{label}</p>
        <p className="text-[13px] font-light truncate"
          style={{ fontFamily: fonts.body, color: colors.primary }}>{sub}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={colors.primaryLt} strokeWidth="1.5" strokeLinecap="round">
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </a>
  );
}

const ICONS = {
  whatsapp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  ),
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

// ─── Initial form state ───────────────────────────────────────────────────────
const INITIAL_FORM = { name: "", phone: "", email: "", instagram: "", service: "", message: "" };
const INITIAL_ERRORS = {};

// ─── Client-side validation ───────────────────────────────────────────────────
function validateForm(form) {
  const errors = {};

  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = "Nome deve ter pelo menos 2 caracteres.";
  }
  if (!form.phone.trim()) {
    errors.phone = "WhatsApp é obrigatório.";
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "E-mail inválido.";
  }
  if (!form.message.trim() || form.message.trim().length < 10) {
    errors.message = "Mensagem deve ter pelo menos 10 caracteres.";
  }

  return errors;
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function ContactSection() {
  const tagRef  = useRevealDelay(0);
  const headRef = useRevealDelay(110);
  const leftRef = useRevealDelay(180);
  const formRef = useRevealDelay(220);

  const [form,       setForm]       = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState(INITIAL_ERRORS);
  const [apiError,   setApiError]   = useState(null);   // { message, details }
  const [status,     setStatus]     = useState("idle"); // idle | sending | success | error

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpa erro do campo ao digitar
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setFieldErrors(INITIAL_ERRORS);
    setApiError(null);
    setStatus("idle");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    // Validação client-side
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setStatus("sending");

    try {
      await submitContact({
        name:      form.name.trim(),
        phone:     form.phone.trim(),
        email:     form.email.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        service:   form.service || undefined,
        message:   form.message.trim(),
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setApiError({
        message: err.message || "Não foi possível enviar sua mensagem. Tente novamente.",
        details: err.details || null,
      });
    }
  };

  const isSending = status === "sending";
  const isSuccess = status === "success";

  return (
    <section
      id="contato"
      className="relative overflow-hidden py-28 md:py-40"
      style={{ background: colors.bgAlt }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 8% 60%, ${colors.primary}09 0%, transparent 50%)` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 92% 30%, ${colors.primaryLt}07 0%, transparent 50%)` }} />

      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Header */}
        <div className="text-center mb-16">
          <div ref={tagRef} className="inline-flex items-center gap-3 mb-8">
            <span className="w-8 h-px" style={{ background: colors.primary }} />
            <span className="text-[10px] tracking-[0.38em] uppercase font-medium"
              style={{ color: colors.primary, fontFamily: fonts.body }}>Fale Conosco</span>
            <span className="w-8 h-px" style={{ background: colors.primary }} />
          </div>
          <h2 ref={headRef}
            className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.1]"
            style={{ fontFamily: fonts.display, color: colors.ink }}>
            Vamos criar algo<br />
            <em className="not-italic" style={{ color: colors.primary }}>extraordinário</em> juntas?
          </h2>
        </div>

        {/* Split layout */}
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 xl:gap-20 items-start">

          {/* Left — channels */}
          <div ref={leftRef} className="flex flex-col gap-7">
            <p className="text-[15px] leading-[1.9] font-light"
              style={{ color: colors.inkMid, fontFamily: fonts.body }}>
              Estamos prontas para ouvir sobre o seu negócio e criar uma estratégia visual feita sob medida. Entre em contato pelo canal que preferir.
            </p>

            <div className="flex flex-col gap-3">
              <ChannelLink href="https://wa.me/555499481393"
                icon={ICONS.whatsapp} label="WhatsApp" sub="Atendimento rápido e humano" />
              <ChannelLink href={INSTAGRAM_URL}
                icon={ICONS.instagram} label="Instagram" sub="@loa.ddigital — veja nosso portfólio" />
              <ChannelLink href={`mailto:${EMAIL}`}
                icon={ICONS.email} label="E-mail" sub={EMAIL} external={false} />
            </div>

            <div className="p-6 rounded-[3px]"
              style={{ background: "#fff", borderLeft: `3px solid ${colors.primary}`,
                      boxShadow: `0 2px 16px ${colors.primary}0C` }}>
              <p className="text-[11px] tracking-[0.25em] uppercase font-medium mb-3"
                style={{ fontFamily: fonts.body, color: colors.primary }}>
                Horário de atendimento
              </p>
              <p className="text-[13.5px] font-light leading-[1.85]"
                style={{ fontFamily: fonts.body, color: colors.inkMid }}>
                Segunda a sexta:{" "}
                <strong className="font-medium" style={{ color: colors.ink }}>9h às 18h</strong><br />
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${colors.primary}18` }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                  stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-[12.5px] font-light leading-[1.75]"
                style={{ fontFamily: fonts.body, color: colors.inkLight }}>
                Todos os serviços são formalizados com{" "}
                <span style={{ color: colors.primary, fontWeight: 500 }}>contrato profissional</span>{" "}
                elaborado por advogados.
              </p>
            </div>
          </div>

          {/* Right — form card */}
          <div ref={formRef} className="rounded-[3px] overflow-hidden"
            style={{ boxShadow: `0 12px 60px ${colors.primary}14` }}>

            <div className="px-8 py-5 flex items-center justify-between"
              style={{ background: colors.primary }}>
              <span className="text-[11px] tracking-[0.3em] uppercase text-white font-light"
                style={{ fontFamily: fonts.body }}>Formulário de contato</span>
              <div className="flex gap-1.5">
                {["rgba(255,255,255,0.3)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.85)"].map((c, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />
                ))}
              </div>
            </div>

            <div className="bg-[#fdfaf8] px-8 py-10">
              {isSuccess ? (
                <SuccessMessage onReset={handleReset} />
              ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                  {/* API error banner */}
                  {apiError && (
                    <ErrorBanner message={apiError.message} details={apiError.details} />
                  )}

                  <Field label="Seu nome" required error={fieldErrors.name}>
                    <Input name="name" placeholder="Como posso te chamar?"
                      value={form.name} onChange={handleChange}
                      hasError={!!fieldErrors.name} />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="WhatsApp" required error={fieldErrors.phone}>
                      <Input name="phone" type="tel" placeholder="(00) 00000-0000"
                        value={form.phone} onChange={handleChange}
                        hasError={!!fieldErrors.phone} />
                    </Field>
                    <Field label="Instagram" error={fieldErrors.instagram}>
                      <Input name="instagram" placeholder="@seuperfil"
                        value={form.instagram} onChange={handleChange}
                        hasError={!!fieldErrors.instagram} />
                    </Field>
                  </div>

                  <Field label="E-mail" error={fieldErrors.email}>
                    <Input name="email" type="email" placeholder="seu@email.com"
                      value={form.email} onChange={handleChange}
                      hasError={!!fieldErrors.email} />
                  </Field>

                  <Field label="Serviço desejado" error={fieldErrors.service}>
                    <StyledSelect name="service" value={form.service}
                      onChange={handleChange} hasError={!!fieldErrors.service} />
                  </Field>

                  <Field label="Mensagem" required error={fieldErrors.message}>
                    <Textarea name="message"
                      placeholder="Fale um pouco sobre seu negócio e o que você está buscando..."
                      value={form.message} onChange={handleChange}
                      hasError={!!fieldErrors.message} />
                  </Field>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full flex items-center justify-center gap-3 py-4 text-[11px] tracking-[0.26em] uppercase font-medium rounded-xs mt-2 transition-all duration-300"
                    style={{
                      fontFamily: fonts.body,
                      background: isSending ? colors.primaryLt : colors.primary,
                      color: "#fff",
                      boxShadow: isSending ? "none" : `0 8px 28px ${colors.primary}33`,
                      cursor: isSending ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSending) {
                        e.currentTarget.style.background = colors.primaryDk;
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSending) {
                        e.currentTarget.style.background = colors.primary;
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {isSending ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
                          style={{ animation: "spin 0.7s linear infinite" }} />
                        Enviando...
                      </>
                    ) : (
                      <>
                        {ICONS.whatsapp}
                        Enviar mensagem
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] font-light"
                    style={{ fontFamily: fonts.body, color: "#b8a09a" }}>
                    Seus dados são seguros e não serão compartilhados.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
