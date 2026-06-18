import { HelmetProvider, Helmet } from "react-helmet-async";

/**
 * SEO — wrap your <App /> with <SEOProvider> in main.jsx,
 * then drop <SEO /> inside App.jsx (or per-page).
 *
 * Install: npm install react-helmet-async
 */

const SEO_CONFIG = {
  siteName:    "Loa Design Digital",
  title:       "Loa Design Digital — Design Estratégico & Marketing Digital",
  description: "Transformamos marcas em experiências visuais sofisticadas através de design estratégico, redes sociais e branding premium. Crescendo junto com você. 🚀",
  keywords:    "agência de marketing digital, criação de conteúdo visual, gestão de instagram, design estratégico, identidade visual, branding, reels, posts para feed, marketing digital, Loa Design Digital",
  url:         "https://loadesign.com.br", // ← atualizar com domínio real
  image:       "https://loadesign.com.br/og-image.jpg", // ← criar og-image 1200×630 e hospedar
  themeColor:  "#B08B7D",
  locale:      "pt_BR",
  twitterHandle: "@loadesign", // ← atualizar se houver
};

// ─── SEO component ────────────────────────────────────────────────────────────
export function SEO({
  title       = SEO_CONFIG.title,
  description = SEO_CONFIG.description,
  image       = SEO_CONFIG.image,
  url         = SEO_CONFIG.url,
}) {
  return (
    <Helmet>
      {/* ── Core ── */}
      <html lang="pt-BR" />
      <title>{title}</title>
      <meta name="description"   content={description} />
      <meta name="keywords"      content={SEO_CONFIG.keywords} />
      <meta name="author"        content={SEO_CONFIG.siteName} />
      <meta name="theme-color"   content={SEO_CONFIG.themeColor} />
      <meta name="robots"        content="index, follow" />
      <link  rel="canonical"     href={url} />

      {/* ── Open Graph ── */}
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={SEO_CONFIG.siteName} />
      <meta property="og:locale"      content={SEO_CONFIG.locale} />
      <meta property="og:url"         content={url} />
      <meta property="og:title"       content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt"   content={`${SEO_CONFIG.siteName} — Design Estratégico`} />

      {/* ── Twitter / X card ── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={SEO_CONFIG.twitterHandle} />
      <meta name="twitter:creator"     content={SEO_CONFIG.twitterHandle} />
      <meta name="twitter:title"       content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />

      {/* ── Favicon (coloque os arquivos em /public) ── */}
      <link rel="icon"             href="/favicon.ico" />
      <link rel="icon"             type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon"             type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180"  href="/apple-touch-icon.png" />
      <link rel="manifest"         href="/site.webmanifest" />

      {/* ── Google Fonts ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap"
        rel="stylesheet"
      />
    </Helmet>
  );
}

// ─── Provider wrapper ─────────────────────────────────────────────────────────
export function SEOProvider({ children }) {
  return <HelmetProvider>{children}</HelmetProvider>;
}
