import { ProfileForm, ProfileStats } from '../components/profile/ProfileForm'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Bell, Shield, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const settingsSections = [
    {
      title: 'Account Settings',
      description: 'Manage your account information and preferences',
      icon: Settings,
      items: [
        { label: 'Personal Information', action: () => {} },
        { label: 'Email Preferences', action: () => {} },
        { label: 'Change Password', action: () => {} }
      ]
    },
    {
      title: 'Notifications',
      description: 'Control how you receive notifications',
      icon: Bell,
      items: [
        { label: 'Push Notifications', action: () => {} },
        { label: 'Email Notifications', action: () => {} },
        { label: 'Message Alerts', action: () => {} }
      ]
    },
    {
      title: 'Privacy & Safety',
      description: 'Manage your privacy and safety settings',
      icon: Shield,
      items: [
        { label: 'Privacy Settings', action: () => {} },
        { label: 'Blocked Users', action: () => {} },
        { label: 'Report a Problem', action: () => {} }
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Profile
        </h1>
        <p className="text-gray-600">
          Manage your profile and account settings
        </p>
      </div>

      <ProfileStats />

      <ProfileForm />

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        
        {settingsSections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <Button
                    key={itemIndex}
                    variant="ghost"
                    className="w-full justify-start text-left"
                    onClick={item.action}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
        <div className="space-y-3">
          <Button variant="outline" className="w-full">
            Download My Data
          </Button>
          <Button variant="outline" className="w-full">
            Deactivate Account
          </Button>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}