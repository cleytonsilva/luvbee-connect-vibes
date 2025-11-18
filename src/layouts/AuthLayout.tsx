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
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Luvbee Connect
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect with amazing people at your favorite locations
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          {children}
        </div>

        <div className="text-center">
          <Link to="/">
            <Button variant="ghost" size="sm">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}