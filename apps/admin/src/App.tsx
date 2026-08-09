import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AdminApi,
  ApiError,
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

type AdminSection = 'overview' | 'catalog' | 'inquiries' | 'reviews' | 'promotions' | 'site-settings'

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
  const [activeSection, setActiveSection] = useState<AdminSection>('catalog')
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')
  const [authError, setAuthError] = useState('')
  const [workspaceError, setWorkspaceError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      try {
        const restored = await api.me()
        if (!cancelled) {
          setAuthError('')
          setUser(restored)
          await bootstrapWorkspace()
        }
      } catch (error) {
        if (cancelled) {
          return
        }
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          resetWorkspaceState()
          return
        }
        setAuthError(describeError(error, 'Не удалось восстановить сеанс администратора.'))
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

  async function bootstrapWorkspace() {
    setWorkspaceLoading(true)
    setWorkspaceError('')
    try {
      await loadWorkspace()
      return true
    } catch (error) {
      setWorkspaceError(describeError(error, 'Не удалось загрузить данные панели управления.'))
      return false
    } finally {
      setWorkspaceLoading(false)
    }
  }

  function resetWorkspaceState() {
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
    setInquiryTotal(0)
    setSelectedInquiry(null)
    setWorkspaceLoading(false)
    setWorkspaceError('')
  }

  async function run(action: () => Promise<void>, success: string) {
    setMessage('')
    try {
      await action()
      const refreshed = await bootstrapWorkspace()
      if (refreshed) {
        setMessage(success)
        setMessageTone('success')
      }
    } catch (error) {
      setMessageTone('error')
      setMessage(describeError(error, 'Запрос не выполнен.'))
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setAuthError('')
    setWorkspaceError('')
    setMessage('')
    try {
      const loggedIn = await api.login(form.get('email'), form.get('password'))
      setUser(loggedIn)
      await bootstrapWorkspace()
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 401 || error.status === 403)) {
        setAuthError('Вход не выполнен. Проверьте эл. почту и пароль.')
        return
      }
      setAuthError(describeError(error, 'Вход не выполнен.'))
    }
  }

  async function handleLogout() {
    await api.logout()
    setMessage('')
    setAuthError('')
    resetWorkspaceState()
  }

  if (loading) {
    return <main className="shell">Загрузка сеанса администратора...</main>
  }

  if (!user) {
    return (
      <main className="shell shell-narrow">
        <h1>Панель управления Cake &amp; Shape</h1>
        <p className="muted">Введите данные администратора для входа в панель управления.</p>
        <form className="card form" onSubmit={handleLogin}>
          <label>
            Эл. почта
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Пароль
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Войти</button>
          {authError ? <p className="error">{authError}</p> : null}
        </form>
      </main>
    )
  }

  const sectionItems: Array<{ id: AdminSection; label: string; meta: string }> = [
    { id: 'overview', label: 'Обзор', meta: 'Статус и недавняя активность' },
    { id: 'catalog', label: 'Каталог', meta: `${desserts.length} десертов` },
    { id: 'inquiries', label: 'Заявки', meta: `${inquiryTotal} обращений` },
    { id: 'reviews', label: 'Отзывы', meta: `${reviews.length} записей` },
    { id: 'promotions', label: 'Акции', meta: `${promotions.length} кампаний` },
    { id: 'site-settings', label: 'Настройки сайта', meta: 'Публичная информация о бизнесе' },
  ]

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">Cake &amp; Shape</p>
          <h1>Панель управления</h1>
          <p className="muted">Вы вошли как {user.email}</p>
        </div>

        <nav className="sidebar-nav" aria-label="Разделы панели управления">
          {sectionItems.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span>{section.label}</span>
              <small>{section.meta}</small>
            </button>
          ))}
        </nav>

        <button type="button" className="secondary sidebar-logout" onClick={handleLogout}>
          Выйти
        </button>
      </aside>

      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Панель управления</p>
            <h2>{sectionTitle(activeSection)}</h2>
          </div>
          <div className="workspace-status">
            {workspaceLoading ? <p className="muted">Загрузка данных панели...</p> : null}
            {workspaceError ? <p className="error">{workspaceError}</p> : null}
            {message ? <p className={messageTone === 'error' ? 'error' : 'success'}>{message}</p> : null}
          </div>
        </header>

        <div className="workspace-content">
          {activeSection === 'overview' ? <OverviewPanel overview={overview} /> : null}
          {activeSection === 'catalog' ? (
            <DessertPanel
              categories={categories.filter((category) => !category.archived_at)}
              desserts={desserts}
              selectedDessert={selectedDessert}
              setSelectedDessert={setSelectedDessert}
              run={run}
            />
          ) : null}
          {activeSection === 'inquiries' ? (
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
          ) : null}
          {activeSection === 'reviews' ? (
            <ReviewPanel
              desserts={desserts}
              reviews={reviews}
              selectedReview={selectedReview}
              setSelectedReview={setSelectedReview}
              run={run}
            />
          ) : null}
          {activeSection === 'promotions' ? (
            <PromotionPanel
              desserts={desserts}
              promotions={promotions}
              selectedPromotion={selectedPromotion}
              setSelectedPromotion={setSelectedPromotion}
              run={run}
            />
          ) : null}
          {activeSection === 'site-settings' && settings ? <SettingsPanel settings={settings} run={run} /> : null}
        </div>
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

