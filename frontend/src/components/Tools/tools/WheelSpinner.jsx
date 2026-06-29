import React, { useState, useRef, useCallback, useEffect } from 'react'
import ToolCard from '../ToolCard'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']

export default function WheelSpinner() {
  const [items, setItems] = useState('Option 1\nOption 2\nOption 3\nOption 4\nOption 5')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState(null)
  const [history, setHistory] = useState([])
  const wheelRef = useRef(null)
  const animationRef = useRef(null)

  const parsedItems = items.split('\n').map(s => s.trim()).filter(Boolean)
  const count = parsedItems.length

  const spin = useCallback(() => {
    if (count < 2 || spinning) return
    setWinner(null)
    setSpinning(true)

    const targetIndex = Math.floor(Math.random() * count)
    const segmentAngle = 360 / count
    const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2)
    const spins = 5 + Math.floor(Math.random() * 3)
    const totalRotation = spins * 360 + targetAngle

    const startRotation = rotation % 360
    const startTime = performance.now()
    const duration = 4000 + Math.random() * 1000

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentRotation = startRotation + totalRotation * eased
      setRotation(currentRotation)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        setWinner(parsedItems[targetIndex])
        setHistory(prev => [parsedItems[targetIndex], ...prev].slice(0, 10))
      }
    }

    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = requestAnimationFrame(animate)
  }, [count, rotation, spinning, parsedItems])

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const segmentAngle = count > 0 ? 360 / count : 0

  return (
    <ToolCard title="Wheel Spinner" description="Random picker wheel - add items and spin to pick a winner" icon="fa-dharmachakra">
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Input area */}
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Items (one per line)</div>
            <textarea
              value={items}
              onChange={e => { setItems(e.target.value); setWinner(null) }}
              className="w-full h-48 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
              placeholder="Enter items, one per line..."
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{count} items</span>
              {count < 2 && <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Need 2+ items</span>}
            </div>
          </div>

          {/* Wheel */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64">
              {/* Pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-orange-500 border-[3px] border-black drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"></div>
              </div>

              {/* Wheel */}
              <div
                ref={wheelRef}
                className="w-full h-full rounded-full border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-none"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {parsedItems.map((item, i) => {
                    const startAngle = i * segmentAngle
                    const endAngle = (i + 1) * segmentAngle
                    const startRad = (startAngle - 90) * Math.PI / 180
                    const endRad = (endAngle - 90) * Math.PI / 180
                    const x1 = 100 + 100 * Math.cos(startRad)
                    const y1 = 100 + 100 * Math.sin(startRad)
                    const x2 = 100 + 100 * Math.cos(endRad)
                    const y2 = 100 + 100 * Math.sin(endRad)
                    const largeArc = segmentAngle > 180 ? 1 : 0
                    const midAngle = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180
                    const textX = 100 + 60 * Math.cos(midAngle)
                    const textY = 100 + 60 * Math.sin(midAngle)
                    const textRotation = (startAngle + endAngle) / 2

                    return (
                      <g key={i}>
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={COLORS[i % COLORS.length]}
                          stroke="#000"
                          strokeWidth="1"
                        />
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          fill="white"
                          fontSize="8"
                          fontWeight="900"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                        >
                          {item.length > 12 ? item.slice(0, 10) + '...' : item}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* Spin button */}
            <button
              onClick={spin}
              disabled={count < 2 || spinning}
              className="mt-4 bg-orange-500 border-[3px] border-black px-8 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {spinning ? (
                <><i className="fa-solid fa-spinner animate-spin mr-2"></i>Spinning...</>
              ) : (
                <><i className="fa-solid fa-play mr-2"></i>Spin the Wheel</>
              )}
            </button>
          </div>
        </div>

        {/* Winner display */}
        {winner && !spinning && (
          <div className="bg-orange-500 border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
            <div className="text-[10px] font-black text-white/70 uppercase tracking-wider mb-1">Winner</div>
            <div className="text-2xl font-black text-white uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {winner}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">History</div>
            <div className="flex flex-wrap gap-1.5">
              {history.map((item, i) => (
                <span
                  key={i}
                  className={`border-[2px] border-black px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                    i === 0 ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-gray-600'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
