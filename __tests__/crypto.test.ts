import { encryptPluginConfig, parsePluginConfig } from "../src/lib/plugins/crypto";

describe("Crypto Architecture", () => {
  const originalEnv = process.env.NEXTAUTH_SECRET;

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "supersecret1234567890supersecret1234567890";
  });

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = originalEnv;
  });

  it("should encrypt and decrypt correctly", () => {
    const config = { apiToken: "12345", endpoint: "https://example.com" };
    const encrypted = encryptPluginConfig(config);
    expect(encrypted).toMatch(/^enc\.v1\./);
    
    expect(parsePluginConfig(encrypted)).toEqual(config);
  });

  it("should successfully parse legacy plaintext JSON", () => {
    const config = { legacy: true };
    const plain = JSON.stringify(config);
    expect(parsePluginConfig(plain)).toEqual(config);
  });

  it("should return empty object on malformed plaintext JSON", () => {
    expect(parsePluginConfig("{badjson}")).toEqual({});
  });

  it("should return empty object on bad encrypted format", () => {
    expect(parsePluginConfig("enc.v1.invalid")).toEqual({});
  });

  it("should throw or return empty when tampering with encrypted payload", () => {
    const config = { apiToken: "12345" };
    const encrypted = encryptPluginConfig(config);
    const parts = encrypted.split(".");
    
    // Tamper the IV
    const tamperedIv = `enc.v1.invalidIv.${parts[3]}.${parts[4]}`;
    expect(parsePluginConfig(tamperedIv)).toEqual({});
    
    // Tamper the ciphertext
    const tamperedCipher = `enc.v1.${parts[2]}.badciphertext.${parts[4]}`;
    expect(parsePluginConfig(tamperedCipher)).toEqual({});
    
    // Tamper the auth tag
    const tamperedTag = `enc.v1.${parts[2]}.${parts[3]}.badtag=`;
    expect(parsePluginConfig(tamperedTag)).toEqual({});
  });
});
