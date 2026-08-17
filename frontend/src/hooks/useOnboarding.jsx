import React from 'react'

const STORAGE_KEY = 'leadfinder_onboarding_done'

const OnboardingContext = React.createContext(null)

export function OnboardingProvider({ children }) {
  const [welcomeOpen, setWelcomeOpen] = React.useState(false)
  const [tourRunning, setTourRunning] = React.useState(false)
  const autoShownRef = React.useRef(false)

  const showWelcome = React.useCallback(() => {
    setTourRunning(false)
    setWelcomeOpen(true)
  }, [])

  const maybeShowWelcome = React.useCallback(() => {
    if (autoShownRef.current) return
    autoShownRef.current = true
    if (localStorage.getItem(STORAGE_KEY) === '1') return
    setWelcomeOpen(true)
  }, [])

  const startTour = React.useCallback(() => {
    setWelcomeOpen(false)
    setTourRunning(true)
  }, [])

  const finishTour = React.useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setTourRunning(false)
    setWelcomeOpen(false)
  }, [])

  const value = React.useMemo(
    () => ({ welcomeOpen, tourRunning, showWelcome, maybeShowWelcome, startTour, finishTour }),
    [welcomeOpen, tourRunning, showWelcome, maybeShowWelcome, startTour, finishTour]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const ctx = React.useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}