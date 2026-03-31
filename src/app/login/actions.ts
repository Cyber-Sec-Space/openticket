"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', Object.fromEntries(formData))
  } catch (error) {
    if (error instanceof AuthError) {
      const errMessage = (error.cause?.err as any)?.message;
      if (errMessage === "Missing2FA") return "REQUIRES_2FA";
      if (errMessage === "Invalid2FA") return "INVALID_2FA";
      if (errMessage === "Global2FAEnforced") return "GLOBAL_LOCKED";
      
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.'
        default:
          return 'Something went wrong.'
      }
    }
    throw error
  }
}
