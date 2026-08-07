import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AdminApi,
  type AdminOverview,
  type AdminCategory,
  type AdminDessert,
  type AdminPromotion,
  type AdminReview,
  type AdminInquiry,
  type InquiryStatus,
  type AdminUser,
  type SiteSettings,
} from '@cake-and-shape/api-client'
import './index.css'

const apiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL ?? 'http://localhost:8000/api'
const api = new AdminApi(apiBaseUrl)

function App() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [desserts, setDesserts] = useState<AdminDessert[]>([])
  const [selectedDessert, setSelectedDessert] = useState<AdminDessert | null>(null)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)
  const [promotions, setPromotions] = useState<AdminPromotion[]>([])
  const [selectedPromotion, setSelectedPromotion] = useState<AdminPromotion | null>(null)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [inquiryTotal, setInquiryTotal] = useState(0)
  const [selectedInquiry, setSelectedInquiry] = useState<AdminInquiry | null>(null)
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<InquiryStatus | ''>('')
  const [inquiryChannelFilter, setInquiryChannelFilter] = useState('')
  const [inquirySearch, setInquirySearch] = useState('')
  const [inquiryOffset, setInquiryOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      try {
        const restored = await api.me()
        if (!cancelled) {
          setUser(restored)
          await loadWorkspace()
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

  async function loadInquiries(
    statusFilter = inquiryStatusFilter,
    offset = inquiryOffset,
    channelFilter = inquiryChannelFilter,
    search = inquirySearch,
  ) {
    const next = await api.inquiries({
      status: statusFilter || undefined,
      preferred_contact_channel: channelFilter ? (channelFilter as 'phone' | 'email' | 'whatsapp' | 'telegram') : undefined,
      search: search || undefined,
      limit: 10,
      offset,
    })
    setInquiries(next.items)
    setInquiryTotal(next.total)
    setSelectedInquiry((current) => next.items.find((inquiry) => inquiry.id === current?.id) ?? next.items[0] ?? null)
  }

  async function loadContent() {
    const [nextReviews, nextPromotions, nextSettings, nextOverview] = await Promise.all([
      api.reviews(),
      api.promotions(),
      api.siteSettings(),
      api.overview(),
    ])
    setReviews(nextReviews)
    setPromotions(nextPromotions)
    setSettings(nextSettings)
    setOverview(nextOverview)
    setSelectedReview((current) => nextReviews.find((review) => review.id === current?.id) ?? nextReviews[0] ?? null)
    setSelectedPromotion(
      (current) => nextPromotions.find((promotion) => promotion.id === current?.id) ?? nextPromotions[0] ?? null,
    )
  }

  async function loadWorkspace() {
    await Promise.all([loadCatalog(), loadInquiries(), loadContent()])
  }

  async function run(action: () => Promise<void>, success: string) {
    setMessage('')
    try {
      await action()
      await loadWorkspace()
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
      await loadWorkspace()
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
    setReviews([])
    setSelectedReview(null)
    setPromotions([])
    setSelectedPromotion(null)
    setSettings(null)
    setOverview(null)
    setInquiries([])
    setSelectedInquiry(null)
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
        <OverviewPanel overview={overview} />
        {settings ? <SettingsPanel settings={settings} run={run} /> : null}
        <CategoryPanel categories={categories} run={run} />
        <DessertPanel
          categories={categories.filter((category) => !category.archived_at)}
          desserts={desserts}
          selectedDessert={selectedDessert}
          setSelectedDessert={setSelectedDessert}
          run={run}
        />
        <InquiryPanel
          inquiries={inquiries}
          total={inquiryTotal}
          offset={inquiryOffset}
          statusFilter={inquiryStatusFilter}
          channelFilter={inquiryChannelFilter}
          search={inquirySearch}
          selectedInquiry={selectedInquiry}
          setSelectedInquiry={setSelectedInquiry}
          setStatusFilter={(value) => {
            setInquiryStatusFilter(value)
            setInquiryOffset(0)
            void loadInquiries(value, 0, inquiryChannelFilter, inquirySearch)
          }}
          setChannelFilter={(value) => {
            setInquiryChannelFilter(value)
            setInquiryOffset(0)
            void loadInquiries(inquiryStatusFilter, 0, value, inquirySearch)
          }}
          setSearch={(value) => {
            setInquirySearch(value)
            setInquiryOffset(0)
            void loadInquiries(inquiryStatusFilter, 0, inquiryChannelFilter, value)
          }}
          page={(nextOffset) => {
            setInquiryOffset(nextOffset)
            void loadInquiries(inquiryStatusFilter, nextOffset, inquiryChannelFilter, inquirySearch)
          }}
          run={run}
        />
        <ReviewPanel
          desserts={desserts}
          reviews={reviews}
          selectedReview={selectedReview}
          setSelectedReview={setSelectedReview}
          run={run}
        />
        <PromotionPanel
          desserts={desserts}
          promotions={promotions}
          selectedPromotion={selectedPromotion}
          setSelectedPromotion={setSelectedPromotion}
          run={run}
        />
      </section>
    </main>
  )
}

const transitionMap: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['in_progress', 'confirmed', 'cancelled', 'spam'],
  in_progress: ['waiting_customer', 'confirmed', 'cancelled', 'spam'],
  waiting_customer: ['in_progress', 'confirmed', 'cancelled', 'spam'],
  confirmed: ['in_progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
  spam: [],
}

function OverviewPanel({ overview }: { overview: AdminOverview | null }) {
  return (
    <section className="card stack wide">
      <div className="section-heading">
        <div>
          <h2>Operational overview</h2>
          <p className="muted">Compact current state from catalog, inquiries, and promotions.</p>
        </div>
      </div>
      {!overview ? <p className="muted">Loading overview...</p> : null}
      {overview ? (
        <>
          <div className="details">
            <div><dt>Published desserts</dt><dd>{overview.published_dessert_count}</dd></div>
            <div><dt>Draft desserts</dt><dd>{overview.hidden_unpublished_dessert_count}</dd></div>
            <div><dt>New inquiries</dt><dd>{overview.new_inquiry_count}</dd></div>
            <div><dt>Active promotions</dt><dd>{overview.active_promotion_count}</dd></div>
          </div>
          <div className="inline-form">
            <div className="note-box">
              <strong>Recent inquiries</strong>
              {overview.recent_inquiries.length === 0 ? <p className="muted">No recent inquiries.</p> : null}
              {overview.recent_inquiries.map((inquiry) => (
                <p key={inquiry.id}>
                  #{inquiry.public_reference} · {inquiry.status.replaceAll('_', ' ')} · {formatDateTime(inquiry.created_at)}
                </p>
              ))}
            </div>
            <div className="note-box">
              <strong>Active promotions</strong>
              {overview.active_promotions.length === 0 ? <p className="muted">No active promotions.</p> : null}
              {overview.active_promotions.map((promotion) => (
                <p key={promotion.id}>
                  {promotion.title} <span className="muted">/{promotion.slug}</span>
                </p>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

function SettingsPanel({
  settings,
  run,
}: {
  settings: SiteSettings
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="card stack wide">
      <div>
        <h2>Site settings</h2>
        <p className="muted">Global public business content shown on the storefront.</p>
      </div>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () => api.updateSiteSettings(siteSettingsPayload(form)).then(() => undefined),
            'Site settings updated.',
          )
        }}
      >
        <div className="inline-form">
          <input name="hero_title" defaultValue={settings.hero_title} placeholder="Hero title" required />
          <input name="phone" defaultValue={settings.phone} placeholder="Phone" />
          <input name="email" defaultValue={settings.email} placeholder="Email" />
        </div>
        <textarea name="hero_text" defaultValue={settings.hero_text} placeholder="Hero text" />
        <input name="about_master_title" defaultValue={settings.about_master_title} placeholder="About-master title" />
        <textarea name="about_master_text" defaultValue={settings.about_master_text} placeholder="About-master text" />
        <div className="inline-form">
          <input name="whatsapp_url" defaultValue={settings.whatsapp_url} placeholder="WhatsApp URL" />
          <input name="telegram_url" defaultValue={settings.telegram_url} placeholder="Telegram URL" />
          <input name="social_url" defaultValue={settings.social_url} placeholder="Social URL" />
        </div>
        <textarea name="address_text" defaultValue={settings.address_text} placeholder="Address" />
        <textarea name="working_hours_text" defaultValue={settings.working_hours_text} placeholder="Working hours" />
        <textarea name="order_terms_text" defaultValue={settings.order_terms_text} placeholder="Order terms" />
        <textarea name="delivery_text" defaultValue={settings.delivery_text} placeholder="Delivery" />
        <textarea name="pickup_text" defaultValue={settings.pickup_text} placeholder="Pickup" />
        <textarea name="prepayment_text" defaultValue={settings.prepayment_text} placeholder="Prepayment" />
        <button type="submit">Save site settings</button>
      </form>
    </section>
  )
}

function InquiryPanel({
  inquiries,
  total,
  offset,
  statusFilter,
  channelFilter,
  search,
  selectedInquiry,
  setSelectedInquiry,
  setStatusFilter,
  setChannelFilter,
  setSearch,
  page,
  run,
}: {
  inquiries: AdminInquiry[]
  total: number
  offset: number
  statusFilter: InquiryStatus | ''
  channelFilter: string
  search: string
  selectedInquiry: AdminInquiry | null
  setSelectedInquiry: (inquiry: AdminInquiry | null) => void
  setStatusFilter: (status: InquiryStatus | '') => void
  setChannelFilter: (channel: string) => void
  setSearch: (search: string) => void
  page: (offset: number) => void
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  const limit = 10
  return (
    <section className="card stack wide">
      <div className="section-heading">
        <div>
          <h2>Inquiries</h2>
          <p className="muted">{total} total customer requests</p>
        </div>
        <div className="filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as InquiryStatus | '')}>
            <option value="">All statuses</option>
            {Object.keys(transitionMap).map((status) => (
              <option key={status} value={status}>
                {status.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <select value={channelFilter} onChange={(event) => setChannelFilter(event.currentTarget.value)}>
            <option value="">All channels</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>
          <input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search contact/ref" />
        </div>
      </div>

      {inquiries.length === 0 ? <p className="muted">No inquiries match this filter.</p> : null}
      <div className="list">
        {inquiries.map((inquiry) => (
          <button className="row-button" type="button" key={inquiry.id} onClick={() => setSelectedInquiry(inquiry)}>
            {inquiry.customer_name}
            <span>{inquiry.status.replaceAll('_', ' ')}</span>
          </button>
        ))}
      </div>
      <div className="row-actions">
        <button className="secondary" type="button" disabled={offset === 0} onClick={() => page(Math.max(0, offset - limit))}>
          Previous
        </button>
        <span className="muted">
          {offset + 1}-{Math.min(offset + limit, total)} of {total}
        </span>
        <button className="secondary" type="button" disabled={offset + limit >= total} onClick={() => page(offset + limit)}>
          Next
        </button>
      </div>

      {selectedInquiry ? <InquiryDetail inquiry={selectedInquiry} run={run} /> : null}
    </section>
  )
}

function InquiryDetail({
  inquiry,
  run,
}: {
  inquiry: AdminInquiry
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="editor stack">
      <h3>
        {inquiry.customer_name} <span className="muted">#{inquiry.public_reference}</span>
      </h3>
      <dl className="details">
        <div><dt>Status</dt><dd>{inquiry.status.replaceAll('_', ' ')}</dd></div>
        <div><dt>Preferred contact</dt><dd>{inquiry.preferred_contact_channel}</dd></div>
        <div><dt>Phone</dt><dd>{inquiry.phone ?? 'Not provided'}</dd></div>
        <div><dt>Email</dt><dd>{inquiry.email ?? 'Not provided'}</dd></div>
        <div><dt>Dessert</dt><dd>{inquiry.dessert?.name ?? inquiry.dessert_name_snapshot ?? 'No dessert reference'}</dd></div>
        <div><dt>Requested date</dt><dd>{inquiry.requested_date ?? 'Flexible'}</dd></div>
        <div><dt>Quantity</dt><dd>{inquiry.quantity ?? 'Not specified'}</dd></div>
        <div><dt>Created</dt><dd>{formatDateTime(inquiry.created_at)}</dd></div>
        <div><dt>Status changed</dt><dd>{formatDateTime(inquiry.status_changed_at)}</dd></div>
      </dl>
      <p className="note-box">{inquiry.message}</p>

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(() => api.updateInquiryNotes(inquiry.id, String(form.get('internal_notes') ?? '')).then(() => undefined), 'Inquiry notes updated.')
        }}
      >
        <textarea name="internal_notes" defaultValue={inquiry.internal_notes} placeholder="Internal notes" />
        <button type="submit">Save notes</button>
      </form>

      <div className="inline-form">
        {transitionMap[inquiry.status].map((target) => (
          <button key={target} type="button" className="secondary" onClick={() => void run(() => api.transitionInquiry(inquiry.id, target).then(() => undefined), 'Inquiry status updated.')}>
            Mark {target.replaceAll('_', ' ')}
          </button>
        ))}
        {transitionMap[inquiry.status].length === 0 ? <span className="muted">Terminal status</span> : null}
      </div>

      <div className="history">
        <strong>Status history</strong>
        {inquiry.status_history.length === 0 ? <p className="muted">No transitions yet.</p> : null}
        {inquiry.status_history.map((entry) => (
          <p key={entry.id}>
            {entry.from_status.replaceAll('_', ' ')} to {entry.to_status.replaceAll('_', ' ')} at {formatDateTime(entry.changed_at)}
          </p>
        ))}
      </div>
    </section>
  )
}

function ReviewPanel({
  desserts,
  reviews,
  selectedReview,
  setSelectedReview,
  run,
}: {
  desserts: AdminDessert[]
  reviews: AdminReview[]
  selectedReview: AdminReview | null
  setSelectedReview: (review: AdminReview | null) => void
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="card stack wide">
      <div className="section-heading">
        <div>
          <h2>Reviews</h2>
          <p className="muted">{reviews.length} active review records</p>
        </div>
      </div>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () =>
              api.createReview({
                dessert_id: nullableNumber(form.get('dessert_id')),
                author_name: String(form.get('author_name') ?? ''),
                rating: Number(form.get('rating')),
                text: String(form.get('text') ?? ''),
              }).then(() => undefined),
            'Review created.',
          )
          event.currentTarget.reset()
        }}
      >
        <input name="author_name" placeholder="Author name" required />
        <input name="rating" type="number" min="1" max="5" defaultValue="5" required />
        <select name="dessert_id">
          <option value="">No dessert link</option>
          {desserts.map((dessert) => (
            <option key={dessert.id} value={dessert.id}>
              {dessert.name}
            </option>
          ))}
        </select>
        <textarea name="text" placeholder="Review text" required />
        <button type="submit">Create review</button>
      </form>

      {reviews.length === 0 ? <p className="muted">No reviews yet.</p> : null}
      <div className="list">
        {reviews.map((review) => (
          <button className="row-button" type="button" key={review.id} onClick={() => setSelectedReview(review)}>
            {review.author_name}
            <span>
              {review.rating}/5 · {review.is_published ? 'Published' : 'Draft'}
              {review.is_featured ? ' · Featured' : ''}
            </span>
          </button>
        ))}
      </div>
      <div className="inline-form">
        {reviews.map((review, index) => (
          <div className="row-actions" key={review.id}>
            <span>{review.author_name}</span>
            <button
              type="button"
              className="secondary"
              disabled={index === 0}
              onClick={() => void run(() => api.reorderReviews(moveOrder(reviews, index, index - 1)).then(() => undefined), 'Reviews reordered.')}
            >
              Up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === reviews.length - 1}
              onClick={() => void run(() => api.reorderReviews(moveOrder(reviews, index, index + 1)).then(() => undefined), 'Reviews reordered.')}
            >
              Down
            </button>
          </div>
        ))}
      </div>
      {selectedReview ? <ReviewEditor review={selectedReview} desserts={desserts} run={run} /> : null}
    </section>
  )
}

function ReviewEditor({
  review,
  desserts,
  run,
}: {
  review: AdminReview
  desserts: AdminDessert[]
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="editor stack">
      <h3>Edit review from {review.author_name}</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () =>
              api.updateReview(review.id, {
                dessert_id: nullableNumber(form.get('dessert_id')),
                author_name: String(form.get('author_name') ?? ''),
                rating: Number(form.get('rating')),
                text: String(form.get('text') ?? ''),
              }).then(() => undefined),
            'Review updated.',
          )
        }}
      >
        <input name="author_name" defaultValue={review.author_name} required />
        <input name="rating" type="number" min="1" max="5" defaultValue={review.rating} required />
        <select name="dessert_id" defaultValue={review.dessert_id ?? ''}>
          <option value="">No dessert link</option>
          {desserts.map((dessert) => (
            <option key={dessert.id} value={dessert.id}>
              {dessert.name}
            </option>
          ))}
        </select>
        <textarea name="text" defaultValue={review.text} required />
        <button type="submit">Save review</button>
      </form>
      <div className="inline-form">
        <button type="button" className="secondary" onClick={() => void run(() => (review.is_published ? api.unpublishReview(review.id) : api.publishReview(review.id)).then(() => undefined), 'Review publication updated.')}>
          {review.is_published ? 'Unpublish' : 'Publish'}
        </button>
        <button type="button" className="secondary" onClick={() => void run(() => (review.is_featured ? api.unfeatureReview(review.id) : api.featureReview(review.id)).then(() => undefined), 'Review featured state updated.')}>
          {review.is_featured ? 'Remove featured' : 'Mark featured'}
        </button>
        <button type="button" className="secondary danger" onClick={() => void run(() => api.archiveReview(review.id).then(() => undefined), 'Review archived.')}>
          Archive
        </button>
      </div>
      <p className="muted">Linked dessert: {review.dessert?.name ?? 'None'}</p>
      <p className="muted">Updated {formatDateTime(review.updated_at)}</p>
    </section>
  )
}

function PromotionPanel({
  desserts,
  promotions,
  selectedPromotion,
  setSelectedPromotion,
  run,
}: {
  desserts: AdminDessert[]
  promotions: AdminPromotion[]
  selectedPromotion: AdminPromotion | null
  setSelectedPromotion: (promotion: AdminPromotion | null) => void
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="card stack wide">
      <div className="section-heading">
        <div>
          <h2>Promotions</h2>
          <p className="muted">{promotions.length} active promotion records</p>
        </div>
      </div>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () =>
              api.createPromotion(promotionPayload(form)).then(() => undefined),
            'Promotion created.',
          )
          event.currentTarget.reset()
        }}
      >
        <div className="inline-form">
          <input name="title" placeholder="Promotion title" required />
          <input name="slug" placeholder="promotion-slug" required />
          <select name="dessert_id">
            <option value="">No dessert link</option>
            {desserts.map((dessert) => (
              <option key={dessert.id} value={dessert.id}>
                {dessert.name}
              </option>
            ))}
          </select>
        </div>
        <textarea name="summary" placeholder="Short public summary" />
        <textarea name="body" placeholder="Promotion details" />
        <div className="inline-form">
          <label>
            Starts at
            <input name="starts_at" type="datetime-local" />
          </label>
          <label>
            Ends at
            <input name="ends_at" type="datetime-local" />
          </label>
        </div>
        <button type="submit">Create promotion</button>
      </form>

      {promotions.length === 0 ? <p className="muted">No promotions yet.</p> : null}
      <div className="list">
        {promotions.map((promotion) => (
          <button className="row-button" type="button" key={promotion.id} onClick={() => setSelectedPromotion(promotion)}>
            {promotion.title}
            <span>{promotion.is_published ? 'Published' : 'Draft'}</span>
          </button>
        ))}
      </div>
      <div className="inline-form">
        {promotions.map((promotion, index) => (
          <div className="row-actions" key={promotion.id}>
            <span>{promotion.title}</span>
            <button
              type="button"
              className="secondary"
              disabled={index === 0}
              onClick={() => void run(() => api.reorderPromotions(moveOrder(promotions, index, index - 1)).then(() => undefined), 'Promotions reordered.')}
            >
              Up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === promotions.length - 1}
              onClick={() => void run(() => api.reorderPromotions(moveOrder(promotions, index, index + 1)).then(() => undefined), 'Promotions reordered.')}
            >
              Down
            </button>
          </div>
        ))}
      </div>
      {selectedPromotion ? <PromotionEditor promotion={selectedPromotion} desserts={desserts} run={run} /> : null}
    </section>
  )
}

