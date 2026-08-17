import React from 'react'
import { Joyride } from 'react-joyride'
import { useNavigate, useLocation } from 'react-router-dom'
import { TOUR_STEPS } from '../../onboarding/steps'
import { JOYRIDE_STYLES } from '../../onboarding/joyrideTheme'
import { useOnboarding } from '../../hooks/useOnboarding'

function waitForTarget(selector, timeout = 8000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      if (document.querySelector(selector)) return resolve(true)
      if (Date.now() - start > timeout) return resolve(false)
      setTimeout(check, 120)
    }
    check()
  })
}

export default function OnboardingTour() {
  const { finishTour } = useOnboarding()
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = React.useRef(location.pathname)

  React.useEffect(() => {
    pathRef.current = location.pathname
  }, [location.pathname])

  const steps = React.useMemo(
    () =>
      TOUR_STEPS.map((step) => ({
        ...step,
        before: async () => {
          if (step.route && step.route !== pathRef.current) {
            navigate(step.route)
            await waitForTarget(step.target)
          }
        },
      })),
    [navigate]
  )

  const handleEvent = React.useCallback(
    (data) => {
      if (data.type === 'tour:end') finishTour()
    },
    [finishTour]
  )

  return (
    <Joyride
      run
      steps={steps}
      onEvent={handleEvent}
      styles={JOYRIDE_STYLES}
      scrollToFirstStep
      continuous
      options={{
        skipBeacon: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        overlayClickAction: false,
        dismissKeyAction: false,
        closeButtonAction: 'skip',
        targetWaitTimeout: 10000,
        beforeTimeout: 10000,
        zIndex: 10000,
        spotlightPadding: 10,
        spotlightRadius: 0,
        primaryColor: '#FF6B35',
        overlayColor: 'rgba(20, 13, 8, 0.72)',
        arrowColor: '#ffffff',
        width: 400,
      }}
      floatingOptions={{ hideArrow: false }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  )
}