const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  waiting_customer: 'Ожидает клиента',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
  spam: 'Спам',
}

const inquiryTransitionLabels: Record<InquiryStatus, string> = {
  new: 'В новую',
  in_progress: 'В работу',
  waiting_customer: 'Ожидать клиента',
  confirmed: 'Подтвердить',
  completed: 'Завершить',
  cancelled: 'Отменить',
  spam: 'В спам',
}

const contactChannelLabels: Record<'phone' | 'email' | 'whatsapp' | 'telegram', string> = {
  phone: 'Телефон',
  email: 'Эл. почта',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}

const fulfillmentLabels: Record<'pickup' | 'delivery', string> = {
  pickup: 'Самовывоз',
  delivery: 'Доставка',
}

const merchandisingFlagLabels: Record<
  'is_available' | 'is_new' | 'is_popular' | 'is_seasonal' | 'is_bento' | 'is_sugar_free' | 'is_gluten_free' | 'is_low_calorie',
  string
> = {
  is_available: 'Доступен для заказа',
  is_new: 'Новинка',
  is_popular: 'Популярный',
  is_seasonal: 'Сезонный',
  is_bento: 'Бенто',
  is_sugar_free: 'Без сахара',
  is_gluten_free: 'Без глютена',
  is_low_calorie: 'Низкокалорийный',
}