function PromotionEditor({
  promotion,
  desserts,
  run,
}: {
  promotion: AdminPromotion
  desserts: AdminDessert[]
  run: (action: () => Promise<void>, success: string) => Promise<void>
}) {
  return (
    <section className="editor stack">
      <h3>Edit {promotion.title}</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(() => api.updatePromotion(promotion.id, promotionPayload(form)).then(() => undefined), 'Promotion updated.')
        }}
      >
        <div className="inline-form">
          <input name="title" defaultValue={promotion.title} required />
          <input name="slug" defaultValue={promotion.slug} required />
          <select name="dessert_id" defaultValue={promotion.dessert_id ?? ''}>
            <option value="">No dessert link</option>
            {desserts.map((dessert) => (
              <option key={dessert.id} value={dessert.id}>
                {dessert.name}
              </option>
            ))}
          </select>
        </div>
        <textarea name="summary" defaultValue={promotion.summary} />
        <textarea name="body" defaultValue={promotion.body} />
        <div className="inline-form">
          <label>
            Starts at
            <input name="starts_at" type="datetime-local" defaultValue={dateTimeLocalValue(promotion.starts_at)} />
          </label>
          <label>
            Ends at
            <input name="ends_at" type="datetime-local" defaultValue={dateTimeLocalValue(promotion.ends_at)} />
          </label>
        </div>
        <button type="submit">Save promotion</button>
      </form>
      <div className="inline-form">
        <button type="button" className="secondary" onClick={() => void run(() => (promotion.is_published ? api.unpublishPromotion(promotion.id) : api.publishPromotion(promotion.id)).then(() => undefined), 'Promotion publication updated.')}>
          {promotion.is_published ? 'Unpublish' : 'Publish'}
        </button>
        <button type="button" className="secondary danger" onClick={() => void run(() => api.archivePromotion(promotion.id).then(() => undefined), 'Promotion archived.')}>
          Archive
        </button>
      </div>
      <p className="muted">Linked dessert: {promotion.dessert?.name ?? 'None'}</p>
      <p className="muted">
        Window: {promotion.starts_at ? formatDateTime(promotion.starts_at) : 'now'} to {promotion.ends_at ? formatDateTime(promotion.ends_at) : 'open-ended'}
      </p>
    </section>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '')
  return text ? Number(text) : null
}

