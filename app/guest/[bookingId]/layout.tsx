import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guest Portal',
  description: 'Access your booking details, check-in information, and more.',
}

export default function GuestPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-4">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://draggonnb.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-teal-600 transition-colors"
            >
              DraggonnB
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
