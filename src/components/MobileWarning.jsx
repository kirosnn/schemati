import { Smartphone } from 'lucide-react'

function MobileWarning() {
  return (
    <div
      className="lg:hidden fixed inset-0 z-[9999] bg-background flex items-center justify-center p-6 overflow-hidden w-screen max-w-[100vw]"
      style={{
        height: '100vh',
        height: '100dvh',
        minHeight: '-webkit-fill-available'
      }}
    >
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Mobile Version Coming Soon</h1>
          <p className="text-muted-foreground">
            Schemati is currently optimized for desktop use. A mobile-friendly version will be available soon.
          </p>
        </div>

        <div className="pt-4 text-sm text-muted-foreground">
          Please visit us on a desktop or tablet for the best experience.
        </div>
      </div>
    </div>
  )
}

export default MobileWarning