function OverviewPanel({ overview }: { overview: AdminOverview | null }) {
  return (
    <section className="card stack wide">
      <div className="section-heading">
        <div>
          <h2>Оперативный обзор</h2>
          <p className="muted">Краткая сводка по каталогу, заявкам и акциям.</p>
        </div>
      </div>
      {!overview ? <p className="muted">Загрузка обзора...</p> : null}
      {overview ? (
        <>
          <div className="details">
            <div><dt>Опубликованные десерты</dt><dd>{overview.published_dessert_count}</dd></div>
            <div><dt>Черновики</dt><dd>{overview.hidden_unpublished_dessert_count}</dd></div>
            <div><dt>Новые заявки</dt><dd>{overview.new_inquiry_count}</dd></div>
            <div><dt>Активные акции</dt><dd>{overview.active_promotion_count}</dd></div>
          </div>
          <div className="inline-form">
            <div className="note-box">
              <strong>Недавние заявки</strong>
              {overview.recent_inquiries.length === 0 ? <p className="muted">Пока нет недавних заявок.</p> : null}
              {overview.recent_inquiries.map((inquiry) => (
                <p key={inquiry.id}>
                  #{inquiry.public_reference} · {formatInquiryStatus(inquiry.status)} · {formatDateTime(inquiry.created_at)}
                </p>
              ))}
            </div>
            <div className="note-box">
              <strong>Активные акции</strong>
              {overview.active_promotions.length === 0 ? <p className="muted">Сейчас нет активных акций.</p> : null}
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
        <h2>Настройки сайта</h2>
        <p className="muted">Глобальный публичный контент, который видят посетители сайта.</p>
      </div>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () => api.updateSiteSettings(siteSettingsPayload(form)).then(() => undefined),
            'Настройки сайта сохранены.',
          )
        }}
      >
        <div className="inline-form">
          <input name="hero_title" defaultValue={settings.hero_title} placeholder="Заголовок первого экрана" required />
          <input name="phone" defaultValue={settings.phone} placeholder="Телефон" />
          <input name="email" defaultValue={settings.email} placeholder="Эл. почта" />
        </div>
        <textarea name="hero_text" defaultValue={settings.hero_text} placeholder="Текст первого экрана" />
        <input name="about_master_title" defaultValue={settings.about_master_title} placeholder="Заголовок блока о мастере" />
        <textarea name="about_master_text" defaultValue={settings.about_master_text} placeholder="Текст блока о мастере" />
        <div className="inline-form">
          <input name="whatsapp_url" defaultValue={settings.whatsapp_url} placeholder="Ссылка WhatsApp" />
          <input name="telegram_url" defaultValue={settings.telegram_url} placeholder="Ссылка Telegram" />
          <input name="social_url" defaultValue={settings.social_url} placeholder="Ссылка на соцсеть" />
        </div>
        <textarea name="address_text" defaultValue={settings.address_text} placeholder="Адрес" />
        <textarea name="working_hours_text" defaultValue={settings.working_hours_text} placeholder="Часы работы" />
        <textarea name="order_terms_text" defaultValue={settings.order_terms_text} placeholder="Условия заказа" />
        <textarea name="delivery_text" defaultValue={settings.delivery_text} placeholder="Доставка" />
        <textarea name="pickup_text" defaultValue={settings.pickup_text} placeholder="Самовывоз" />
        <textarea name="prepayment_text" defaultValue={settings.prepayment_text} placeholder="Предоплата" />
        <button type="submit">Сохранить настройки сайта</button>
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
          <h2>Заявки</h2>
          <p className="muted">Всего обращений: {total}</p>
        </div>
        <div className="filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as InquiryStatus | '')}>
            <option value="">Все статусы</option>
            {(Object.keys(transitionMap) as InquiryStatus[]).map((status) => (
              <option key={status} value={status}>
                {formatInquiryStatus(status)}
              </option>
            ))}
          </select>
          <select value={channelFilter} onChange={(event) => setChannelFilter(event.currentTarget.value)}>
            <option value="">Все каналы</option>
            <option value="email">{formatContactChannel('email')}</option>
            <option value="phone">{formatContactChannel('phone')}</option>
            <option value="whatsapp">{formatContactChannel('whatsapp')}</option>
            <option value="telegram">{formatContactChannel('telegram')}</option>
          </select>
          <input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Поиск по контакту или номеру" />
        </div>
      </div>

      {inquiries.length === 0 ? <p className="muted">По этим фильтрам заявок не найдено.</p> : null}
      <div className="list">
        {inquiries.map((inquiry) => (
          <button className="row-button" type="button" key={inquiry.id} onClick={() => setSelectedInquiry(inquiry)}>
            {inquiry.customer_name}
            <span>{formatInquiryStatus(inquiry.status)}</span>
          </button>
        ))}
      </div>
      <div className="row-actions">
        <button className="secondary" type="button" disabled={offset === 0} onClick={() => page(Math.max(0, offset - limit))}>
          Назад
        </button>
        <span className="muted">
          {offset + 1}-{Math.min(offset + limit, total)} из {total}
        </span>
        <button className="secondary" type="button" disabled={offset + limit >= total} onClick={() => page(offset + limit)}>
          Вперед
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
        <div><dt>Статус</dt><dd>{formatInquiryStatus(inquiry.status)}</dd></div>
        <div><dt>Предпочтительный контакт</dt><dd>{formatContactChannel(inquiry.preferred_contact_channel)}</dd></div>
        <div><dt>Телефон</dt><dd>{inquiry.phone ?? 'Не указан'}</dd></div>
        <div><dt>Эл. почта</dt><dd>{inquiry.email ?? 'Не указана'}</dd></div>
        <div><dt>Десерт</dt><dd>{inquiry.dessert?.name ?? inquiry.dessert_name_snapshot ?? 'Без привязки к десерту'}</dd></div>
        <div><dt>Вариант</dt><dd>{variantSnapshot(inquiry)}</dd></div>
        <div><dt>Получение</dt><dd>{formatFulfillment(inquiry.fulfillment_method)}</dd></div>
        <div><dt>Желаемая дата</dt><dd>{inquiry.requested_date ?? 'Гибко'}</dd></div>
        <div><dt>Количество</dt><dd>{inquiry.quantity ?? 'Не указано'}</dd></div>
        <div><dt>Создана</dt><dd>{formatDateTime(inquiry.created_at)}</dd></div>
        <div><dt>Статус изменен</dt><dd>{formatDateTime(inquiry.status_changed_at)}</dd></div>
      </dl>
      {inquiry.recipe_preferences ? <p className="note-box">Пожелания по рецепту: {inquiry.recipe_preferences}</p> : null}
      {inquiry.decor_preferences ? <p className="note-box">Пожелания по декору: {inquiry.decor_preferences}</p> : null}
      <p className="note-box">{inquiry.message}</p>

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(() => api.updateInquiryNotes(inquiry.id, String(form.get('internal_notes') ?? '')).then(() => undefined), 'Внутренние заметки сохранены.')
        }}
      >
        <textarea name="internal_notes" defaultValue={inquiry.internal_notes} placeholder="Внутренние заметки" />
        <button type="submit">Сохранить заметки</button>
      </form>

      <div className="inline-form">
        {transitionMap[inquiry.status].map((target) => (
          <button key={target} type="button" className="secondary" onClick={() => void run(() => api.transitionInquiry(inquiry.id, target).then(() => undefined), 'Статус заявки обновлен.')}>
            {formatInquiryTransition(target)}
          </button>
        ))}
        {transitionMap[inquiry.status].length === 0 ? <span className="muted">Конечный статус</span> : null}
      </div>

      <div className="history">
        <strong>История статусов</strong>
        {inquiry.status_history.length === 0 ? <p className="muted">Переходов пока не было.</p> : null}
        {inquiry.status_history.map((entry) => (
          <p key={entry.id}>
            {formatInquiryStatus(entry.from_status)} → {formatInquiryStatus(entry.to_status)} · {formatDateTime(entry.changed_at)}
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
          <h2>Отзывы</h2>
          <p className="muted">Активных отзывов: {reviews.length}</p>
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
            'Отзыв создан.',
          )
          event.currentTarget.reset()
        }}
      >
        <input name="author_name" placeholder="Имя автора" required />
        <input name="rating" type="number" min="1" max="5" defaultValue="5" required />
        <select name="dessert_id">
          <option value="">Без привязки к десерту</option>
          {desserts.map((dessert) => (
            <option key={dessert.id} value={dessert.id}>
              {dessert.name}
            </option>
          ))}
        </select>
        <textarea name="text" placeholder="Текст отзыва" required />
        <button type="submit">Создать отзыв</button>
      </form>

      {reviews.length === 0 ? <p className="muted">Отзывов пока нет.</p> : null}
      <div className="list">
        {reviews.map((review) => (
          <button className="row-button" type="button" key={review.id} onClick={() => setSelectedReview(review)}>
            {review.author_name}
            <span>
              {review.rating}/5 · {review.is_published ? 'Опубликован' : 'Черновик'}
              {review.is_featured ? ' · Рекомендуемый' : ''}
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
              onClick={() => void run(() => api.reorderReviews(moveOrder(reviews, index, index - 1)).then(() => undefined), 'Отзывы переупорядочены.')}
            >
              Вверх
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === reviews.length - 1}
              onClick={() => void run(() => api.reorderReviews(moveOrder(reviews, index, index + 1)).then(() => undefined), 'Отзывы переупорядочены.')}
            >
              Вниз
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
      <h3>Редактирование отзыва: {review.author_name}</h3>
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
            'Отзыв сохранен.',
          )
        }}
      >
        <input name="author_name" defaultValue={review.author_name} required />
        <input name="rating" type="number" min="1" max="5" defaultValue={review.rating} required />
        <select name="dessert_id" defaultValue={review.dessert_id ?? ''}>
          <option value="">Без привязки к десерту</option>
          {desserts.map((dessert) => (
            <option key={dessert.id} value={dessert.id}>
              {dessert.name}
            </option>
          ))}
        </select>
        <textarea name="text" defaultValue={review.text} required />
        <button type="submit">Сохранить отзыв</button>
      </form>
      <div className="inline-form">
        <button type="button" className="secondary" onClick={() => void run(() => (review.is_published ? api.unpublishReview(review.id) : api.publishReview(review.id)).then(() => undefined), 'Статус публикации отзыва обновлен.')}>
          {review.is_published ? 'Снять с публикации' : 'Опубликовать'}
        </button>
        <button type="button" className="secondary" onClick={() => void run(() => (review.is_featured ? api.unfeatureReview(review.id) : api.featureReview(review.id)).then(() => undefined), 'Признак рекомендуемого отзыва обновлен.')}>
          {review.is_featured ? 'Убрать из рекомендуемых' : 'Сделать рекомендуемым'}
        </button>
        <button type="button" className="secondary danger" onClick={() => void run(() => api.archiveReview(review.id).then(() => undefined), 'Отзыв архивирован.')}>
          Архивировать
        </button>
      </div>
      <p className="muted">Связанный десерт: {review.dessert?.name ?? 'Нет'}</p>
      <p className="muted">Обновлен: {formatDateTime(review.updated_at)}</p>
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
          <h2>Акции</h2>
          <p className="muted">Активных акций: {promotions.length}</p>
        </div>
      </div>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(
            () => api.createPromotion(promotionPayload(form)).then(() => undefined),
            'Акция создана.',
          )
          event.currentTarget.reset()
        }}
      >
        <div className="inline-form">
          <input name="title" placeholder="Название акции" required />
          <input name="slug" placeholder="slug акции" required />
          <select name="dessert_id">
            <option value="">Без привязки к десерту</option>
            {desserts.map((dessert) => (
              <option key={dessert.id} value={dessert.id}>
                {dessert.name}
              </option>
            ))}
          </select>
        </div>
        <textarea name="summary" placeholder="Краткое публичное описание" />
        <textarea name="body" placeholder="Подробности акции" />
        <div className="inline-form">
          <label>
            Начало
            <input name="starts_at" type="datetime-local" />
          </label>
          <label>
            Завершение
            <input name="ends_at" type="datetime-local" />
          </label>
        </div>
        <button type="submit">Создать акцию</button>
      </form>

      {promotions.length === 0 ? <p className="muted">Акций пока нет.</p> : null}
      <div className="list">
        {promotions.map((promotion) => (
          <button className="row-button" type="button" key={promotion.id} onClick={() => setSelectedPromotion(promotion)}>
            {promotion.title}
            <span>{promotion.is_published ? 'Опубликована' : 'Черновик'}</span>
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
              onClick={() => void run(() => api.reorderPromotions(moveOrder(promotions, index, index - 1)).then(() => undefined), 'Акции переупорядочены.')}
            >
              Вверх
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === promotions.length - 1}
              onClick={() => void run(() => api.reorderPromotions(moveOrder(promotions, index, index + 1)).then(() => undefined), 'Акции переупорядочены.')}
            >
              Вниз
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
      <h3>Редактирование: {promotion.title}</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void run(() => api.updatePromotion(promotion.id, promotionPayload(form)).then(() => undefined), 'Акция сохранена.')
        }}
      >
        <div className="inline-form">
          <input name="title" defaultValue={promotion.title} required />
          <input name="slug" defaultValue={promotion.slug} required />
          <select name="dessert_id" defaultValue={promotion.dessert_id ?? ''}>
            <option value="">Без привязки к десерту</option>
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
            Начало
            <input name="starts_at" type="datetime-local" defaultValue={dateTimeLocalValue(promotion.starts_at)} />
          </label>
          <label>
            Завершение
            <input name="ends_at" type="datetime-local" defaultValue={dateTimeLocalValue(promotion.ends_at)} />
          </label>
        </div>
        <button type="submit">Сохранить акцию</button>
      </form>
      <div className="inline-form">
        <button type="button" className="secondary" onClick={() => void run(() => (promotion.is_published ? api.unpublishPromotion(promotion.id) : api.publishPromotion(promotion.id)).then(() => undefined), 'Статус публикации акции обновлен.')}>
          {promotion.is_published ? 'Снять с публикации' : 'Опубликовать'}
        </button>
        <button type="button" className="secondary danger" onClick={() => void run(() => api.archivePromotion(promotion.id).then(() => undefined), 'Акция архивирована.')}>
          Архивировать
        </button>
      </div>
      <p className="muted">Связанный десерт: {promotion.dessert?.name ?? 'Нет'}</p>
      <p className="muted">
        Период: {promotion.starts_at ? formatDateTime(promotion.starts_at) : 'сейчас'} до {promotion.ends_at ? formatDateTime(promotion.ends_at) : 'без ограничения'}
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
    <section className="subcard stack">
      <div>
        <h3>Категории</h3>
        <p className="muted">Дополнительная структура каталога и управление видимостью.</p>
      </div>
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
            'Категория создана.',
          )
          event.currentTarget.reset()
        }}
      >
        <input name="name" placeholder="Название категории" required />
        <input name="slug" placeholder="slug категории" required />
        <textarea name="description" placeholder="Описание" />
        <button type="submit">Создать категорию</button>
      </form>

      <div className="list">
        {categories.map((category) => (
          <article className="mini-card" key={category.id}>
            <strong>{category.name}</strong>
            <span className="muted">/{category.slug}</span>
            <label>
              Видима
              <input
                type="checkbox"
                checked={category.is_visible}
                onChange={(event) =>
                  void run(
                    () => api.updateCategory(category.id, { is_visible: event.currentTarget.checked }).then(() => undefined),
                    'Категория обновлена.',
                  )
                }
              />
            </label>
            <button type="button" className="secondary" onClick={() => void run(() => api.archiveCategory(category.id).then(() => undefined), 'Категория архивирована.')}>
              Архивировать
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
  const [search, setSearch] = useState('')
  const visibleDesserts = desserts.filter((dessert) => {
    const query = search.trim().toLowerCase()
    const categoryName = categories.find((category) => category.id === dessert.category_id)?.name.toLowerCase() ?? ''
    if (!query) {
      return true
    }
    return dessert.name.toLowerCase().includes(query) || dessert.slug.toLowerCase().includes(query) || categoryName.includes(query)
  })

  return (
    <section className="catalog-workspace">
      <aside className="card catalog-sidebar stack">
        <div className="section-heading">
          <div>
            <h2>Десерты</h2>
            <p className="muted">Всего в каталоге: {desserts.length}</p>
          </div>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Поиск по названию, слагу или категории"
        />

        <form
          className="form subcard"
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
              'Десерт создан.',
            )
            event.currentTarget.reset()
          }}
        >
          <div className="section-heading">
            <strong>Создать десерт</strong>
          </div>
          <select name="category_id" required>
            <option value="">Выберите категорию</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Название десерта" required />
          <input name="slug" placeholder="slug десерта" required />
          <textarea name="short_description" placeholder="Краткое описание" />
          <button type="submit">Создать десерт</button>
        </form>

        <div className="catalog-list">
          {visibleDesserts.map((dessert) => {
            const currentIndex = itemIndex(desserts, dessert.id)
            return (
            <article
              className={`catalog-row ${selectedDessert?.id === dessert.id ? 'selected' : ''}`}
              key={dessert.id}
            >
              <button type="button" className="catalog-select" onClick={() => setSelectedDessert(dessert)}>
                <span className="catalog-name">{dessert.name}</span>
                <span className="catalog-meta">{dessert.slug}</span>
                <div className="badge-row">
                  <StatusBadge tone={dessert.is_published ? 'published' : 'draft'}>
                    {dessert.is_published ? 'Опубликован' : 'Черновик'}
                  </StatusBadge>
                  <StatusBadge tone={dessert.is_available ? 'available' : 'muted'}>
                    {dessert.is_available ? 'Доступен' : 'Недоступен'}
                  </StatusBadge>
                </div>
              </button>
              <div className="row-actions compact">
                <button
                  type="button"
                  className="secondary"
                  disabled={currentIndex === 0}
                  onClick={() =>
                    void run(
                      () => api.reorderDesserts(moveOrder(desserts, currentIndex, currentIndex - 1)).then(() => undefined),
                      'Десерты переупорядочены.',
                    )
                  }
                >
                  Вверх
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={currentIndex === desserts.length - 1}
                  onClick={() =>
                    void run(
                      () => api.reorderDesserts(moveOrder(desserts, currentIndex, currentIndex + 1)).then(() => undefined),
                      'Десерты переупорядочены.',
                    )
                  }
                >
                  Вниз
                </button>
              </div>
            </article>
            )
          })}
          {visibleDesserts.length === 0 ? <p className="muted">По этому запросу десертов не найдено.</p> : null}
        </div>

        <CategoryPanel categories={categories} run={run} />
      </aside>

      <div className="catalog-detail">
        {selectedDessert ? (
          <DessertEditor dessert={selectedDessert} categories={categories} run={run} />
        ) : (
          <section className="card empty-state">
            <h3>Выберите десерт</h3>
            <p className="muted">Откройте десерт из списка, чтобы редактировать описание, варианты, фотографии и параметры отображения в каталоге.</p>
          </section>
        )}
      </div>
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
    <section className="card editor stack">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Редактор каталога</p>
          <h3>{dessert.name}</h3>
          <p className="muted">/{dessert.slug}</p>
        </div>
        <div className="detail-header-actions">
          <StatusBadge tone={dessert.is_published ? 'published' : 'draft'}>
            {dessert.is_published ? 'Опубликован' : 'Черновик'}
          </StatusBadge>
          <StatusBadge tone={dessert.is_available ? 'available' : 'muted'}>
            {dessert.is_available ? 'Доступен' : 'Недоступен'}
          </StatusBadge>
          <button
            type="button"
            onClick={() =>
              void run(
                () => api.updateDessert(dessert.id, { is_published: !dessert.is_published }).then(() => undefined),
                dessert.is_published ? 'Десерт снят с публикации.' : 'Десерт опубликован.',
              )
            }
          >
            {dessert.is_published ? 'Снять с публикации' : 'Опубликовать'}
          </button>
          <button
            type="button"
            className="secondary danger"
            onClick={() => void run(() => api.archiveDessert(dessert.id).then(() => undefined), 'Десерт архивирован.')}
          >
            Архивировать
          </button>
        </div>
      </div>

      <section className="subcard stack">
        <div>
          <h4>Основная информация</h4>
          <p className="muted">Название, категория, описания и примечание к приготовлению.</p>
        </div>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void run(
              () =>
                api.updateDessert(dessert.id, {
                  category_id: Number(form.get('category_id')),
                  name: String(form.get('name') ?? ''),
                  slug: String(form.get('slug') ?? ''),
                  short_description: String(form.get('short_description') ?? ''),
                  full_description: String(form.get('full_description') ?? ''),
                  preparation_time_text: String(form.get('preparation_time_text') ?? ''),
                }).then(() => undefined),
              'Основная информация сохранена.',
            )
          }}
        >
          <div className="inline-form wide-inputs">
            <label>
              Категория
              <select name="category_id" defaultValue={String(dessert.category_id)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Название
              <input name="name" defaultValue={dessert.name} required />
            </label>
            <label>
              Слаг
              <input name="slug" defaultValue={dessert.slug} required />
            </label>
          </div>
          <label>
            Краткое описание
            <textarea name="short_description" defaultValue={dessert.short_description} />
          </label>
          <label>
            Полное описание
            <textarea name="full_description" defaultValue={dessert.full_description} />
          </label>
          <label>
            Время приготовления
            <input name="preparation_time_text" defaultValue={dessert.preparation_time_text} placeholder="Например, 2 дня" />
          </label>
          <button type="submit">Сохранить основную информацию</button>
        </form>
      </section>

      <section className="subcard stack">
        <div>
          <h4>Состав и КБЖУ</h4>
          <p className="muted">Ингредиенты, предупреждения, аллергены и пищевые значения.</p>
        </div>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void run(
              () =>
                api.updateDessert(dessert.id, {
                  ingredients: String(form.get('ingredients') ?? ''),
                  allergens: String(form.get('allergens') ?? ''),
                  warnings: String(form.get('warnings') ?? ''),
                  calories: nullableNumber(form.get('calories')),
                  proteins: nullableText(form.get('proteins')),
                  fats: nullableText(form.get('fats')),
                  carbohydrates: nullableText(form.get('carbohydrates')),
                }).then(() => undefined),
              'Состав и КБЖУ сохранены.',
            )
          }}
        >
          <div className="inline-form">
            <label>
              Калории
              <input name="calories" type="number" min="0" defaultValue={dessert.calories ?? ''} />
            </label>
            <label>
              Белки
              <input name="proteins" defaultValue={dessert.proteins ?? ''} />
            </label>
            <label>
              Жиры
              <input name="fats" defaultValue={dessert.fats ?? ''} />
            </label>
            <label>
              Углеводы
              <input name="carbohydrates" defaultValue={dessert.carbohydrates ?? ''} />
            </label>
          </div>
          <label>
            Ингредиенты
            <textarea name="ingredients" defaultValue={dessert.ingredients} />
          </label>
          <label>
            Аллергены
            <textarea name="allergens" defaultValue={dessert.allergens} />
          </label>
          <label>
            Предупреждения
            <textarea name="warnings" defaultValue={dessert.warnings} />
          </label>
          <button type="submit">Сохранить состав и КБЖУ</button>
        </form>
      </section>

      <section className="subcard stack">
        <div>
          <h4>Варианты и цены</h4>
          <p className="muted">Вес, цена и порядок вариантов.</p>
        </div>
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
                  price: rublesToMinorUnits(form.get('price')),
                }).then(() => undefined),
              'Вариант добавлен.',
            )
            event.currentTarget.reset()
          }}
        >
          <input name="weight_value" placeholder="Значение веса" required />
          <select name="weight_unit" defaultValue="kg">
            <option value="g">г</option>
            <option value="kg">кг</option>
            <option value="pcs">шт</option>
          </select>
          <label>
            Цена в ₽
            <input name="price" type="text" inputMode="decimal" placeholder="2800 или 2800,50" required />
          </label>
          <button type="submit">Добавить вариант</button>
        </form>

        <div className="variant-list">
          {dessert.variants.map((variant) => (
            <article className="mini-card variant-card" key={variant.id}>
              <div>
                <strong>
                  {variant.weight_value} {formatWeightUnit(variant.weight_unit)}
                </strong>
                <p className="muted">{formatPrice(variant.price)}</p>
              </div>
              <div className="row-actions compact">
                <button type="button" className="secondary" onClick={() => void run(() => api.archiveVariant(dessert.id, variant.id).then(() => undefined), 'Вариант архивирован.')}>
                  Архивировать
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
                      'Варианты переупорядочены.',
                    )
                  }
                >
                  Вверх
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
                      'Варианты переупорядочены.',
                    )
                  }
                >
                  Вниз
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="subcard stack">
        <div>
          <h4>Фотографии</h4>
          <p className="muted">Загрузка, порядок и выбор основной фотографии десерта.</p>
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
            void run(() => api.uploadImage(dessert.id, upload).then(() => undefined), 'Фотография загружена.')
            event.currentTarget.reset()
          }}
        >
          <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
          <input name="alt_text" placeholder="Альтернативный текст" />
          <label className="checkbox">
            <input name="is_primary" type="checkbox" />
            Основная фотография
          </label>
          <button type="submit">Загрузить фотографию</button>
        </form>

        <div className="image-grid">
          {dessert.images.map((image) => (
            <article className="mini-card image-card" key={image.id}>
              <div className="image-frame">
                <img alt={image.alt_text || dessert.name} src={`${apiBaseUrl.replace('/api', '')}${image.url}`} />
              </div>
              <div className="section-heading">
                <strong>{image.alt_text || image.original_filename}</strong>
                {image.is_primary ? <StatusBadge tone="published">Основная</StatusBadge> : null}
              </div>
              <form
                className="form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  void run(
                    () => api.updateImageAlt(dessert.id, image.id, String(form.get('alt_text') ?? '')).then(() => undefined),
                    'Описание фотографии сохранено.',
                  )
                }}
              >
                <label>
                  Описание изображения (Alt)
                  <input name="alt_text" defaultValue={image.alt_text} />
                </label>
                <button type="submit" className="secondary">Сохранить описание</button>
              </form>
              <div className="row-actions compact">
                <button type="button" className="secondary" onClick={() => void run(() => api.setPrimaryImage(dessert.id, image.id).then(() => undefined), 'Основная фотография обновлена.')}>
                  Сделать основной
                </button>
                <button type="button" className="secondary" onClick={() => void run(() => api.deleteImage(dessert.id, image.id).then(() => undefined), 'Фотография удалена.')}>
                  Удалить
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
                      'Фотографии переупорядочены.',
                    )
                  }
                >
                  Вверх
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
                      'Фотографии переупорядочены.',
                    )
                  }
                >
                  Вниз
                </button>
              </div>
            </article>
          ))}
          {dessert.images.length === 0 ? <p className="muted">Фотографии пока не загружены.</p> : null}
        </div>
      </section>

      <section className="subcard stack">
        <div>
          <h4>Статус и отображение в каталоге</h4>
          <p className="muted">Управление доступностью и подсветкой на витрине.</p>
        </div>
        <div className="toggles">
          {(['is_available', 'is_new', 'is_popular', 'is_seasonal', 'is_bento', 'is_sugar_free', 'is_gluten_free', 'is_low_calorie'] as const).map((field) => (
            <label key={field} className="checkbox-card">
              <span>{merchandisingFlagLabels[field]}</span>
              <input
                type="checkbox"
                checked={Boolean(dessert[field])}
                onChange={(event) =>
                  void run(
                    () => api.updateDessert(dessert.id, { [field]: event.currentTarget.checked }).then(() => undefined),
                    'Десерт обновлен.',
                  )
                }
              />
            </label>
          ))}
        </div>
      </section>
    </section>
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(price / 100)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function variantSnapshot(inquiry: AdminInquiry) {
  if (!inquiry.variant_weight_value_snapshot || !inquiry.variant_weight_unit_snapshot) {
    return 'Вариант не выбран'
  }
  return `${inquiry.variant_weight_value_snapshot} ${formatWeightUnit(inquiry.variant_weight_unit_snapshot)}`
}

