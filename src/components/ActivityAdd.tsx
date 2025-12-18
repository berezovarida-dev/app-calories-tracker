import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  ACTIVITY_TYPES, 
  getActivitiesByCategory,
  calculateCaloriesBurned,
  type ActivityType 
} from '../utils/activityMET'
import { useProfile } from '../hooks/useProfile'
import './ActivityAdd.css'

type ActivityAddProps = {
  onClose: () => void
  onSaved: () => void
}

export function ActivityAdd({ onClose, onSaved }: ActivityAddProps) {
  const { profile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null)
  const [duration, setDuration] = useState('30')
  const [time, setTime] = useState(
    new Date().toTimeString().slice(0, 5), // HH:MM
  )
  const [manualCalories, setManualCalories] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const activitiesByCategory = getActivitiesByCategory()
  const categories = Object.keys(activitiesByCategory)
  
  // Средний вес для расчета примерных калорий (70 кг)
  const AVERAGE_WEIGHT_KG = 70
  
  // Фильтрация активностей по поисковому запросу
  // Исключаем уже выбранную активность из списка
  const filteredActivities = (searchQuery.trim()
    ? ACTIVITY_TYPES.filter(activity =>
        activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ACTIVITY_TYPES
  ).filter(activity => activity.id !== selectedActivity?.id)

  // Функция для расчета примерных калорий (для отображения в списке)
  const getEstimatedCalories = (activity: ActivityType, durationMinutes: number = 30) => {
    return calculateCaloriesBurned(activity.met, AVERAGE_WEIGHT_KG, durationMinutes)
  }

  // Расчет калорий для выбранной активности
  const calculatedCalories = selectedActivity && profile?.current_weight_kg
    ? calculateCaloriesBurned(
        selectedActivity.met,
        profile.current_weight_kg,
        parseFloat(duration) || 0
      )
    : selectedActivity
    ? calculateCaloriesBurned(
        selectedActivity.met,
        AVERAGE_WEIGHT_KG,
        parseFloat(duration) || 0
      )
    : 0

  // Если вес не указан, используем введенные вручную калории или примерные
  const finalCalories = profile?.current_weight_kg
    ? calculatedCalories
    : (parseFloat(manualCalories) || calculatedCalories)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedActivity) {
      setError('Пожалуйста, выберите вид активности')
      return
    }

    if (finalCalories <= 0) {
      setError('Калории должны быть больше 0')
      return
    }

    const durationNum = parseFloat(duration) || 0
    if (durationNum <= 0) {
      setError('Длительность должна быть больше 0')
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Необходима авторизация')
        return
      }

      // Создаём дату с текущей датой и выбранным временем
      const [hours, minutes] = time.split(':').map(Number)
      const occurredAt = new Date()
      occurredAt.setHours(hours, minutes, 0, 0)

      const insertData = {
        user_id: user.id,
        type: selectedActivity?.name || 'Активность',
        duration_minutes: durationNum || 0,
        calories: Math.round(finalCalories),
        occurred_at: occurredAt.toISOString(),
        intensity: selectedActivity ? undefined : 'manual',
      }

      const { error: insertError } = await supabase
        .from('activities')
        .insert(insertData)

      if (insertError) {
        throw insertError
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error saving activity:', err)
      setError(err.message || 'Не удалось сохранить активность')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="activity-add-overlay">
      <div className="activity-add-container">
        <div className="activity-add-header">
          <h2 className="activity-add-title">Добавить активность</h2>
          <button
            type="button"
            className="activity-add-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="activity-add-form">
          <div className="activity-add-field">
            <label className="activity-add-label">Время</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="activity-add-time-input"
              required
            />
          </div>

          <div className="activity-add-field">
            <label className="activity-add-label">Поиск активности</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Например: бег, ходьба, плавание"
              className="activity-add-search-input"
            />
          </div>

          {!searchQuery.trim() ? (
            // Показываем по категориям
            <div className="activity-add-categories">
              {categories.map(category => {
                // Исключаем выбранную активность из списка
                const categoryActivities = activitiesByCategory[category].filter(
                  activity => activity.id !== selectedActivity?.id
                )
                
                // Показываем категорию только если в ней есть активности
                if (categoryActivities.length === 0) {
                  return null
                }
                
                return (
                  <div key={category} className="activity-add-category">
                    <h3 className="activity-add-category-title">{category}</h3>
                    <div className="activity-add-list">
                      {categoryActivities.map(activity => (
                        <button
                          key={activity.id}
                          type="button"
                          onClick={() => {
                            setSelectedActivity(activity)
                            // Автоматически заполняем примерные калории, если вес не указан
                            if (!profile?.current_weight_kg) {
                              const estimated = getEstimatedCalories(activity, parseFloat(duration) || 30)
                              setManualCalories(estimated.toString())
                            }
                          }}
                          className="activity-add-item"
                        >
                          <div className="activity-add-item-name">{activity.name}</div>
                          <div className="activity-add-item-met">
                            MET: {activity.met}
                            {!profile?.current_weight_kg && (
                              <span className="activity-add-item-estimated">
                                {' '}· ~{getEstimatedCalories(activity, 30)} ккал (30 мин)
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Показываем результаты поиска
            <div className="activity-add-search-results">
              {filteredActivities.length > 0 ? (
                filteredActivities.map(activity => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => {
                      setSelectedActivity(activity)
                      // Автоматически заполняем примерные калории, если вес не указан
                      if (!profile?.current_weight_kg) {
                        const estimated = getEstimatedCalories(activity, parseFloat(duration) || 30)
                        setManualCalories(estimated.toString())
                      }
                    }}
                    className="activity-add-item"
                  >
                    <div className="activity-add-item-name">{activity.name}</div>
                    <div className="activity-add-item-category">{activity.category}</div>
                    <div className="activity-add-item-met">
                      MET: {activity.met}
                      {!profile?.current_weight_kg && (
                        <span className="activity-add-item-estimated">
                          {' '}· ~{getEstimatedCalories(activity, 30)} ккал (30 мин)
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="activity-add-no-results">
                  Активность не найдена. Можно ввести калории вручную.
                </div>
              )}
            </div>
          )}

          {selectedActivity && (
            <div className="activity-add-selected">
              <div className="activity-add-selected-name">{selectedActivity.name}</div>
              <div className="activity-add-selected-info">
                MET: {selectedActivity.met} · {selectedActivity.category}
              </div>
            </div>
          )}

          <div className="activity-add-field">
            <label className="activity-add-label">Длительность (минуты)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value)
                // Пересчитываем калории при изменении длительности
                if (selectedActivity && !profile?.current_weight_kg) {
                  const newDuration = parseFloat(e.target.value) || 30
                  const estimated = getEstimatedCalories(selectedActivity, newDuration)
                  setManualCalories(estimated.toString())
                }
              }}
              className="activity-add-duration-input"
              min="1"
              step="1"
              required
            />
          </div>

          {selectedActivity && profile?.current_weight_kg && (
            <div className="activity-add-calculation">
              <div className="activity-add-calculation-label">Расчет калорий:</div>
              <div className="activity-add-calculation-formula">
                MET ({selectedActivity.met}) × Вес ({profile.current_weight_kg} кг) × Время ({duration} мин / 60)
              </div>
              <div className="activity-add-calculation-result">
                = {calculatedCalories} ккал
              </div>
            </div>
          )}

          {selectedActivity && !profile?.current_weight_kg && (
            <>
              <div className="activity-add-calculation">
                <div className="activity-add-calculation-label">Примерный расчет калорий (вес 70 кг):</div>
                <div className="activity-add-calculation-formula">
                  MET ({selectedActivity.met}) × Вес (70 кг) × Время ({duration} мин / 60)
                </div>
                <div className="activity-add-calculation-result">
                  = ~{calculatedCalories} ккал
                </div>
                <div className="activity-add-warning" style={{ marginTop: '0.5rem' }}>
                  ⚠️ Для точного расчета укажите ваш вес в профиле
                </div>
              </div>
              <div className="activity-add-field">
                <label className="activity-add-label">Калории (можно скорректировать)</label>
                <input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  className="activity-add-calories-input"
                  min="1"
                  step="1"
                  placeholder="Введите количество калорий"
                  required
                />
              </div>
            </>
          )}

          {error && <div className="activity-add-error">{error}</div>}

          <button
            type="submit"
            className="activity-add-submit"
            disabled={loading || finalCalories <= 0}
          >
            {loading ? 'Сохранение...' : 'Сохранить активность'}
          </button>
        </form>
      </div>
    </div>
  )
}

