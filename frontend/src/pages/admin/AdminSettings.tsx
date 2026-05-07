import { useState, useEffect } from 'react'

// Feature toggles stored in localStorage
const SETTINGS_KEY = 'pod_admin_settings'

interface AdminSettings {
  scrollNoticeEnabled: boolean
}

const defaultSettings: AdminSettings = {
  scrollNoticeEnabled: true,
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings)
  const [saved, setSaved] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch {
        setSettings(defaultSettings)
      }
    }
  }, [])

  // Save settings
  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateSetting = (key: keyof AdminSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <span
          className="text-sm font-medium"
          style={{ color: '#78716c' }}
        >
          Configure system features and preferences
        </span>
      </div>

      {/* Feature Settings */}
      <div className="space-y-6">
        {/* Scroll Notice Feature */}
        <div
          className="p-6 rounded-xl border"
          style={{
            background: '#ffffff',
            borderColor: '#e7e5e4',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3
                  className="font-semibold"
                  style={{ color: '#1c1917', fontFamily: 'var(--font-display)' }}
                >
                  Scroll Notice Bar
                </h3>
                <p className="text-sm" style={{ color: '#78716c' }}>
                  Display scrolling announcements at the top of all pages
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => updateSetting('scrollNoticeEnabled', !settings.scrollNoticeEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                settings.scrollNoticeEnabled ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  settings.scrollNoticeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Status indicator */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                settings.scrollNoticeEnabled
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {settings.scrollNoticeEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Other Feature Placeholders */}
        <div
          className="p-6 rounded-xl border opacity-60"
          style={{
            background: '#fafaf9',
            borderColor: '#e7e5e4',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-200"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-10a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3
                className="font-semibold"
                style={{ color: '#1c1917', fontFamily: 'var(--font-display)' }}
              >
                More Settings
              </h3>
              <p className="text-sm" style={{ color: '#78716c' }}>
                Additional system configurations coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg font-medium text-white transition-colors"
          style={{
            background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)',
            boxShadow: '0 2px 8px rgba(32, 158, 157, 0.25)',
          }}
        >
          Save Settings
        </button>

        {saved && (
          <span className="text-sm font-medium text-emerald-600">
            Settings saved successfully!
          </span>
        )}
      </div>
    </div>
  )
}