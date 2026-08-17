import React from 'react'
import ResumeUploader from '../Settings/ResumeUploader'
import PortfolioProjects from '../Settings/PortfolioProjects'
import CountrySelector from '../Settings/CountrySelector'
import { SettingsProvider } from '../../hooks/useSettings'

function NeoSection({ title, icon, tourId, children }) {
  return (
    <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden" data-tour={tourId}>
      <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
      <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
            <i className={`fa-solid ${icon} text-white text-sm`}></i>
          </div>
        )}
        <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <SettingsProvider>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Profile</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage your resume, portfolio, and job search preferences.</p>
          </div>
        </div>

        {/* Resume / Profile Data */}
        <NeoSection title="Resume / Profile Data" icon="fa-file-lines" tourId="profile-resume">
          <ResumeUploader />
        </NeoSection>

        {/* Portfolio / Past Projects */}
        <NeoSection title="Portfolio / Past Projects" icon="fa-briefcase" tourId="profile-portfolio">
          <PortfolioProjects />
        </NeoSection>

        {/* Country for Job Search */}
        <NeoSection title="Country" icon="fa-globe">
          <CountrySelector />
        </NeoSection>
      </div>
    </SettingsProvider>
  )
}
