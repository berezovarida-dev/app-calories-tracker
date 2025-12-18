import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // В dev-режиме просто предупредим в консоли
  // (в проде эти переменные должны быть обязательно заданы)
  console.warn('Supabase env variables are not set')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


