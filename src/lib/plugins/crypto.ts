import crypto from "crypto";

const ALGO = "aes-256-gcm";
const LEGACY_FALLBACK_SECRET = process.env.LEGACY_FALLBACK_SECRET || "0".repeat(32);

// Vault: {"v1": "secret1", "v2": "secret2"}
let keyVault: Record<string, Buffer> | null = null;
let currentVersion = "v1";

const initVault = () => {
  if (keyVault) return;
  keyVault = {};
  
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[Plugin Crypto] Missing NEXTAUTH_SECRET/AUTH_SECRET. Refusing to use insecure fallback secret."
    );
  }
  
  // v1 is always the default NEXTAUTH_SECRET for backwards compatibility
  keyVault["v1"] = crypto.createHash("sha256").update(secret).digest();

  // Parse ENCRYPTION_KEY_VAULT if provided (Format: "v2:new_secret,v1:old_secret")
  // The first key in the list becomes the new "currentVersion" used for all new encryptions
  if (process.env.ENCRYPTION_KEY_VAULT) {
    try {
      const parts = process.env.ENCRYPTION_KEY_VAULT.split(",");
      parts.forEach((part, index) => {
        const [id, ...keyParts] = part.split(":");
        const keyStr = keyParts.join(":");
        if (id && keyStr) {
          keyVault![id.trim()] = crypto.createHash("sha256").update(keyStr.trim()).digest();
          if (index === 0) {
            currentVersion = id.trim();
          }
        }
      });
    } catch (err) {
      console.error("[Plugin Crypto] Failed to parse ENCRYPTION_KEY_VAULT", err);
    }
  }
};

const getKeyForVersion = (version: string): Buffer => {
  initVault();
  return keyVault![version] || keyVault!["v1"];
};

const getCurrentKey = (): Buffer => {
  initVault();
  return keyVault![currentVersion];
};

const getLegacyFallbackKey = () => crypto.createHash("sha256").update(LEGACY_FALLBACK_SECRET).digest();

export function encryptPluginConfig(configObject: Record<string, unknown> | null | undefined): string {
  if (!configObject) return `enc.${currentVersion}.`;
  const jsonStr = JSON.stringify(configObject);
  const iv = crypto.randomBytes(12); // Standard 96-bit for GCM
  const cipher = crypto.createCipheriv(ALGO, getCurrentKey(), iv);
  
  let encrypted = cipher.update(jsonStr, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  // Format: enc.[version].[iv_base64].[authTag_base64].[encrypted_payload_base64]
  return `enc.${currentVersion}.${iv.toString("base64")}.${authTag}.${encrypted}`;
}

export function parsePluginConfig(rawConfigStr: string): Record<string, unknown> {
  if (!rawConfigStr) return {};
  
  if (!rawConfigStr.startsWith("enc.")) {
    // Legacy mapping fallback (Plain Text)
    try {
      return JSON.parse(rawConfigStr);
    } catch {
      return {};
    }
  }

  try {
    const parts = rawConfigStr.split(".");
    // Format: enc.v1.[iv].[tag].[data]
    if (parts.length !== 5) return {}; // Invalid format

    const version = parts[1];
    const iv = Buffer.from(parts[2], "base64");
    const authTag = Buffer.from(parts[3], "base64");
    const encryptedB64 = parts[4];
    
    let decrypted = "";
    try {
      const decipher = crypto.createDecipheriv(ALGO, getKeyForVersion(version), iv);
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
    console.error("[Plugin Crypto] Decryption failed.", err);
    return {};
  }
}

export function encryptString(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getCurrentKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return `enc.${currentVersion}.${iv.toString("base64")}.${authTag}.${encrypted}`;
}

export function decryptString(rawStr: string): string {
  if (!rawStr || !rawStr.startsWith("enc.")) return rawStr;
  
  try {
    const parts = rawStr.split(".");
    if (parts.length !== 5) return rawStr;

    const version = parts[1];
    const iv = Buffer.from(parts[2], "base64");
    const authTag = Buffer.from(parts[3], "base64");
    const encryptedB64 = parts[4];
    
    const decipher = crypto.createDecipheriv(ALGO, getKeyForVersion(version), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedB64, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("[Plugin Crypto] String decryption failed.", err);
    return rawStr;
  }
}
