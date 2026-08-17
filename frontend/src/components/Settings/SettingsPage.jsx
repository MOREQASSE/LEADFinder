import React from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import { SettingsProvider, useSettings } from '../../hooks/useSettings'
import SearchPresets from './SearchPresets'
import CountrySelector from './CountrySelector'
import PlatformApiKeys from './PlatformApiKeys'
import BudgetRanges from './BudgetRanges'
import RateLimits from './RateLimits'
import KeywordRules from './KeywordRules'
import ModelSelector from './ModelSelector'
import UnsavedWarningModal from './UnsavedWarningModal'
import TogglesTab from './TogglesTab'

const TABS = [
  { id: 'presets', label: 'Presets', icon: 'fa-magnifying-glass' },
  { id: 'connections', label: 'Connection Center', icon: 'fa-plug' },
  { id: 'limits', label: 'Budget & Limits', icon: 'fa-sliders' },
  { id: 'ai', label: 'AI Model', icon: 'fa-brain' },
  { id: 'toggles', label: 'Toggles', icon: 'fa-toggle-on' },
]

function TabButton({ tab, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-5 py-3 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all duration-200 ${
        active
          ? 'bg-orange-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]'
          : 'bg-white text-gray-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
      }`}
    >
      <i className={`fa-solid ${tab.icon} ${active ? 'text-white' : 'text-orange-500'}`}></i>
      {tab.label}
    </button>
  )
}

function SettingsContent() {
  const { saveAll, saving, hasChanges, getValue } = useSettings()
  const [activeTab, setActiveTab] = React.useState('presets')
  const [showWarning, setShowWarning] = React.useState(false)
  const [pendingLeave, setPendingLeave] = React.useState(null)
  const [searchParams] = useSearchParams()

  React.useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab)
  }, [searchParams])

  const dismissWarning = getValue('dismiss_unsaved_warning', '') === '1'

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && !dismissWarning && currentLocation.pathname !== nextLocation.pathname
  )

  React.useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowWarning(true)
    }
  }, [blocker.state])

  React.useEffect(() => {
    const handler = (e) => {
      if (hasChanges && !dismissWarning) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges, dismissWarning])

  const handleSave = async () => {
    await saveAll()
    setShowWarning(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  const handleLeave = () => {
    setShowWarning(false)
    if (blocker.state === 'blocked') blocker.proceed()
  }

  const handleCancel = () => {
    setShowWarning(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  return (
    <div className="space-y-6">
      <UnsavedWarningModal
        open={showWarning}
        onSave={handleSave}
        onLeave={handleLeave}
        onCancel={handleCancel}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Settings</h1>
            <p className="text-gray-500 mt-1 text-sm">Configure your lead discovery engine</p>
          </div>
        </div>
        <button
          onClick={saveAll}
          disabled={!hasChanges || saving}
          data-tour="settings-save"
          className={`flex items-center gap-2 px-6 py-3 border-[3px] border-black font-black text-xs uppercase tracking-wider transition-all ${
            hasChanges
              ? 'bg-orange-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save All
            </>
          )}
        </button>
      </div>

      {hasChanges && (
        <div className="border-[3px] border-black bg-yellow-100 px-5 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0 text-yellow-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-xs font-bold text-yellow-900 uppercase tracking-wider">Unsaved changes — click "Save All" to persist</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" data-tour="settings-tabs">
        {TABS.map(tab => (
          <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <SearchPresets />
            <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
              <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-globe text-white text-sm"></i>
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Country for Job Search</h2>
              </div>
              <div className="p-6">
                <CountrySelector />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'connections' && (
          <PlatformApiKeys />
        )}
        {activeTab === 'limits' && (
          <div className="grid gap-6" data-tour="settings-limits">
            <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
              <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-coins text-white text-sm"></i>
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Budget Ranges</h2>
              </div>
              <div className="p-6">
                <BudgetRanges />
              </div>
            </div>
            <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
              <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-gauge-high text-white text-sm"></i>
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Rate Limits</h2>
              </div>
              <div className="p-6">
                <RateLimits />
              </div>
            </div>
            <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
              <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-filter text-white text-sm"></i>
                </div>
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Keyword Rules</h2>
              </div>
              <div className="p-6">
                <KeywordRules />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ai' && (
          <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden" data-tour="settings-ai">
            <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
            <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                <i className="fa-solid fa-brain text-white text-sm"></i>
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>AI Model Configuration</h2>
            </div>
            <div className="p-6">
              <ModelSelector />
            </div>
          </div>
        )}
        {activeTab === 'toggles' && (
          <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden" data-tour="settings-toggles">
            <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
            <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                <i className="fa-solid fa-toggle-on text-white text-sm"></i>
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Toggles & Reminders</h2>
            </div>
            <div className="p-6">
              <TogglesTab />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <SettingsProvider>
      <SettingsContent />
    </SettingsProvider>
  )
}
