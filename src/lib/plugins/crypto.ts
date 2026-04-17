import crypto from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc.v1.";
const LEGACY_FALLBACK_SECRET = process.env.LEGACY_FALLBACK_SECRET || "0".repeat(32);

// Ensure key is exactly 32 bytes for AES-256
const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[Plugin Crypto] Missing NEXTAUTH_SECRET/AUTH_SECRET. Refusing to use insecure fallback secret.",
    );
  }
  return secret;
};

const getKey = () => crypto.createHash("sha256").update(getSecret()).digest();
const getLegacyFallbackKey = () => crypto.createHash("sha256").update(LEGACY_FALLBACK_SECRET).digest();

export function encryptPluginConfig(configObject: Record<string, unknown> | null | undefined): string {
  if (!configObject) return PREFIX;
  const jsonStr = JSON.stringify(configObject);
  const iv = crypto.randomBytes(12); // Standard 96-bit for GCM
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  
  let encrypted = cipher.update(jsonStr, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  // Format: enc.v1.[iv_base64].[authTag_base64].[encrypted_payload_base64]
  return `${PREFIX}${iv.toString("base64")}.${authTag}.${encrypted}`;
}

export function parsePluginConfig(rawConfigStr: string): Record<string, unknown> {
  if (!rawConfigStr) return {};
  
  if (!rawConfigStr.startsWith(PREFIX)) {
    // Legacy mapping fallback (Plain Text)
    try {
      return JSON.parse(rawConfigStr);
    } catch {
      return {};
    }
  }

  try {
    const parts = rawConfigStr.slice(PREFIX.length).split(".");
    if (parts.length !== 3) return {}; // Invalid format

    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    
    let decrypted = "";
    try {
      const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
      decipher.setAuthTag(authTag);
      decrypted = decipher.update(encryptedB64, "base64", "utf8");
      decrypted += decipher.final("utf8");
    } catch {
      // Backward compatibility for legacy data encrypted with the removed insecure fallback.
      const legacyDecipher = crypto.createDecipheriv(ALGO, getLegacyFallbackKey(), iv);
      legacyDecipher.setAuthTag(authTag);
      decrypted = legacyDecipher.update(encryptedB64, "base64", "utf8");
      decrypted += legacyDecipher.final("utf8");
    }
    
    return JSON.parse(decrypted);
  } catch (err) {
    console.error("[Plugin Crypto] Decryption failed. Did the app secret change?", err);
    return {};
  }
}

export function encryptString(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return `${PREFIX}${iv.toString("base64")}.${authTag}.${encrypted}`;
}

export function decryptString(rawStr: string): string {
  if (!rawStr || !rawStr.startsWith(PREFIX)) return rawStr;
  
  try {
    const parts = rawStr.slice(PREFIX.length).split(".");
    if (parts.length !== 3) return rawStr;

    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedB64, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("[Plugin Crypto] String decryption failed.", err);
    return rawStr;
  }
}
