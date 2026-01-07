import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    try {
      const token = req.nextauth.token
      const pathname = req.nextUrl.pathname
      
      // Allow access to public routes
      if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth')) {
        return NextResponse.next()
      }
      
      // Check if user is authenticated
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      
      const isAdmin = token.role === 'admin' || token.role === 'manager'
      const isAdminRoute = pathname.startsWith('/admin')
      
      // Redirect non-admin users away from admin routes
      if (isAdminRoute && !isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      
      // Redirect authenticated users from login/home to their dashboard
      if (pathname === '/login' || pathname === '/') {
        if (isAdmin) {
          return NextResponse.redirect(new URL('/admin', req.url))
        } else {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
      
      return NextResponse.next()
    } catch (error) {
      console.error('Middleware error:', error)
      return NextResponse.next()
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Return true to allow middleware to run
        // We'll handle authorization logic inside the middleware function
        return true
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
     * - favicon.ico, manifest.json
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
