import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

// EVERY route needs access to the clerk middleware because our base layout.tsx uses the ClerkProvider
// and the SignedOut component to redirect to the sign in page if the user is not signed in

// if we try to exclude any route (even static files) it throws an error because the route doesn't have access to the clerk middleware

// it's possible to make a route public by using the clerkMiddleware function but it doesn't matter
// because it'd just redirect to the sign in page

export const config = {
  matcher: [
    // Match all routes
    '/(.*)',
    // Match API routes
    '/api/:path*',
    // Match tRPC routes
    '/trpc/:path*',
  ]
}
