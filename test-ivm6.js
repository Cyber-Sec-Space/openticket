const ivm = require('isolated-vm');

async function main() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = isolate.createContextSync();
  const script = isolate.compileScriptSync(`1 + 1`);
  const res = script.runSync(context);
  console.log("Result:", res);
}

main().catch(console.error);
