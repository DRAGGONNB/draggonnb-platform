'use client'

import { useState } from 'react'

interface AccessPackProps {
  accessPack: {
    wifi: { networkName: string | null; password: string | null }
    checkInTime: string
    checkOutTime: string
    houseRules: string[]
    directions: string | null
    emergencyContacts: Array<{ name: string; phone: string; role: string }>
    parkingInfo: string | null
  }
  property: {
    name: string
    address: string
    phone: string | null
    email: string | null
    mapsUrl: string | null
    whatsappUrl: string | null
  } | null
}

function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

export default function AccessPack({ accessPack, property }: AccessPackProps) {
  const hasWifi =
    accessPack.wifi.networkName || accessPack.wifi.password
  const hasDirections = accessPack.directions || property?.mapsUrl
  const hasHouseRules = accessPack.houseRules.length > 0
  const hasEmergencyContacts = accessPack.emergencyContacts.length > 0
  const hasParkingInfo = !!accessPack.parkingInfo

  const hasAnyContent =
    hasWifi || hasDirections || hasHouseRules || hasEmergencyContacts || hasParkingInfo

  if (!hasAnyContent) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Access Pack
      </h3>
      <div className="space-y-3">
        {/* WiFi */}
        {hasWifi && (
          <CollapsibleCard
            title="WiFi"
            defaultOpen={true}
            icon={
              <svg
                className="w-4 h-4 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"
                />
              </svg>
            }
          >
            <div className="pt-3 space-y-3">
              {accessPack.wifi.networkName && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Network</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {accessPack.wifi.networkName}
                    </p>
                  </div>
                  <CopyButton
                    value={accessPack.wifi.networkName}
                    label="network name"
                  />
                </div>
              )}
              {accessPack.wifi.password && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Password</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {accessPack.wifi.password}
                    </p>
                  </div>
                  <CopyButton
                    value={accessPack.wifi.password}
                    label="password"
                  />
                </div>
              )}
            </div>
          </CollapsibleCard>
        )}

        {/* Directions */}
        {hasDirections && (
          <CollapsibleCard
            title="Getting There"
            icon={
              <svg
                className="w-4 h-4 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          >
            <div className="pt-3 space-y-3">
              {property?.address && (
                <p className="text-sm text-gray-700">{property.address}</p>
              )}
              {accessPack.directions && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {accessPack.directions}
                </p>
              )}
              {hasParkingInfo && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Parking
                  </p>
                  <p className="text-sm text-blue-700">
                    {accessPack.parkingInfo}
                  </p>
                </div>
              )}
              {property?.mapsUrl && (
                <a
                  href={property.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors w-full justify-center"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  Open in Google Maps
                </a>
              )}
            </div>
          </CollapsibleCard>
        )}

        {/* House Rules */}
        {hasHouseRules && (
          <CollapsibleCard
            title="House Rules"
            icon={
              <svg
                className="w-4 h-4 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
          >
            <ul className="pt-3 space-y-2">
              {accessPack.houseRules.map((rule, index) => (
                <li key={index} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-teal-500 mt-0.5 flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </CollapsibleCard>
        )}

        {/* Emergency Contacts */}
        {hasEmergencyContacts && (
          <CollapsibleCard
            title="Emergency Contacts"
            icon={
              <svg
                className="w-4 h-4 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          >
            <div className="pt-3 space-y-3">
              {accessPack.emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500">{contact.role}</p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}
      </div>
    </div>
  )
}
