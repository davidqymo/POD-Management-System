import { useState, useCallback, useRef } from 'react'
import { FiUpload, FiDownload, FiCheck, FiAlertTriangle, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import Modal from '../common/Modal'
import type { Resource } from '../../types'

/* ─── Types ─────────────────────────────────────────── */

interface ImportRow {
  externalId: string
  name: string
  costCenterId: string
  billableTeamCode: string
  skill: string
  level: number
  status: string
  category: string
  errors: string[]
}

type ImportStep = 'upload' | 'preview' | 'confirm'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImport?: (resources: Omit<Resource, 'id' | 'version' | 'createdAt' | 'updatedAt'>[]) => void
}

/* ─── Helpers ─────────────────────────────────────────── */

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: ImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = csvLine(lines[i])
    if (values.length === 0) continue

    const get = (header: string): string => {
      const idx = headers.indexOf(header)
      return idx >= 0 && idx < values.length ? values[idx].trim() : ''
    }

    const errors: string[] = []
    const name = get('name')
    if (!name) errors.push('Missing name')
    if (!get('externalId')) errors.push('Missing external ID')
    if (!get('costCenterId')) errors.push('Missing cost center')

    rows.push({
      externalId: get('externalId'),
      name: name || 'Unknown',
      costCenterId: get('costCenterId'),
      billableTeamCode: get('billableTeamCode'),
      skill: get('skill'),
      level: Math.min(5, Math.max(1, parseInt(get('level')) || 3)),
      status: get('status') || 'ACTIVE',
      category: get('category') || 'PERMANENT',
      errors,
    })
  }
  return rows
}

function csvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

const sampleTemplate = `externalId,name,costCenterId,billableTeamCode,skill,level,status,category
EMP-011,Alice Zhang,CC-ENG,BTC-API,backend,4,ACTIVE,PERMANENT
EMP-012,Bob Liu,CC-DES,BTC-UX,designer,3,ACTIVE,PERMANENT
EMP-013,Carol Wu,CC-PM,BTC-PM,pm,2,ON_LEAVE,CONTRACT`

/* ─── Sub-components ──────────────────────────────────── */

