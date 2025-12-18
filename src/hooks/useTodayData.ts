import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export type MealEntry = {
  id: string
  name: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  eaten_at: string
  note?: string
}

export type ActivityEntry = {
  id: string
  type: string
  duration_minutes: number
  calories: number
  occurred_at: string
  intensity?: string
}

export type TodayData = {
  meals: MealEntry[]
  activities: ActivityEntry[]
  waterMl: number
  waterGoalMl: number
  consumed: number
  burned: number
  balance: number
  target: number
}

export function useTodayData(date: Date = new Date()) {
  const [data, setData] = useState<TodayData>({
    meals: [],
    activities: [],
    waterMl: 0,
    waterGoalMl: 2000,
    consumed: 0,
    burned: 0,
    balance: 0,
    target: 1900,
  })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = () => {
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    async function loadData() {
      try {
        // Получаем текущего пользователя
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Если пользователь не авторизован, возвращаем пустые данные
          setLoading(false)
          return
        }

        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        // Загружаем еду за день
        const { data: mealsData } = await supabase
          .from('daily_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('eaten_at', startOfDay.toISOString())
          .lte('eaten_at', endOfDay.toISOString())
          .order('eaten_at', { ascending: false })

        // Загружаем активность за день
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .gte('occurred_at', startOfDay.toISOString())
          .lte('occurred_at', endOfDay.toISOString())
          .order('occurred_at', { ascending: false })

        // Загружаем состояние дня (вода)
        const dateStr = date.toISOString().split('T')[0]
        const { data: dailyState, error: dailyStateError } = await supabase
          .from('daily_states')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle()

        // Если ошибка не "не найдено", логируем её
        if (dailyStateError && dailyStateError.code !== 'PGRST116') {
          console.error('Error loading daily state:', dailyStateError)
        }

        // Загружаем профиль для цели калорий
        const { data: profile } = await supabase
          .from('profiles')
          .select('calorie_goal, water_goal_ml')
          .eq('id', user.id)
          .single()

        const consumed = (mealsData || []).reduce((sum, m) => sum + m.kcal, 0)
        const burned = (activitiesData || []).reduce(
          (sum, a) => sum + a.calories,
          0,
        )

        setData({
          meals: (mealsData || []) as MealEntry[],
          activities: (activitiesData || []) as ActivityEntry[],
          waterMl: dailyState?.water_intake_ml || 0,
          waterGoalMl: profile?.water_goal_ml || dailyState?.water_goal_ml || 2000,
          consumed,
          burned,
          balance: consumed - burned,
          target: profile?.calorie_goal || 1900,
        })
      } catch (error) {
        console.error('Error loading today data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [date, refreshKey])

  return { data, loading, refetch }
}

