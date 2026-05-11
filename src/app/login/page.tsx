import { LoginClient } from '@/components/client/auth/LoginClient'

export const metadata = {
  title: 'Login - JobbaWorks',
  description: 'Log in to your JobbaWorks account to access your dashboard and start earning.',
}

export default async function LoginPage() {
  return <LoginClient />
}
