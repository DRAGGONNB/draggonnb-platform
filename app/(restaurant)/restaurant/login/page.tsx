'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StaffCard } from '@/components/restaurant/auth/StaffCard'
import { PINPad } from '@/components/restaurant/auth/PINPad'
import { Suspense } from 'react'

const SESSION_KEY = 'restaurant_staff_session'

type StaffMember = {
  id: string
  display_name: string
  role: string
}

type Step = 'select' | 'pin'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // restaurant_id can be passed as ?r=xxx, or falls back to env var for single-restaurant deploys
  const restaurantId = searchParams.get('r') ?? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID ?? ''

  const [step, setStep] = useState<Step>('select')
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!restaurantId) {
      setErrorMessage('No restaurant configured. Add ?r=<restaurant_id> to the URL.')
      setLoading(false)
      return
    }
    async function fetchStaff() {
      try {
        const res = await fetch(`/api/restaurant/staff/public?restaurant_id=${restaurantId}`)
        if (!res.ok) throw new Error('Failed to load staff')
        const data = await res.json()
        setStaffList(data.staff ?? [])
      } catch {
        setErrorMessage('Could not load staff list. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchStaff()
  }, [])

  function handleSelectStaff(staff: StaffMember) {
    setSelectedStaff(staff)
    setError(false)
    setErrorMessage('')
    setStep('pin')
  }

  function handleBack() {
    setSelectedStaff(null)
    setError(false)
    setErrorMessage('')
    setStep('select')
  }

  async function handlePINComplete(pin: string) {
    if (!selectedStaff || verifying) return
    setVerifying(true)
    setError(false)
    setErrorMessage('')

    try {
      const res = await fetch('/api/restaurant/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: selectedStaff.id, pin }),
      })

      if (res.ok) {
        const data = await res.json()
        const session = {
          staffId: data.staff.id,
          displayName: data.staff.display_name,
          role: data.staff.role,
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
        router.replace('/restaurant/tables')
        return
      }

      // Auth failed
      setError(true)
      setErrorMessage('Incorrect PIN')
    } catch {
      setError(true)
      setErrorMessage('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  function handleClear() {
    setError(false)
    setErrorMessage('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2D2F33]">
        <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white flex flex-col items-center justify-center px-4 py-8">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#6B1420] flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6C3 4.343 4.343 3 6 3H18C19.657 3 21 4.343 21 6V16C21 17.657 19.657 19 18 19H13L8 22V19H6C4.343 19 3 17.657 3 16V6Z"
              fill="white"
              fillOpacity="0.9"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">DraggonnB</h1>
        <p className="text-sm text-gray-500 mt-0.5">Restaurant</p>
      </div>

      {/* Step: Select staff */}
      {step === 'select' && (
        <div className="w-full max-w-md">
          <p className="text-center text-gray-400 text-sm mb-5">Select your name to continue</p>

          {staffList.length === 0 ? (
            <div className="text-center text-gray-600 py-8">
              {errorMessage || 'No active staff found.'}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 justify-items-center">
              {staffList.map(staff => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  selected={selectedStaff?.id === staff.id}
                  onClick={() => handleSelectStaff(staff)}
                />
              ))}
            </div>
          )}

          {errorMessage && staffList.length === 0 && (
            <button
              onClick={() => { setLoading(true); setErrorMessage('') }}
              className="mt-4 w-full text-sm text-[#6B1420] hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Step: PIN entry */}
      {step === 'pin' && selectedStaff && (
        <div className="w-full max-w-xs flex flex-col items-center gap-6">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="self-start flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>

          {/* Selected staff info */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[#6B1420] flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {selectedStaff.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-base">{selectedStaff.display_name}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{selectedStaff.role}</p>
            </div>
          </div>

          <p className="text-sm text-gray-400">Enter your 4-digit PIN</p>

          {/* PIN pad */}
          <div className="bg-[#1E2023] rounded-2xl p-6 w-full flex flex-col items-center">
            {verifying ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PINPad
                onComplete={handlePINComplete}
                onClear={handleClear}
                error={error}
              />
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="text-sm text-red-400 text-center">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function RestaurantLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#2D2F33]">
        <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
