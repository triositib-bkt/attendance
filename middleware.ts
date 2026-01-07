import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === 'admin' || token?.role === 'manager'
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    // Redirect non-admin users away from admin routes
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Redirect admin users to admin panel from login
    if (req.nextUrl.pathname === '/login' && token) {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page
        if (req.nextUrl.pathname === '/login') {
          return true
        }
        // Require token for protected routes
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login'],
}
