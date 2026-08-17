import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useOnboarding } from '../../hooks/useOnboarding'
import WelcomeModal from './WelcomeModal'
import OnboardingTour from './OnboardingTour'

export default function OnboardingOverlay() {
  const { user } = useAuth()
  const { welcomeOpen, tourRunning, maybeShowWelcome, startTour, finishTour } = useOnboarding()

  React.useEffect(() => {
    if (user) maybeShowWelcome()
  }, [user, maybeShowWelcome])

  return (
    <>
      <WelcomeModal open={welcomeOpen} onStart={startTour} onSkip={finishTour} />
      {tourRunning && <OnboardingTour />}
    </>
  )
}