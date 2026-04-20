jest.mock("dns", () => ({
  promises: { lookup: jest.fn() }
}));
jest.mock("@/lib/settings", () => ({ getGlobalSettings: jest.fn() }));

import { isTargetSecure, dispatchWebhook } from "@/lib/webhook";
import { promises as dns } from "dns";
import { getGlobalSettings } from "@/lib/settings";

describe("Webhook SSRF Protection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isTargetSecure", () => {
    it("blocks localhost", async () => {
      const { isSecure } = await isTargetSecure("http://localhost:8080");
      expect(isSecure).toBe(false);
    });

    it("blocks 127.0.0.1", async () => {
      const { isSecure } = await isTargetSecure("http://127.0.0.1");
      expect(isSecure).toBe(false);
    });

    it("blocks internal IP ranges via DNS lookup", async () => {
      (dns.lookup as jest.Mock).mockResolvedValue({ address: "10.0.0.5" });
      const { isSecure } = await isTargetSecure("http://internal-corp-service.com");
      expect(isSecure).toBe(false);
    });

    it("allows valid external URLs", async () => {
      (dns.lookup as jest.Mock).mockResolvedValue({ address: "8.8.8.8" });
      const { isSecure, parsed } = await isTargetSecure("https://api.github.com");
      expect(isSecure).toBe(true);
      expect(parsed?.hostname).toBe("api.github.com");
    });
  });

  describe("dispatchWebhook", () => {
    it("does not dispatch if webhookEnabled is false", async () => {
      (getGlobalSettings as jest.Mock).mockResolvedValue({ webhookEnabled: false });
      global.fetch = jest.fn();
      await dispatchWebhook("INCIDENT_CREATED", { id: 1 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("dispatches to frozen URL securely", async () => {
      (getGlobalSettings as jest.Mock).mockResolvedValue({ webhookEnabled: true, webhookUrl: "https://api.github.com" });
      (dns.lookup as jest.Mock).mockResolvedValue({ address: "8.8.8.8" });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, text: jest.fn() });

      await dispatchWebhook("INCIDENT_CREATED", { id: 1 });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://8.8.8.8/",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