function formatWeightUnit(unit: string) {
  const labels: Record<'g' | 'kg' | 'pcs', string> = {
    g: 'г',
    kg: 'кг',
    pcs: 'шт',
  }
  return unit === 'g' || unit === 'kg' || unit === 'pcs' ? labels[unit] : unit
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '')
  return text ? Number(text) : null
}

function nullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

function rublesToMinorUnits(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) {
    throw new Error('Цена должна быть указана в рублях, например 2800 или 2800.50.')
  }
  const wholeRubles = Number(match[1])
  const fractional = (match[2] ?? '').padEnd(2, '0')
  const minorUnits = wholeRubles * 100 + Number(fractional || '0')
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error('Цена слишком большая.')
  }
  return minorUnits
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
    throw new Error('Дата завершения акции должна быть позже даты начала.')
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

function sectionTitle(section: AdminSection) {
  switch (section) {
    case 'overview':
      return 'Обзор'
    case 'catalog':
      return 'Каталог'
    case 'inquiries':
      return 'Заявки'
    case 'reviews':
      return 'Отзывы'
    case 'promotions':
      return 'Акции'
    case 'site-settings':
      return 'Настройки сайта'
  }
}

function formatInquiryStatus(status: InquiryStatus) {
  return inquiryStatusLabels[status]
}

function formatInquiryTransition(status: InquiryStatus) {
  return inquiryTransitionLabels[status]
}

function formatContactChannel(channel: 'phone' | 'email' | 'whatsapp' | 'telegram') {
  return contactChannelLabels[channel]
}

function formatFulfillment(method: 'pickup' | 'delivery') {
  return fulfillmentLabels[method]
}

function StatusBadge({
  children,
  tone,
}: {
  children: string
  tone: 'published' | 'draft' | 'available' | 'muted'
}) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

function describeError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  return fallback
}

export default App
