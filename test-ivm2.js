const ivm = require('isolated-vm');

async function main() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = isolate.createContextSync();
  
  const payload = { test: 123 };
  const config = { cfg: 456 };
  const sdkContext = {
    api: {
      createIncident: async () => { return "inc-1" }
    }
  };

  const hookFn = async (p, c, ctx) => {
    console.log("Hook called with", p, c);
    const res = await ctx.api.createIncident();
    console.log("Context returned", res);
    
    // Simulate a hang if payload.hang is true
    if (p.hang) {
      return new Promise(() => {}); // never resolves
    }
    return "done";
  };

  // The wrapper runs in Host
  const hostWrapper = async () => {
    await hookFn(payload, config, sdkContext);
  };

  context.global.setSync('_hostWrapper', new ivm.Reference(hostWrapper));
  
  const code = `
    async function run() {
      // Call the host wrapper and WAIT for it
      // apply() returns a Promise representing the Host promise
      await _hostWrapper.apply(undefined, [], { result: { promise: true } });
    }
    run();
  `;
  const script = isolate.compileScriptSync(code);
  
  console.log("Running script...");
  await script.run(context, { timeout: 5000 });
  console.log("Script finished!");
}

main().catch(console.error);
