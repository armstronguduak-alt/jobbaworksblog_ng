import { ForgotPasswordClient } from '@/components/client/auth/ForgotPasswordClient'

export const metadata = {
  title: 'Forgot Password - JobbaWorks',
  description: 'Reset your JobbaWorks account password.',
}

export default async function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}
