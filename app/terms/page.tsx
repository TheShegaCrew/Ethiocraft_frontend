'use client'

import { LegalDocumentPage } from '@/components/shared/legal-document-page'
import {
  TERMS_OF_SERVICE_LAST_UPDATED,
  termsOfServiceSections,
} from '@/lib/legal/terms-of-service'

export default function TermsOfServicePage() {
  return (
    <LegalDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="The rules and conditions for using EthioCraft as a customer, artisan, or other platform participant."
      lastUpdated={TERMS_OF_SERVICE_LAST_UPDATED}
      sections={termsOfServiceSections}
      relatedLinks={[{ href: '/privacy', label: 'Privacy Policy' }]}
    />
  )
}
