import { exportApi } from '@/api/index.js'
import { toIsoDate } from '@/composables/useFormat.js'

export function useDownload() {
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function downloadExport(params) {
    const blob = await exportApi.download(params)
    saveBlob(blob, `carvis-${toIsoDate()}.${params.format === 'xlsx' ? 'xlsx' : 'csv'}`)
  }

  return { downloadExport }
}
