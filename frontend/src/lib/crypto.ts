// Client-side message encryption for SHROUD.
//
// Uses the Web Crypto API: a 256-bit AES-GCM key is derived from the
// passphrase with PBKDF2 (SHA-256). The salt and IV are random per message and
// are packed alongside the ciphertext so a single self-contained token can be
// shared and later decrypted with the same passphrase.

const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function shroud(message: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(message),
  );

  const cipherBytes = new Uint8Array(cipher);
  const packed = new Uint8Array(salt.length + iv.length + cipherBytes.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(cipherBytes, salt.length + iv.length);

  return toBase64(packed);
}

export async function unshroud(token: string, passphrase: string): Promise<string> {
  const packed = fromBase64(token.trim());
  if (packed.length <= SALT_BYTES + IV_BYTES) {
    throw new Error("This token is too short to be a valid SHROUD message.");
  }

  const salt = packed.slice(0, SALT_BYTES);
  const iv = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const cipherBytes = packed.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(passphrase, salt);

  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  return decoder.decode(plain);
}
