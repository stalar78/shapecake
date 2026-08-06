import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './index.css'

type AdminUser = {
  id: number
  email: string
}

type SiteSettings = {
  hero_title: string
  hero_text: string
  phone: string
  email: string
  whatsapp_url: string
  telegram_url: string
  social_url: string
  address_text: string
  delivery_text: string
  pickup_text: string
  prepayment_text: string
  order_terms_text: string
  working_hours_text: string
}

const emptySettings: SiteSettings = {
  hero_title: '',
  hero_text: '',
  phone: '',
  email: '',
  whatsapp_url: '',
  telegram_url: '',
  social_url: '',
  address_text: '',
  delivery_text: '',
  pickup_text: '',
  prepayment_text: '',
  order_terms_text: '',
  working_hours_text: '',
}

const apiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL ?? 'http://localhost:8000/api'

async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function getCsrfToken() {
  const response = await apiFetch('/admin/auth/csrf')
  if (!response.ok) {
    throw new Error('Could not load CSRF token')
  }
  return (await response.json()).csrf_token as string
}

function App() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [settings, setSettings] = useState<SiteSettings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      const response = await apiFetch('/admin/auth/me')
      if (!cancelled && response.ok) {
        setUser(await response.json())
        await loadSettings()
      }
      if (!cancelled) {
        setLoading(false)
      }
    }
    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadSettings() {
    const response = await apiFetch('/admin/site-settings')
    if (response.ok) {
      setSettings(await response.json())
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    const form = new FormData(event.currentTarget)
    const response = await apiFetch('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    })
    if (!response.ok) {
      setMessage('Login failed. Check the email and password.')
      return
    }
    setUser(await response.json())
    await loadSettings()
  }

  async function handleLogout() {
    const csrf = await getCsrfToken()
    await apiFetch('/admin/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
    })
    setUser(null)
    setSettings(emptySettings)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    const csrf = await getCsrfToken()
    const response = await apiFetch('/admin/site-settings', {
      method: 'PATCH',
      headers: { 'x-csrf-token': csrf },
      body: JSON.stringify(settings),
    })
    if (!response.ok) {
      setMessage('Could not save settings.')
      return
    }
    setSettings(await response.json())
    setMessage('Settings saved.')
  }

  if (loading) {
    return <main className="shell">Loading admin session...</main>
  }

  if (!user) {
    return (
      <main className="shell shell-narrow">
        <h1>Cake & Shape Admin</h1>
        <p className="muted">Sign in with the local administrator account created through the CLI.</p>
        <form className="card form" onSubmit={handleLogin}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Sign in</button>
          {message ? <p className="error">{message}</p> : null}
        </form>
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="muted">Signed in as {user.email}</p>
        </div>
        <button type="button" className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <section className="card">
        <h2>Site settings</h2>
        <form className="settings-grid" onSubmit={handleSave}>
          {(Object.keys(settings) as Array<keyof SiteSettings>).map((key) => (
            <label key={key}>
              {key.replaceAll('_', ' ')}
              {key.includes('text') || key.includes('terms') || key.includes('hours') ? (
                <textarea
                  value={settings[key]}
                  onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
                />
              ) : (
                <input
                  value={settings[key]}
                  onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
                />
              )}
            </label>
          ))}
          <button type="submit">Save settings</button>
        </form>
        {message ? <p className={message.includes('saved') ? 'success' : 'error'}>{message}</p> : null}
      </section>
    </main>
  )
}

export default App
