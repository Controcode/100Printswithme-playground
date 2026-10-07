import { useEffect, useMemo, useRef, useState } from "react";
import { HundredPrints } from "@100printswithme/browser-sdk";

type PlaygroundInput = {
  templateId?: string;
  template_id?: string;
  data?: Record<string, unknown>;
};

const DEFAULT_CODE = `{
  "template_id": "replace_your_template_id",
  "data": {
    "name": "Alex Johnson",
    "achievement": "Outstanding Performance",
    "date": "March 8, 2026",
    "score": "98",
    "image_url": "https://example.com/avatar.jpg"
  }
}`;

const INSTALL_SNIPPETS = {
  npm: "npm install @100printswithme/browser-sdk",
  yarn: "yarn add @100printswithme/browser-sdk",
};

export default function App() {
  const [publishableKey, setPublishableKey] = useState(
    () => localStorage.getItem("100prints_playground_key") || ""
  );
  const [code, setCode] = useState(DEFAULT_CODE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState<"preview" | "png" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installTab, setInstallTab] = useState<keyof typeof INSTALL_SNIPPETS>("npm");
  const [copied, setCopied] = useState(false);

  const lastPreviewResult = useRef<Awaited<ReturnType<HundredPrints["png"]>> | null>(null);

  useEffect(() => {
    localStorage.setItem("100prints_playground_key", publishableKey);
  }, [publishableKey]);

  useEffect(() => {
    return () => {
      lastPreviewResult.current?.revoke?.();
    };
  }, []);

  const parsedInput = useMemo(() => {
    try {
      const parsed = JSON.parse(code) as PlaygroundInput;

      return {
        templateId: parsed.templateId || parsed.template_id || "",
        data: parsed.data || {},
        error: null as string | null,
      };
    } catch {
      return {
        templateId: "",
        data: {},
        error: "The template config must be valid JSON.",
      };
    }
  }, [code]);

  function getClient() {
    if (!publishableKey.trim()) {
      throw new Error("Add your publishable API key first.");
    }

    return new HundredPrints({
      publishableKey: publishableKey.trim(),
    });
  }

  function getRenderInput() {
    if (parsedInput.error) {
      throw new Error(parsedInput.error);
    }

    if (!parsedInput.templateId.trim()) {
      throw new Error("Replace template_id with your template ID.");
    }

    return {
      templateId: parsedInput.templateId.trim(),
      data: parsedInput.data,
    };
  }

  function handleError(cause: unknown) {
    console.error("100PrintsWithMe Playground:", cause);

    const message =
      cause instanceof Error
        ? cause.message
        : "Something went wrong while rendering.";

    setError(message);
    setStatus("Render failed");
  }

  async function renderPreview() {
    setBusy("preview");
    setError(null);
    setStatus("Rendering preview…");

    try {
      const prints = getClient();
      const input = getRenderInput();

      const result = await prints.png({
        ...input,
        side: "front",
        quality: "high",
      });

      lastPreviewResult.current?.revoke?.();
      lastPreviewResult.current = result;

      setPreviewUrl(result.url);
      setStatus("Preview ready");
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPng() {
    setBusy("png");
    setError(null);
    setStatus("Preparing PNG…");

    try {
      const prints = getClient();
      const input = getRenderInput();

      const result = await prints.png({
        ...input,
        side: "front",
        quality: "high",
      });

      result.download("100prints-render.png");
      window.setTimeout(() => result.revoke(), 1200);
      setStatus("PNG downloaded");
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    setError(null);
    setStatus("Preparing PDF…");

    try {
      const prints = getClient();
      const input = getRenderInput();

      const result = await prints.pdf({
        ...input,
        includeBack: true,
        quality: "high",
      });

      result.download("100prints-render.pdf");
      window.setTimeout(() => result.revoke(), 1200);
      setStatus("PDF downloaded");
    } catch (cause) {
      handleError(cause);
    } finally {
      setBusy(null);
    }
  }

  async function copyInstall() {
    await navigator.clipboard.writeText(INSTALL_SNIPPETS[installTab]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <style>{styles}</style>

      <div className="page-shell">
        <header className="site-header">
          <div className="header-inner">
            <a
              href="https://100printswith.me"
              target="_blank"
              rel="noreferrer"
              className="brand"
              aria-label="100PrintsWithMe"
            >
              <img
                src="https://www.100printswith.me/logo-100printswithme.png"
                alt="100PrintsWithMe"
              />
            </a>

            <nav className="nav-links" aria-label="Main navigation">
              <a href="/docs">Docs</a>
              <a
                href="https://100printswith.me"
                target="_blank"
                rel="noreferrer"
              >
                Get API
              </a>
              <a
                href="https://100printswith.me/feedback"
                target="_blank"
                rel="noreferrer"
              >
                Feedback
              </a>
              <a
                className="nav-cta"
                href="https://100printswith.me"
                target="_blank"
                rel="noreferrer"
              >
                Open platform
                <ArrowRightIcon />
              </a>
            </nav>
          </div>
        </header>

        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow">Browser SDK Playground</span>

              <h1>Render templates in your browser.</h1>

              <p>
                Create images and PDFs with dynamic data using the 100PrintsWithMe Browser SDK.
              </p>

              <div className="benefit-row">
                <Benefit text="Works in modern browsers" />
                <Benefit text="No backend render required" />
                <Benefit text="PNG, JPEG, PDF & Vector PDF" />
              </div>
            </div>

            <div className="hero-image-wrap">
              <img
                src="/showcase.png"
                alt="Template and data flowing through the 100PrintsWithMe Browser SDK into promotional graphics, certificates, ID cards, reports, and product creatives."
              />
            </div>
          </section>

          <section className="playground-section">
            <div className="playground-card input-card">
              <div className="card-head">
                <div>
                  <h2>Template & data</h2>
                  <p>
                    Provide your publishable API key and the template ID with
                    the data you want to render.
                  </p>
                </div>
              </div>

              <div className="field">
                <div className="field-heading">
                  <label htmlFor="publishable-key">Publishable API key</label>
                  <a
                    href="https://100printswith.me"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get your API key <ArrowRightIcon />
                  </a>
                </div>

                <input
                  id="publishable-key"
                  type="password"
                  value={publishableKey}
                  onChange={(event) => setPublishableKey(event.target.value)}
                  placeholder="pk_live_..."
                  autoComplete="off"
                />

                <small>Your publishable key is intended for browser use.</small>
              </div>

              <div className="field code-field">
                <div className="field-heading">
                  <label htmlFor="template-config">Template ID & data</label>
                  <span>JSON</span>
                </div>

                <div className="code-editor-shell">
                  <textarea
                    id="template-config"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    spellCheck={false}
                    aria-label="Template ID and data JSON"
                  />
                </div>
              </div>

              <div className="render-actions">
                <button
                  className="button primary-button"
                  type="button"
                  onClick={renderPreview}
                  disabled={busy !== null}
                >
                  <PlayIcon />
                  {busy === "preview" ? "Rendering…" : "Render preview"}
                </button>

                <button
                  className="button secondary-button"
                  type="button"
                  onClick={downloadPng}
                  disabled={busy !== null}
                >
                  <DownloadIcon />
                  {busy === "png" ? "Preparing…" : "Download PNG"}
                </button>

                <button
                  className="button secondary-button"
                  type="button"
                  onClick={downloadPdf}
                  disabled={busy !== null}
                >
                  <DownloadIcon />
                  {busy === "pdf" ? "Preparing…" : "Download PDF"}
                </button>
              </div>

              <div className={`render-status ${error ? "is-error" : ""}`}>
                <span className="status-dot" />
                <strong>{error || status}</strong>
                {!error && (
                  <>
                    <span className="status-divider" />
                    <span>Rendering happens locally in your browser.</span>
                  </>
                )}
              </div>
            </div>

            <div className="playground-card output-card">
              <div className="card-head">
                <div>
                  <h2>Preview</h2>
                  <p>
                    This preview is generated in your browser using a local
                    object URL.
                  </p>
                </div>
              </div>

              <div className="preview-stage">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Rendered 100PrintsWithMe template"
                  />
                ) : (
                  <div className="preview-placeholder">
                    <div className="placeholder-sheet">
                      <img
                        src="https://www.100printswith.me/logo-100printswithme.png"
                        alt=""
                      />
                      <span>YOUR TEMPLATE</span>
                      <strong>Preview</strong>
                      <p>
                        Enter your API key and template data, then render.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="use-cases-section">
            <div className="section-copy">
              <span className="eyebrow">Use cases</span>
              <h2>Turn one template into thousands of useful outputs.</h2>
              <p>
                Connect application data to a reusable visual template and
                generate finished graphics or documents directly in the browser.
              </p>
            </div>

            <div className="commerce-showcase">
              <div className="commerce-copy">
                <span className="showcase-kicker">Commerce & campaigns</span>
                <h3>Generate promotional graphics from live product data.</h3>
                <p>
                  Use one campaign template for sale banners, price drops,
                  marketplace creatives, recommendation cards, social posts, and
                  personalized offers. Your app changes the data — the SDK
                  produces the visual.
                </p>

                <div className="commerce-code">
                  <div className="commerce-code-bar">
                    <span />
                    <span />
                    <span />
                    <small>JavaScript</small>
                  </div>
                  <pre>
                    <code>{`await prints.png({
  templateId: "tpl_product_offer",
  data: {
    product: "Running Shoes",
    price: "₹2,499",
    offer: "30% OFF"
  },
  side: "front"
});`}</code>
                  </pre>
                </div>
              </div>

              <div className="campaign-results" aria-label="Example generated campaign graphics">
                <div className="campaign-card campaign-pink">
                  <span className="campaign-topline">MEGA SALE</span>
                  <strong>30% OFF</strong>
                  <div className="campaign-product campaign-product-one" />
                  <small>SHOP NOW</small>
                </div>

                <div className="campaign-card campaign-orange">
                  <span className="campaign-topline">PRICE DROP</span>
                  <strong>₹2,499</strong>
                  <div className="campaign-product campaign-product-two" />
                  <small>VIEW OFFER</small>
                </div>

                <div className="campaign-card campaign-blue">
                  <span className="campaign-topline">NEW ARRIVAL</span>
                  <strong>RUN 02</strong>
                  <div className="campaign-product campaign-product-three" />
                  <small>EXPLORE</small>
                </div>

                <div className="campaign-card campaign-violet">
                  <span className="campaign-topline">FOR ALEX</span>
                  <strong>YOUR PICKS</strong>
                  <div className="campaign-product campaign-product-four" />
                  <small>SEE PICKS</small>
                </div>
              </div>
            </div>

            <div className="use-case-grid supporting-use-cases">
              <UseCaseCard
                icon={<IdIcon />}
                title="Certificates & IDs"
                copy="Generate personalized certificates, student cards, employee IDs, badges, membership cards, and passes."
              />

              <UseCaseCard
                icon={<DocumentIcon />}
                title="Reports & business documents"
                copy="Create reports, invoices, statements, result sheets, and other branded documents from structured data."
              />

              <UseCaseCard
                icon={<ImageIcon />}
                title="Tickets, labels & downloadable assets"
                copy="Produce tickets, labels, event assets, printable cards, and personalized downloads on demand."
              />
            </div>
          </section>

          <section className="features-showcase">
            <div className="feature-intro">
              <span className="eyebrow">Browser SDK</span>
              <h2>Render directly where your users already are.</h2>
              <p>
                Fill a template with your own data and get back a finished
                visual without building a separate rendering service for every
                browser workflow. Keep the same template system across images,
                PDFs, downloads, previews, and app-generated assets.
              </p>
            </div>

            <div className="feature-list-wrap">
              <span className="eyebrow">Key features</span>
              <h3>Everything needed for browser-side generation.</h3>

              <ul className="feature-list">
                <li><span><CheckIcon /></span> PNG and JPEG image rendering</li>
                <li><span><CheckIcon /></span> Raster PDF and vector PDF output</li>
                <li><span><CheckIcon /></span> Front and back template support</li>
                <li><span><CheckIcon /></span> Dynamic data and image replacement</li>
                <li><span><CheckIcon /></span> Platform fonts and custom template fonts</li>
                <li><span><CheckIcon /></span> Blob URLs and built-in download helpers</li>
                <li><span><CheckIcon /></span> TypeScript-ready ESM and UMD package</li>
                <li><span><CheckIcon /></span> Publishable browser key — no secret API key in the client</li>
              </ul>
            </div>
          </section>

          <section className="developer-section">
            <div className="developer-copy">
              <span className="eyebrow">For developers</span>
              <h2>Simple. Powerful. Flexible.</h2>
              <p>
                Add the 100PrintsWithMe Browser SDK to your web app with a few
                lines of code. Render PNG, JPEG, PDF, or vector PDF without
                building your own rendering pipeline.
              </p>

              <div className="developer-actions">
                <a className="button primary-button" href="/docs">
                  Read the documentation
                  <ArrowRightIcon />
                </a>

                <a
                  className="text-link"
                  href="https://www.npmjs.com/package/@100printswithme/browser-sdk"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on npm
                  <ArrowRightIcon />
                </a>
              </div>
            </div>

            <div className="install-panel">
              <div className="install-tabs">
                <div>
                  {(Object.keys(INSTALL_SNIPPETS) as Array<
                    keyof typeof INSTALL_SNIPPETS
                  >).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={installTab === tab ? "active" : ""}
                      onClick={() => setInstallTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="copy-button"
                  onClick={copyInstall}
                  aria-label="Copy install command"
                >
                  {copied ? "Copied" : <CopyIcon />}
                </button>
              </div>

              <pre>
                <code>{INSTALL_SNIPPETS[installTab]}</code>
              </pre>

              <div className="mini-code">
                <span className="mini-line mini-blue">
                  import {"{ HundredPrints }"} from
                  "@100printswithme/browser-sdk";
                </span>
                <span className="mini-line">
                  const prints = new HundredPrints(
                  {"{ publishableKey: 'pk_live_...' }"});
                </span>
              </div>
            </div>
          </section>
        </main>

        <footer>
          <div className="footer-inner">
            <div className="footer-cta">
              <div>
                <span className="footer-cta-label">Start creating</span>
                <h2>Ready to render in the browser?</h2>
                <p>Build a template, add your data, and create your next image or PDF.</p>
              </div>
              <a href="https://100printswith.me" target="_blank" rel="noreferrer">
                Open platform <ArrowRightIcon />
              </a>
            </div>
            <div className="footer-top">
              <div className="footer-brand">
                <a href="https://100printswith.me" target="_blank" rel="noreferrer">
                  <img
                    src="https://www.100printswith.me/logo-100printswithme.png"
                    alt="100PrintsWithMe"
                  />
                </a>
                <p>Render images and documents from your templates, right in the browser.</p>
              </div>

              <nav className="footer-links" aria-label="Footer navigation">
                <div>
                  <strong>Build</strong>
                  <a href="/docs">Documentation</a>
                  <a href="https://www.npmjs.com/package/@100printswithme/browser-sdk" target="_blank" rel="noreferrer">Browser SDK on npm</a>
                </div>
                <div>
                  <strong>100PrintsWithMe</strong>
                  <a href="https://100printswith.me" target="_blank" rel="noreferrer">Open platform</a>
                  <a href="https://100printswith.me/feedback" target="_blank" rel="noreferrer">Feedback</a>
                </div>
              </nav>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} 100PrintsWithMe</span>
              <span>Made for browser-based creation.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="benefit">
      <span>
        <CheckIcon />
      </span>
      {text}
    </div>
  );
}

function UseCaseCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <article className="use-case-card">
      <div className="use-case-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5.5 10.4 3 3 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 5.6 14 10l-7 4.4V5.6Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="7" y="6" width="8" height="9" rx="1.5" />
      <path d="M5 12H4.5A1.5 1.5 0 0 1 3 10.5v-6A1.5 1.5 0 0 1 4.5 3h6A1.5 1.5 0 0 1 12 4.5V5" />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.8 16c.9-1.6 4.5-1.6 5.4 0M14 9h4M14 13h4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m5 17 4.8-4.8 3.4 3.4 2.3-2.3L19 17" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5M10 12h5M10 16h5" />
    </svg>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  :root {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #101632;
    background: #f9fbff;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-width: 320px;
    background:
      linear-gradient(180deg, #ffffff 0%, #fbfdff 24%, #f7faff 100%);
    color: #101632;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button,
  a {
    -webkit-tap-highlight-color: transparent;
  }

  a {
    color: inherit;
  }

  svg {
    width: 1em;
    height: 1em;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .page-shell {
    min-height: 100vh;
    overflow: hidden;
  }

  #root {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
    display: block;
  }

  .page-shell h1 {
    background: none;
    -webkit-text-fill-color: currentColor;
  }

  .page-shell h2 {
    display: block;
  }

  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.92);
    border-bottom: 1px solid #e9edf6;
    backdrop-filter: blur(16px);
  }

  .header-inner {
    width: min(1160px, calc(100% - 40px));
    height: 64px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 30px;
  }

  .brand {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .brand img {
    width: 188px;
    max-width: 44vw;
    display: block;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 26px;
  }

  .nav-links a {
    color: #1d2746;
    text-decoration: none;
    font-size: 0.84rem;
    font-weight: 600;
    transition: color 140ms ease;
  }

  .nav-links a:hover {
    color: #2f62ed;
  }

  .nav-links .nav-cta {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    border-radius: 8px;
    background: #2f62ed;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(47, 98, 237, 0.18);
  }

  .nav-links .nav-cta:hover {
    background: #2555d8;
    color: #ffffff;
  }

  main {
    width: min(1160px, calc(100% - 40px));
    margin: 0 auto;
  }

  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 34px;
    padding: 48px 0 54px;
  }

  .hero-copy {
    width: 100%;
    max-width: 1100px;
    text-align: center;
    position: relative;
    z-index: 2;
  }

  .eyebrow {
    display: inline-block;
    color: #2f62ed;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .hero-copy h1 {
    margin: 13px auto 18px;
    max-width: 100%;
    color: #0e1530;
    font-size: clamp(2.25rem, 4.2vw, 3.75rem);
    line-height: 1.06;
    letter-spacing: -0.062em;
    font-weight: 800;
    white-space: nowrap;
  }

  .hero-copy > p {
    max-width: 100%;
    margin: 0 auto;
    color: #5f6b86;
    font-size: clamp(0.85rem, 1.35vw, 1rem);
    line-height: 1.68;
    white-space: nowrap;
  }

  .benefit-row {
    margin-top: 24px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 18px 26px;
  }

  .benefit {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #263252;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .benefit > span {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #eef4ff;
    color: #2f62ed;
  }

  .benefit svg {
    width: 14px;
    height: 14px;
    stroke-width: 2.2;
  }

  .hero-image-wrap {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-image-wrap img {
    width: 100%;
    max-width: 1160px;
    height: auto;
    display: block;
    object-fit: contain;
    filter: drop-shadow(0 22px 34px rgba(31, 55, 104, 0.08));
  }

  .playground-section {
    display: grid;
    grid-template-columns: minmax(0, 1.06fr) minmax(390px, 0.94fr);
    gap: 18px;
    align-items: stretch;
  }

  .playground-card {
    min-width: 0;
    padding: 23px;
    background: #ffffff;
    border: 1px solid #e3e9f4;
    border-radius: 10px;
    box-shadow: 0 6px 22px rgba(32, 51, 91, 0.045);
  }

  .card-head {
    margin-bottom: 20px;
  }

  .card-head h2 {
    margin: 0 0 5px;
    color: #111936;
    font-size: 1.12rem;
    letter-spacing: -0.025em;
  }

  .card-head p {
    margin: 0;
    color: #7b879f;
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .field + .field {
    margin-top: 18px;
  }

  .field-heading {
    min-height: 23px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .field-heading label {
    color: #1c2747;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .field-heading > span {
    color: #8490a8;
    font-family: "DM Mono", monospace;
    font-size: 0.65rem;
  }

  .field-heading a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #2f62ed;
    text-decoration: none;
    font-size: 0.68rem;
    font-weight: 600;
  }

  .field-heading a svg {
    width: 13px;
    height: 13px;
  }

  .field input {
    width: 100%;
    height: 42px;
    padding: 0 13px;
    border: 1px solid #d6deed;
    border-radius: 7px;
    background: #ffffff;
    color: #15203e;
    outline: none;
    transition: border-color 120ms ease, box-shadow 120ms ease;
  }

  .field input:focus {
    border-color: #799cf7;
    box-shadow: 0 0 0 3px rgba(47, 98, 237, 0.08);
  }

  .field small {
    display: block;
    margin-top: 7px;
    color: #8a95aa;
    font-size: 0.66rem;
  }

  .code-editor-shell {
    margin-top: 5px;
    overflow: hidden;
    border-radius: 7px;
    background: #132131;
    border: 1px solid #172538;
  }

  .code-editor-shell textarea {
    width: 100%;
    height: 205px;
    resize: vertical;
    display: block;
    padding: 15px 18px;
    border: 0;
    outline: 0;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.035) 0 36px, transparent 36px),
      #132131;
    color: #dce7f5;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.74rem;
    line-height: 1.65;
  }

  .render-actions {
    display: grid;
    grid-template-columns: 1.08fr 1fr 1fr;
    gap: 9px;
    margin-top: 14px;
  }

  .button {
    min-height: 40px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 7px;
    font-size: 0.74rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: transform 110ms ease, background 110ms ease, border-color 110ms ease;
  }

  .button svg {
    width: 15px;
    height: 15px;
    stroke-width: 2;
  }

  .button:active:not(:disabled) {
    transform: translateY(1px);
  }

  .button:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .primary-button {
    color: #ffffff;
    background: #2f62ed;
    border: 1px solid #2f62ed;
    box-shadow: 0 4px 10px rgba(47, 98, 237, 0.14);
  }

  .primary-button:hover:not(:disabled) {
    background: #2555d8;
    border-color: #2555d8;
  }

  .secondary-button {
    color: #263457;
    background: #ffffff;
    border: 1px solid #d4ddec;
  }

  .secondary-button:hover:not(:disabled) {
    background: #f8faff;
    border-color: #b8c6de;
  }

  .render-status {
    min-height: 35px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding-top: 11px;
    border-top: 1px solid #e7ecf4;
    color: #9099ac;
    font-size: 0.64rem;
  }

  .render-status strong {
    color: #57627b;
    font-weight: 600;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #36b75c;
  }

  .status-divider {
    width: 1px;
    height: 14px;
    margin: 0 4px;
    background: #d6deeb;
  }

  .render-status.is-error,
  .render-status.is-error strong {
    color: #bd3f46;
  }

  .render-status.is-error .status-dot {
    background: #df4f58;
  }

  .output-card {
    display: flex;
    flex-direction: column;
  }

  .preview-stage {
    width: 100%;
    aspect-ratio: 1 / 1;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 18px;
    border-radius: 8px;
    background: #f7f9fd;
    border: 1px solid #e7ecf4;
  }

  .preview-stage > img {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    display: block;
    object-fit: contain;
    filter: drop-shadow(0 13px 16px rgba(22, 36, 69, 0.12));
  }

  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
  }

  .placeholder-sheet {
    width: min(78%, 360px);
    aspect-ratio: 1.35 / 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    background: #ffffff;
    border: 1px solid #e0e5ee;
    box-shadow: 0 13px 24px rgba(24, 43, 79, 0.10);
    text-align: center;
  }

  .placeholder-sheet img {
    width: 118px;
    margin-bottom: 24px;
  }

  .placeholder-sheet span {
    color: #b2bac9;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.17em;
  }

  .placeholder-sheet strong {
    margin-top: 5px;
    color: #243152;
    font-family: Georgia, serif;
    font-size: 1.7rem;
    font-weight: 500;
  }

  .placeholder-sheet p {
    max-width: 210px;
    margin: 9px 0 0;
    color: #9aa4b6;
    font-size: 0.62rem;
    line-height: 1.5;
  }

  .use-cases-section {
    padding: 76px 0 66px;
  }

  .section-copy {
    max-width: 720px;
  }

  .section-copy h2,
  .developer-copy h2 {
    margin: 9px 0 7px;
    color: #101632;
    font-size: clamp(2rem, 4vw, 3.35rem);
    line-height: 1.03;
    letter-spacing: -0.052em;
  }

  .section-copy > p,
  .developer-copy > p {
    max-width: 680px;
    margin: 0;
    color: #6f7b94;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .use-case-grid {
    margin-top: 28px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .use-case-card {
    min-height: 136px;
    padding: 20px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
    background: #ffffff;
    border: 1px solid #e4e9f2;
    border-radius: 8px;
    box-shadow: 0 5px 18px rgba(28, 48, 88, 0.035);
  }

  .use-case-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #edf3ff;
    color: #2f62ed;
  }

  .use-case-icon svg {
    width: 26px;
    height: 26px;
    stroke-width: 1.7;
  }

  .use-case-card h3 {
    margin: 4px 0 7px;
    color: #18213c;
    font-size: 0.91rem;
  }

  .use-case-card p {
    margin: 0;
    color: #768199;
    font-size: 0.74rem;
    line-height: 1.55;
  }

  .commerce-showcase {
    margin-top: 30px;
    padding: 34px;
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(480px, 1.1fr);
    gap: 40px;
    align-items: center;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #e4e9f2;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(28, 48, 88, 0.045);
  }

  .showcase-kicker {
    color: #2f62ed;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .commerce-copy h3 {
    max-width: 540px;
    margin: 9px 0 12px;
    color: #101632;
    font-size: clamp(1.8rem, 3.4vw, 3rem);
    line-height: 1.04;
    letter-spacing: -0.045em;
  }

  .commerce-copy > p {
    max-width: 560px;
    margin: 0;
    color: #6f7b94;
    font-size: 0.86rem;
    line-height: 1.7;
  }

  .commerce-code {
    margin-top: 24px;
    overflow: hidden;
    border-radius: 8px;
    background: #151c2c;
    box-shadow: 0 14px 26px rgba(20, 29, 49, 0.12);
  }

  .commerce-code-bar {
    min-height: 34px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 7px;
    background: #202737;
    border-bottom: 1px solid #2b3448;
  }

  .commerce-code-bar span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff6961;
  }

  .commerce-code-bar span:nth-child(2) { background: #f5d76e; }
  .commerce-code-bar span:nth-child(3) { background: #54d98c; }

  .commerce-code-bar small {
    margin-left: auto;
    color: #8892a7;
    font-size: 0.62rem;
  }

  .commerce-code pre {
    margin: 0;
    padding: 17px 18px 19px;
    overflow-x: auto;
    color: #dbe7f5;
    font: 0.69rem/1.65 "DM Mono", ui-monospace, monospace;
  }

  .campaign-results {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    align-items: end;
    position: relative;
  }

  .campaign-results::before {
    content: "";
    position: absolute;
    width: 88%;
    height: 70%;
    left: 6%;
    bottom: -8%;
    background: radial-gradient(circle, rgba(47,98,237,0.14), transparent 68%);
    filter: blur(22px);
    z-index: 0;
  }

  .campaign-card {
    min-width: 0;
    aspect-ratio: 0.76 / 1;
    padding: 13px 11px 11px;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 16px 27px rgba(35, 50, 88, 0.13);
  }

  .campaign-card:nth-child(1) { transform: rotate(-3deg) translateY(13px); }
  .campaign-card:nth-child(2) { transform: rotate(1deg); }
  .campaign-card:nth-child(3) { transform: rotate(-1deg) translateY(7px); }
  .campaign-card:nth-child(4) { transform: rotate(3deg) translateY(18px); }

  .campaign-topline {
    color: #ffffff;
    font-size: clamp(0.55rem, 1vw, 0.75rem);
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .campaign-card strong {
    margin-top: 2px;
    color: #ffffff;
    font-size: clamp(0.88rem, 1.4vw, 1.25rem);
    line-height: 1;
  }

  .campaign-card small {
    margin-top: auto;
    align-self: flex-start;
    padding: 5px 7px;
    border-radius: 4px;
    background: #ffffff;
    color: #17213f;
    font-size: 0.48rem;
    font-weight: 800;
  }

  .campaign-pink {
    background: linear-gradient(150deg, #ff2cb3 0 50%, #ff813b 50% 100%);
  }

  .campaign-orange {
    background: linear-gradient(155deg, #ff8a28 0 47%, #ffca2c 47% 100%);
  }

  .campaign-blue {
    background: linear-gradient(155deg, #3266ed 0 52%, #6e5cf2 52% 100%);
  }

  .campaign-violet {
    background: linear-gradient(155deg, #7655ee 0 46%, #e349b6 46% 100%);
  }

  .campaign-product {
    width: 72%;
    aspect-ratio: 1 / 1;
    margin: auto;
    border-radius: 50%;
    position: relative;
    background: rgba(255,255,255,0.94);
    box-shadow: inset 0 0 0 5px rgba(255,255,255,0.24);
  }

  .campaign-product::before,
  .campaign-product::after {
    content: "";
    position: absolute;
    border-radius: 999px;
  }

  .campaign-product-one::before {
    width: 62%;
    height: 30%;
    left: 20%;
    top: 39%;
    background: #111a35;
    transform: rotate(-18deg);
  }

  .campaign-product-one::after {
    width: 44%;
    height: 13%;
    left: 32%;
    top: 33%;
    background: #ffffff;
    border: 4px solid #111a35;
  }

  .campaign-product-two::before {
    width: 62%;
    height: 62%;
    left: 19%;
    top: 18%;
    background: linear-gradient(135deg, #ffffff 0 48%, #ef5c37 48%);
    border-radius: 18px;
    transform: rotate(10deg);
  }

  .campaign-product-two::after {
    width: 26%;
    height: 26%;
    right: 12%;
    top: 8%;
    background: #2f62ed;
  }

  .campaign-product-three::before {
    width: 67%;
    height: 28%;
    left: 18%;
    top: 39%;
    background: #eef2f8;
    border: 4px solid #d7dfec;
    transform: rotate(-18deg);
  }

  .campaign-product-three::after {
    width: 36%;
    height: 14%;
    left: 31%;
    top: 48%;
    background: #80a2e9;
    transform: rotate(-18deg);
  }

  .campaign-product-four::before {
    width: 30%;
    height: 54%;
    left: 35%;
    top: 23%;
    background: #101632;
    border-radius: 12px;
  }

  .campaign-product-four::after {
    width: 18%;
    height: 18%;
    left: 41%;
    top: 17%;
    background: #f1c27d;
    border-radius: 50%;
  }

  .supporting-use-cases {
    margin-top: 18px;
  }

  .features-showcase {
    margin: 10px 0 74px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid #dfe5ef;
    border-bottom: 1px solid #dfe5ef;
    background: #ffffff;
  }

  .feature-intro,
  .feature-list-wrap {
    padding: 58px 52px;
  }

  .feature-intro {
    border-right: 1px solid #dfe5ef;
  }

  .feature-intro h2,
  .feature-list-wrap h3 {
    margin: 10px 0 18px;
    color: #101632;
    letter-spacing: -0.045em;
  }

  .feature-intro h2 {
    max-width: 540px;
    font-size: clamp(2.1rem, 4.2vw, 3.8rem);
    line-height: 1.03;
  }

  .feature-intro p {
    max-width: 570px;
    margin: 0;
    color: #56627b;
    font-size: clamp(1rem, 1.7vw, 1.2rem);
    line-height: 1.75;
  }

  .feature-list-wrap h3 {
    font-size: clamp(1.85rem, 3vw, 2.8rem);
    line-height: 1.05;
  }

  .feature-list {
    margin: 25px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 14px;
  }

  .feature-list li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    color: #202943;
    font-size: 0.96rem;
    line-height: 1.45;
  }

  .feature-list li > span {
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    display: grid;
    place-items: center;
    margin-top: 1px;
    color: #159447;
  }

  .feature-list svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.4;
  }

  .developer-section {
    margin-bottom: 70px;
    padding: 30px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(400px, 0.96fr);
    gap: 46px;
    align-items: center;
    background: linear-gradient(135deg, #f2f6ff 0%, #f8faff 100%);
    border: 1px solid #e4eaf5;
    border-radius: 10px;
  }

  .developer-copy h2 {
    font-size: clamp(1.85rem, 3.5vw, 2.8rem);
  }

  .developer-copy > p {
    max-width: 560px;
    font-size: 0.8rem;
  }

  .developer-actions {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: 20px;
  }

  .developer-actions .primary-button {
    min-height: 42px;
  }

  .text-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #33415f;
    text-decoration: none;
    font-size: 0.74rem;
    font-weight: 700;
  }

  .text-link:hover {
    color: #2f62ed;
  }

  .install-panel {
    overflow: hidden;
    background: #132131;
    border: 1px solid #24374b;
    border-radius: 8px;
    box-shadow: 0 13px 30px rgba(23, 37, 65, 0.09);
  }

  .install-tabs {
    min-height: 40px;
    padding: 0 10px 0 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border-bottom: 1px solid #e3e8f0;
  }

  .install-tabs > div {
    display: flex;
    height: 40px;
  }

  .install-tabs button {
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .install-tabs > div button {
    position: relative;
    padding: 0 14px;
    color: #7a8498;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .install-tabs > div button.active {
    color: #2f62ed;
  }

  .install-tabs > div button.active::after {
    content: "";
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 0;
    height: 2px;
    background: #2f62ed;
  }

  .copy-button {
    min-width: 48px;
    display: grid;
    place-items: center;
    color: #768196;
    font-size: 0.65rem;
  }

  .copy-button svg {
    width: 16px;
    height: 16px;
  }

  .install-panel pre {
    margin: 0;
    padding: 22px 20px 17px;
    color: #f2f6fb;
    overflow-x: auto;
    font-family: "DM Mono", ui-monospace, monospace;
    font-size: 0.72rem;
  }

  .install-panel pre code::before {
    content: "$ ";
    color: #efc56c;
  }

  .mini-code {
    padding: 0 20px 19px;
    display: grid;
    gap: 6px;
    font-family: "DM Mono", ui-monospace, monospace;
    font-size: 0.57rem;
  }

  .mini-line {
    color: #84c5a0;
  }

  .mini-blue {
    color: #85b4ff;
  }

  footer {
    border-top: 1px solid #e4eaf4;
    background: #f6f8fc;
  }

  .footer-inner {
    width: min(1160px, calc(100% - 40px));
    margin: 0 auto;
    color: #78839a;
    font-size: 0.76rem;
  }

  .footer-cta {
    margin-top: 42px;
    padding: 32px 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    border-radius: 16px;
    background: linear-gradient(115deg, #152655 0%, #2459c4 100%);
    box-shadow: 0 18px 36px rgba(25, 60, 132, 0.14);
  }

  .footer-cta-label {
    color: #a9c5ff;
    font-size: 0.67rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .footer-cta h2 {
    margin: 8px 0 7px;
    color: #ffffff;
    font-size: clamp(1.35rem, 2.4vw, 2rem);
    letter-spacing: -0.04em;
    line-height: 1.15;
  }

  .footer-cta p {
    color: #d2dfff;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .footer-cta > a {
    min-height: 44px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    flex: 0 0 auto;
    border-radius: 8px;
    background: #ffffff;
    color: #1b45a3;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 140ms ease, transform 140ms ease;
  }

  .footer-cta > a:hover {
    background: #eaf1ff;
    transform: translateY(-2px);
  }

  .footer-top {
    padding: 48px 0 42px;
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 56px;
  }

  .footer-brand {
    max-width: 330px;
  }

  .footer-brand img {
    width: 188px;
    max-width: 100%;
    display: block;
  }

  .footer-brand p {
    margin: 16px 0 0;
    color: #66738e;
    font-size: 0.83rem;
    line-height: 1.65;
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 50px;
  }

  .footer-links div {
    min-width: 145px;
    display: grid;
    align-content: start;
    gap: 13px;
  }

  .footer-links strong {
    color: #1d2746;
    font-size: 0.79rem;
  }

  .footer-links a {
    color: #66738e;
    font-size: 0.79rem;
    text-decoration: none;
    transition: color 140ms ease;
  }

  .footer-links a:hover {
    color: #2f62ed;
  }

  .footer-bottom {
    min-height: 58px;
    border-top: 1px solid #dfe6f1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  @media (max-width: 1120px) {
    .commerce-showcase {
      grid-template-columns: 1fr;
    }

    .campaign-results {
      max-width: 760px;
      width: 100%;
      margin: 0 auto;
    }
  }

  @media (max-width: 1000px) {
    .hero-section {
      padding-top: 44px;
    }

    .playground-section {
      grid-template-columns: 1fr;
    }

    .output-card {
      min-height: 620px;
    }

    .preview-stage {
      max-height: 560px;
    }

    .developer-section {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .header-inner,
    main,
    .footer-inner {
      width: min(100% - 24px, 1160px);
    }

    .header-inner {
      height: auto;
      min-height: 66px;
    }

    .brand img {
      width: 156px;
    }

    .nav-links {
      gap: 13px;
    }

    .nav-links a {
      font-size: 0.73rem;
    }

    .nav-links .nav-cta {
      display: none;
    }

    .hero-section {
      padding-top: 38px;
    }

    .hero-copy h1 {
      font-size: clamp(2.25rem, 8vw, 3.5rem);
      white-space: normal;
    }

    .hero-copy > p {
      white-space: normal;
    }

    .render-actions {
      grid-template-columns: 1fr;
    }

    .render-status {
      flex-wrap: wrap;
    }

    .status-divider {
      display: none;
    }

    .use-case-grid {
      grid-template-columns: 1fr;
    }

    .commerce-showcase {
      padding: 22px;
      gap: 28px;
    }

    .campaign-results {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .campaign-card:nth-child(n) {
      transform: none;
    }

    .features-showcase {
      grid-template-columns: 1fr;
      margin-bottom: 58px;
    }

    .feature-intro,
    .feature-list-wrap {
      padding: 38px 24px;
    }

    .feature-intro {
      border-right: 0;
      border-bottom: 1px solid #dfe5ef;
    }

    .use-case-card {
      min-height: 0;
    }

    .developer-section {
      padding: 22px;
      gap: 28px;
    }

    .footer-inner {
      padding: 0;
    }

    .footer-cta {
      margin-top: 28px;
      padding: 28px;
      flex-direction: column;
      align-items: flex-start;
    }

    .footer-top {
      flex-direction: column;
      gap: 30px;
      padding: 36px 0;
    }

    .footer-bottom {
      flex-wrap: wrap;
      padding: 18px 0;
    }
  }

  @media (max-width: 520px) {
    .nav-links {
      gap: 10px;
    }

    .nav-links a:nth-child(3) {
      display: none;
    }

    .hero-section {
      gap: 22px;
      padding: 32px 0 38px;
    }

    .benefit-row {
      align-items: center;
      flex-direction: column;
      gap: 12px;
    }

    .footer-links {
      gap: 32px;
    }

    .footer-cta {
      padding: 24px;
    }

    .footer-cta > a {
      width: 100%;
    }

    .footer-links div {
      min-width: 120px;
    }

    .footer-bottom {
      align-items: flex-start;
      flex-direction: column;
      gap: 7px;
    }

    .playground-card {
      padding: 17px;
    }

    .field-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
    }

    .output-card {
      min-height: 460px;
    }

    .preview-stage {
      padding: 10px;
    }

    .developer-actions {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;