function StepIndicator({ current }: { current: ImportStep }) {
  const steps: { key: ImportStep; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'confirm', label: 'Confirm' },
  ]

  const currentIndex = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center gap-2 px-6 pt-4">
      {steps.map((step, i) => {
        const isActive = step.key === current
        const isDone = i < currentIndex
        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-8 h-0.5 ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors ${
                isDone
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isActive
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}
            >
              {isDone ? (
                <FiCheck className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[13px] font-semibold ${
                isDone ? 'text-emerald-600' : isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function UploadZone({
  onFile,
  fileName,
}: {
  onFile: (text: string) => void
  fileName: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      readFile(file)
    },
    [onFile],
  )

  const readFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      onFile(text)
    }
    reader.readAsText(file)
  }

  return (
    <div
      className={`relative mx-6 rounded-xl border-2 border-dashed p-10 text-center transition-all ${
        dragOver
          ? 'border-primary-600 bg-blue-50'
          : fileName
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-gray-200 hover:border-primary-300 hover:bg-blue-50/30'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) readFile(file)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />

      {!fileName ? (
        <>
          <FiUpload className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to browse</p>
          <p className="mt-1 text-xs text-gray-400 font-mono">
            Download the <button onClick={() => inputRef.current?.click()} className="text-primary-600 underline underline-offset-2">template</button> to get started
          </p>
        </>
      ) : (
        <>
          <FiCheck className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">{fileName}</p>
          <p className="mt-1 text-xs text-gray-400 font-mono">Click to change file</p>
          <button
            type="button"
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            onClick={() => inputRef.current?.click()}
          >
            <FiDownload className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}

function PreviewTable({ rows }: { rows: ImportRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const maxVisible = 5

  return (
    <div className="mx-6 mt-4 overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-10 px-3 py-2 text-center font-semibold text-gray-400">#</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">External ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">Cost Center</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">Team</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">Skill</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono text-xs">
            {rows.slice(0, maxVisible).map((row, i) => (
              <tr key={i} className={row.errors.length ? 'bg-red-50' : ''}>
                <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 text-gray-600">{row.externalId}</td>
                <td className="px-3 py-2 text-gray-900">{row.name}</td>
                <td className="px-3 py-2 text-gray-600">{row.costCenterId}</td>
                <td className="px-3 py-2 text-gray-600">{row.billableTeamCode}</td>
                <td className="px-3 py-2 text-gray-600">{row.skill}</td>
                <td className="px-3 py-2 text-gray-600">{row.status}</td>
                <td className="px-3 py-2">
                  {row.errors.length > 0 ? (
                    <span className="text-red-500 text-xs">{row.errors.join(', ')}</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > maxVisible && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-2 text-xs text-gray-400 hover:text-gray-600"
        >
          {expanded ? <FiChevronUp className="h-3 w-3" /> : <FiChevronDown className="h-3 w-3" />}
          {expanded ? 'Show less' : `Show ${rows.length - maxVisible} more rows`}
        </button>
      )}

      {expanded && rows.length > maxVisible && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <tbody className="divide-y divide-gray-100 font-mono text-xs">
              {rows.slice(maxVisible).map((row, i) => (
                <tr key={i + maxVisible} className={row.errors.length ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 text-center text-gray-400">{i + maxVisible + 1}</td>
                  <td className="px-3 py-2 text-gray-600">{row.externalId}</td>
                  <td className="px-3 py-2 text-gray-900">{row.name}</td>
                  <td className="px-3 py-2 text-gray-600">{row.costCenterId}</td>
                  <td className="px-3 py-2 text-gray-600">{row.billableTeamCode}</td>
                  <td className="px-3 py-2 text-gray-600">{row.skill}</td>
                  <td className="px-3 py-2 text-gray-600">{row.status}</td>
                  <td className="px-3 py-2">
                    {row.errors.length > 0 ? (
                      <span className="text-red-500 text-xs">{row.errors.join(', ')}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Modal ───────────────────────────────────────────── */

export default function ImportModal({
  open,
  onClose,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  const handleConfirm = useCallback(async () => {
    setImporting(true)
    try {
      const validRows = parsedRows.filter((r) => r.errors.length === 0)
      const resources = validRows.map((r) => ({
        externalId: r.externalId,
        name: r.name,
        costCenterId: r.costCenterId,
        billableTeamCode: r.billableTeamCode,
        skill: r.skill,
        level: r.level,
        status: r.status as any,
        category: r.category as any,
        isBillable: true,
        isActive: true,
      }))
      onImport?.(resources)
      handleReset()
    } finally {
      setImporting(false)
    }
  }, [parsedRows, onImport])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParsedRows([])
    setFileName('')
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length
  const validCount = parsedRows.length - errorCount

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Resources from CSV"
      size="xl"
      footer={
        step === 'upload' ? null : (
          <>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([sampleTemplate], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'resource_import_template.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Download Template
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {step === 'confirm' ? 'Back to Preview' : 'Close'}
              </button>
              {step === 'preview' && (
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  disabled={errorCount === parsedRows.length}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Import
                </button>
              )}
              {step === 'confirm' && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={importing}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${validCount} Resources`}
                </button>
              )}
            </div>
          </>
        )
      }
    >
      <StepIndicator current={step} />

      {step === 'upload' && (
        <UploadZone
          onFile={(text) => {
            const rows = parseCSV(text)
            setParsedRows(rows)
            setStep('preview')
          }}
          fileName={fileName}
        />
      )}

      {step === 'preview' && (
        <>
          <div
            className={`mx-6 mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
              errorCount > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {errorCount > 0 ? (
              <FiAlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <FiCheck className="h-4 w-4 shrink-0" />
            )}
            <span>
              {validCount} of {parsedRows.length} rows parsed successfully
              {errorCount > 0 && (
                <span className="font-medium"> · {errorCount} row{errorCount > 1 ? 's' : ''} with issues</span>
              )}
            </span>
          </div>
          <PreviewTable rows={parsedRows} />
        </>
      )}

      {step === 'confirm' && (
        <div className="mx-6 mt-4 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Import Summary</p>
            <p className="mt-1">
              {validCount} {validCount === 1 ? 'resource' : 'resources'} will be imported from{' '}
              <span className="font-mono font-medium">{fileName || 'uploaded file'}</span>.
              {errorCount > 0 && (
                <span className="text-amber-600"> {errorCount} row{errorCount > 1 ? 's' : ''} with errors will be skipped.</span>
              )}
            </p>
          </div>
          <PreviewTable rows={parsedRows.filter((r) => r.errors.length === 0)} />
        </div>
      )}
    </Modal>
  )
}
