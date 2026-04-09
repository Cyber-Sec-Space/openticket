const fs = require('fs');
let code = fs.readFileSync('src/lib/plugins/sdk-context.ts', 'utf8');

// Insert triggerHook helper inside createPluginContext
code = code.replace("return {\n    plugin: { id: pluginId },", 
`  const triggerHook = async (event, payload) => {
    try {
      const { fireHook } = await import("./hook-engine");
      await fireHook(event, payload, pluginId);
    } catch(e) { }
  };

  return {
    plugin: { id: pluginId },`);

const replacements = [
  { match: /return newInc;\n        } catch \(error\)/, replace: "await triggerHook('onIncidentCreated', newInc);\n          return newInc;\n        } catch (error)" },
  { match: /return updated;(\s*)} catch \(error\) \{ throw new Error\(`SDK DB Error: \$\{error instanceof Error \? error.message : "Failure"\}`\); \}（\s*\},)?/g, 
    replace: (m, space) => {
      // For updated, we need to know the context. Since var is 'updated', it's hard to globally replace without context. 
      return m;
    } 
  }
];

fs.writeFileSync('src/lib/plugins/sdk-context.ts', code);
