import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password')
        }

        // Get user from database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', credentials.email)
          .eq('is_active', true)
          .single()

        if (error || !profile) {
          throw new Error('Invalid email or password')
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, profile.password_hash)
        
        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        // Return user object
        return {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
          employeeId: profile.employee_id,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      try {
        // On sign in, set user data with timestamp for uniqueness
        if (user) {
          token.id = user.id
          token.email = user.email
          token.name = user.name
          token.role = user.role
          token.employeeId = user.employeeId
          token.loginTime = Date.now()
        }
        // Force refresh on update trigger
        if (trigger === 'update') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', token.id || token.sub)
            .eq('is_active', true)
            .single()
          
          if (profile) {
            token.role = profile.role
            token.employeeId = profile.employee_id
            token.name = profile.full_name
            token.email = profile.email
          }
        }
      } catch (error) {
        console.error('JWT callback error:', error)
      }
      return token
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = (token.id || token.sub) as string
          session.user.email = token.email as string
          session.user.name = token.name as string
          session.user.role = token.role as string
          session.user.employeeId = token.employeeId as string
        }
      } catch (error) {
        console.error('Session callback error:', error)
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // Update session every hour
  },
  secret: process.env.NEXTAUTH_SECRET,
}
