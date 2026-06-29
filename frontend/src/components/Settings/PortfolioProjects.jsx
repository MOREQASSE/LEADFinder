import React from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

function NeoInput({ label, value, onChange, placeholder, type = 'text' }) {
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
      ) : (
        <input
          type={type}
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={value ?? ''}
          onChange={(e) => onChange(type === 'number' ? (e.target.value ? parseInt(e.target.value) : '') : e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

function ProjectCard({ project, onUpdate, onDelete }) {
  const [editing, setEditing] = React.useState(false)
  const [form, setForm] = React.useState({ ...project })
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/portfolio/${project.id}`, form)
      onUpdate(res.data)
      toast.success('Project updated')
      setEditing(false)
    } catch (e) {
      toast.error('Failed to save: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this project?')) return
    try {
      await api.delete(`/portfolio/${project.id}`)
      onDelete(project.id)
      toast.success('Project deleted')
    } catch (e) {
      toast.error('Failed to delete')
    }
  }

  if (editing) {
    return (
      <div className="bg-[#f5f0eb] border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <NeoInput label="Title" value={form.title} onChange={v => setForm({...form, title: v})} />
          <div className="grid grid-cols-2 gap-3">
            <NeoInput label="Client" value={form.client_name || ''} onChange={v => setForm({...form, client_name: v})} placeholder="Client name" />
            <NeoInput label="Year" type="number" value={form.year || ''} onChange={v => setForm({...form, year: v ? parseInt(v) : null})} />
          </div>
        </div>
        <NeoInput label="URL" value={form.url || ''} onChange={v => setForm({...form, url: v})} placeholder="https://..." />
        <NeoInput label="Tech Stack (comma separated)" value={Array.isArray(form.tech_stack) ? form.tech_stack.join(', ') : ''} onChange={v => setForm({...form, tech_stack: v.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="React, Node.js, PostgreSQL" />
        <NeoInput label="Description" type="textarea" value={form.description || ''} onChange={v => setForm({...form, description: v})} />
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={() => setEditing(false)} className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-5 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-[3px] border-black p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-gray-900 uppercase tracking-tight">{project.title}</h4>
            {project.client_name && <span className="text-xs font-bold text-gray-500">for {project.client_name}</span>}
            {project.year && <span className="text-xs font-bold text-gray-400">({project.year})</span>}
          </div>
          {project.description && <p className="text-sm font-medium text-gray-600 mt-1.5">{project.description}</p>}
          {Array.isArray(project.tech_stack) && project.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tech_stack.map(t => <span key={t} className="bg-white text-gray-700 border-[2px] border-black px-2 py-0.5 text-[10px] font-black">{t}</span>)}
            </div>
          )}
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-black text-xs uppercase tracking-wider mt-2 inline-block hover:underline">
              View project &rarr;
            </a>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setEditing(true)} className="border-[2px] border-black p-1.5 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-500 hover:text-orange-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={handleDelete} className="border-[2px] border-black p-1.5 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-500 hover:text-red-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioProjects() {
  const [projects, setProjects] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [extracting, setExtracting] = React.useState(false)
  const [showAdd, setShowAdd] = React.useState(false)
  const [newProject, setNewProject] = React.useState({ title: '', description: '', url: '', tech_stack: '', year: '', client_name: '' })
  const [saving, setSaving] = React.useState(false)

  const load = async () => {
    try {
      const res = await api.get('/portfolio/')
      setProjects(res.data)
    } catch (e) {
      console.error('Failed to load portfolio projects', e)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  const handleExtract = async () => {
    setExtracting(true)
    try {
      const res = await api.post('/portfolio/extract')
      setProjects(prev => [...res.data, ...prev])
      toast.success(`Extracted ${res.data.length} projects`)
    } catch (e) {
      toast.error('Extraction failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setExtracting(false)
    }
  }

  const handleAdd = async () => {
    if (!newProject.title.trim()) return
    setSaving(true)
    try {
      const data = {
        title: newProject.title,
        description: newProject.description || undefined,
        url: newProject.url || undefined,
        tech_stack: newProject.tech_stack ? newProject.tech_stack.split(',').map(s => s.trim()).filter(Boolean) : [],
        year: newProject.year ? parseInt(newProject.year) : undefined,
        client_name: newProject.client_name || undefined,
      }
      const res = await api.post('/portfolio/', data)
      setProjects(prev => [res.data, ...prev])
      setNewProject({ title: '', description: '', url: '', tech_stack: '', year: '', client_name: '' })
      setShowAdd(false)
      toast.success('Project added')
    } catch (e) {
      toast.error('Failed to add: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = (updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const handleDelete = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-bold text-gray-600">Showcase your work. Projects are referenced in outreach emails and LinkedIn DMs.</p>
        <div className="flex gap-2">
          <button onClick={handleExtract} disabled={extracting}
            className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-4 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center gap-2">
            {extracting ? (
              <div className="w-4 h-4 border-[3px] border-gray-400 border-t-gray-800 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            )}
            {extracting ? 'Extracting...' : 'Auto-extract'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Project
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-[#f5f0eb] border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <NeoInput label="Title *" value={newProject.title} onChange={v => setNewProject({...newProject, title: v})} placeholder="Project name" />
            <div className="grid grid-cols-2 gap-3">
              <NeoInput label="Client" value={newProject.client_name} onChange={v => setNewProject({...newProject, client_name: v})} placeholder="Client name" />
              <NeoInput label="Year" type="number" value={newProject.year} onChange={v => setNewProject({...newProject, year: v})} />
            </div>
          </div>
          <NeoInput label="URL" value={newProject.url} onChange={v => setNewProject({...newProject, url: v})} placeholder="https://..." />
          <NeoInput label="Tech Stack (comma separated)" value={newProject.tech_stack} onChange={v => setNewProject({...newProject, tech_stack: v})} placeholder="React, Node.js, PostgreSQL" />
          <NeoInput label="Description" type="textarea" value={newProject.description} onChange={v => setNewProject({...newProject, description: v})} />
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowAdd(false)} className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !newProject.title.trim()} className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-5 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Project'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-500 border-[3px] border-black flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <p className="text-sm font-bold text-gray-500">No projects yet. Add one manually or click "Auto-extract" to pull them from your resume.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
