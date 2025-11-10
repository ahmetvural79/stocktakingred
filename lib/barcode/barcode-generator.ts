import bwipjs from 'bwip-js'
import QRCode from 'qrcode'

/**
 * Generate barcode image data URL
 */
export async function generateBarcode(
  value: string,
  type: 'code128' | 'ean13' | 'code39' = 'code128'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    bwipjs.toCanvas(canvas, {
      bcid: type,
      text: value,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    })
      .then(() => {
        resolve(canvas.toDataURL('image/png'))
      })
      .catch((err: Error) => {
        reject(err)
      })
  })
}

/**
 * Generate QR code image data URL
 */
export async function generateQRCode(value: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(value, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return dataUrl
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`)
  }
}

/**
 * Generate barcode and QR code for a product
 */
export async function generateProductCodes(
  productCode: string,
  countItemId: string
): Promise<{ barcode: string; qrcode: string }> {
  const barcodeValue = productCode.padStart(12, '0').substring(0, 12)
  const qrValue = JSON.stringify({
    productCode,
    countItemId,
    timestamp: Date.now(),
  })

  const [barcode, qrcode] = await Promise.all([
    generateBarcode(barcodeValue, 'ean13'),
    generateQRCode(qrValue),
  ])

  return { barcode, qrcode }
}

/**
 * Download barcode/QR code as image
 */
export function downloadCode(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

