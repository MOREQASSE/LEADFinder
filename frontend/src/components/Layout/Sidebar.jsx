import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: 'fa-chart-simple' },
  { to: '/get-leads', label: 'Get Leads', icon: 'fa-magnifying-glass' },
  { to: '/scrape-maps', label: 'Scrape Maps', icon: 'fa-location-dot' },
  { to: '/tools', label: 'Tools', icon: 'fa-wrench' },
  { to: '/leads', label: 'Leads', icon: 'fa-list' },
  { to: '/maps-leads', label: 'Maps Leads', icon: 'fa-map' },
  { to: '/profile', label: 'Profile', icon: 'fa-user' },
  { to: '/settings', label: 'Settings', icon: 'fa-gear' },
]

const NavItem = ({ to, icon, label, end, mini }) => (
  <NavLink to={to} end={end}>
    {({ isActive }) => (
      <div
        className={`flex items-center border-[3px] border-black text-sm font-black uppercase tracking-wider transition-all duration-200 ${
          mini ? 'justify-center mx-1 px-0 py-2.5' : 'gap-3 px-3 py-2.5'
        } ${
          isActive
            ? 'bg-orange-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            : 'bg-white text-gray-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
        }`}
      >
        <i className={`fa-solid ${icon} text-center text-sm transition-colors duration-200 ${
          mini ? 'w-auto text-base' : 'w-4'
        } ${
          isActive ? 'text-white' : 'text-orange-500'
        }`}></i>
        {!mini && <span className="truncate">{label}</span>}
      </div>
    )}
  </NavLink>
)

export default function Sidebar({ open, onToggle }) {
  const mini = !open

  return (
    <aside
      className={`bg-[#f5f0eb] flex flex-col transition-all duration-300 ease-in-out border-r-[4px] border-black ${
        mini ? 'w-16' : 'w-64'
      }`}
    >
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${mini ? 'px-0' : 'px-4'} pt-6 pb-4`}>
        {/* Brand */}
        <div className={`relative ${mini ? 'mb-6 flex justify-center' : 'mb-7'}`}>
          <div className={`flex items-center ${mini ? 'flex-col gap-1' : 'gap-3'}`}>
            <img src="/Logo.webp" alt="LEADFinder" className="w-11 h-11 object-contain shrink-0" />
            {!mini && (
              <div className="transition-opacity duration-200">
                <span className="text-xl font-black leading-none tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  <span className="text-orange-500">LEAD</span>Finder
                </span>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mt-0.5">By <a href="https://devaxio.com" target="_blank" rel="noopener noreferrer" className="font-black text-blue-600 hover:underline">Devaxio</a></p>
              </div>
            )}
          </div>
          {!mini && <div className="absolute -bottom-2 left-0 right-0 h-[3px] bg-black" />}
        </div>

        {/* Main section */}
        {!mini && (
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2.5 px-1">
            Main
          </div>
        )}
        <nav className={`space-y-1.5 ${mini ? 'px-0.5' : ''}`} data-tour="sidebar-nav">
          {links.slice(0, 4).map((link) => (
            <NavItem key={link.to} {...link} end={link.to === '/'} mini={mini} />
          ))}
        </nav>

        {/* Views section */}
        {!mini && (
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2.5 mt-6 px-1">
            Views
          </div>
        )}
        <nav className={`space-y-1.5 mt-6 ${mini ? 'px-0.5' : ''}`}>
          {links.slice(4, 6).map((link) => (
            <NavItem key={link.to} {...link} mini={mini} />
          ))}
        </nav>

        {/* Configuration section */}
        {!mini && (
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2.5 mt-6 px-1">
            Configuration
          </div>
        )}
        <nav className={`space-y-1.5 mt-6 ${mini ? 'px-0.5' : ''}`}>
          {links.slice(6).map((link) => (
            <NavItem key={link.to} {...link} mini={mini} />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className={`border-t-[4px] border-black mt-auto ${mini ? 'py-3 flex justify-center' : 'px-4 py-3'}`}>
        {mini ? (
          <div className="w-1.5 h-1.5 bg-orange-500 rotate-45" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-orange-500 rotate-45" />
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Devaxio LEAD Finder</span>
          </div>
        )}
      </div>
    </aside>
  )
}
