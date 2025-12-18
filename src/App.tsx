import { useState } from 'react'
import './App.css'

type TabKey = 'today' | 'analytics' | 'profile'

function useTodayDemoData() {
  const todayMeals = [
    {
      id: 1,
      name: 'Овсянка с ягодами',
      time: '08:30',
      kcal: 320,
      macros: 'Б 12 · Ж 8 · У 45',
    },
    {
      id: 2,
      name: 'Обед: курица и киноа',
      time: '13:10',
      kcal: 540,
      macros: 'Б 32 · Ж 14 · У 62',
    },
  ]

  const todayActivities = [
    {
      id: 1,
      name: 'Прогулка',
      time: '10:20',
      duration: '25 мин',
      kcal: 110,
    },
    {
      id: 2,
      name: 'Лёгкая растяжка',
      time: '19:00',
      duration: '15 мин',
      kcal: 45,
    },
  ]

  const consumed = todayMeals.reduce((sum, m) => sum + m.kcal, 0)
  const burned = todayActivities.reduce((sum, a) => sum + a.kcal, 0)
  const target = 1900

  return { todayMeals, todayActivities, consumed, burned, target }
}

function TodayScreen() {
  const { todayMeals, todayActivities, consumed, burned, target } =
    useTodayDemoData()

  const balance = consumed - burned
  const progress = Math.min(Math.max(balance / target, 0), 1)

  const isGreen = balance <= target * 0.9
  const isYellow = balance > target * 0.9 && balance <= target * 1.1

  const heroBalanceClass = isGreen
    ? 'hero-balance-positive'
    : isYellow
    ? 'hero-balance-warning'
    : 'hero-balance-danger'

  const statusDotClass = isGreen
    ? 'hero-status-dot'
    : isYellow
    ? 'hero-status-dot hero-status-dot-warning'
    : 'hero-status-dot hero-status-dot-danger'

  const statusText = isGreen
    ? 'Сегодня хороший баланс, продолжай в том же темпе'
    : isYellow
    ? 'Ты почти у цели — прислушайся к себе'
    : 'Баланс чуть выше цели — это сигнал, а не приговор'

  return (
    <div className="app-main">
      <header className="app-header">
        <div className="today-date">
          <span className="app-header-subtitle">Сегодня</span>
          <span className="app-header-title">Четверг</span>
        </div>
        <div className="app-header-subtitle">Баланс за день</div>
      </header>

      <div className="app-content">
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
              <div className="hero-pill-label">
                <span>🍽 Потреблено</span>
              </div>
              <div className="hero-pill-value">{consumed}</div>
              <div className="hero-pill-secondary">ккал за еду</div>
            </div>
            <div className="hero-pill">
              <div className="hero-pill-label">
                <span>🔥 Сожжено</span>
              </div>
              <div className="hero-pill-value">{burned}</div>
              <div className="hero-pill-secondary">ккал активность</div>
            </div>
            <div className={`hero-pill ${heroBalanceClass}`}>
              <div className="hero-pill-label">
                <span>⚖️ Баланс</span>
              </div>
              <div className="hero-pill-value">{balance}</div>
              <div className="hero-pill-secondary">еда − активность</div>
            </div>
          </div>

          <div className="hero-progress">
            <div className="hero-progress-bar">
              <div
                className="hero-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="hero-status">
              <div className="hero-status-label">
                <span className={statusDotClass} />
                <span>Баланс дня</span>
              </div>
              <span>{Math.round(progress * 100)}% от цели</span>
            </div>
          </div>

          <div className="microcopy microcopy-strong">
            {todayMeals.length > 0
              ? 'Сегодня уже есть прогресс'
              : 'Можно начать с любого приёма — завтрак не обязателен'}
          </div>
          <div className="microcopy">
            {todayActivities.length > 0
              ? 'Движение сегодня уже помогло балансу'
              : 'Небольшая прогулка тоже считается'}
          </div>
          <div className="microcopy-block">{statusText}</div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Приёмы пищи</h2>
            <span className="section-subtitle">
              Всего: {consumed} ккал за день
            </span>
          </div>

          {todayMeals.length === 0 ? (
            <div className="empty-state">
              Можно добавить завтрак позже — ничего страшного
            </div>
          ) : (
            <div className="cards-list">
              {todayMeals.map((meal) => (
                <article key={meal.id} className="entry-card">
                  <div className="entry-main">
                    <div className="entry-title">{meal.name}</div>
                    <div className="entry-meta">
                      <span>{meal.time}</span>
                      <span>{meal.macros}</span>
                    </div>
                  </div>
                  <div className="entry-kcal">{meal.kcal} ккал</div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Активность</h2>
            <span className="section-subtitle">
              Всего: {burned} ккал сегодня
            </span>
          </div>

          {todayActivities.length === 0 ? (
            <div className="empty-state">
              Небольшая прогулка тоже считается — можно добавить позже
            </div>
          ) : (
            <div className="cards-list">
              {todayActivities.map((activity) => (
                <article key={activity.id} className="entry-card">
                  <div className="entry-main">
                    <div className="entry-title">{activity.name}</div>
                    <div className="entry-meta">
                      <span>{activity.time}</span>
                      <span>{activity.duration}</span>
                    </div>
                  </div>
                  <div className="entry-kcal entry-kcal-negative">
                    −{activity.kcal} ккал
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
  )
}

function AnalyticsScreen() {
  return null
}

function ProfileScreen() {
  return null
}

function App() {
  const [activeTab, setActiveTab] = useState('today' as TabKey)

  return (
    <div className="app-root">
      {activeTab === 'today' && <TodayScreen />}
      {activeTab === 'analytics' && <AnalyticsScreen />}
      {activeTab === 'profile' && <ProfileScreen />}

      <div className="fab-wrapper">
        <button
          type="button"
          className="fab-button"
          aria-label="Добавить запись"
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
    </div>
  )
}

export default App
