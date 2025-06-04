"use client"

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
    
    // Clean the HTML before processing
    
    // Create the HTML structure with inlined styles
    const htmlWithStyles = `
        <head>
          <style>
            ${pdfExportCss}
          </style>
        </head>
          <div class="prose">
            ${htmlString}
          </div>
    `
    
    // Debug: Log the final HTML structure
    console.log('Final HTML Structure:', htmlWithStyles)

    const opt = {
      margin: [0, 10, 10, 10],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    await html2pdfInstance().set(opt).from(htmlWithStyles).save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}