// Crypto layer for the /root/.real puzzle.
//
// ⚠️ NOT FOR REAL SECRETS. This is theatrical-grade crypto for a public
// puzzle: the password is a hint-derivable phrase the puzzle is *designed*
// to leak, the SHA-256(password) key derivation skips PBKDF2/Argon2 on
// purpose (a stretched KDF would only slow down the intended player), and
// both the ciphertext and IV ship in the public JS bundle. Don't reach for
// `verifyPassword` or `decryptPitch` to protect anything that actually
// matters — credentials, tokens, PII. Wire those through a server route
// against a real password hashing function (argon2id, scrypt) instead.
//
// Two functions, both backed by Web Crypto (`crypto.subtle`):
//   verifyPassword(input, expectedHash)
//     SHA-256 the user's input and constant-time compare against the hash
//     stored in elijah.ts.
//   decryptPitch(password, ciphertextB64, ivB64)
//     AES-GCM decrypt the ciphertext using a key derived as SHA-256(password).
//     Returns the decoded string[] on success, null on any failure.
//
// The bundle therefore exposes only a SHA-256 hex string, a base64 ciphertext,
// and a base64 IV — searching the source for `leverage`, `wobbles`,
// `.real` or the candid pitch returns nothing useful.

const enc = new TextEncoder();
const dec = new TextDecoder();

// Decodes base64 to a fresh ArrayBuffer. ArrayBuffer (not Uint8Array) keeps
// the WebCrypto call sites simple under TypeScript 5.7+'s narrower DOM
// types (which want BufferSource backed by ArrayBuffer specifically, not
// ArrayBufferLike).
function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", enc.encode(input));
}

// Constant-time string compare. Both sides are hex digests of equal length in
// our use, but we still guard against length differences.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return acc === 0;
}

export async function verifyPassword(
  input: string,
  expectedHash: string,
): Promise<boolean> {
  const hash = toHex(await sha256(input));
  return constantTimeEqual(hash, expectedHash);
}

export async function decryptPitch(
  password: string,
  ciphertextB64: string,
  ivB64: string,
): Promise<string[] | null> {
  try {
    const keyBytes = await sha256(password);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivB64) },
      key,
      fromBase64(ciphertextB64),
    );
    const text = dec.decode(plaintext);
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === "string")) {
      return null;
    }
    return parsed as string[];
  } catch {
    return null;
  }
}
