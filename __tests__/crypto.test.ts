import { encryptPluginConfig, parsePluginConfig, encryptString, decryptString } from "../src/lib/plugins/crypto"

describe("Crypto Utils", () => {
  it("encrypts and decrypts plugin config", () => {
    const config = { test: "val", nested: { num: 1 } }
    const encrypted = encryptPluginConfig(config)
    expect(encrypted).toContain("enc.v1.")
    
    const decrypted = parsePluginConfig(encrypted)
    expect(decrypted).toEqual(config)
  })

  it("handles null undefined in plugin config", () => {
    expect(encryptPluginConfig(null)).toBe("enc.v1.")
    expect(parsePluginConfig("")).toEqual({})
    expect(parsePluginConfig("invalid format")).toEqual({})
    expect(parsePluginConfig("enc.v1.invalid.format")).toEqual({}) // parts !== 3
    expect(parsePluginConfig("enc.v1.invalid.format.stuff")).toEqual({})
    expect(parsePluginConfig("enc.v1.bad.bad.bad")).toEqual({}) // catch block
  })

  it("handles missing NEXTAUTH_SECRET fallback", () => {
    jest.isolateModules(() => {
        const og = process.env.NEXTAUTH_SECRET
        delete process.env.NEXTAUTH_SECRET
        const crypto2 = require("../src/lib/plugins/crypto")
        expect(crypto2.encryptString("test")).toContain("enc.v1.")
        process.env.NEXTAUTH_SECRET = og
    })
  })

  it("handles legacy plain text json", () => {
    expect(parsePluginConfig('{"legacy": true}')).toEqual({ legacy: true })
    expect(parsePluginConfig('{bad json')).toEqual({})
  })

  it("encrypts and decrypts string", () => {
    const text = "super_secret"
    const encrypted = encryptString(text)
    expect(encrypted).toContain("enc.v1.")
    expect(encrypted).not.toEqual(text)
    
    const decrypted = decryptString(encrypted)
    expect(decrypted).toBe(text)
  })

  it("handles empty or invalid string inputs", () => {
    expect(encryptString("")).toBe("")
    expect(decryptString("")).toBe("")
    expect(decryptString("not encrypted")).toBe("not encrypted")
    expect(decryptString("enc.v1.invalid.format")).toBe("enc.v1.invalid.format")
    expect(decryptString("enc.v1.bad.bad.bad")).toBe("enc.v1.bad.bad.bad") // catch block
  })
})
