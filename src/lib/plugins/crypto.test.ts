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

  describe("encryptPluginConfig and parsePluginConfig", () => {
    it("should encrypt and decrypt full JSON objects", () => {
      const config = { apiToken: "12345", endpoint: "https://api.example.com" };
      const encrypted = encryptPluginConfig(config);
      
      expect(encrypted).toContain("enc.v1.");

      const parsed = parsePluginConfig(encrypted);
      expect(parsed).toEqual(config);
    });
  });
});
