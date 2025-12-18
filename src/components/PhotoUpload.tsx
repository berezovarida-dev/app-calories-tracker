import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  fetchProductByBarcode, 
  searchProductsByName,
  type ProductInfo as ProductInfoType 
} from '../utils/openFoodFacts'
import { BarcodeScanner } from './BarcodeScanner'
import './PhotoUpload.css'

type PhotoUploadProps = {
  onClose: () => void
  onSaved: () => void
}

export function PhotoUpload({ onClose, onSaved }: PhotoUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [time, setTime] = useState(
    new Date().toTimeString().slice(0, 5), // HH:MM
  )
  const [productName, setProductName] = useState('')
  const [productBarcode, setProductBarcode] = useState('')
  const [foundProduct, setFoundProduct] = useState<ProductInfoType | null>(null)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [searchResults, setSearchResults] = useState<ProductInfoType[]>([])
  const [searchingByName, setSearchingByName] = useState(false)
  const [showBarcodeSearch, setShowBarcodeSearch] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [amount, setAmount] = useState('100')
  const [unit, setUnit] = useState('g')

  // Cleanup camera on unmount or when component closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
        setCameraStream(null)
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [cameraStream])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    // Проверяем размер (макс 10 МБ)
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10 МБ')
      return
    }

    // Создаем превью
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      console.log('File preview loaded, setting preview state')
      setPreview(result)
    }
    reader.onerror = (error) => {
      console.error('Error reading file:', error)
      setError('Ошибка при чтении файла')
    }
    reader.readAsDataURL(file)
    setError(null)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // задняя камера на мобильных
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      setCameraStream(stream)
      setShowCamera(true)
      setError(null)

      // Ждем, пока видео элемент будет готов
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Нужен доступ к камере. Разреши доступ в настройках браузера.')
      } else if (err.name === 'NotFoundError') {
        setError('Камера не найдена.')
      } else {
        setError(`Не удалось открыть камеру: ${err.message}`)
      }
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Устанавливаем размеры canvas равными размерам видео
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Рисуем кадр на canvas
    context.drawImage(video, 0, 0)

    // Конвертируем canvas в blob, затем в файл
    canvas.toBlob((blob) => {
      if (!blob) return

      // Создаем File из blob
      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      })

      // Создаем превью
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        // Устанавливаем файл в input
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(file)
          fileInputRef.current.files = dataTransfer.files
        }
      }
      reader.readAsDataURL(file)

      // Останавливаем камеру
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  const handleSearchProduct = async () => {
    if (!productBarcode.trim()) {
      setError('Введите штрихкод для поиска продукта')
      return
    }

    setSearchingProduct(true)
    setError(null)
    setSearchResults([])

    try {
      const product = await fetchProductByBarcode(productBarcode.trim())
      if (product) {
        setFoundProduct(product)
        setProductName(product.name)
      } else {
        setError('Продукт не найден. Можно сохранить фото без данных о продукте.')
        setFoundProduct(null)
      }
    } catch (err: any) {
      setError('Ошибка при поиске продукта: ' + err.message)
      setFoundProduct(null)
    } finally {
      setSearchingProduct(false)
    }
  }

  const handleSearchByName = async () => {
    if (!productName.trim()) {
      setError('Введите название продукта для поиска')
      return
    }

    setSearchingByName(true)
    setError(null)
    setFoundProduct(null)

    try {
      const results = await searchProductsByName(productName.trim(), 10)
      if (results.length > 0) {
        setSearchResults(results)
        // Автоматически выбираем первый результат, если он один
        if (results.length === 1) {
          setFoundProduct(results[0])
        }
      } else {
        setError('Продукты не найдены. Попробуйте другое название или сохраните фото без данных о продукте.')
        setSearchResults([])
      }
    } catch (err: any) {
      setError('Ошибка при поиске: ' + err.message)
      setSearchResults([])
    } finally {
      setSearchingByName(false)
    }
  }

  const handleSelectProduct = (product: ProductInfoType) => {
    setFoundProduct(product)
    setProductName(product.name)
    setSearchResults([])
    setError(null)
  }

  const handleBarcodeScanned = async (barcode: string) => {
    setProductBarcode(barcode)
    setShowBarcodeScanner(false)
    // Автоматически запускаем поиск по отсканированному штрихкоду
    setSearchingProduct(true)
    setError(null)
    setSearchResults([])

    try {
      const product = await fetchProductByBarcode(barcode.trim())
      if (product) {
        setFoundProduct(product)
        setProductName(product.name)
      } else {
        setError('Продукт не найден по штрихкоду. Можно сохранить фото без данных о продукте.')
        setFoundProduct(null)
      }
    } catch (err: any) {
      setError('Ошибка при поиске продукта: ' + err.message)
      setFoundProduct(null)
    } finally {
      setSearchingProduct(false)
    }
  }

  const calculateNutrients = () => {
    if (!foundProduct) {
      console.log('No product found, returning zero nutrients')
      return { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    }
    
    const amountNum = parseFloat(amount) || 0
    if (amountNum <= 0) {
      console.warn('Amount is 0 or invalid:', amount)
      return { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    }
    
    const multiplier = amountNum / 100

    const calculated = {
      kcal: Math.round(foundProduct.kcalPer100g * multiplier),
      protein: Math.round(foundProduct.proteinPer100g * multiplier * 10) / 10,
      fat: Math.round(foundProduct.fatPer100g * multiplier * 10) / 10,
      carbs: Math.round(foundProduct.carbsPer100g * multiplier * 10) / 10,
    }

    console.log('Calculating nutrients for photo:', {
      productName: foundProduct.name,
      productKcalPer100g: foundProduct.kcalPer100g,
      amount: amountNum,
      multiplier,
      calculatedKcal: calculated.kcal,
      foundProduct: foundProduct,
    })

    // Проверяем, что калории не равны 0, если продукт имеет калории
    if (foundProduct.kcalPer100g > 0 && calculated.kcal === 0) {
      console.error('ERROR: Product has calories but calculated kcal is 0!', {
        productKcalPer100g: foundProduct.kcalPer100g,
        amount: amountNum,
        multiplier,
        calculated,
      })
    }

    return calculated
  }

  const nutrients = calculateNutrients()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const file = fileInputRef.current?.files?.[0]
    
    // Если продукт не найден, фото обязательно
    if (!foundProduct && !file) {
      setError('Пожалуйста, выберите фото или найдите продукт')
      return
    }

    // Проверяем, что если продукт найден, но калории 0, предупреждаем пользователя
    if (foundProduct && foundProduct.kcalPer100g === 0) {
      const confirmSave = window.confirm(
        'В базе данных нет информации о калориях для этого продукта. Сохранить без калорий?'
      )
      if (!confirmSave) {
        return
      }
    }

    // Проверяем, что если есть результаты поиска, но продукт не выбран
    if (searchResults.length > 0 && !foundProduct) {
      setError('Пожалуйста, выберите продукт из списка результатов или сохраните без данных о продукте.')
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Необходима авторизация')
        setLoading(false)
        return
      }

      // Создаём дату с текущей датой и выбранным временем
      const [hours, minutes] = time.split(':').map(Number)
      const takenAt = new Date()
      takenAt.setHours(hours, minutes, 0, 0)

      let photoUrl: string | null = null

      // Обрабатываем фото только если оно есть
      if (file) {
        // Пытаемся загрузить в Storage
        try {
          // Генерируем уникальное имя файла
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}.${fileExt}`

          // Загружаем фото в Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('food-photos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw uploadError
          }

          // Получаем публичный URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('food-photos').getPublicUrl(fileName)
          photoUrl = publicUrl
        } catch (storageError: any) {
          // Если bucket не существует или другая ошибка Storage, используем base64
          console.warn('Storage upload failed, using base64 fallback:', storageError)
          
          // Конвертируем файл в base64
          const reader = new FileReader()
          photoUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              resolve(reader.result as string)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        }
      }

      // Сохраняем запись в базу данных
      // Если есть фото, пробуем сохранить в таблицу food_photos
      if (photoUrl) {
        const { error: photosInsertError } = await supabase.from('food_photos').insert({
          user_id: user.id,
          photo_url: photoUrl,
          storage_path: photoUrl.startsWith('data:') ? 'base64' : photoUrl,
          taken_at: takenAt.toISOString(),
        })

        if (photosInsertError) {
          // Если таблица не существует, продолжаем сохранение в daily_entries
          console.warn('food_photos table not found, saving in daily_entries')
        }
      }

      // Сохраняем в daily_entries (с фото или без)
      // Если фото в base64, сохраняем его полностью в note
      // Если это URL, сохраняем URL
      const noteContent = photoUrl 
        ? (photoUrl.startsWith('data:') 
            ? photoUrl // Сохраняем полный base64
            : `Фото: ${photoUrl}`)
        : undefined
      
      // Используем данные продукта, если они найдены
      const entryName = foundProduct ? foundProduct.name : (productName || 'Фото еды')
      
      // Пересчитываем калории прямо здесь, чтобы убедиться, что они актуальны
      let entryNutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      let entryAmount = 0
      let entryUnit = 'g'
      
      if (foundProduct) {
        entryAmount = parseFloat(amount) || 0
        entryUnit = unit
        
        if (entryAmount > 0) {
          const multiplier = entryAmount / 100
          entryNutrients = {
            kcal: Math.round(foundProduct.kcalPer100g * multiplier),
            protein: Math.round(foundProduct.proteinPer100g * multiplier * 10) / 10,
            fat: Math.round(foundProduct.fatPer100g * multiplier * 10) / 10,
            carbs: Math.round(foundProduct.carbsPer100g * multiplier * 10) / 10,
          }
        } else {
          // Если количество не указано, используем значения на 100г
          entryAmount = 100
          entryNutrients = {
            kcal: foundProduct.kcalPer100g,
            protein: foundProduct.proteinPer100g,
            fat: foundProduct.fatPer100g,
            carbs: foundProduct.carbsPer100g,
          }
        }
      }
      
      const noteWithPhoto = foundProduct 
        ? (noteContent || undefined)
        : (productName 
            ? (noteContent ? `Продукт: ${productName}. ${noteContent}` : `Продукт: ${productName}`)
            : noteContent || undefined)

      console.log('=== SAVING PHOTO ===')
      console.log('Found product:', foundProduct)
      console.log('Product kcalPer100g:', foundProduct?.kcalPer100g)
      console.log('Amount:', amount)
      console.log('Entry amount:', entryAmount)
      console.log('Calculated nutrients:', entryNutrients)
      console.log('Entry name:', entryName)
      console.log('===================')

      // Критическая проверка перед сохранением
      if (foundProduct && foundProduct.kcalPer100g > 0 && entryNutrients.kcal === 0) {
        console.error('CRITICAL ERROR: Product has calories but entryNutrients.kcal is 0!', {
          foundProduct,
          amount,
          entryAmount,
          entryNutrients,
          calculatedNutrients: nutrients,
        })
      }

      const insertData = {
        user_id: user.id,
        name: entryName,
        kcal: Math.max(0, entryNutrients.kcal),
        protein: Math.max(0, Math.round(entryNutrients.protein)),
        fat: Math.max(0, Math.round(entryNutrients.fat)),
        carbs: Math.max(0, Math.round(entryNutrients.carbs)),
        amount: entryAmount,
        unit: entryUnit,
        eaten_at: takenAt.toISOString(),
        note: noteWithPhoto,
      }

      console.log('=== INSERT DATA ===')
      console.log('Insert data:', insertData)
      console.log('Kcal value:', insertData.kcal)
      console.log('==================')

      const { error: entryError, data: insertedData } = await supabase
        .from('daily_entries')
        .insert(insertData)
        .select()

      if (entryError) {
        console.error('Error inserting data:', entryError)
        throw entryError
      }

      if (insertedData) {
        console.log('=== SUCCESSFULLY SAVED ===')
        console.log('Inserted data:', insertedData)
        console.log('Saved kcal:', insertedData[0]?.kcal)
        console.log('==========================')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error uploading photo:', err)
      setError(err.message || 'Не удалось сохранить фото')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="photo-upload-overlay">
      <div className="photo-upload-container">
        <div className="photo-upload-header">
          <h2 className="photo-upload-title">Добавить фото еды</h2>
          <button
            type="button"
            className="photo-upload-close"
            onClick={() => {
              // Останавливаем камеру при закрытии
              if (showCamera) {
                stopCamera()
              }
              onClose()
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="photo-upload-form">
          {showCamera ? (
            <div className="photo-upload-camera-container">
              <video
                ref={videoRef}
                className="photo-upload-camera-video"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="photo-upload-camera-controls">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="photo-upload-camera-cancel"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="photo-upload-camera-capture"
                >
                  📷
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="photo-upload-preview-container">
                {preview ? (
                  <img src={preview} alt="Preview" className="photo-upload-preview" />
                ) : (
                  <div className="photo-upload-placeholder">
                    <span className="photo-upload-placeholder-icon">📷</span>
                    <span className="photo-upload-placeholder-text">
                      Сделайте фото или выберите из галереи
                    </span>
                  </div>
                )}
              </div>

              <div className="photo-upload-select-buttons">
                <button
                  type="button"
                  onClick={startCamera}
                  className="photo-upload-camera-btn-primary"
                >
                  📷 Сделать фото
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="photo-upload-select-btn"
                >
                  {preview ? 'Выбрать другое фото' : 'Выбрать из галереи'}
                </button>
              </div>
            </>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="photo-upload-input"
            style={{ display: 'none' }}
          />

          <div className="photo-upload-field">
            <label className="photo-upload-label">Время съёмки</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="photo-upload-time-input"
              required
            />
          </div>

          <div className="photo-upload-field">
            <label className="photo-upload-label">
              Найти продукт по названию
            </label>
            <div className="photo-upload-search-row">
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Например: мандарин, яблоко, банан"
                className="photo-upload-name-search-input"
                disabled={searchingByName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && productName.trim()) {
                    e.preventDefault()
                    handleSearchByName()
                  }
                }}
                autoFocus={false}
              />
              <button
                type="button"
                onClick={handleSearchByName}
                className="photo-upload-search-btn"
                disabled={searchingByName || !productName.trim()}
              >
                {searchingByName ? 'Поиск...' : 'Найти'}
              </button>
            </div>
            <div className="photo-upload-hint">
              Введите название продукта для поиска в базе Open Food Facts
            </div>
          </div>

          {searchResults.length > 0 && !foundProduct && (
            <div className="photo-upload-search-results">
              <div className="photo-upload-search-results-label">
                Найдено продуктов: {searchResults.length}
              </div>
              <div className="photo-upload-results-list">
                {searchResults.map((product, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="photo-upload-result-item"
                  >
                    <div className="photo-upload-result-name">{product.name}</div>
                    {product.brand && (
                      <div className="photo-upload-result-brand">{product.brand}</div>
                    )}
                    <div className="photo-upload-result-nutrition">
                      {product.kcalPer100g > 0 ? (
                        <>
                          {product.kcalPer100g} ккал/100г · Б {product.proteinPer100g} · Ж {product.fatPer100g} · У {product.carbsPer100g}
                        </>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Калории не указаны</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="photo-upload-field">
            <button
              type="button"
              onClick={() => setShowBarcodeSearch(!showBarcodeSearch)}
              className="photo-upload-toggle-barcode"
            >
              {showBarcodeSearch ? '▼' : '▶'} Или найти по штрихкоду
            </button>
            
            {showBarcodeSearch && (
              <div className="photo-upload-barcode-search-container">
                <div className="photo-upload-search-row">
                  <input
                    type="text"
                    value={productBarcode}
                    onChange={(e) => setProductBarcode(e.target.value)}
                    placeholder="Введите штрихкод продукта"
                    className="photo-upload-barcode-input"
                    disabled={searchingProduct}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      // Останавливаем камеру для фото, если она активна
                      if (showCamera) {
                        stopCamera()
                        // Небольшая задержка для освобождения камеры
                        await new Promise(resolve => setTimeout(resolve, 300))
                      }
                      setShowBarcodeScanner(true)
                    }}
                    className="photo-upload-camera-btn"
                    title="Сканировать штрихкод камерой"
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    onClick={handleSearchProduct}
                    className="photo-upload-search-btn"
                    disabled={searchingProduct || !productBarcode.trim()}
                  >
                    {searchingProduct ? 'Поиск...' : 'Найти'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {foundProduct && (
            <div className="photo-upload-product-info">
              <div className="photo-upload-product-name">{foundProduct.name}</div>
              {foundProduct.brand && (
                <div className="photo-upload-product-brand">{foundProduct.brand}</div>
              )}
              <div className="photo-upload-product-nutrition">
                На 100г: {foundProduct.kcalPer100g} ккал, Б {foundProduct.proteinPer100g} · Ж {foundProduct.fatPer100g} · У {foundProduct.carbsPer100g}
              </div>
              
              <div className="photo-upload-field">
                <label className="photo-upload-label">Количество</label>
                <div className="photo-upload-amount-row">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="photo-upload-amount-input"
                    min="1"
                    step="1"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="photo-upload-unit-select"
                  >
                    <option value="g">г</option>
                    <option value="ml">мл</option>
                  </select>
                </div>
              </div>

              <div className="photo-upload-calculated">
                <div className="photo-upload-calculated-label">Будет добавлено:</div>
                <div className="photo-upload-calculated-values">
                  <span className="photo-upload-calculated-kcal">
                    {nutrients.kcal} ккал
                  </span>
                  <span>
                    Б {nutrients.protein} · Ж {nutrients.fat} · У {nutrients.carbs}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!foundProduct && productName && (
            <div className="photo-upload-field">
              <label className="photo-upload-label">Название продукта (вручную)</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Например: Апельсин"
                className="photo-upload-name-input"
              />
            </div>
          )}

          {!foundProduct && preview && searchResults.length === 0 && (
            <div className="photo-upload-warning">
              ⚠️ Продукт не указан. Фото будет сохранено без калорий.
              <br />
              Введите название продукта выше и нажмите "Найти", чтобы найти продукт и рассчитать калории.
            </div>
          )}

          {searchResults.length > 0 && !foundProduct && (
            <div className="photo-upload-info">
              ℹ️ Выберите продукт из списка выше, чтобы рассчитать калории.
            </div>
          )}

          {foundProduct && foundProduct.kcalPer100g === 0 && (
            <div className="photo-upload-warning">
              ⚠️ В базе Open Food Facts нет данных о калориях для этого продукта.
              <br />
              Фото будет сохранено без калорий.
            </div>
          )}

          {error && <div className="photo-upload-error">{error}</div>}

          <div style={{ marginTop: '1rem', flexShrink: 0 }}>
            <button
              type="submit"
              className="photo-upload-submit"
              disabled={loading || (!fileInputRef.current?.files?.[0] && !foundProduct)}
              style={{ width: '100%' }}
            >
              {loading ? 'Сохранение...' : foundProduct ? 'Сохранить' : 'Сохранить фото'}
            </button>
            {!fileInputRef.current?.files?.[0] && !foundProduct && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc2626' }}>
                Пожалуйста, выберите фото или найдите продукт
              </div>
            )}
          </div>
        </form>
      </div>

      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  )
}

