'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase?.auth.getSession()
        if (error) {
          console.error('Session error:', error)
        }
        if (mounted) {
          setUser(session?.user ?? null)
          console.log('Initial session:', session?.user?.email || 'none')
        }
      } catch (error) {
        console.error('Failed to get session:', error)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const authListener = supabase?.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'none')
      if (mounted) {
        setUser(session?.user ?? null)
      }
    })

    return () => {
      mounted = false
      authListener?.data?.subscription?.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/habitflow/` : undefined,
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (user) {
    return (
      <div className="flex items-center gap-4 mb-6">
        <span className="text-muted">Signed in as: {user.email}</span>
        <button
          onClick={async () => {
            const { data: { session } } = await supabase?.auth.getSession()
            console.log('Current session:', session)
            alert(`Session active: ${!!session}\nUser: ${session?.user?.email || 'none'}`)
          }}
          className="text-xs text-muted hover:text-white px-2 py-1 rounded border border-border hover:border-primary"
          title="Check session status"
        >
          🔍
        </button>
        <button
          onClick={signOut}
          className="text-sm text-muted hover:text-white px-3 py-1 rounded border border-border hover:border-primary"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium text-white mb-4">Sign In to Sync Your Habits</h2>
      <form onSubmit={signInWithEmail} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-muted mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-background border border-border rounded px-3 py-2 text-white placeholder:text-muted focus:border-primary"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-background py-2 rounded font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${message.includes('Check') ? 'text-accent' : 'text-danger'}`}>
          {message}
        </p>
      )}
      <p className="text-xs text-muted mt-4">
        No password needed! We'll send you a secure link to sign in.
      </p>
    </div>
  )
}