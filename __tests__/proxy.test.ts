import { withRateLimit, proxyFetch } from "@/proxy";

describe("Proxy Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("withRateLimit", () => {
    it("allows execution within limits", async () => {
      const result = await withRateLimit("test-key", 10, 1000, async () => {
        return "success";
      });
      expect(result).toBe("success");
    });
  });

  describe("proxyFetch", () => {
    it("fetches via proxy", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: "test" })
      });

      const res = await proxyFetch("https://example.com");
      expect(global.fetch).toHaveBeenCalled();
      expect(await res.json()).toEqual({ data: "test" });
    });
  });
});