function dateTimeLocalValue(value: string | null) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function dateTimePayload(value: FormDataEntryValue | null) {
  const text = String(value ?? '')
  if (!text) {
    return null
  }
  return new Date(text).toISOString()
}

function promotionPayload(form: FormData): Partial<AdminPromotion> {
  const startsAt = dateTimePayload(form.get('starts_at'))
  const endsAt = dateTimePayload(form.get('ends_at'))
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new Error('ends_at must be greater than starts_at')
  }
  return {
    dessert_id: nullableNumber(form.get('dessert_id')),
    title: String(form.get('title') ?? ''),
    slug: String(form.get('slug') ?? ''),
    summary: String(form.get('summary') ?? ''),
    body: String(form.get('body') ?? ''),
    starts_at: startsAt,
    ends_at: endsAt,
  }
}

function siteSettingsPayload(form: FormData): Partial<SiteSettings> {
  return {
    hero_title: String(form.get('hero_title') ?? ''),
    hero_text: String(form.get('hero_text') ?? ''),
    about_master_title: String(form.get('about_master_title') ?? ''),
    about_master_text: String(form.get('about_master_text') ?? ''),
    phone: String(form.get('phone') ?? ''),
    email: String(form.get('email') ?? ''),
    whatsapp_url: String(form.get('whatsapp_url') ?? ''),
    telegram_url: String(form.get('telegram_url') ?? ''),
    social_url: String(form.get('social_url') ?? ''),
    address_text: String(form.get('address_text') ?? ''),
    working_hours_text: String(form.get('working_hours_text') ?? ''),
    order_terms_text: String(form.get('order_terms_text') ?? ''),
    delivery_text: String(form.get('delivery_text') ?? ''),
    pickup_text: String(form.get('pickup_text') ?? ''),
    prepayment_text: String(form.get('prepayment_text') ?? ''),
  }
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
