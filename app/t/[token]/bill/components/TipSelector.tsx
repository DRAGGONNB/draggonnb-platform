'use client'

import { useState } from 'react'

interface TipSelectorProps {
  billAmount: number
  onTipChange: (tip: number) => void
}

const TIP_PRESETS = [
  { label: '10%', multiplier: 0.1 },
  { label: '15%', multiplier: 0.15 },
  { label: '20%', multiplier: 0.2 },
]

export default function TipSelector({ billAmount, onTipChange }: TipSelectorProps) {
  const [selected, setSelected] = useState<number | 'custom' | null>(null)
  const [customAmount, setCustomAmount] = useState('')

  function selectPreset(idx: number) {
    setSelected(idx)
    const tip = Math.round(billAmount * TIP_PRESETS[idx].multiplier * 100) / 100
    onTipChange(tip)
  }

  function selectCustom() {
    setSelected('custom')
    const val = parseFloat(customAmount) || 0
    onTipChange(val)
  }

  function handleCustomChange(val: string) {
    setCustomAmount(val)
    if (selected === 'custom') {
      onTipChange(parseFloat(val) || 0)
    }
  }

  const currentTip =
    selected === 'custom'
      ? parseFloat(customAmount) || 0
      : selected !== null
        ? Math.round(billAmount * TIP_PRESETS[selected].multiplier * 100) / 100
        : 0

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-stone-700">Add a tip</h3>

      <div className="flex gap-2">
        {TIP_PRESETS.map((preset, idx) => {
          const tipAmount = Math.round(billAmount * preset.multiplier * 100) / 100
          return (
            <button
              key={idx}
              onClick={() => selectPreset(idx)}
              className={`flex-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                selected === idx
                  ? 'border-[#0077B6] bg-[#0077B6]/5'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <span className={`block text-sm font-bold ${
                selected === idx ? 'text-[#0077B6]' : 'text-stone-700'
              }`}>
                {preset.label}
              </span>
              <span className={`block text-xs mt-0.5 ${
                selected === idx ? 'text-[#0077B6]/70' : 'text-stone-400'
              }`}>
                R {tipAmount.toFixed(2)}
              </span>
            </button>
          )
        })}

        <button
          onClick={selectCustom}
          className={`flex-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
            selected === 'custom'
              ? 'border-[#0077B6] bg-[#0077B6]/5'
              : 'border-stone-200 hover:border-stone-300'
          }`}
        >
          <span className={`block text-sm font-bold ${
            selected === 'custom' ? 'text-[#0077B6]' : 'text-stone-700'
          }`}>
            Custom
          </span>
        </button>
      </div>

      {selected === 'custom' && (
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
            <span className="text-sm text-stone-400">R</span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step="5"
              className="flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-300"
            />
          </div>
        </div>
      )}

      {currentTip > 0 && (
        <div className="mt-3 flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
          <span className="text-stone-500">Tip</span>
          <span className="font-semibold text-stone-700">R {currentTip.toFixed(2)}</span>
        </div>
      )}

      <button
        onClick={() => { setSelected(null); onTipChange(0) }}
        className="mt-2 w-full text-center text-xs text-stone-400 hover:text-stone-600"
      >
        No tip
      </button>
    </div>
  )
}
