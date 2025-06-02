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
    
    const element = document.createElement("div")
    element.innerHTML = htmlString
    
    await html2pdfInstance(element)
      .set({
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}