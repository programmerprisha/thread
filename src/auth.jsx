import { use, useState } from 'react'
import { supabase } from './supabase.js'
import './auth.css'

export default function Auth() {
    // prisha note: which tab is active (signup or login)
    const[mode, setMode] = useState('signin')
    // prisha note: user input
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    // prisha note: button loading state!
    const [loading, setLoading] = useState(false)
    // prisha note: error message
    const [error, setError] = useState('')
    // prisha note: success message
    const[success, setSuccess] = useState('')

    const handleSignIn = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // prisha note: sends email + password to supabase and if it matches supabase gives session token
        // app.jsx will detect and show app automatically
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) setError(error.message) 
        setLoading(false)
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        // prisha note: creates new account and supabase will send a confirmation email to the user whcih they must click on
        const { error } = await supabase.auth.signUp({
            email, 
            password, 
        })

        if (error) {
            setError(error.message)
        } else {
            setSuccess('Account created! Please check your email to confirm your account and sign in.')
            setMode('signin')
        }
        setLoading(false)
    }

    return (
        <div className="auth-page">
        <div className="auth-card">

            <div>
            <h1 className="auth-logo">Thread</h1>
            <p className="auth-tagline">Communication made easier</p>
            </div>

            {/* Sign in / Sign up tabs */}
            <div className="auth-tabs">
            <button
                className={mode === 'signin' ? 'auth-tab auth-tab--active' : 'auth-tab'}
                onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
            >
                Sign in
            </button>
            <button
                className={mode === 'signup' ? 'auth-tab auth-tab--active' : 'auth-tab'}
                onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
            >
                Sign up
            </button>
            </div>

            {error && <p className="auth-error">{error}</p>}
            {success && <p className="auth-success">{success}</p>}

            <form
            className="auth-form"
            onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}
            >
            <div>
                <label className="auth-label">Email</label>
                <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                />
            </div>

            <div>
                <label className="auth-label">Password</label>
                <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
            </div>

            <button
                className="auth-submit-btn"
                type="submit"
                disabled={loading}
            >
                {loading
                ? 'Please wait...'
                : mode === 'signin' ? 'Sign in' : 'Create account'
                }
            </button>
            </form>

        </div>
        </div>
  )
}


