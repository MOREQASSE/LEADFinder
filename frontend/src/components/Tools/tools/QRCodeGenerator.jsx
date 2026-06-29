import React, { useState, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import ToolCard from '../ToolCard'

export default function QRCodeGenerator() {
  const [text, setText] = useState('https://example.com')
  const [size, setSize] = useState(200)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [level, setLevel] = useState('M')
  const canvasRef = useRef(null)

  const downloadPNG = () => {
    const canvas = document.querySelector('#qr-canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const downloadSVG = () => {
    const svg = document.querySelector('#qr-svg svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'qrcode.svg'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolCard title="QR Code Generator" description="Generate QR codes for URLs, text, or contact info" icon="fa-qrcode">
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Content</div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter URL or text..."
                className="w-full h-28 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Size</span>
                <span className="text-xs font-black text-orange-500">{size}px</span>
              </div>
              <input
                type="range"
                min={100}
                max={400}
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 border-[3px] border-black appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Error Correction</div>
              <div className="flex gap-2">
                {['L', 'M', 'Q', 'H'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`flex-1 border-[3px] border-black py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                      level === lvl
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <div className="text-[10px] font-bold text-gray-400 mt-1">
                {level === 'L' ? '~7% recovery' : level === 'M' ? '~15% recovery' : level === 'Q' ? '~25% recovery' : '~30% recovery'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Foreground</div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={e => setFgColor(e.target.value)}
                    className="w-10 h-10 border-[3px] border-black cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={e => setFgColor(e.target.value)}
                    className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-2 py-1 text-xs font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Background</div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="w-10 h-10 border-[3px] border-black cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-2 py-1 text-xs font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center">
            <div className="bg-[#f5f0eb] border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              {text ? (
                <>
                  <div id="qr-svg" className="flex items-center justify-center">
                    <QRCodeSVG
                      value={text}
                      size={size}
                      fgColor={fgColor}
                      bgColor={bgColor}
                      level={level}
                    />
                  </div>
                  {/* Hidden canvas for PNG download */}
                  <div className="hidden">
                    <QRCodeCanvas
                      ref={canvasRef}
                      id="qr-canvas"
                      value={text}
                      size={size}
                      fgColor={fgColor}
                      bgColor={bgColor}
                      level={level}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="flex items-center justify-center bg-white border-[2px] border-dashed border-gray-300"
                  style={{ width: size, height: size }}
                >
                  <span className="text-xs font-bold text-gray-400">Enter content</span>
                </div>
              )}
            </div>

            {/* Download buttons */}
            {text && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={downloadPNG}
                  className="bg-orange-500 border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <i className="fa-solid fa-download mr-1"></i> PNG
                </button>
                <button
                  onClick={downloadSVG}
                  className="bg-white border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <i className="fa-solid fa-download mr-1"></i> SVG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  )
}
