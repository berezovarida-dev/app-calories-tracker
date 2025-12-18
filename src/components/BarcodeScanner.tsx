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

  useEffect(() => {
    const startScanning = async () => {
      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        // Получаем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // задняя камера на мобильных
          },
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()

          // Начинаем сканирование
          reader.decodeFromVideoDevice(
            null,
            videoRef.current,
            (result, error) => {
              if (result) {
                const barcode = result.getText()
                stopScanning()
                onScan(barcode)
              }
              if (error && error.name !== 'NotFoundException') {
                // NotFoundException - это нормально, просто не нашли штрихкод
                // Логируем только другие ошибки
                if (error.name !== 'NotFoundException') {
                  console.error('Scan error:', error)
                }
              }
            },
          )
        }
      } catch (err: any) {
        console.error('Camera error:', err)
        if (err.name === 'NotAllowedError') {
          setError('Нужен доступ к камере. Разреши доступ в настройках браузера.')
        } else if (err.name === 'NotFoundError') {
          setError('Камера не найдена.')
        } else {
          setError('Не удалось открыть камеру. Можно ввести штрихкод вручную.')
        }
        setShowManual(true)
      }
    }

    startScanning()

    return () => {
      stopScanning()
    }
  }, [onScan])

  const stopScanning = () => {
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
            <video ref={videoRef} className="barcode-scanner-video" />
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

