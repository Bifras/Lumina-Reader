export interface QuoteData {
  text: string
  author: string
  bookTitle: string
  theme: 'minimal' | 'classic' | 'modern' | 'dark'
}

export class QuoteService {
  static async generateQuoteImage(data: QuoteData): Promise<string> {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350 // Instagram Portrait
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    // Background
    if (data.theme === 'dark') {
      ctx.fillStyle = '#121212'
    } else if (data.theme === 'classic') {
      ctx.fillStyle = '#f4ecd8'
    } else {
      ctx.fillStyle = '#ffffff'
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Text Style
    ctx.fillStyle = data.theme === 'dark' ? '#ffffff' : '#1a1a1a'
    ctx.textAlign = 'center'
    
    // Quote Mark
    ctx.font = 'italic 120px Georgia'
    ctx.fillText('“', canvas.width / 2, 200)

    // Quote Text
    ctx.font = '48px Georgia'
    const words = data.text.split(' ')
    let line = ''
    let y = 350
    const maxWidth = 800
    const lineHeight = 60

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, canvas.width / 2, y)
        line = words[n] + ' '
        y += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, canvas.width / 2, y)

    // Attribution
    y += 150
    ctx.font = 'italic 32px Georgia'
    ctx.fillText(`— ${data.author}`, canvas.width / 2, y)
    
    y += 50
    ctx.font = 'bold 24px system-ui'
    ctx.fillStyle = '#c05d4e'
    ctx.fillText(data.bookTitle.toUpperCase(), canvas.width / 2, y)

    return canvas.toDataURL('image/png')
  }
}
