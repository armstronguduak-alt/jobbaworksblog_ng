import { ResetPasswordClient } from '@/components/client/auth/ResetPasswordClient'

export const metadata = {
  title: 'Reset Password - JobbaWorks',
  description: 'Create a new password for your JobbaWorks account.',
}

export default async function ResetPasswordPage() {
  return <ResetPasswordClient />
}
