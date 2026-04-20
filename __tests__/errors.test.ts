import { PluginSystemError, PluginPermissionError, PluginInputError, withPluginErrorHandling } from "@/lib/plugins/errors";

describe("errors", () => {
  it("PluginSystemError sets prototype correctly", () => {
    const err = new PluginSystemError("system error", "origin");
    expect(err).toBeInstanceOf(PluginSystemError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("system error");
    expect(err.originalError).toBe("origin");
    expect(err.name).toBe("PluginSystemError");
  });

  it("PluginPermissionError sets prototype correctly", () => {
    const err = new PluginPermissionError("permission error");
    expect(err).toBeInstanceOf(PluginPermissionError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("permission error");
    expect(err.name).toBe("PluginPermissionError");
  });

  it("PluginInputError sets prototype correctly", () => {
    const err = new PluginInputError("input error");
    expect(err).toBeInstanceOf(PluginInputError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("input error");
    expect(err.name).toBe("PluginInputError");
  });

  describe("withPluginErrorHandling", () => {
    it("returns successful result", async () => {
      const fn = withPluginErrorHandling(async () => "success");
      await expect(fn()).resolves.toBe("success");
    });

    it("rethrows PluginSystemError without wrapping", async () => {
      const err = new PluginSystemError("sys");
      const fn = withPluginErrorHandling(async () => { throw err; });
      await expect(fn()).rejects.toBe(err);
    });

    it("wraps unknown Error in PluginSystemError", async () => {
      const err = new Error("unknown");
      const fn = withPluginErrorHandling(async () => { throw err; });
      await expect(fn()).rejects.toThrow(PluginSystemError);
      await expect(fn()).rejects.toThrow("SDK DB Error: unknown");
    });

    it("wraps non-Error thrown objects", async () => {
      const fn = withPluginErrorHandling(async () => { throw "string fail"; });
      await expect(fn()).rejects.toThrow(PluginSystemError);
      await expect(fn()).rejects.toThrow("SDK DB Error: Failure");
    });
  });
});
