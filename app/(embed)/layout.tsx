import '@/app/globals.css'

export const metadata = {
  title: 'DraggonnB Embed',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
