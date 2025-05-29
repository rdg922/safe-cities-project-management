import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const isOnboardingRoute = createRouteMatcher(['/onboarding'])
const isApiRoute = createRouteMatcher(['/api(.*)'])

export default clerkMiddleware(async (auth, req: NextRequest) => {
    // Skip custom logic for API routes, but still allow Clerk to handle auth
    if (isApiRoute(req)) {
        return NextResponse.next()
    }

    const { userId, sessionClaims, redirectToSignIn } = await auth()

    if (!userId) {
        return redirectToSignIn()
    }

    if (
        !sessionClaims?.metadata?.onboardingComplete &&
        !isOnboardingRoute(req)
    ) {
        const onboardingUrl = new URL('/onboarding', req.url)
        return NextResponse.redirect(onboardingUrl)
    }

    // otherwise keep going
    return NextResponse.next()
})

export const config = {
    matcher: [
        // Skip Next.js internals and static files, but include API routes for Clerk auth
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Explicitly include API routes for Clerk authentication
        '/api/(.*)',
    ],
}
