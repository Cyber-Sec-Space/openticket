import { hasPermission } from "../src/lib/auth-utils"
import { Session } from "next-auth"
import { Permission } from "@prisma/client"

describe("auth-utils", () => {
  it("returns false if session is missing", () => {
    expect(hasPermission(null, "VIEW_INCIDENTS" as any)).toBe(false)
  })

  it("returns false if user is missing", () => {
    expect(hasPermission({} as Session, "VIEW_INCIDENTS" as any)).toBe(false)
  })

  it("returns false if permissions array is missing", () => {
    expect(hasPermission({ user: {} } as Session, "VIEW_INCIDENTS" as any)).toBe(false)
  })

  it("returns true if single permission is included", () => {
    expect(hasPermission({ user: { permissions: ["VIEW_INCIDENTS", "MANAGE_USERS"] } } as unknown as Session, "VIEW_INCIDENTS" as any)).toBe(true)
  })

  it("returns false if single permission is missing", () => {
    expect(hasPermission({ user: { permissions: ["MANAGE_USERS"] } } as unknown as Session, "VIEW_INCIDENTS" as any)).toBe(false)
  })

  it("returns true if ANY of the array permissions match", () => {
    expect(hasPermission({ user: { permissions: ["VIEW_INCIDENTS"] } } as unknown as Session, ["VIEW_INCIDENTS", "MANAGE_SYSTEM"] as any)).toBe(true)
  })

  it("returns false if NONE of the array permissions match", () => {
    expect(hasPermission({ user: { permissions: ["MANAGE_USERS", "CREATE_INCIDENT"] } } as unknown as Session, ["VIEW_INCIDENTS", "MANAGE_SYSTEM"] as any)).toBe(false)
  })
})
