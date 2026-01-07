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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.employeeId = user.employeeId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.employeeId = token.employeeId as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
