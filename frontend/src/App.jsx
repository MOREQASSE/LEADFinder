import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { OnboardingProvider } from './hooks/useOnboarding'
import OnboardingOverlay from './components/Onboarding/OnboardingOverlay'
import LoginPage from './components/Auth/LoginPage'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import LeadsPage from './components/Leads/LeadsPage'
import GetLeads from './components/Leads/GetLeads'
import ScrapeMaps from './components/Leads/ScrapeMaps'
import MapsLeads from './components/Leads/MapsLeads'
import DashboardHome from './components/Dashboard/DashboardHome'
import ProfilePage from './components/Profile/ProfilePage'
import SettingsPage from './components/Settings/SettingsPage'
import ToolsLayout from './components/Tools/ToolsLayout'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  if (loading) return <div className="flex items-center justify-center h-screen text-sm font-black uppercase tracking-wider">Loading...</div>
  if (!user) return <Navigate to="/login" />

  return (
    <OnboardingProvider>
      <div className="flex h-screen bg-[#f5f0eb]">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-6"><Outlet /></main>
        </div>
      </div>
      <OnboardingOverlay />
    </OnboardingProvider>
  )
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/", element: <DashboardHome /> },
      { path: "/get-leads", element: <GetLeads /> },
      { path: "/leads", element: <LeadsPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/scrape-maps", element: <ScrapeMaps /> },
      { path: "/maps-leads", element: <MapsLeads /> },
      { path: "/tools", element: <ToolsLayout /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
