import React, { useState, useMemo } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

function hexToRgb(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  if (hex.length !== 6) return null
  const num = parseInt(hex, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

export default function ColorConverter() {
  const [hex, setHex] = useState('#f97316')

  const rgb = useMemo(() => hexToRgb(hex), [hex])
  const hsl = useMemo(() => rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null, [rgb])

  const handleRgbChange = (key, val) => {
    if (!rgb) return
    const newRgb = { ...rgb, [key]: Math.max(0, Math.min(255, Number(val) || 0)) }
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }

  const handleHslChange = (key, val) => {
    if (!hsl) return
    const newHsl = { ...hsl, [key]: Number(val) || 0 }
    if (key === 'h') newHsl.h = Math.max(0, Math.min(360, newHsl.h))
    if (key === 's' || key === 'l') newHsl[key] = Math.max(0, Math.min(100, newHsl[key]))
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l)
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }

  const isValid = hexToRgb(hex) !== null

  return (
    <ToolCard title="Color Converter" description="Convert between HEX, RGB, and HSL color formats" icon="fa-palette">
      <div className="space-y-5">
        {/* Color preview */}
        <div className="flex gap-4">
          <div
            className="w-24 h-24 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0"
            style={{ backgroundColor: isValid ? hex : '#ccc' }}
          />
          <div className="flex-1 space-y-3">
            {/* HEX */}
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">HEX</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hex}
                  onChange={e => setHex(e.target.value)}
                  className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-mono font-bold focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
                <CopyButton text={hex} />
              </div>
            </div>
          </div>
        </div>

        {/* RGB */}
        <div>
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">RGB</div>
          <div className="grid grid-cols-3 gap-2">
            {['r', 'g', 'b'].map((ch, i) => (
              <div key={ch}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{ch.toUpperCase()}</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb ? rgb[ch] : 0}
                  onChange={e => handleRgbChange(ch, e.target.value)}
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-mono font-bold focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5">
            <CopyButton text={rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : ''} label="Copy RGB" />
          </div>
        </div>

        {/* HSL */}
        <div>
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">HSL</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'h', label: 'H', max: 360 },
              { key: 's', label: 'S', max: 100 },
              { key: 'l', label: 'L', max: 100 },
            ].map(({ key, label, max }) => (
              <div key={key}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label} ({key === 'h' ? '°' : '%'})</label>
                <input
                  type="number"
                  min={0}
                  max={max}
                  value={hsl ? hsl[key] : 0}
                  onChange={e => handleHslChange(key, e.target.value)}
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-mono font-bold focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5">
            <CopyButton text={hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : ''} label="Copy HSL" />
          </div>
        </div>
      </div>
    </ToolCard>
  )
}
