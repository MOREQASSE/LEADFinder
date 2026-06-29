import React, { useState, useRef, useEffect, useCallback } from 'react'
import ToolCard from '../ToolCard'

const SENTENCES = [
  "The quick brown fox jumps over the lazy dog near the riverbank",
  "Pack my box with five dozen liquor jugs and deliver them quickly",
  "How vexingly quick daft zebras jump over fences at the zoo",
  "The five boxing wizards jump quickly across the ancient courtyard",
  "Amazingly few discotheques provide jukeboxes in the small town",
  "Jackdaws love my big sphinx of quartz that sits on the pedestal",
  "Crazy Frederick bought many very exquisite opal jewels from Peru",
  "We promptly judged antique ivory buckles for the next prize award",
  "The job requires extra pluck and zeal from the young wage earner",
  "Two driven jocks help fax my big quiz to the remote mountain lodge",
  "A wizard's job is to vex chumps quickly in fog at the castle gate",
  "The quick brown fox jumps over the lazy sleeping cat by the fireplace",
  "Pack my box with five dozen big jugs of quality whiskey and rum",
  "How razorback-jumping frogs can level six piqued gymnasts with ease",
  "Crazy Frederick bought many very exquisite opal jewels from the auction",
  "We promptly judged antique ivory buckles for the winning prize award",
  "The job requires extra pluck and zeal from every young wage earner",
  "Two driven jocks help fax my big quiz over the remote mountain lodge",
  "A wizard's job is to vex chumps quickly in the fog near the castle",
  "The five boxing wizards jump quickly over the tall wooden fence",
  "Amazingly few discotheques provide jukeboxes for the late night crowd",
  "Jackdaws love my big sphinx of quartz sitting in the garden patio",
  "Pack my box with five dozen large jugs of quality liquor from Spain",
  "How vexingly quick daft zebras jump over the sleeping lion nearby",
  "Crazy Frederick bought many very exquisite opal jewels at the market",
  "The quick brown fox jumps over the lazy dog while the sun sets",
  "We promptly judged antique ivory buckles for the upcoming prize",
  "Two driven jocks help fax my big quiz to the mountain research lab",
  "The job requires extra pluck and zeal from every single wage earner",
  "A wizard's job is to vex chumps quickly in foggy weather at dawn",
]

const DURATIONS = [15, 30, 60]

function pickSentence() {
  return SENTENCES[Math.floor(Math.random() * SENTENCES.length)]
}

