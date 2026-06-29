import React from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

function Section({ title, children }) {
  return (
    <div className="border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      <div className="bg-[#f5f0eb] px-5 py-3 border-b-[3px] border-black">
        <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function EditableField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      {type === 'textarea' ? (
        <textarea
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none min-h-[60px]"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === 'number' ? (
        <input
          type="number"
          step="0.1"
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

function EditableListField({ label, value, onChange, placeholder = 'type and press Enter' }) {
  const [input, setInput] = React.useState('')
  const items = Array.isArray(value) ? value : []

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed])
      setInput('')
    }
  }

  const remove = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-4 py-2.5 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
        />
        <button onClick={add} className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">Add</button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-white border-[2px] border-black text-xs font-bold">
              {item}
              <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 font-black ml-0.5">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function EditableDictField({ label, value, onChange, fields }) {
  const dict = value && typeof value === 'object' ? value : {}

  const setKey = (key, val) => {
    onChange({ ...dict, [key]: val })
  }

  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <input
            key={f.key}
            type="text"
            className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
            value={dict[f.key] || ''}
            onChange={(e) => setKey(f.key, e.target.value)}
            placeholder={f.placeholder || f.key}
          />
        ))}
      </div>
    </div>
  )
}

export default function ResumeUploader() {
  const [resume, setResume] = React.useState(null)
  const [text, setText] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [dragOver, setDragOver] = React.useState(false)
  const [lastFileName, setLastFileName] = React.useState('')
  const [fields, setFields] = React.useState({})
  const fileRef = React.useRef(null)

  React.useEffect(() => {
    api.get('/ai/resume').then(r => {
      setResume(r.data)
      setText(r.data.raw_text || '')
      setFields(r.data)
    }).catch(() => {})
  }, [])

  const syncFields = (data) => {
    setResume(data)
    setFields(data)
  }

  const updateField = (key, value) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/ai/resume', { raw_text: text })
      syncFields(res.data)
      setLastFileName('')
      toast.success('Resume parsed & saved')
    } catch (e) {
      toast.error('Failed to save: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdits = async () => {
    setSaving(true)
    try {
      const res = await api.put('/ai/resume', fields)
      syncFields(res.data)
      toast.success('Changes saved')
    } catch (e) {
      toast.error('Failed to save: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  const uploadFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt', 'md', 'docx'].includes(ext)) {
      toast.error('Supported formats: PDF, TXT, MD, DOCX')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 85))
    }, 200)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/ai/resume/upload-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearInterval(interval)
      setUploadProgress(100)
      await new Promise(r => setTimeout(r, 400))
      syncFields(res.data)
      setText(res.data.raw_text || '')
      setLastFileName(file.name)
      toast.success(`Parsed "${file.name}" successfully`)
    } catch (e) {
      clearInterval(interval)
      toast.error('Upload failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-[4px] border-black p-8 text-center cursor-pointer transition-all ${
          uploading
            ? 'bg-orange-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            : dragOver
              ? 'bg-orange-100 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-[1.01]'
              : lastFileName
                ? 'bg-emerald-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleFileSelect} />

        {uploading ? (
          <div className="space-y-4">
            <div className="w-10 h-10 mx-auto border-[4px] border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-black text-orange-700 uppercase tracking-wider">Parsing resume...</p>
            <div className="w-48 h-3 mx-auto border-[2px] border-black bg-white overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : lastFileName ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-bold text-emerald-700">{lastFileName}</p>
            <button onClick={(e) => { e.stopPropagation(); setLastFileName('') }} className="text-xs font-black text-gray-400 hover:text-gray-600 ml-2 uppercase tracking-wider underline">
              upload another
            </button>
          </div>
        ) : (
          <>
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-bold text-gray-600">Drop a file here or click to browse</p>
            <p className="text-xs font-bold text-gray-400 mt-1.5">PDF, TXT, MD, DOCX supported &mdash; AI-parsed automatically</p>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-[3px] bg-black" />
        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">or paste text below</span>
        <div className="flex-1 h-[3px] bg-black" />
      </div>

      {/* Text paste */}
      <textarea
        className="w-full bg-[#f5f0eb] border-[4px] border-black p-5 text-sm font-medium min-h-[130px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
        placeholder={`Example:\nName: John Doe\nPortfolio: https://johndoe.dev\nPricing: 5000 - 15000 MAD\nSpecialties: e-commerce, portfolio, blog\nTone: professional\nAvailability: can start within 3 days`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handleSave} disabled={saving || !text.trim()}
        className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-6 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50">
        {saving ? 'Saving...' : 'Parse Text'}
      </button>

      {/* Parsed data section */}
      {resume && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-emerald-50 border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-black text-emerald-800 uppercase tracking-wider">Parsed Data &mdash; edit any field then save</p>
            </div>
            <button onClick={handleSaveEdits} disabled={saving}
              className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center gap-2">
              {saving ? 'Saving...' : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>

          <Section title="Contact &amp; Identity">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditableField label="Name" value={fields.name} onChange={(v) => updateField('name', v)} placeholder="Your full name" />
              <EditableField label="Email" value={fields.email} onChange={(v) => updateField('email', v)} placeholder="email@example.com" />
              <EditableField label="Phone" value={fields.phone} onChange={(v) => updateField('phone', v)} placeholder="+1 234 567 890" />
              <EditableField label="Portfolio URL" value={fields.portfolio_url} onChange={(v) => updateField('portfolio_url', v)} placeholder="https://yourportfolio.com" />
              <EditableField label="Location" value={fields.location} onChange={(v) => updateField('location', v)} placeholder="City, Country" />
              <EditableField label="Timezone" value={fields.timezone} onChange={(v) => updateField('timezone', v)} placeholder="UTC+1" />
            </div>
            <EditableDictField
              label="Social Links"
              value={fields.social_links}
              onChange={(v) => updateField('social_links', v)}
              fields={[
                { key: 'github', placeholder: 'GitHub URL' },
                { key: 'linkedin', placeholder: 'LinkedIn URL' },
                { key: 'twitter', placeholder: 'Twitter URL' },
                { key: 'other', placeholder: 'Other URL' },
              ]}
            />
          </Section>

          <Section title="Skills &amp; Expertise">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditableField label="Experience (years)" type="number" value={fields.experience_years} onChange={(v) => updateField('experience_years', v)} placeholder="5" />
              <EditableField label="Education" value={fields.education} onChange={(v) => updateField('education', v)} placeholder="BS Computer Science" />
            </div>
            <EditableListField label="Skills" value={fields.skills} onChange={(v) => updateField('skills', v)} placeholder="e.g. React" />
            <EditableListField label="Industries" value={fields.industries} onChange={(v) => updateField('industries', v)} placeholder="e.g. e-commerce" />
            <EditableListField label="Certifications" value={fields.certifications} onChange={(v) => updateField('certifications', v)} placeholder="e.g. AWS Certified" />
            <EditableListField label="Languages" value={fields.languages} onChange={(v) => updateField('languages', v)} placeholder="e.g. English" />
          </Section>

          <Section title="Services &amp; Availability">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditableField label="Min Price (MAD)" type="number" value={fields.pricing_min} onChange={(v) => updateField('pricing_min', v)} />
              <EditableField label="Max Price (MAD)" type="number" value={fields.pricing_max} onChange={(v) => updateField('pricing_max', v)} />
              <EditableField label="Voice Tone" value={fields.voice_tone} onChange={(v) => updateField('voice_tone', v)} placeholder="professional, friendly, casual, technical" />
              <EditableField label="Availability" value={fields.availability} onChange={(v) => updateField('availability', v)} placeholder="Can start within 3 days" />
            </div>
            <EditableListField label="Website Types" value={fields.website_types} onChange={(v) => updateField('website_types', v)} placeholder="e.g. e-commerce" />
          </Section>

          <Section title="Additional Info">
            <EditableField label="Past Projects" type="textarea" value={fields.past_projects} onChange={(v) => updateField('past_projects', v)} placeholder="Describe notable past projects..." />
            <EditableField label="Additional Notes" type="textarea" value={fields.additional_notes} onChange={(v) => updateField('additional_notes', v)} placeholder="Any other relevant info..." />
          </Section>
        </div>
      )}
    </div>
  )
}
