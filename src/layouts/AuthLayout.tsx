import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-lg border-2 border-foreground bg-background shadow-hard">
            <img src="/abaicon.png" alt="Luvbee" className="h-10 w-10 object-contain" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Luvbee Connect</h2>
          <p className="mt-2 text-sm text-gray-600">Connect with amazing people at your favorite locations</p>
        </div>
        <div className="bg-white rounded-lg shadow-hard border-2 p-8">
          {children}
        </div>
        <div className="text-center">
          <Link to="/">
            <Button variant="ghost" size="sm">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}