import React, { useState, useMemo } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

const UNIT_GROUPS = {
  length: {
    label: 'Length',
    units: {
      mm: { label: 'Millimeter', factor: 0.001 },
      cm: { label: 'Centimeter', factor: 0.01 },
      m: { label: 'Meter', factor: 1 },
      km: { label: 'Kilometer', factor: 1000 },
      in: { label: 'Inch', factor: 0.0254 },
      ft: { label: 'Foot', factor: 0.3048 },
      yd: { label: 'Yard', factor: 0.9144 },
      mi: { label: 'Mile', factor: 1609.344 },
    }
  },
  weight: {
    label: 'Weight',
    units: {
      mg: { label: 'Milligram', factor: 0.000001 },
      g: { label: 'Gram', factor: 0.001 },
      kg: { label: 'Kilogram', factor: 1 },
      t: { label: 'Metric Ton', factor: 1000 },
      oz: { label: 'Ounce', factor: 0.028349523 },
      lb: { label: 'Pound', factor: 0.453592 },
      st: { label: 'Stone', factor: 6.35029 },
    }
  },
  temperature: {
    label: 'Temperature',
    units: {
      c: { label: 'Celsius' },
      f: { label: 'Fahrenheit' },
      k: { label: 'Kelvin' },
    }
  },
  speed: {
    label: 'Speed',
    units: {
      ms: { label: 'm/s', factor: 1 },
      kmh: { label: 'km/h', factor: 0.277778 },
      mph: { label: 'mph', factor: 0.44704 },
      kn: { label: 'Knots', factor: 0.514444 },
      mach: { label: 'Mach', factor: 343 },
    }
  },
  data: {
    label: 'Data Storage',
    units: {
      b: { label: 'Bytes', factor: 1 },
      kb: { label: 'Kilobytes', factor: 1024 },
      mb: { label: 'Megabytes', factor: 1048576 },
      gb: { label: 'Gigabytes', factor: 1073741824 },
      tb: { label: 'Terabytes', factor: 1099511627776 },
    }
  },
}

function convertTemp(value, from, to) {
  let celsius
  if (from === 'c') celsius = value
  else if (from === 'f') celsius = (value - 32) * 5/9
  else celsius = value - 273.15

  if (to === 'c') return celsius
  if (to === 'f') return celsius * 9/5 + 32
  return celsius + 273.15
}

export default function UnitConverter() {
  const [group, setGroup] = useState('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('ft')
  const [value, setValue] = useState('1')

  const unitGroup = UNIT_GROUPS[group]

  const result = useMemo(() => {
    const numVal = parseFloat(value)
    if (isNaN(numVal)) return ''

    if (group === 'temperature') {
      return convertTemp(numVal, fromUnit, toUnit)
    }

    const fromFactor = unitGroup.units[fromUnit]?.factor || 1
    const toFactor = unitGroup.units[toUnit]?.factor || 1
    return (numVal * fromFactor) / toFactor
  }, [value, fromUnit, toUnit, group, unitGroup])

  const handleGroupChange = (newGroup) => {
    setGroup(newGroup)
    const units = Object.keys(UNIT_GROUPS[newGroup].units)
    setFromUnit(units[0])
    setToUnit(units[1] || units[0])
  }

  const swapUnits = () => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  return (
    <ToolCard title="Unit Converter" description="Convert between different units of measurement" icon="fa-ruler">
      <div className="space-y-5">
        {/* Group selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(UNIT_GROUPS).map(([key, grp]) => (
            <button
              key={key}
              onClick={() => handleGroupChange(key)}
              className={`border-[3px] border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                group === key
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {grp.label}
            </button>
          ))}
        </div>

        {/* Converter */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
          {/* From */}
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">From</div>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-lg font-black focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
            />
            <select
              value={fromUnit}
              onChange={e => setFromUnit(e.target.value)}
              className="w-full mt-2 bg-white border-[3px] border-black px-3 py-2.5 text-xs font-black uppercase tracking-wider focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none cursor-pointer"
            >
              {Object.entries(unitGroup.units).map(([key, unit]) => (
                <option key={key} value={key}>{unit.label} ({key})</option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <button
            onClick={swapUnits}
            className="w-10 h-10 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] mb-0.5"
          >
            <i className="fa-solid fa-right-left text-white text-sm"></i>
          </button>

          {/* To */}
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">To</div>
            <div className="w-full bg-white border-[3px] border-black px-4 py-3 text-lg font-black text-orange-500 min-h-[52px] flex items-center">
              {result !== '' ? (typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 6 }) : result) : '—'}
            </div>
            <select
              value={toUnit}
              onChange={e => setToUnit(e.target.value)}
              className="w-full mt-2 bg-white border-[3px] border-black px-3 py-2.5 text-xs font-black uppercase tracking-wider focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none cursor-pointer"
            >
              {Object.entries(unitGroup.units).map(([key, unit]) => (
                <option key={key} value={key}>{unit.label} ({key})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Result display */}
        {result !== '' && (
          <div className="bg-[#f5f0eb] border-[3px] border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
            <span className="text-sm font-black text-gray-900">
              {value} {unitGroup.units[fromUnit]?.label} = {' '}
              <span className="text-orange-500">
                {typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 6 }) : result}
              </span>
              {' '}{unitGroup.units[toUnit]?.label}
            </span>
            <CopyButton text={`${value} ${fromUnit} = ${typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 6 }) : result} ${toUnit}`} />
          </div>
        )}
      </div>
    </ToolCard>
  )
}
