import { useState } from "react";
import { shroud, unshroud } from "../lib/crypto";

type Mode = "shroud" | "unshroud";

export function ShroudConsole() {
  const [mode, setMode] = useState<Mode>("shroud");
  const [message, setMessage] = useState("Meet me at the old lighthouse, midnight.");
  const [passphrase, setPassphrase] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const isShroud = mode === "shroud";

  async function handleRun() {
    setError("");
    setOutput("");
    setCopied(false);

    if (!passphrase) {
      setError("Enter a passphrase to derive your key.");
      return;
    }
    if (!message.trim()) {
      setError(isShroud ? "Type a message to shroud." : "Paste a token to unshroud.");
      return;
    }

    setBusy(true);
    try {
      const result = isShroud
        ? await shroud(message, passphrase)
        : await unshroud(message, passphrase);
      setOutput(result);
    } catch {
      setError(
        isShroud
          ? "Encryption failed. Please try again."
          : "Could not unshroud. Check the token and passphrase.",
      );
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setError("");
    setCopied(false);
    // Chain the workflow: the output of one mode becomes the input of the other.
    if (output) {
      setMessage(output);
      setOutput("");
    }
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard unavailable in this context.");
    }
  }

  return (
    <section id="console" className="console" aria-label="Encryption console">
      <div className="console__chrome">
        <span className="console__dot console__dot--red" />
        <span className="console__dot console__dot--amber" />
        <span className="console__dot console__dot--green" />
        <span className="console__title">shroud://console</span>
      </div>

      <div className="console__body">
        <div className="toggle" role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={isShroud}
            className={`toggle__btn ${isShroud ? "is-active" : ""}`}
            onClick={() => switchMode("shroud")}
          >
            Shroud
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isShroud}
            className={`toggle__btn ${!isShroud ? "is-active" : ""}`}
            onClick={() => switchMode("unshroud")}
          >
            Unshroud
          </button>
        </div>

        <label className="field">
          <span className="field__label">
            {isShroud ? "Plain message" : "Shrouded token"}
          </span>
          <textarea
            className="field__input field__input--area"
            value={message}
            spellCheck={false}
            placeholder={isShroud ? "Type your secret…" : "Paste a SHROUD token…"}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Passphrase</span>
          <input
            className="field__input"
            type="password"
            value={passphrase}
            placeholder="Shared secret"
            autoComplete="off"
            onChange={(event) => setPassphrase(event.target.value)}
          />
        </label>

        <button type="button" className="run" onClick={handleRun} disabled={busy}>
          {busy ? "Working…" : isShroud ? "Shroud message" : "Reveal message"}
        </button>

        {error && (
          <p className="console__error" role="alert">
            {error}
          </p>
        )}

        {output && (
          <div className="output">
            <div className="output__head">
              <span className="field__label">
                {isShroud ? "Shrouded token" : "Revealed message"}
              </span>
              <button type="button" className="output__copy" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="output__value">{output}</pre>
          </div>
        )}
      </div>
    </section>
  );
}
