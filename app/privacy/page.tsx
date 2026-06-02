'use client'

import { LegalDocumentPage } from '@/components/shared/legal-document-page'
import {
  PRIVACY_POLICY_LAST_UPDATED,
  privacyPolicySections,
} from '@/lib/legal/privacy-policy'

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="How EthioCraft collects, uses, and protects your personal information when you use our marketplace."
      lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
      sections={privacyPolicySections}
      relatedLinks={[{ href: '/terms', label: 'Terms of Service' }]}
    />
  )
}
