import { OnboardingFlow } from '@/components/auth/OnboardingFlow'
import { AuthLayout } from '@/layouts/AuthLayout'

export function OnboardingPage() {
  return (
    <AuthLayout>
      <div className="w-full flex items-center justify-center min-h-[60vh] py-8">
        <OnboardingFlow />
      </div>
    </AuthLayout>
  )
}

