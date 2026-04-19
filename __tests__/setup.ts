const { Request, Response, Headers } = require("node-fetch");
global.Request = Request;
global.Response = Response;
global.Headers = Headers;
