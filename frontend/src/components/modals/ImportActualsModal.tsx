import { useState, useCallback, useRef } from 'react'
import { FiUpload, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import Modal from '../common/Modal'
import { importActuals } from '../../api/actuals'

interface ImportRow {
  externalId: string
  clarityId: string
  projectName: string
  dec: string
  jan: string
  feb: string
  mar: string
  apr: string
  may: string
  jun: string
  jul: string
  aug: string
  sep: string
  oct: string
  nov: string
  errors: string[]
}

interface ImportActualsModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MONTH_COLS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: ImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    if (values.length < 4) continue

    const get = (header: string): string => {
      const idx = headers.indexOf(header)
      return idx >= 0 && idx < values.length ? values[idx] : ''
    }

    const errors: string[] = []
    if (!get('externalid')) errors.push('Missing externalId')
    if (!get('clarityid')) errors.push('Missing clarityId')

    rows.push({
      externalId: get('externalid'),
      clarityId: get('clarityid'),
      projectName: get('projectname'),
      dec: get('dec'),
      jan: get('jan'),
      feb: get('feb'),
      mar: get('mar'),
      apr: get('apr'),
      may: get('may'),
      jun: get('jun'),
      jul: get('jul'),
      aug: get('aug'),
      sep: get('sep'),
      oct: get('oct'),
      nov: get('nov'),
      errors,
    })
  }
  return rows
}

const sampleTemplate = `externalId,clarityId,projectName,Dec,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov
EMP001,PRJ-001,Project Alpha,1.0,1.5,2.0,1.0,0.5,1.0,1.5,2.0,1.0,0.5,1.0,1.5
EMP002,PRJ-002,Project Beta,0.5,1.0,1.0,0.5,0.5,0.5,1.0,1.0,0.5,0.5,0.5,0.5`

export default function ImportActualsModal({ open, onClose, onSuccess }: ImportActualsModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload')
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)

  const handleFile = useCallback((text: string) => {
    const rows = parseCSV(text)
    setParsedRows(rows)
    setStep('preview')
  }, [])

  const handleConfirm = useCallback(async () => {
    setImporting(true)
    try {
      // Build CSV content from parsed rows
      const header = 'externalId,clarityId,projectName,' + MONTH_COLS.join(',')
      const dataRows = parsedRows
        .filter((r) => r.errors.length === 0)
        .map((r) =>
          [r.externalId, r.clarityId, r.projectName, r.dec, r.jan, r.feb, r.mar, r.apr, r.may, r.jun, r.jul, r.aug, r.sep, r.oct, r.nov].join(',')
        )
      const csvContent = [header, ...dataRows].join('\n')

      await importActuals(csvContent)
      onSuccess?.()
      handleReset()
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }, [parsedRows, onSuccess, onClose])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParsedRows([])
  }, [])

  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length
  const validCount = parsedRows.length - errorCount

  const inputRef = useRef<HTMLInputElement>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleFile(ev.target?.result as string)
    reader.readAsText(file)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Actual Consumption"
      size="xl"
      footer={
        step === 'upload' ? null : (
          <>
            <button
              onClick={() => {
                const blob = new Blob([sampleTemplate], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'actuals_import_template.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Download Template
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                Close
              </button>
              {step === 'preview' && (
                <button
                  onClick={() => setStep('confirm')}
                  disabled={errorCount === parsedRows.length}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Confirm Import
                </button>
              )}
              {step === 'confirm' && (
                <button
                  onClick={handleConfirm}
                  disabled={importing}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${validCount} Records`}
                </button>
              )}
            </div>
          </>
        )
      }
    >
      {step === 'upload' && (
        <div className="mx-6 rounded-xl border-2 border-dashed p-10 text-center">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          <FiUpload className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to browse</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 text-sm text-primary-600 underline"
          >
            Click to upload
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="mx-6">
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
            errorCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {errorCount > 0 ? <FiAlertTriangle className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
            <span>{validCount} of {parsedRows.length} rows parsed successfully</span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1">External ID</th>
                  <th className="px-2 py-1">Clarity ID</th>
                  <th className="px-2 py-1">Project</th>
                  <th className="px-2 py-1">Dec</th>
                  <th className="px-2 py-1">Jan</th>
                  <th className="px-2 py-1">Feb</th>
                  <th className="px-2 py-1">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsedRows.slice(0, 10).map((row, i) => (
                  <tr key={i} className={row.errors.length ? 'bg-red-50' : ''}>
                    <td className="px-2 py-1">{row.externalId}</td>
                    <td className="px-2 py-1">{row.clarityId}</td>
                    <td className="px-2 py-1">{row.projectName}</td>
                    <td className="px-2 py-1">{row.dec}</td>
                    <td className="px-2 py-1">{row.jan}</td>
                    <td className="px-2 py-1">{row.feb}</td>
                    <td className="px-2 py-1 text-red-500">{row.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="mx-6">
          <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm">
            <p className="font-medium">Import Summary</p>
            <p>{validCount} records will be imported</p>
          </div>
        </div>
      )}
    </Modal>
  )
}