export default function TypingSpeedTest() {
  const [duration, setDuration] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [target, setTarget] = useState(() => pickSentence())
  const [typed, setTyped] = useState('')
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const wpm = React.useMemo(() => {
    if (!started || !startTime || typed.length === 0) return 0
    const elapsed = (Date.now() - startTime) / 1000
    const words = typed.trim().split(/\s+/).length
    return Math.round((words / elapsed) * 60)
  }, [typed, started, startTime])

  const accuracy = React.useMemo(() => {
    if (typed.length === 0) return 100
    let correct = 0
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === target[i]) correct++
    }
    return Math.round((correct / typed.length) * 100)
  }, [typed, target])

  const progress = Math.min(100, (typed.length / target.length) * 100)

  useEffect(() => {
    if (started && !finished && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timerRef.current)
    }
    if (timeLeft === 0 && started) {
      setFinished(true)
      clearTimeout(timerRef.current)
    }
  }, [timeLeft, started, finished])

  const handleInput = useCallback((e) => {
    if (finished) return
    const val = e.target.value
    if (!started) {
      setStarted(true)
      setStartTime(Date.now())
      setTimeLeft(duration)
    }
    setTyped(val)
    if (val.length >= target.length) {
      setFinished(true)
      clearTimeout(timerRef.current)
    }
  }, [started, finished, target, duration])

  const restart = useCallback(() => {
    clearTimeout(timerRef.current)
    setTarget(pickSentence())
    setTyped('')
    setStarted(false)
    setFinished(false)
    setTimeLeft(duration)
    setStartTime(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [duration])

  const handleDurationChange = (d) => {
    if (started && !finished) return
    setDuration(d)
    setTimeLeft(d)
  }

  const resetOnFinish = finished

  return (
    <ToolCard title="Typing Speed Test" description="Measure your typing speed in words per minute" icon="fa-keyboard">
      <div className="space-y-5">
        {/* Duration selector */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Duration:</span>
          <div className="flex gap-1.5">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => handleDurationChange(d)}
                disabled={started && !finished}
                className={`border-[3px] border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  duration === d
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className={`text-2xl font-black tabular-nums ${timeLeft <= 5 && started ? 'text-red-500 animate-pulse' : 'text-gray-900'}`} style={{ fontFamily: "'Bebas Neue', cursive" }}>
            {timeLeft}s
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-200 border-[3px] border-black overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Target text */}
        <div className="bg-[#f5f0eb] border-[4px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] leading-relaxed text-base font-mono select-none">
          {target.split('').map((char, i) => {
            let color = 'text-gray-400'
            if (i < typed.length) {
              color = typed[i] === char ? 'text-green-600' : 'text-red-500 bg-red-100'
            } else if (i === typed.length) {
              color = 'text-gray-900 border-b-2 border-orange-500'
            }
            return (
              <span key={i} className={`${color} transition-colors duration-75`}>
                {char}
              </span>
            )
          })}
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            disabled={finished}
            placeholder={finished ? 'Test complete — see your results below' : 'Start typing here...'}
            className="w-full h-24 bg-white border-[3px] border-black px-4 py-3 text-sm font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none disabled:opacity-60"
            autoFocus
          />
        </div>

        {/* Live stats */}
        {started && !finished && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xl font-black text-orange-500">{wpm}</div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">WPM</div>
            </div>
            <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xl font-black text-gray-900">{accuracy}%</div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Accuracy</div>
            </div>
            <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xl font-black text-gray-900">{typed.length}</div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Chars</div>
            </div>
          </div>
        )}

        {/* Results */}
        {finished && (
          <div className="space-y-4">
            <div className="bg-white border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-center mb-5">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Your Score</div>
                <div className="text-5xl font-black text-orange-500" style={{ fontFamily: "'Bebas Neue', cursive" }}>{wpm}</div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wider">Words Per Minute</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center">
                  <div className="text-lg font-black text-gray-900">{accuracy}%</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Accuracy</div>
                </div>
                <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center">
                  <div className="text-lg font-black text-gray-900">{typed.length}</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Characters</div>
                </div>
                <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center">
                  <div className="text-lg font-black text-gray-900">{typed.trim().split(/\s+/).filter(Boolean).length}</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Words Typed</div>
                </div>
                <div className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center">
                  <div className="text-lg font-black text-gray-900">{target.length - typed.length > 0 ? target.length - typed.length : 0}</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Chars Remaining</div>
                </div>
              </div>
              {/* Rating */}
              <div className="mt-4 text-center">
                <span className={`inline-block border-[3px] border-black px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  wpm >= 80 ? 'bg-green-500 text-white' : wpm >= 50 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {wpm >= 80 ? 'Lightning Fast' : wpm >= 60 ? 'Above Average' : wpm >= 40 ? 'Average' : wpm >= 20 ? 'Below Average' : 'Keep Practicing'}
                </span>
              </div>
            </div>
            <button
              onClick={restart}
              className="w-full bg-orange-500 border-[3px] border-black px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <i className="fa-solid fa-rotate mr-2"></i>Try Again
            </button>
          </div>
        )}

        {/* Start hint */}
        {!started && !finished && (
          <div className="text-center py-2 text-gray-400">
            <i className="fa-solid fa-circle-play text-2xl mb-1"></i>
            <p className="text-xs font-bold uppercase tracking-wider">Start typing to begin the test</p>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
