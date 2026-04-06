import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(new URL('/login?error=InvalidVerificationLink', request.url))
  }

  const verificationToken = await db.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: email,
        token: token
      }
    }
  })

  if (!verificationToken) {
    return NextResponse.redirect(new URL('/login?error=InvalidVerificationToken', request.url))
  }

  if (new Date() > verificationToken.expires) {
    return NextResponse.redirect(new URL('/login?error=TokenExpired', request.url))
  }

  // Update User
  const user = await db.user.findUnique({ where: { email } })
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() }
    })
  }

  // Wipe the token securely preventing TOCTOU unhandled rejections
  await db.verificationToken.deleteMany({
    where: {
      identifier: email,
      token: token
    }
  })

  return NextResponse.redirect(new URL('/login?registered=verified', request.url))
}
