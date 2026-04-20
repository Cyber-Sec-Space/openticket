import { encryptString, decryptString, encryptPluginConfig, parsePluginConfig } from "./crypto";

describe("Plugin Crypto Module", () => {
  describe("encryptString and decryptString", () => {
    it("should accurately encrypt and decrypt a plaintext string", () => {
      const plaintext = "my-super-secret-smtp-password";
      const encrypted = encryptString(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain("enc.v1.");
      
      const decrypted = decryptString(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should return the input if empty or falsy", () => {
      expect(encryptString("")).toBe("");
      expect(decryptString("")).toBe("");
    });

    it("should fallback to plaintext if decryptString is called on unencrypted text", () => {
      const plain = "not-encrypted-string";
      expect(decryptString(plain)).toBe(plain);
    });

    it("should handle corrupted ciphertexts gracefully", () => {
      const corrupted = "enc.v1.invalidbase64.authtag.payload";
      expect(decryptString(corrupted)).toBe(corrupted);
    });
  });

  describe("Key Vault Rotation", () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.ENCRYPTION_KEY_VAULT;
      jest.resetModules();
    });

    afterEach(() => {
      process.env.ENCRYPTION_KEY_VAULT = originalEnv;
    });

    it("initializes vault with ENCRYPTION_KEY_VAULT correctly", () => {
      process.env.ENCRYPTION_KEY_VAULT = "v2:new-secret-key,v1:old-secret-key";
      
      const cryptoMod = require("./crypto");
      
      const config = { test: true };
      const encrypted = cryptoMod.encryptPluginConfig(config);
      
      expect(encrypted).toContain("enc.v2."); // It should use v2 now
      
      const decrypted = cryptoMod.parsePluginConfig(encrypted);
      expect(decrypted).toEqual(config);
    });

    it("catches errors during vault parsing silently", () => {
      // Create a corrupted key string that splits poorly or throws error
      process.env.ENCRYPTION_KEY_VAULT = undefined as any; 
      
      // Actually the try-catch in crypto.ts is for standard parsing errors, 
      // but splitting doesn't fail unless it's not a string. 
      // Let's redefine it as an object to trigger a parse error on split
      Object.defineProperty(process.env, "ENCRYPTION_KEY_VAULT", {
        value: { split: () => { throw new Error("Parse Error") } },
        writable: true
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const cryptoMod = require("./crypto");
      const encrypted = cryptoMod.encryptPluginConfig({ test: true });
      
      expect(consoleSpy).toHaveBeenCalledWith("[Plugin Crypto] Failed to parse ENCRYPTION_KEY_VAULT", expect.any(Error));
      expect(encrypted).toContain("enc.v1.");
      consoleSpy.mockRestore();
    });
  });
});
