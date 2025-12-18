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

    // Извлекаем название (приоритет: русский, английский, или первое доступное)
    const name =
      product.product_name ||
      product.product_name_en ||
      'Продукт без названия'

    // Извлекаем БЖУ (на 100г)
    const nutriments = product.nutriments || {}
    const kcalPer100g = nutriments.energy_kcal_100g || 0
    const proteinPer100g = nutriments.proteins_100g || 0
    const fatPer100g = nutriments.fat_100g || 0
    const carbsPer100g = nutriments.carbohydrates_100g || 0

    return {
      name: name.trim(),
      brand: product.brands?.split(',')[0]?.trim(),
      kcalPer100g: Math.round(kcalPer100g),
      proteinPer100g: Math.round(proteinPer100g * 10) / 10,
      fatPer100g: Math.round(fatPer100g * 10) / 10,
      carbsPer100g: Math.round(carbsPer100g * 10) / 10,
      quantity: product.quantity || product.serving_size,
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

