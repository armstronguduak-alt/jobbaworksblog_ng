import { SignupClient } from '@/components/client/auth/SignupClient'
import { fetchPageToggles } from '@/lib/data/settings'

export const metadata = {
  title: 'Sign Up - JobbaWorks',
  description: 'Create a free JobbaWorks account and start your reading and earning journey.',
}

export default async function SignupPage() {
  const pageToggles = await fetchPageToggles()
  const globalRegistrationEnabled = pageToggles.globalRegistrationEnabled !== false

  return <SignupClient globalRegistrationEnabled={globalRegistrationEnabled} />
}
