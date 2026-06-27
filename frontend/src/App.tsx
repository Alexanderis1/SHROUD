import { ShroudConsole } from "./components/ShroudConsole";

const features = [
  {
    title: "Zero-knowledge by design",
    body: "Keys are derived from your passphrase with PBKDF2 and never leave the device. We can't read what we can't see.",
    glyph: "◍",
  },
  {
    title: "AES-256-GCM",
    body: "Every message is sealed with authenticated encryption, so tampering is detected the moment it happens.",
    glyph: "⬡",
  },
  {
    title: "Runs in your browser",
    body: "All cryptography happens locally with the native Web Crypto API. No servers, no logs, no trace.",
    glyph: "❖",
  },
];

const steps = [
  { n: "01", label: "Write your message" },
  { n: "02", label: "Choose a passphrase" },
  { n: "03", label: "Share the shrouded token" },
];

function App() {
  return (
    <div className="page">
      <div className="aurora" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />

      <header className="nav">
        <a className="brand" href="#top">
          <span className="brand__mark" aria-hidden="true">
            ◐
          </span>
          <span className="brand__name">SHROUD</span>
        </a>
        <nav className="nav__links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a className="nav__cta" href="#console">
            Open console
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <p className="hero__eyebrow">Private messaging, unmasked for no one</p>
          <h1 className="hero__title">
            Wrap your words in a <span className="hero__accent">shroud</span>.
          </h1>
          <p className="hero__lede">
            SHROUD turns any message into an encrypted token that only your passphrase can
            unlock. End-to-end privacy, entirely in your browser.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#console">
              Try the console
            </a>
            <a className="btn btn--ghost" href="#how">
              See how it works
            </a>
          </div>

          <ShroudConsole />
        </section>

        <section id="features" className="features">
          <h2 className="section__title">Built for secrecy</h2>
          <div className="features__grid">
            {features.map((feature) => (
              <article key={feature.title} className="card">
                <span className="card__glyph" aria-hidden="true">
                  {feature.glyph}
                </span>
                <h3 className="card__title">{feature.title}</h3>
                <p className="card__body">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="how">
          <h2 className="section__title">Three steps to silence</h2>
          <ol className="steps">
            {steps.map((step) => (
              <li key={step.n} className="step">
                <span className="step__n">{step.n}</span>
                <span className="step__label">{step.label}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="footer">
        <span className="brand__mark" aria-hidden="true">
          ◐
        </span>
        <p>SHROUD — encryption that disappears.</p>
      </footer>
    </div>
  );
}

export default App;
