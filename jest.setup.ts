import { TextEncoder, TextDecoder } from 'util'
class MockRequest {}
Object.assign(global, { TextDecoder, TextEncoder, Request: MockRequest as any })
