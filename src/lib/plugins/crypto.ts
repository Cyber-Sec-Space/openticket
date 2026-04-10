import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "00000000000000000000000000000000";
const ALGO = "aes-256-gcm";
const PREFIX = "enc.v1.";

// Ensure key is exactly 32 bytes for AES-256
const getKey = () => crypto.createHash("sha256").update(SECRET).digest();

export function encryptPluginConfig(configObject: any): string {
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

export function parsePluginConfig(rawConfigStr: string): any {
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
    
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedB64, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return JSON.parse(decrypted);
  } catch (err) {
    console.error("[Plugin Crypto] Decryption failed. Did the app secret change?", err);
    return {};
  }
}
