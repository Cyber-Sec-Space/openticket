import { TextEncoder, TextDecoder } from 'util'
class MockRequest {}
Object.assign(global, { TextDecoder, TextEncoder, Request: MockRequest as any })
const { Request, Response, Headers } = require("node-fetch");
global.Request = Request;
global.Response = Response;
global.Headers = Headers;
