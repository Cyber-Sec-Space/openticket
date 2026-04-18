import { activePlugins } from './src/plugins';
console.log(activePlugins[0].hooks.onWebhookReceived.toString());
