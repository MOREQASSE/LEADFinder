import React, { useState, useCallback } from 'react'
import ToolCard from '../ToolCard'

const PRESETS = [
  { label: 'd4', sides: 4 },
  { label: 'd6', sides: 6 },
  { label: 'd8', sides: 8 },
  { label: 'd10', sides: 10 },
  { label: 'd12', sides: 12 },
  { label: 'd20', sides: 20 },
  { label: 'd100', sides: 100 },
]

const D6_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function DieVisual({ value, sides }) {
  if (sides === 6 && value >= 1 && value <= 6) {
    return <span className="text-4xl leading-none">{D6_FACES[value - 1]}</span>
  }
  return <span className="text-2xl font-black text-gray-900">{value}</span>
}

export default function DiceRoller() {
  const [numDice, setNumDice] = useState(1)
  const [sides, setSides] = useState(20)
  const [modifier, setModifier] = useState(0)
  const [results, setResults] = useState([])
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState([])

  const roll = useCallback(() => {
    setRolling(true)
    const rolls = []
    for (let i = 0; i < numDice; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1)
    }
    const sum = rolls.reduce((a, b) => a + b, 0)
    const total = sum + modifier

    setTimeout(() => {
      setResults(rolls)
      setRolling(false)
      setHistory(prev => [{
        rolls: [...rolls],
        modifier,
        sides,
        total,
        ts: Date.now()
      }, ...prev].slice(0, 20))
    }, 350)
  }, [numDice, sides, modifier])

  const sum = results.length > 0 ? results.reduce((a, b) => a + b, 0) : 0
  const total = sum + modifier
  const notation = `${numDice}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''}`

  return (
    <ToolCard title="Dice Roller" description="Roll virtual dice for tabletop gaming and decision making" icon="fa-dice">
      <div className="space-y-5">
        {/* Preset dice */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.sides}
              onClick={() => setSides(p.sides)}
              className={`border-[3px] border-black px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                sides === p.sides
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Dice</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setNumDice(Math.max(1, numDice - 1))} className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50 transition-all active:translate-x-[1px] active:translate-y-[1px]">-</button>
              <input type="number" min={1} max={20} value={numDice} onChange={e => setNumDice(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-1 py-2 text-center text-lg font-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
              <button onClick={() => setNumDice(Math.min(20, numDice + 1))} className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50 transition-all active:translate-x-[1px] active:translate-y-[1px]">+</button>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Sides</div>
            <input type="number" min={2} max={1000} value={sides} onChange={e => setSides(Math.max(2, Math.min(1000, Number(e.target.value) || 2)))} className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2.5 text-center text-lg font-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Modifier</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setModifier(modifier - 1)} className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50 transition-all active:translate-x-[1px] active:translate-y-[1px]">-</button>
              <input type="number" value={modifier} onChange={e => setModifier(Number(e.target.value) || 0)} className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-1 py-2.5 text-center text-lg font-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
              <button onClick={() => setModifier(modifier + 1)} className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50 transition-all active:translate-x-[1px] active:translate-y-[1px]">+</button>
            </div>
          </div>
        </div>

        {/* Roll button */}
        <button
          onClick={roll}
          disabled={rolling}
          className="w-full bg-orange-500 border-[3px] border-black px-4 py-4 text-sm font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60"
        >
          {rolling ? (
            <><i className="fa-solid fa-spinner animate-spin mr-2"></i>Rolling...</>
          ) : (
            <><i className="fa-solid fa-dice mr-2"></i>Roll {notation}</>
          )}
        </button>

        {/* Results */}
        {results.length > 0 && !rolling && (
          <div className="bg-[#f5f0eb] border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Rolled {notation}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {results.map((val, i) => (
                <div key={i} className="w-16 h-16 bg-white border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <DieVisual value={val} sides={sides} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t-[3px] border-black">
              <span className="text-sm font-bold text-gray-600">
                {results.length > 1 ? `${results.join(' + ')}` : ''}
                {modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''}
                {results.length > 1 || modifier !== 0 ? ' =' : ''}
              </span>
              <span className="text-3xl font-black text-orange-500" style={{ fontFamily: "'Bebas Neue', cursive" }}>{total}</span>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">History</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {history.map((entry, i) => {
                const mod = entry.modifier
                return (
                  <div key={entry.ts} className={`flex items-center justify-between border-[2px] border-black px-3 py-2 text-xs font-black ${i === 0 ? 'bg-orange-50 border-orange-500' : 'bg-white'}`}>
                    <span className="text-gray-500 uppercase tracking-wider w-16">{entry.rolls.length}d{entry.sides}{mod !== 0 ? `${mod > 0 ? '+' : ''}${mod}` : ''}</span>
                    <span className="text-gray-400 flex-1 text-center">{entry.rolls.join(', ')}</span>
                    <span className={`text-sm w-12 text-right ${i === 0 ? 'text-orange-500' : 'text-gray-700'}`}>{entry.total}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
