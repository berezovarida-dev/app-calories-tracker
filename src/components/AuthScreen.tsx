import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import './AuthScreen.css'

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setNeedsEmailConfirmation(false)
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
        setMessage('Вход выполнен успешно!')
      } else {
        const result = await signUp(email, password)
        if (result.user && !result.session) {
          // Пользователь создан, но сессия не создана = нужно подтвердить email
          setNeedsEmailConfirmation(true)
          setMessage(
            'Регистрация успешна! Проверь почту и подтверди email, чтобы войти.',
          )
        } else {
          setMessage('Регистрация успешна!')
        }
      }
    } catch (err: any) {
      // Обрабатываем ошибку "Email not confirmed"
      if (err.message?.includes('not confirmed') || err.message?.includes('email_not_confirmed')) {
        setNeedsEmailConfirmation(true)
        setError(
          'Email не подтверждён. Проверь почту и перейди по ссылке из письма, затем попробуй войти снова.',
        )
      } else {
        setError(err.message || 'Произошла ошибка')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    try {
      const { supabase } = await import('../supabaseClient')
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      if (error) throw error
      setMessage('Письмо с подтверждением отправлено на твой email!')
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить письмо')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Трекер калорий</h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Войди, чтобы продолжить'
              : 'Создай аккаунт, чтобы начать'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setIsLogin(true)
              setError(null)
              setMessage(null)
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setIsLogin(false)
              setError(null)
              setMessage(null)
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="твой@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Пароль
            </label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          {needsEmailConfirmation && (
            <div className="auth-email-confirmation">
              <p className="auth-email-confirmation-text">
                Нужно подтвердить email. Проверь почту и перейди по ссылке из
                письма.
              </p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="auth-resend-button"
                disabled={loading || !email}
              >
                Отправить письмо повторно
              </button>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  )
}

