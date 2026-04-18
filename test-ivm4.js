const ivm = require('isolated-vm');

async function main() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = isolate.createContextSync();
  
  const hostWrapper = () => {
    console.log("Wrapper executed");
  };

  context.global.setSync('_hostWrapper', new ivm.Reference(hostWrapper));
  
  const code = `
    _hostWrapper.applySync(undefined, []);
  `;
  const script = isolate.compileScriptSync(code);
  
  script.runSync(context);
}

main().catch(console.error);
