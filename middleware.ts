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

    // Redirect authenticated users from login/home
    if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') && token) {
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
        const pathname = req.nextUrl.pathname
        
        // Allow public access to home, login, and API auth routes
        if (
          pathname === '/' || 
          pathname === '/login' || 
          pathname.startsWith('/api/auth')
        ) {
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
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
