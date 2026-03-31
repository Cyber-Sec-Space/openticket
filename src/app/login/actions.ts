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
      const errCode = (error.cause?.err as any)?.code || error.type;
      if (errCode === "Missing2FA") return "REQUIRES_2FA";
      if (errCode === "Invalid2FA") return "INVALID_2FA";
      
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
