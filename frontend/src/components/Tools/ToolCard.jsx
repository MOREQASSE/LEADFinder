import React from 'react'

export default function ToolCard({ title, description, icon, children }) {
  return (
    <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
      <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
            <i className={`fa-solid ${icon} text-white text-sm`}></i>
          </div>
        )}
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>{title}</h2>
          {description && <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
