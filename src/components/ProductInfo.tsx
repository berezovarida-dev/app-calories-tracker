import { useState } from 'react'
import type { ProductInfo as ProductInfoType } from '../utils/openFoodFacts'
import { supabase } from '../supabaseClient'
import './ProductInfo.css'

type ProductInfoProps = {
  product: ProductInfoType
  barcode: string
  onClose: () => void
  onSaved: () => void
}

export function ProductInfo({
  product,
  barcode,
  onClose,
  onSaved,
}: ProductInfoProps) {
  const [amount, setAmount] = useState('100')
  const [unit, setUnit] = useState('g')
  const [time, setTime] = useState(
    new Date().toTimeString().slice(0, 5), // HH:MM
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateNutrients = () => {
    const amountNum = parseFloat(amount) || 0
    const multiplier = amountNum / 100

    return {
      kcal: Math.round(product.kcalPer100g * multiplier),
      protein: Math.round(product.proteinPer100g * multiplier * 10) / 10,
      fat: Math.round(product.fatPer100g * multiplier * 10) / 10,
      carbs: Math.round(product.carbsPer100g * multiplier * 10) / 10,
    }
  }

  const nutrients = calculateNutrients()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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
      const eatenAt = new Date()
      eatenAt.setHours(hours, minutes, 0, 0)

      const { error: insertError } = await supabase.from('daily_entries').insert({
        user_id: user.id,
        name: product.name,
        kcal: nutrients.kcal,
        protein: Math.round(nutrients.protein),
        fat: Math.round(nutrients.fat),
        carbs: Math.round(nutrients.carbs),
        amount: parseFloat(amount) || 0,
        unit: unit,
        eaten_at: eatenAt.toISOString(),
        note: product.brand ? `Бренд: ${product.brand}` : undefined,
      })

      if (insertError) {
        throw insertError
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить продукт')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="product-info-overlay">
      <div className="product-info-container">
        <div className="product-info-header">
          <h2 className="product-info-title">Добавить продукт</h2>
          <button
            type="button"
            className="product-info-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="product-info-content">
          <div className="product-info-name">{product.name}</div>
          {product.brand && (
            <div className="product-info-brand">{product.brand}</div>
          )}

          <div className="product-info-nutrition">
            <div className="product-info-nutrition-label">
              На 100 {unit === 'g' ? 'г' : 'мл'}:
            </div>
            <div className="product-info-nutrition-values">
              <span>{product.kcalPer100g} ккал</span>
              <span>
                Б {product.proteinPer100g} · Ж {product.fatPer100g} · У{' '}
                {product.carbsPer100g}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="product-info-form">
            <div className="product-info-field">
              <label className="product-info-label">Количество</label>
              <div className="product-info-amount-row">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="product-info-amount-input"
                  min="1"
                  step="1"
                  required
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="product-info-unit-select"
                >
                  <option value="g">г</option>
                  <option value="ml">мл</option>
                </select>
              </div>
            </div>

            <div className="product-info-field">
              <label className="product-info-label">Время приёма</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="product-info-time-input"
                required
              />
            </div>

            <div className="product-info-calculated">
              <div className="product-info-calculated-label">Будет добавлено:</div>
              <div className="product-info-calculated-values">
                <span className="product-info-calculated-kcal">
                  {nutrients.kcal} ккал
                </span>
                <span>
                  Б {nutrients.protein} · Ж {nutrients.fat} · У {nutrients.carbs}
                </span>
              </div>
            </div>

            {error && <div className="product-info-error">{error}</div>}

            <button
              type="submit"
              className="product-info-submit"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Добавить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

