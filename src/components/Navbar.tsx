'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import AuthModal from './AuthModal'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? ''

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">{process.env.NEXT_PUBLIC_ARTIST_NAME} · Setlist</span>
        <div className="navbar-right">
          {user ? (
            <div className="navbar-user">
              <button className="navbar-avatar" onClick={() => setMenuOpen(m => !m)} title={user.email}>
                {initials}
              </button>
              {menuOpen && (
                <div className="navbar-menu">
                  <div className="navbar-email">{user.email}</div>
                  <button className="navbar-signout" onClick={handleSignOut}>退出登录</button>
                </div>
              )}
            </div>
          ) : (
            <button className="navbar-login" onClick={() => setShowModal(true)}>登录 / 注册</button>
          )}
        </div>
      </nav>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}
