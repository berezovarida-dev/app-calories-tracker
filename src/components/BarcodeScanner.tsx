import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import './BarcodeScanner.css'

type BarcodeScannerProps = {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastBarcodeRef = useRef<string | null>(null)
  const barcodeCountRef = useRef<number>(0)
  const isScanningStoppedRef = useRef<boolean>(false)

  useEffect(() => {
    const startScanning = async () => {
      // Проверяем, что компонент еще смонтирован и видео элемент доступен
      if (!videoRef.current) {
        console.warn('Video element not available, skipping scan start')
        return
      }
      
      // Сбрасываем флаг остановки
      isScanningStoppedRef.current = false
      
      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        // Получаем доступ к камере с улучшенными настройками для точности распознавания
        let stream: MediaStream
        try {
          // Пытаемся использовать заднюю камеру с высоким разрешением
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment', // задняя камера на мобильных
              width: { ideal: 1920 }, // Высокое разрешение для лучшего распознавания
              height: { ideal: 1080 },
              aspectRatio: { ideal: 16 / 9 },
            },
          })
        } catch (facingModeError: any) {
          // Если facingMode не поддерживается (например, на некоторых iPhone),
          // пробуем без указания камеры, но с высоким разрешением
          if (facingModeError.name === 'OverconstrainedError' || facingModeError.name === 'NotReadableError') {
            console.warn('facingMode not supported, trying default camera with high resolution')
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                  aspectRatio: { ideal: 16 / 9 },
                },
              })
            } catch (resolutionError: any) {
              // Если высокое разрешение не поддерживается, используем стандартное
              console.warn('High resolution not supported, using default')
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
              })
            }
          } else {
            throw facingModeError
          }
        }

        streamRef.current = stream

        // Проверяем еще раз, что видео элемент все еще доступен
        // (компонент мог размонтироваться во время получения доступа к камере)
        if (!videoRef.current) {
          // Останавливаем поток, если видео элемент исчез
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          console.warn('Video element became unavailable during camera setup')
          return
        }

        const video = videoRef.current
        
        // Проверяем еще раз перед настройкой видео
        if (!video) {
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          return
        }
        
        // Устанавливаем атрибуты для iOS перед установкой srcObject
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.muted = true // Нужно для autoplay на iOS
        
        // Устанавливаем поток, но НЕ запускаем видео вручную
        // Библиотека @zxing сама управляет воспроизведением
        video.srcObject = stream

        // Ждем, пока видео будет готово (загружены метаданные)
        await new Promise<void>((resolve, reject) => {
          // Проверяем, что видео элемент все еще доступен
          if (!videoRef.current) {
            reject(new Error('Video element became unavailable'))
            return
          }
          
          const onLoadedMetadata = () => {
            if (!videoRef.current) {
              reject(new Error('Video element became unavailable'))
              return
            }
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve()
          }
          const onError = (e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video failed to load'))
          }
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
          
          // Таймаут на случай, если событие не сработает
          setTimeout(() => {
            if (!videoRef.current) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata)
              video.removeEventListener('error', onError)
              reject(new Error('Video element became unavailable'))
              return
            }
            if (video.readyState >= 1) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata)
              video.removeEventListener('error', onError)
              resolve()
            }
          }, 2000)
        })

        // Проверяем еще раз перед началом сканирования
        if (!videoRef.current || isScanningStoppedRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
          return
        }

        console.log('Starting barcode scanning...')

        // Функция проверки контрольной суммы EAN-13
        const validateEAN13 = (barcode: string): boolean => {
          if (barcode.length !== 13 || !/^\d+$/.test(barcode)) {
            return false
          }
          
          let sum = 0
          for (let i = 0; i < 12; i++) {
            const digit = parseInt(barcode[i])
            sum += i % 2 === 0 ? digit : digit * 3
          }
          const checkDigit = (10 - (sum % 10)) % 10
          return checkDigit === parseInt(barcode[12])
        }

        // Начинаем сканирование
        // Библиотека сама запустит видео через decodeFromVideoDevice
        try {
          // Проверяем еще раз перед вызовом библиотеки
          if (!videoRef.current) {
            throw new Error('Video element not available')
          }
          
          reader.decodeFromVideoDevice(
            null,
            videoRef.current,
            (result, error) => {
              // Игнорируем все дальнейшие вызовы после остановки сканирования
              if (isScanningStoppedRef.current) {
                return
              }
              
              if (result) {
                const barcode = result.getText()
                console.log('Barcode found:', barcode)
                
                // Проверяем контрольную сумму для EAN-13 (13 цифр)
                if (barcode.length === 13 && !validateEAN13(barcode)) {
                  console.warn('Invalid EAN-13 checksum, ignoring:', barcode)
                  return
                }
                
                // Механизм подтверждения: требуем, чтобы один и тот же штрихкод
                // был распознан несколько раз подряд для уменьшения ошибок
                if (lastBarcodeRef.current === barcode) {
                  barcodeCountRef.current++
                  if (barcodeCountRef.current >= 2) {
                    // Подтвержден - используем результат
                    console.log('Barcode confirmed:', barcode)
                    isScanningStoppedRef.current = true // Устанавливаем флаг ДО остановки
                    stopScanning()
                    onScan(barcode)
                    return // Прерываем выполнение
                  }
                } else {
                  // Новый штрихкод - начинаем счет заново
                  lastBarcodeRef.current = barcode
                  barcodeCountRef.current = 1
                }
              }
              if (error) {
                // NotFoundException - это нормально, просто не нашли штрихкод в текущем кадре
                // Проверяем разные варианты названия этой ошибки
                const isNotFoundException =
                  error.name === 'NotFoundException' ||
                  error.name === 'NotFoundError' ||
                  error.name === 'NotFoundException2' ||
                  error.message?.includes('No MultiFormat Readers') ||
                  error.message?.includes('detect the code')
                
                if (!isNotFoundException) {
                  // Логируем только реальные ошибки, не связанные с отсутствием штрихкода
                  console.error('Scan error:', error.name, error.message)
                  // Не показываем ошибку пользователю, если это не критическая ошибка
                  // Просто логируем для отладки
                }
                // NotFoundException - это норма, просто тихо игнорируем
              }
            },
          )
          console.log('Barcode scanner started successfully')
        } catch (scanError: any) {
          console.error('Failed to start barcode scanner:', scanError)
          throw new Error(`Не удалось запустить сканер: ${scanError.message}`)
        }
      } catch (err: any) {
        console.error('Camera error:', err)
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        })
        
        // Останавливаем поток, если он был создан
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        if (err.name === 'NotAllowedError') {
          setError('Нужен доступ к камере. Разреши доступ в настройках браузера.')
        } else if (err.name === 'NotFoundError') {
          setError('Камера не найдена.')
        } else if (err.name === 'OverconstrainedError') {
          setError('Камера не поддерживает требуемые настройки.')
        } else {
          const errorMessage = err.message || 'Неизвестная ошибка'
          setError(`Не удалось открыть камеру: ${errorMessage}. Можно ввести штрихкод вручную.`)
        }
        setShowManual(true)
      }
    }

    startScanning()

    return () => {
      // Останавливаем сканирование при размонтировании компонента
      stopScanning()
    }
    // Убираем onScan из зависимостей, чтобы избежать перезапуска
    // onScan не должен меняться между рендерами
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopScanning = () => {
    isScanningStoppedRef.current = true // Устанавливаем флаг остановки
    
    if (readerRef.current) {
      readerRef.current.reset()
      readerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    // Сбрасываем счетчики подтверждения
    lastBarcodeRef.current = null
    barcodeCountRef.current = 0
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      stopScanning()
      onScan(manualBarcode.trim())
    }
  }

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-container">
        <div className="barcode-scanner-header">
          <h2 className="barcode-scanner-title">Сканирование штрихкода</h2>
          <button
            type="button"
            className="barcode-scanner-close"
            onClick={() => {
              stopScanning()
              onClose()
            }}
          >
            ✕
          </button>
        </div>

        {!showManual && !error && (
          <div className="barcode-scanner-video-container">
            <video
              ref={videoRef}
              className="barcode-scanner-video"
              playsInline
              muted
            />
            <div className="barcode-scanner-overlay-frame">
              <div className="barcode-scanner-frame" />
              <p className="barcode-scanner-hint">
                Наведи камеру на штрихкод
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="barcode-scanner-error">
            <p>{error}</p>
          </div>
        )}

        <div className="barcode-scanner-actions">
          {!showManual && (
            <button
              type="button"
              className="barcode-scanner-manual-btn"
              onClick={() => setShowManual(true)}
            >
              Ввести вручную
            </button>
          )}

          {showManual && (
            <form onSubmit={handleManualSubmit} className="barcode-scanner-manual">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Введите штрихкод"
                className="barcode-scanner-input"
                autoFocus
              />
              <div className="barcode-scanner-manual-buttons">
                <button
                  type="button"
                  className="barcode-scanner-cancel"
                  onClick={() => {
                    setShowManual(false)
                    setManualBarcode('')
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="barcode-scanner-submit"
                  disabled={!manualBarcode.trim()}
                >
                  Найти
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

