import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AdminApi,
  type AdminCategory,
  type AdminDessert,
  type AdminUser,
} from '@cake-and-shape/api-client'
import './index.css'

const apiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL ?? 'http://localhost:8000/api'
const api = new AdminApi(apiBaseUrl)

function App() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [desserts, setDesserts] = useState<AdminDessert[]>([])
  const [selectedDessert, setSelectedDessert] = useState<AdminDessert | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      try {
        const restored = await api.me()
        if (!cancelled) {
          setUser(restored)
          await loadCatalog()
        }
      } catch {
        // Login form is shown below.
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadCatalog() {
    const [nextCategories, nextDesserts] = await Promise.all([api.categories(), api.desserts()])
    setCategories(nextCategories)
    setDesserts(nextDesserts)
    setSelectedDessert((current) => nextDesserts.find((dessert) => dessert.id === current?.id) ?? nextDesserts[0] ?? null)
  }

  async function run(action: () => Promise<void>, success: string) {
    setMessage('')
    try {
      await action()
      await loadCatalog()
      setMessage(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed')
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const loggedIn = await api.login(form.get('email'), form.get('password'))
      setUser(loggedIn)
      await loadCatalog()
      setMessage('')
    } catch {
      setMessage('Login failed. Check the email and password.')
    }
  }

  async function handleLogout() {
    await api.logout()
    setUser(null)
    setCategories([])
    setDesserts([])
    setSelectedDessert(null)
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
          <h1>Catalog Admin</h1>
          <p className="muted">Signed in as {user.email}</p>
        </div>
        <button type="button" className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {message ? <p className={message.includes('failed') || message.includes('detail') ? 'error' : 'success'}>{message}</p> : null}

      <section className="admin-grid">
        <CategoryPanel categories={categories} run={run} />
        <DessertPanel
          categories={categories.filter((category) => !category.archived_at)}
          desserts={desserts}
          selectedDessert={selectedDessert}
          setSelectedDessert={setSelectedDessert}
          run={run}
        />
      </section>
    </main>
  )
}

function CategoryPanel({
  categories,
  run,
}: {
  categories: AdminCategory[]
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="card stack">
      <h2>Categories</h2>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () =>
              api.createCategory({
                name: String(form.get('name') ?? ''),
                slug: String(form.get('slug') ?? ''),
                description: String(form.get('description') ?? ''),
              }).then(() => undefined),
            'Category created.',
          )
          event.currentTarget.reset()
        }}
      >
        <input name="name" placeholder="Category name" required />
        <input name="slug" placeholder="category-slug" required />
        <textarea name="description" placeholder="Description" />
        <button type="submit">Create category</button>
      </form>

      <div className="list">
        {categories.map((category) => (
          <article className="mini-card" key={category.id}>
            <strong>{category.name}</strong>
            <span className="muted">/{category.slug}</span>
            <label>
              Visible
              <input
                type="checkbox"
                checked={category.is_visible}
                onChange={(event) =>
                  void run(
                    () => api.updateCategory(category.id, { is_visible: event.currentTarget.checked }).then(() => undefined),
                    'Category updated.',
                  )
                }
              />
            </label>
            <button type="button" className="secondary" onClick={() => void run(() => api.archiveCategory(category.id).then(() => undefined), 'Category archived.')}>
              Archive
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function DessertPanel({
  categories,
  desserts,
  selectedDessert,
  setSelectedDessert,
  run,
}: {
  categories: AdminCategory[]
  desserts: AdminDessert[]
  selectedDessert: AdminDessert | null
  setSelectedDessert: (dessert: AdminDessert | null) => void
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="card stack">
      <h2>Desserts</h2>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () =>
              api.createDessert({
                category_id: Number(form.get('category_id')),
                name: String(form.get('name') ?? ''),
                slug: String(form.get('slug') ?? ''),
                short_description: String(form.get('short_description') ?? ''),
              }).then(() => undefined),
            'Dessert created.',
          )
          event.currentTarget.reset()
        }}
      >
        <select name="category_id" required>
          <option value="">Choose category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input name="name" placeholder="Dessert name" required />
        <input name="slug" placeholder="dessert-slug" required />
        <textarea name="short_description" placeholder="Short description" />
        <button type="submit">Create dessert</button>
      </form>

      <div className="list">
        {desserts.map((dessert) => (
          <button className="row-button" type="button" key={dessert.id} onClick={() => setSelectedDessert(dessert)}>
            {dessert.name}
            <span>{dessert.is_published ? 'Published' : 'Draft'}</span>
          </button>
        ))}
      </div>

      <div className="inline-form">
        {desserts.map((dessert, index) => (
          <div className="row-actions" key={dessert.id}>
            <span>{dessert.name}</span>
            <button
              type="button"
              className="secondary"
              disabled={index === 0}
              onClick={() =>
                void run(
                  () => api.reorderDesserts(moveOrder(desserts, index, index - 1)).then(() => undefined),
                  'Desserts reordered.',
                )
              }
            >
              Up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === desserts.length - 1}
              onClick={() =>
                void run(
                  () => api.reorderDesserts(moveOrder(desserts, index, index + 1)).then(() => undefined),
                  'Desserts reordered.',
                )
              }
            >
              Down
            </button>
          </div>
        ))}
      </div>

      {selectedDessert ? (
        <DessertEditor dessert={selectedDessert} categories={categories} run={run} />
      ) : (
        <p className="muted">Create or select a dessert to manage variants and images.</p>
      )}
    </section>
  )
}

