import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const isOnboardingRoute = createRouteMatcher(['/onboarding'])
const isApiRoute = createRouteMatcher(['/api(.*)'])
const isSupabaseRoute = createRouteMatcher([
    '/pages/:id(\\d+)',
    '/sheets/:id(\\d+)',
    '/forms/:id(\\d+)',
    '/uploads/:id(\\d+)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
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

    if (sessionClaims?.metadata?.onboardingComplete && isOnboardingRoute(req)) {
        const homeUrl = new URL('/', req.url)
        return NextResponse.redirect(homeUrl)
    }

    // Only sync Supabase session for pages, sheets, forms, and upload routes
    if (isSupabaseRoute(req)) {
        return await updateSession(req)
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        // Keep Clerk auth and onboarding everywhere except static assets
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/api/(.*)',
    ],
}
