// База данных MET (Metabolic Equivalent of Task) значений для различных видов активности
// MET - это отношение скорости метаболизма во время активности к скорости метаболизма в покое
// Формула расчета калорий: калории = MET × вес (кг) × время (часы)

export type ActivityType = {
  id: string
  name: string
  met: number
  category: string
  description?: string
}

export const ACTIVITY_TYPES: ActivityType[] = [
  // Ходьба
  { id: 'walking-slow', name: 'Ходьба медленная (3 км/ч)', met: 2.0, category: 'Ходьба' },
  { id: 'walking-normal', name: 'Ходьба обычная (4 км/ч)', met: 3.0, category: 'Ходьба' },
  { id: 'walking-fast', name: 'Ходьба быстрая (5-6 км/ч)', met: 4.5, category: 'Ходьба' },
  { id: 'walking-very-fast', name: 'Ходьба очень быстрая (7 км/ч)', met: 6.0, category: 'Ходьба' },
  { id: 'walking-uphill', name: 'Ходьба в гору', met: 6.0, category: 'Ходьба' },
  
  // Бег
  { id: 'running-slow', name: 'Бег медленный (6-7 км/ч)', met: 8.0, category: 'Бег' },
  { id: 'running-normal', name: 'Бег обычный (8-9 км/ч)', met: 9.5, category: 'Бег' },
  { id: 'running-fast', name: 'Бег быстрый (10-11 км/ч)', met: 11.5, category: 'Бег' },
  { id: 'running-very-fast', name: 'Бег очень быстрый (12+ км/ч)', met: 13.5, category: 'Бег' },
  
  // Велосипед
  { id: 'cycling-leisure', name: 'Велосипед неспешно (<16 км/ч)', met: 4.0, category: 'Велосипед' },
  { id: 'cycling-normal', name: 'Велосипед обычный (16-19 км/ч)', met: 6.0, category: 'Велосипед' },
  { id: 'cycling-fast', name: 'Велосипед быстрый (20-22 км/ч)', met: 8.0, category: 'Велосипед' },
  { id: 'cycling-very-fast', name: 'Велосипед очень быстрый (23+ км/ч)', met: 10.0, category: 'Велосипед' },
  { id: 'cycling-uphill', name: 'Велосипед в гору', met: 10.0, category: 'Велосипед' },
  
  // Плавание
  { id: 'swimming-leisure', name: 'Плавание неспешно', met: 6.0, category: 'Плавание' },
  { id: 'swimming-normal', name: 'Плавание обычное', met: 8.0, category: 'Плавание' },
  { id: 'swimming-fast', name: 'Плавание быстрое', met: 10.0, category: 'Плавание' },
  { id: 'swimming-crawl', name: 'Плавание кролем', met: 10.0, category: 'Плавание' },
  { id: 'swimming-butterfly', name: 'Плавание баттерфляем', met: 13.5, category: 'Плавание' },
  
  // Силовые тренировки
  { id: 'weight-training-light', name: 'Силовая тренировка легкая', met: 3.5, category: 'Силовые' },
  { id: 'weight-training-normal', name: 'Силовая тренировка обычная', met: 5.0, category: 'Силовые' },
  { id: 'weight-training-heavy', name: 'Силовая тренировка интенсивная', met: 6.0, category: 'Силовые' },
  
  // Йога и растяжка
  { id: 'yoga', name: 'Йога', met: 3.0, category: 'Йога и растяжка' },
  { id: 'stretching', name: 'Растяжка', met: 2.5, category: 'Йога и растяжка' },
  { id: 'pilates', name: 'Пилатес', met: 3.0, category: 'Йога и растяжка' },
  
  // Танцы
  { id: 'dancing-slow', name: 'Танцы медленные', met: 3.0, category: 'Танцы' },
  { id: 'dancing-normal', name: 'Танцы обычные', met: 4.5, category: 'Танцы' },
  { id: 'dancing-fast', name: 'Танцы быстрые', met: 6.0, category: 'Танцы' },
  
  // Другие виды спорта
  { id: 'tennis', name: 'Теннис', met: 7.0, category: 'Спорт' },
  { id: 'basketball', name: 'Баскетбол', met: 8.0, category: 'Спорт' },
  { id: 'football', name: 'Футбол', met: 8.0, category: 'Спорт' },
  { id: 'volleyball', name: 'Волейбол', met: 3.0, category: 'Спорт' },
  { id: 'skiing', name: 'Лыжи', met: 7.0, category: 'Спорт' },
  { id: 'skating', name: 'Катание на коньках', met: 7.0, category: 'Спорт' },
  
  // Повседневная активность
  { id: 'cleaning', name: 'Уборка', met: 3.0, category: 'Повседневное' },
  { id: 'gardening', name: 'Садоводство', met: 4.0, category: 'Повседневное' },
  { id: 'cooking', name: 'Готовка', met: 2.0, category: 'Повседневное' },
  { id: 'shopping', name: 'Покупки', met: 2.5, category: 'Повседневное' },
]

// Функция для расчета калорий на основе MET, веса и времени
export function calculateCaloriesBurned(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  // Формула: калории = MET × вес (кг) × время (часы)
  const hours = durationMinutes / 60
  return Math.round(met * weightKg * hours)
}

// Функция для получения активности по ID
export function getActivityById(id: string): ActivityType | undefined {
  return ACTIVITY_TYPES.find(activity => activity.id === id)
}

// Функция для группировки активностей по категориям
export function getActivitiesByCategory(): Record<string, ActivityType[]> {
  const grouped: Record<string, ActivityType[]> = {}
  
  ACTIVITY_TYPES.forEach(activity => {
    if (!grouped[activity.category]) {
      grouped[activity.category] = []
    }
    grouped[activity.category].push(activity)
  })
  
  return grouped
}

