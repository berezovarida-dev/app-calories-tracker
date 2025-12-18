import { useEffect, useState } from 'react'
import './App.css'
import { useTodayData } from './hooks/useTodayData'
import { useProfile } from './hooks/useProfile'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'
import { BarcodeScanner } from './components/BarcodeScanner'
import { ProductInfo } from './components/ProductInfo'
import { PhotoUpload } from './components/PhotoUpload'
import { ActivityAdd } from './components/ActivityAdd'
import {
  fetchProductByBarcode,
  type ProductInfo as ProductInfoType,
} from './utils/openFoodFacts'
import { supabase } from './supabaseClient'

type TabKey = 'today' | 'analytics' | 'profile'

type AddSheetAction =
  | 'barcode'
  | 'photo'
  | 'search'
  | 'activity'
  | 'favorites'
  | 'recent'

type CalendarDay = {
  date: string
  day: number
  hasFood: boolean
  hasActivity: boolean
  hasWater: boolean
  cycle: 'none' | 'menstruation'
}

let waterAudioCtx: AudioContext | null = null

function playWaterReminderSound() {
  try {
    if (!waterAudioCtx) {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      waterAudioCtx = new AudioCtx()
    }
    const ctx = waterAudioCtx
    if (ctx.state === 'suspended') {
      // Требуется первый пользовательский жест, чтобы разблокировать аудио
      ctx.resume().catch(() => {})
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.001

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    gain.gain.exponentialRampToValueAtTime(
      0.00001,
      ctx.currentTime + 0.4,
    )
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // молча игнорируем, если браузер блокирует звук
  }
}

function AppSimple() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [lastAction, setLastAction] = useState<AddSheetAction | null>(null)
  const [showWaterBanner, setShowWaterBanner] = useState(false)
  const [lastWaterTime, setLastWaterTime] = useState<Date | null>(new Date())
  const [selectedAnalyticsDay, setSelectedAnalyticsDay] =
    useState<string>('2025-01-08')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showActivityAdd, setShowActivityAdd] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<ProductInfoType | null>(
    null,
  )
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [mealsExpanded, setMealsExpanded] = useState(true)
  const [activitiesExpanded, setActivitiesExpanded] = useState(true)

  // Загружаем данные из Supabase
  const todayDate = new Date()
  const { data: todayData, loading: todayLoading, refetch: refetchToday } =
    useTodayData(todayDate)
  const { profile, loading: profileLoading } = useProfile()

  // Fallback на мок-данные, если пользователь не авторизован или данные не загружены
  const consumed = todayData.consumed || 960
  const burned = todayData.burned || 180
  const balance = todayData.balance || 780
  const target = todayData.target || 1900
  const waterMl = todayData.waterMl || 900
  const waterGoal = todayData.waterGoalMl || 2000

  // Данные профиля
  const profileHeightCm = profile?.height_cm || 168
  const profileStartWeightKg = profile?.start_weight_kg || 72
  const profileCurrentWeightKg = profile?.current_weight_kg || 68
  const profileGoalWeightKg = profile?.goal_weight_kg || 60
  const profileToGoalKg =
    (profileCurrentWeightKg || 0) - (profileGoalWeightKg || 0)

  const calendarMock: CalendarDay[] = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    return {
      date: `2025-01-${String(day).padStart(2, '0')}`,
      day,
      hasFood: day % 2 === 0,
      hasActivity: day % 3 === 0,
      hasWater: day % 2 === 1,
      cycle: day >= 7 && day <= 10 ? 'menstruation' : 'none',
    }
  })

  const selectedDay =
    calendarMock.find((d) => d.date === selectedAnalyticsDay) ??
    calendarMock[7]

  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastWaterTime) return
      const diffMs = Date.now() - lastWaterTime.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      if (diffHours >= 2 && activeTab === 'today' && !isAddOpen) {
        setShowWaterBanner(true)
        playWaterReminderSound()
      }
    }, 60 * 1000) // проверяем раз в минуту

    return () => clearInterval(interval)
  }, [lastWaterTime, activeTab, isAddOpen])

  const handleAddWater = async (amount: number) => {
    if (waterAudioCtx && waterAudioCtx.state === 'suspended') {
      waterAudioCtx.resume().catch(() => {})
    }

    // Оптимистичное обновление UI
    const previousWaterMl = waterMl
    const newWaterMl = previousWaterMl + amount

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        return
      }

      const dateStr = todayDate.toISOString().split('T')[0]

      // Получаем текущее значение из базы, чтобы избежать конфликтов
      const { data: currentState } = await supabase
        .from('daily_states')
        .select('water_intake_ml')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle()

      const currentWaterMl = currentState?.water_intake_ml || 0
      const finalWaterMl = currentWaterMl + amount

      // Обновляем или создаём запись в daily_states
      const { error } = await supabase.from('daily_states').upsert(
        {
          user_id: user.id,
          date: dateStr,
          water_intake_ml: finalWaterMl,
          water_goal_ml: waterGoal,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,date',
        },
      )

      if (error) {
        console.error('Error saving water:', error)
        // В случае ошибки можно показать toast или сообщение
      } else {
        // Перезагружаем данные после успешного сохранения
        refetchToday()
        setLastWaterTime(new Date())
        setShowWaterBanner(false)
      }
    } catch (error) {
      console.error('Error adding water:', error)
    }
  }

  const handleAddAction = (action: AddSheetAction) => {
    if (waterAudioCtx && waterAudioCtx.state === 'suspended') {
      waterAudioCtx.resume().catch(() => {})
    }
    setLastAction(action)
    setIsAddOpen(false)

    if (action === 'barcode') {
      setShowBarcodeScanner(true)
    } else if (action === 'photo') {
      setShowPhotoUpload(true)
    } else if (action === 'activity') {
      setShowActivityAdd(true)
    }
    // Остальные действия будут реализованы позже
  }

  const handleBarcodeScanned = async (barcode: string) => {
    setShowBarcodeScanner(false)
    setScannedBarcode(barcode)

    // Загружаем информацию о продукте
    const product = await fetchProductByBarcode(barcode)

    if (product) {
      setScannedProduct(product)
    } else {
      alert('Продукт не найден в базе Open Food Facts. Попробуй другой штрихкод или добавь продукт вручную.')
    }
  }

  const handleProductSaved = () => {
    setScannedProduct(null)
    setScannedBarcode(null)
    refetchToday()
  }

  // Показываем экран авторизации, если пользователь не залогинен
  if (authLoading) {
    return (
      <div className="app-root">
        <div className="app-main">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="app-root">
      <div className="app-main">
        <header className="app-header">
          <div className="today-date">
            {activeTab === 'today' && (
              <>
                <span className="app-header-subtitle">Сегодня</span>
                <span className="app-header-title">Баланс дня</span>
              </>
            )}
            {activeTab === 'analytics' && (
              <>
                <span className="app-header-subtitle">Обзор</span>
                <span className="app-header-title">Аналитика</span>
              </>
            )}
            {activeTab === 'profile' && (
              <>
                <span className="app-header-subtitle">Аккаунт</span>
                <span className="app-header-title">Профиль</span>
              </>
            )}
          </div>
        </header>

        <main className="app-content">
          {activeTab === 'today' && (
            <>
              <section className="hero-card">
                <div className="hero-top">
                  <div className="hero-badges">
                    <span>🍽 {consumed} ккал</span>
                    <span>🔥 {burned} ккал</span>
                  </div>
                  <div className="hero-total">цель · {target} ккал</div>
                </div>

                <div className="hero-grid">
                  <div className="hero-pill">
                    <div className="hero-pill-label">🍽 Потреблено</div>
                    <div className="hero-pill-value">{consumed}</div>
                    <div className="hero-pill-secondary">ккал за еду</div>
                  </div>
                  <div className="hero-pill">
                    <div className="hero-pill-label">🔥 Сожжено</div>
                    <div className="hero-pill-value">{burned}</div>
                    <div className="hero-pill-secondary">ккал активность</div>
                  </div>
                  <div
                    className={`hero-pill ${
                      balance <= target * 0.9
                        ? 'hero-balance-positive'
                        : balance <= target * 1.1
                          ? 'hero-balance-warning'
                          : 'hero-balance-danger'
                    }`}
                  >
                    <div className="hero-pill-label">⚖️ Баланс</div>
                    <div className="hero-pill-value">{balance}</div>
                    <div className="hero-pill-secondary">еда − активность</div>
                  </div>
                </div>

                <div className="hero-progress">
                  <div className="hero-progress-bar">
                    <div
                      className="hero-progress-fill"
                      style={{
                        width: `${Math.min(
                          Math.max((balance / target) * 100, 0),
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="hero-status">
                    <div className="hero-status-label">
                      <span
                        className={`hero-status-dot ${
                          balance <= target * 0.9
                            ? ''
                            : balance <= target * 1.1
                              ? 'hero-status-dot-warning'
                              : 'hero-status-dot-danger'
                        }`}
                      />
                      <span>Баланс дня</span>
                    </div>
                    <span>
                      {Math.round(
                        Math.min(Math.max((balance / target) * 100, 0), 100),
                      )}
                      % от цели
                    </span>
                  </div>
                </div>

                <p className="microcopy microcopy-strong">
                  {todayData.meals.length > 0
                    ? 'Сегодня уже есть прогресс'
                    : 'Можно начать с любого приёма — завтрак не обязателен'}
                </p>
                <p className="microcopy">
                  {todayData.activities.length > 0
                    ? 'Движение сегодня уже помогло балансу'
                    : 'Небольшая прогулка тоже считается'}
                </p>
              </section>

              <section className="water-card">
                <div className="water-info">
                  <span className="water-title">💧 Вода за сегодня</span>
                  <span className="water-subtitle">
                    {waterMl} / {waterGoal} мл
                  </span>
                  {waterMl > 0 && (
                    <div className="water-progress">
                      <div
                        className="water-progress-bar"
                        style={{
                          width: `${Math.min((waterMl / waterGoal) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="water-actions">
                  <button
                    type="button"
                    className="water-chip"
                    onClick={() => handleAddWater(100)}
                    disabled={todayLoading}
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    className="water-chip"
                    onClick={() => handleAddWater(200)}
                    disabled={todayLoading}
                  >
                    +200
                  </button>
                  <button
                    type="button"
                    className="water-chip"
                    onClick={() => handleAddWater(300)}
                    disabled={todayLoading}
                  >
                    +300
                  </button>
                </div>
              </section>

              <section className="section">
                <div className="section-header">
                  <button
                    type="button"
                    onClick={() => setMealsExpanded(!mealsExpanded)}
                    className="section-header-toggle"
                  >
                    <h2 className="section-title">Приёмы пищи</h2>
                    <span className="section-subtitle">
                      Всего: {consumed} ккал
                    </span>
                    <span className="section-toggle-icon">
                      {mealsExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                </div>
                {mealsExpanded && (
                  <>
                    {todayData.meals.length === 0 ? (
                      <div className="empty-state">
                        Можно добавить завтрак позже — ничего страшного
                      </div>
                    ) : (
                      <div className="cards-list">
                        {todayData.meals.map((meal) => {
                          const mealDate = new Date(meal.eaten_at)
                          const timeStr = `${String(mealDate.getHours()).padStart(
                            2,
                            '0',
                          )}:${String(mealDate.getMinutes()).padStart(2, '0')}`
                          return (
                            <article key={meal.id} className="entry-card">
                              <div className="entry-main">
                                <div className="entry-title">{meal.name}</div>
                                <div className="entry-meta">
                                  <span>{timeStr}</span>
                                  <span>
                                    Б {meal.protein} · Ж {meal.fat} · У {meal.carbs}
                                  </span>
                                </div>
                              </div>
                              <div className="entry-kcal">{meal.kcal} ккал</div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="section">
                <div className="section-header">
                  <button
                    type="button"
                    onClick={() => setActivitiesExpanded(!activitiesExpanded)}
                    className="section-header-toggle"
                  >
                    <h2 className="section-title">Активность</h2>
                    <span className="section-subtitle">Всего: {burned} ккал</span>
                    <span className="section-toggle-icon">
                      {activitiesExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                </div>
                {activitiesExpanded && (
                  <>
                    {todayData.activities.length === 0 ? (
                      <div className="empty-state">
                        Небольшая прогулка тоже считается — можно добавить позже
                      </div>
                    ) : (
                      <div className="cards-list">
                        {todayData.activities.map((activity) => {
                          const activityDate = new Date(activity.occurred_at)
                          const timeStr = `${String(
                            activityDate.getHours(),
                          ).padStart(2, '0')}:${String(
                            activityDate.getMinutes(),
                          ).padStart(2, '0')}`
                          return (
                            <article key={activity.id} className="entry-card">
                              <div className="entry-main">
                                <div className="entry-title">{activity.type}</div>
                                <div className="entry-meta">
                                  <span>{timeStr}</span>
                                  <span>{activity.duration_minutes} мин</span>
                                </div>
                              </div>
                              <div className="entry-kcal entry-kcal-negative">
                                −{activity.calories} ккал
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              <section className="analytics-card">
                <div className="analytics-heading">
                  Баланс за неделю важнее отдельных дней
                </div>
                <p className="analytics-text">
                  Здесь появятся графики: потреблено против сожжено и БЖУ по
                  дням. Активность помогает сглаживать колебания — даже короткие
                  прогулки и разминки имеют значение.
                </p>
                <div className="calendar-strip">
                  <div className="calendar-grid">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                      <div key={d} className="calendar-weekday">
                        {d}
                      </div>
                    ))}
                    {calendarMock.map((day) => {
                      const isSelected = day.date === selectedAnalyticsDay
                      const classes = [
                        'calendar-day',
                        isSelected ? 'calendar-day-active' : '',
                      ]
                      return (
                        <button
                          key={day.date}
                          type="button"
                          className={classes.join(' ').trim()}
                          onClick={() => setSelectedAnalyticsDay(day.date)}
                        >
                          <span className="calendar-day-number">{day.day}</span>
                          <span className="calendar-day-icons">
                            {day.hasFood && '🍽'}
                            {day.hasActivity && '🔥'}
                            {day.hasWater && '💧'}
                            {day.cycle === 'menstruation' && '❤️'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="microcopy-block">
                  Баланс важнее отдельных дней — приложение смотрит на картину
                  целиком и мягко поддерживает тебя.
                </div>
              </section>

              <section className="analytics-card">
                <div className="analytics-heading">
                  Сводка за выбранный день
                </div>
                <p className="analytics-text">
                  Для {selectedDay.day} числа:{' '}
                  {selectedDay.hasFood
                    ? 'есть записи по еде'
                    : 'еда ещё не внесена'}
                  ,{' '}
                  {selectedDay.hasActivity
                    ? 'есть движение'
                    : 'активность пока не добавлена'}
                  ,{' '}
                  {selectedDay.hasWater
                    ? 'вода близка к цели'
                    : 'можно добавить пару стаканов воды'}{' '}
                  {selectedDay.cycle === 'menstruation'
                    ? '— сейчас дни менструации, можно быть мягче к себе.'
                    : '— это обычный день, главное — спокойный, устойчивый ритм.'}
                </p>
              </section>
            </>
          )}

          {activeTab === 'profile' && (
            <>
              <section className="profile-card">
                <div className="profile-heading">Мои цели</div>
                <p className="profile-text">
                  Дневная цель калорий и БЖУ помогут приложению мягко
                  поддерживать тебя. Цели можно менять — это нормально.
                </p>
                <div className="chip-row">
                  <span className="chip">Рост: {profileHeightCm} см</span>
                  <span className="chip">Старт: {profileStartWeightKg} кг</span>
                  <span className="chip chip-soft">
                    Сейчас: {profileCurrentWeightKg} кг
                  </span>
                </div>
                <div className="chip-row">
                  <span className="chip">Цель: {profileGoalWeightKg} кг</span>
                  <span className="chip">
                    Осталось:{' '}
                    {profileToGoalKg > 0 ? `${profileToGoalKg} кг` : 'цель достигнута'}
                  </span>
                </div>
                <div className="chip-row">
                  <span className="chip chip-soft">Цель калорий</span>
                  <span className="chip">Цель БЖУ</span>
                </div>
                <div className="microcopy-block">
                  Подстраивать питание и активность под жизнь важнее, чем
                  держаться за цифры.
                </div>
              </section>
              <section className="profile-card">
                <div className="profile-heading">Язык и интеграции</div>
                <p className="profile-text">
                  Приложение поддерживает RU / EN. Интеграции с трекерами
                  появятся позже — архитектура уже готова для их подключения.
                </p>
                <div className="chip-row">
                  <span className="chip chip-soft">RU</span>
                  <span className="chip">EN</span>
                  <span className="chip">Трекеры (скоро)</span>
                </div>
              </section>
              <section className="profile-card">
                <div className="profile-heading">Аккаунт</div>
                <p className="profile-text">
                  Выйти из аккаунта можно в любой момент. Все данные сохранятся.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signOut()
                    } catch (error) {
                      console.error('Error signing out:', error)
                    }
                  }}
                  className="auth-submit"
                  style={{
                    marginTop: '0.75rem',
                    background: 'linear-gradient(to right, #ef4444, #dc2626)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  Выйти
                </button>
              </section>
            </>
          )}
        </main>
      </div>

      <div className="fab-wrapper">
        <button
          type="button"
          className="fab-button"
          aria-label="Добавить запись"
          onClick={() => setIsAddOpen(true)}
        >
          +
        </button>
      </div>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <button
            type="button"
            className={`bottom-nav-item ${
              activeTab === 'today' ? 'bottom-nav-item-active' : ''
            }`}
            onClick={() => setActiveTab('today')}
          >
            <span className="bottom-nav-icon">📅</span>
            <span>Сегодня</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${
              activeTab === 'analytics' ? 'bottom-nav-item-active' : ''
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <span className="bottom-nav-icon">📈</span>
            <span>Аналитика</span>
          </button>
          <button
            type="button"
            className={`bottom-nav-item ${
              activeTab === 'profile' ? 'bottom-nav-item-active' : ''
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="bottom-nav-icon">👤</span>
            <span>Профиль</span>
          </button>
        </div>
      </nav>

      {isAddOpen && (
        <div
          className="add-sheet-backdrop"
          onClick={() => setIsAddOpen(false)}
        >
          <div className="add-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="add-sheet-header">
              <div>
                <div className="add-sheet-title">Что добавить?</div>
                <div className="add-sheet-subtitle">
                  Всё остальное приложение подстроится под твой ритм.
                </div>
              </div>
            </div>

            <div className="add-sheet-grid">
              <button
                type="button"
                className="add-sheet-item"
                onClick={() => handleAddAction('photo')}
              >
                <div className="add-sheet-item-label">
                  <span className="add-sheet-item-icon">📷</span>
                  Фото еды
                </div>
                <div className="add-sheet-item-desc">
                  Сохраним снимок и найдём продукт по названию или штрихкоду.
                </div>
              </button>
              <button
                type="button"
                className="add-sheet-item"
                onClick={() => handleAddAction('activity')}
              >
                <div className="add-sheet-item-label">
                  <span className="add-sheet-item-icon">🏃</span>
                  Активность
                </div>
                <div className="add-sheet-item-desc">
                  Выбери тип, длительность и калории.
                </div>
              </button>
              <button
                type="button"
                className="add-sheet-item"
                onClick={() => handleAddAction('favorites')}
              >
                <div className="add-sheet-item-label">
                  <span className="add-sheet-item-icon">⭐</span>
                  Избранное
                </div>
                <div className="add-sheet-item-desc">
                  Частые приёмы всегда под рукой.
                </div>
              </button>
              <button
                type="button"
                className="add-sheet-item"
                onClick={() => handleAddAction('recent')}
              >
                <div className="add-sheet-item-label">
                  <span className="add-sheet-item-icon">🕒</span>
                  Недавние
                </div>
                <div className="add-sheet-item-desc">
                  Повтори последнее в один тап.
                </div>
              </button>
            </div>

            <div className="add-sheet-footer">
              {lastAction
                ? 'Готово. Записали — можно двигаться дальше.'
                : 'Можно начать с любого шага — завтрак, перекус или короткая прогулка.'}
            </div>
          </div>
        </div>
      )}

      {showWaterBanner && (
        <div className="water-banner">
          <div className="water-banner-inner">
            <span>Пора сделать пару глотков воды.</span>
            <button
              type="button"
              className="water-banner-button"
              onClick={() => handleAddWater(100)}
            >
              +100 мл
            </button>
          </div>
        </div>
      )}

      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {scannedProduct && scannedBarcode && (
        <ProductInfo
          product={scannedProduct}
          barcode={scannedBarcode}
          onClose={() => {
            setScannedProduct(null)
            setScannedBarcode(null)
          }}
          onSaved={handleProductSaved}
        />
      )}

      {showPhotoUpload && (
        <PhotoUpload
          onClose={() => setShowPhotoUpload(false)}
          onSaved={handleProductSaved}
        />
      )}

      {showActivityAdd && (
        <ActivityAdd
          onClose={() => setShowActivityAdd(false)}
          onSaved={handleProductSaved}
        />
      )}
    </div>
  )
}

export default AppSimple