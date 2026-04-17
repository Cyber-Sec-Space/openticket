import { PrismaClient } from '@prisma/client'

const SENSITIVE_KEYS = ['password', 'passwordHash', 'twoFactorSecret', 'token', 'secret', 'refreshToken', 'accessToken', 'clientSecret'];

function scrubPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubPayload);
  
  const result: any = {};
  for (const key in obj) {
    if (SENSITIVE_KEYS.includes(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = scrubPayload(obj[key]);
    }
  }
  return result;
}

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      auditLog: {
        async create({ args, query }) {
          if (args.data && args.data.changes) {
            args.data.changes = scrubPayload(args.data.changes);
          }
          return query(args);
        },
        async createMany({ args, query }) {
          if (args.data) {
            const dataArray = Array.isArray(args.data) ? args.data : [args.data];
            for (const item of dataArray) {
              if (item.changes) {
                item.changes = scrubPayload(item.changes);
              }
            }
            args.data = dataArray;
          }
          return query(args);
        }
      }
    }
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const db = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