function DessertEditor({
  dessert,
  categories,
  run,
}: {
  dessert: AdminDessert
  categories: AdminCategory[]
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="editor stack">
      <h3>{dessert.name}</h3>
      <div className="toggles">
        {(['is_published', 'is_available', 'is_new', 'is_popular', 'is_seasonal', 'is_bento'] as const).map((field) => (
          <label key={field}>
            {field.replaceAll('_', ' ')}
            <input
              type="checkbox"
              checked={Boolean(dessert[field])}
              onChange={(event) =>
                void run(
                  () => api.updateDessert(dessert.id, { [field]: event.currentTarget.checked }).then(() => undefined),
                  'Dessert updated.',
                )
              }
            />
          </label>
        ))}
      </div>
      <label>
        Category
        <select
          value={dessert.category_id}
          onChange={(event) =>
            void run(
              () => api.updateDessert(dessert.id, { category_id: Number(event.currentTarget.value) }).then(() => undefined),
              'Dessert category updated.',
            )
          }
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () =>
              api.createVariant(dessert.id, {
                weight_value: String(form.get('weight_value') ?? '1'),
                weight_unit: form.get('weight_unit') as 'g' | 'kg' | 'pcs',
                price: Number(form.get('price')),
              }).then(() => undefined),
            'Variant added.',
          )
          event.currentTarget.reset()
        }}
      >
        <input name="weight_value" placeholder="Weight" required />
        <select name="weight_unit" defaultValue="kg">
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="pcs">pcs</option>
        </select>
        <input name="price" type="number" placeholder="Price cents" min="0" required />
        <button type="submit">Add variant</button>
      </form>

      <div className="list">
        {dessert.variants.map((variant) => (
          <article className="mini-card" key={variant.id}>
            <strong>
              {variant.weight_value} {variant.weight_unit}
            </strong>
            <span>{formatPrice(variant.price)}</span>
            <button type="button" className="secondary" onClick={() => void run(() => api.archiveVariant(dessert.id, variant.id).then(() => undefined), 'Variant archived.')}>
              Archive
            </button>
            <button
              type="button"
              className="secondary"
              disabled={itemIndex(dessert.variants, variant.id) === 0}
              onClick={() =>
                void run(
                  () =>
                    api
                      .reorderVariants(dessert.id, moveOrder(dessert.variants, itemIndex(dessert.variants, variant.id), itemIndex(dessert.variants, variant.id) - 1))
                      .then(() => undefined),
                  'Variants reordered.',
                )
              }
            >
              Up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={itemIndex(dessert.variants, variant.id) === dessert.variants.length - 1}
              onClick={() =>
                void run(
                  () =>
                    api
                      .reorderVariants(dessert.id, moveOrder(dessert.variants, itemIndex(dessert.variants, variant.id), itemIndex(dessert.variants, variant.id) + 1))
                      .then(() => undefined),
                  'Variants reordered.',
                )
              }
            >
              Down
            </button>
          </article>
        ))}
      </div>

      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const upload = new FormData()
          const file = form.get('file')
          if (file instanceof File) {
            upload.append('file', file)
          }
          upload.append('alt_text', String(form.get('alt_text') ?? ''))
          upload.append('is_primary', String(form.get('is_primary') === 'on'))
          void run(() => api.uploadImage(dessert.id, upload).then(() => undefined), 'Image uploaded.')
          event.currentTarget.reset()
        }}
      >
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        <input name="alt_text" placeholder="Alt text" />
        <label>
          Primary
          <input name="is_primary" type="checkbox" />
        </label>
        <button type="submit">Upload image</button>
      </form>

      <div className="image-grid">
        {dessert.images.map((image) => (
          <article className="mini-card" key={image.id}>
            <img alt={image.alt_text || dessert.name} src={`${apiBaseUrl.replace('/api', '')}${image.url}`} />
            <span>{image.is_primary ? 'Primary' : image.alt_text || 'Image'}</span>
            <button type="button" className="secondary" onClick={() => void run(() => api.setPrimaryImage(dessert.id, image.id).then(() => undefined), 'Primary image updated.')}>
              Set primary
            </button>
            <button type="button" className="secondary" onClick={() => void run(() => api.deleteImage(dessert.id, image.id).then(() => undefined), 'Image deleted.')}>
              Delete
            </button>
            <button
              type="button"
              className="secondary"
              disabled={itemIndex(dessert.images, image.id) === 0}
              onClick={() =>
                void run(
                  () =>
                    api
                      .reorderImages(dessert.id, moveOrder(dessert.images, itemIndex(dessert.images, image.id), itemIndex(dessert.images, image.id) - 1))
                      .then(() => undefined),
                  'Images reordered.',
                )
              }
            >
              Up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={itemIndex(dessert.images, image.id) === dessert.images.length - 1}
              onClick={() =>
                void run(
                  () =>
                    api
                      .reorderImages(dessert.id, moveOrder(dessert.images, itemIndex(dessert.images, image.id), itemIndex(dessert.images, image.id) + 1))
                      .then(() => undefined),
                  'Images reordered.',
                )
              }
            >
              Down
            </button>
          </article>
        ))}
      </div>

      <button type="button" className="secondary danger" onClick={() => void run(() => api.archiveDessert(dessert.id).then(() => undefined), 'Dessert archived.')}>
        Archive dessert
      </button>
    </section>
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 100)
}

function moveOrder(items: Array<{ id: number }>, from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items.map((item, index) => ({ id: item.id, sort_order: index }))
  }
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next.map((entry, index) => ({ id: entry.id, sort_order: index }))
}

function itemIndex(items: Array<{ id: number }>, id: number) {
  return items.findIndex((item) => item.id === id)
}

export default App
