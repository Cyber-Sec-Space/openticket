const ivm = require('isolated-vm');

async function main() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = isolate.createContextSync();
  const jail = context.global;
  jail.setSync('global', jail.derefInto());

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
    return "done";
  };

  jail.setSync('_hookFn', new ivm.Reference(hookFn));
  
  // We can pass simple objects by copy
  jail.setSync('payload', new ivm.ExternalCopy(payload).copyInto());
  jail.setSync('config', new ivm.ExternalCopy(config).copyInto());

  // Since sdkContext has functions, we can't ExternalCopy it. We pass a Reference.
  // BUT the plugin needs to call ctx.api.createIncident(), which means if it's a Reference,
  // it has to do ctx.getSync('api').getSync('createIncident').applySync().
  // If the plugin expects standard JS objects, passing a Reference breaks it!
  jail.setSync('sdkContext', new ivm.Reference(sdkContext));

  const code = `
    (async () => {
      // Problem: how does the plugin code (hookFn) interact with these?
      // Since hookFn is executed in Node.js via Reference apply, the arguments passed to it
      // must be normal JS objects from Node's perspective!
      // When we call _hookFn.apply, we are passing arguments FROM Isolate TO Node.
      
      // Let's call _hookFn.apply. We pass payload and config.
      // What about sdkContext? Since sdkContext originated in Node, if we pass the Reference back to Node,
      // it might not unwrap automatically.
      
      await _hookFn.apply(undefined, [
        payload, 
        config, 
        sdkContext // passing the reference back?
      ]);
    })();
  `;
  const script = isolate.compileScriptSync(code);
  await script.run(context, { timeout: 5000 });
}

main().catch(console.error);
