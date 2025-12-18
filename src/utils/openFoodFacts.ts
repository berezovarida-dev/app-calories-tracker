// Утилиты для работы с Open Food Facts API

export type OpenFoodFactsProduct = {
  code: string
  product_name?: string
  product_name_en?: string
  brands?: string
  nutriments?: {
    energy_kcal_100g?: number
    proteins_100g?: number
    fat_100g?: number
    carbohydrates_100g?: number
  }
  quantity?: string
  serving_size?: string
}

export type ProductInfo = {
  name: string
  brand?: string
  kcalPer100g: number
  proteinPer100g: number
  fatPer100g: number
  carbsPer100g: number
  quantity?: string
}

// Функция для извлечения данных о продукте из ответа API
function extractProductInfo(product: OpenFoodFactsProduct): ProductInfo | null {
  // Извлекаем название (приоритет: русский, английский, или первое доступное)
  const name =
    product.product_name ||
    product.product_name_en ||
    'Продукт без названия'

  // Извлекаем БЖУ (на 100г)
  const nutriments = product.nutriments || {}
  
  // Пытаемся получить калории из разных возможных полей
  let kcalPer100g = 0
  
  const possibleKcalFields = [
    'energy-kcal_100g',
    'energy_kcal_100g',
    'energy-kcal',
    'energy_kcal',
    'energy-kcal-value',
    'energy_kcal_value',
  ]
  
  for (const field of possibleKcalFields) {
    const value = (nutriments as any)[field]
    if (value && typeof value === 'number' && value > 0) {
      kcalPer100g = value
      break
    }
  }
  
  // Если не нашли в калориях, пробуем килоджоули
  if (kcalPer100g === 0) {
    const possibleEnergyFields = [
      'energy_100g',
      'energy-100g',
      'energy',
      'energy-value',
      'energy_value',
    ]
    
    for (const field of possibleEnergyFields) {
      const value = (nutriments as any)[field]
      if (value && typeof value === 'number' && value > 0) {
        kcalPer100g = value / 4.184
        break
      }
    }
  }
  
  const proteinPer100g = nutriments.proteins_100g || (nutriments as any)['proteins_100g'] || 0
  const fatPer100g = nutriments.fat_100g || (nutriments as any)['fat_100g'] || 0
  const carbsPer100g = nutriments.carbohydrates_100g || (nutriments as any)['carbohydrates_100g'] || 0

  return {
    name: name.trim(),
    brand: product.brands?.split(',')[0]?.trim(),
    kcalPer100g: Math.round(kcalPer100g),
    proteinPer100g: Math.round(proteinPer100g * 10) / 10,
    fatPer100g: Math.round(fatPer100g * 10) / 10,
    carbsPer100g: Math.round(carbsPer100g * 10) / 10,
    quantity: product.quantity || product.serving_size,
  }
}

export async function fetchProductByBarcode(
  barcode: string,
): Promise<ProductInfo | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.status === 0 || !data.product) {
      return null
    }

    const product: OpenFoodFactsProduct = data.product

    // Логируем все доступные поля для отладки
    const nutriments = product.nutriments || {}
    const allNutrientKeys = Object.keys(nutriments)
    const energyKeys = allNutrientKeys.filter(k => 
      k.toLowerCase().includes('energy') || 
      k.toLowerCase().includes('kcal') ||
      k.toLowerCase().includes('calorie')
    )
    
    console.log('Product nutriments keys:', {
      barcode,
      allKeys: allNutrientKeys,
      energyKeys,
      nutriments: nutriments,
    })

    const productInfo = extractProductInfo(product)
    
    if (productInfo && productInfo.kcalPer100g === 0) {
      console.warn('No calories found in product data:', {
        barcode,
        name: productInfo.name,
        allNutrientKeys,
        energyKeys,
        sampleValues: energyKeys.slice(0, 5).map(k => ({ key: k, value: (nutriments as any)[k] })),
      })
    }

    return productInfo
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

// Поиск продуктов по названию через Open Food Facts API
export async function searchProductsByName(
  searchTerm: string,
  limit: number = 20,
): Promise<ProductInfo[]> {
  try {
    if (!searchTerm.trim()) {
      return []
    }

    // Кодируем поисковый запрос
    const encodedTerm = encodeURIComponent(searchTerm.trim())
    
    // Используем API поиска Open Food Facts
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedTerm}&json=1&page_size=${limit}&action=process&fields=code,product_name,product_name_en,brands,nutriments,quantity,serving_size`,
    )

    if (!response.ok) {
      console.error('Search API error:', response.status)
      return []
    }

    const data = await response.json()

    if (!data.products || data.products.length === 0) {
      return []
    }

    // Обрабатываем результаты поиска
    const results: ProductInfo[] = []
    
    for (const productData of data.products) {
      const productInfo = extractProductInfo(productData as OpenFoodFactsProduct)
      if (productInfo) {
        results.push(productInfo)
      }
    }

    console.log(`Found ${results.length} products for "${searchTerm}"`)
    return results
  } catch (error) {
    console.error('Error searching products:', error)
    return []
  }
}

