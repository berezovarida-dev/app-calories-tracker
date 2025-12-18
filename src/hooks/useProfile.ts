import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export type Profile = {
  height_cm: number | null
  start_weight_kg: number | null
  current_weight_kg: number | null
  goal_weight_kg: number | null
  calorie_goal: number | null
  protein_goal_g: number | null
  fat_goal_g: number | null
  carbs_goal_g: number | null
  water_goal_ml: number | null
  show_cycle_tracking: boolean
  locale: string
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = not found, это нормально для нового пользователя
          console.error('Error loading profile:', error)
        }

        if (data) {
          setProfile(data as Profile)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  return { profile, loading }
}

