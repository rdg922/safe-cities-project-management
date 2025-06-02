"use client"
import { inner } from '@floating-ui/react'

// Dynamically import html2pdf only on the client side
let html2pdf: any = null

// Initialize html2pdf only when needed
async function initHtml2Pdf() {
  if (!html2pdf) {
    const module = await import('html2pdf.js')
    html2pdf = module.default
  }
  return html2pdf
}

export async function downloadFile(htmlString: string, fileName: string) {
  try {
    // Initialize html2pdf
    const html2pdfInstance = await initHtml2Pdf()
    
    // Fetch the CSS files
    const pdfExportCss = await fetch('/styles/pdf-export.css').then(res => res.text())
    
    // Create the HTML structure with inlined styles
    const htmlWithStyles = `
      <html>
        <head>
          <style>
            ${pdfExportCss}
          </style>
        </head>
        <body>
          <div class="prose">
            ${htmlString}
          </div>
        </body>
      </html>
    `
    
    // Debug: Log the final HTML structure
    console.log('Final HTML Structure:', htmlWithStyles)
    
    await html2pdfInstance(htmlWithStyles)
      .set({
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}