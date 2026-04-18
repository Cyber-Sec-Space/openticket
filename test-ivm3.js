const ivm = require('isolated-vm');

async function main() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = isolate.createContextSync();
  
  const hostWrapper = () => {
    console.log("Wrapper executed");
  };

  context.global.setSync('_hostWrapper', new ivm.Reference(hostWrapper));
  
  const code = `
    _hostWrapper.applyIgnored(undefined, []);
  `;
  const script = isolate.compileScriptSync(code);
  
  await script.run(context, { timeout: 5000 });
}

main().catch(console.error);
