export const PRIVACY_POLICY_LAST_UPDATED = 'May 28, 2026'

export type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const privacyPolicySections: LegalSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    paragraphs: [
      'EthioCraft ("we," "us," or "our") operates a digital marketplace that connects customers with Ethiopian artisans and their handcrafted products. This Privacy Policy explains how we collect, use, disclose, and protect personal information when you visit our website, create an account, browse or purchase products, sell as an artisan, or otherwise use our services.',
      'By using EthioCraft, you acknowledge that you have read this Privacy Policy. If you do not agree with our practices, please do not use the platform.',
    ],
  },
  {
    id: 'controller',
    title: '2. Who We Are',
    paragraphs: [
      'EthioCraft is operated from Addis Ababa, Ethiopia. For privacy-related questions or requests, contact us at support@ethiocraft.com or using the details on our Contact page.',
    ],
  },
  {
    id: 'information-we-collect',
    title: '3. Information We Collect',
    paragraphs: [
      'We collect information you provide directly, information generated through your use of the platform, and limited technical data necessary to operate and secure our services.',
    ],
    bullets: [
      'Account and profile data: name, email address, phone number, password (stored in hashed form), role (customer, artisan, admin, or verification agent), profile photo, and account status.',
      'Artisan and verification data: shop name, business description, craft category, location, bank or payout details, product drafts, samples, verification documents, and media you upload for listing or identity review.',
      'Commerce data: shipping and billing addresses, cart and wishlist contents, orders, order status, product reviews, and communication related to transactions.',
      'Payment-related data: payment status, transaction references, and amounts processed through integrated providers such as Telebirr, Chapa, or test/simulation modes in non-production environments. We do not store full payment card numbers on our servers when payments are handled by third-party providers.',
      'Communications: messages you send through contact forms, support channels, in-platform notifications, and AI chat support sessions (including session identifiers and message content needed to provide assistance).',
      'Authentication data: one-time passcodes and verification records used to confirm your email or secure your account.',
      'Technical and usage data: device type, browser, IP address, log data, session identifiers, and cookies or similar technologies used for authentication, security, and basic site functionality.',
    ],
  },
  {
    id: 'how-we-use',
    title: '4. How We Use Your Information',
    paragraphs: ['We use personal information for the following purposes:'],
    bullets: [
      'Creating and managing user accounts and authenticating access.',
      'Operating the marketplace, including product discovery, checkout, order fulfillment, and payout-related processes for artisans.',
      'Reviewing artisan applications, product drafts, and samples through our verification workflow.',
      'Processing payments and sending transactional communications (order confirmations, shipping updates, payment results).',
      'Providing customer support, including AI-assisted chat that may use your account context to answer marketplace questions.',
      'Sending service-related notices, security alerts, and—where permitted—marketing or platform updates.',
      'Improving platform performance, detecting fraud or abuse, enforcing our Terms of Service, and complying with legal obligations.',
      'Generating aggregated or de-identified analytics for internal reporting and platform health.',
    ],
  },
  {
    id: 'legal-bases',
    title: '5. Legal Bases for Processing',
    paragraphs: [
      'Where applicable under Ethiopian law and other regulations that may apply to you, we process personal information based on one or more of the following: performance of a contract (for example, fulfilling an order you place); your consent (for example, optional marketing or certain cookies); our legitimate interests in operating a secure and effective marketplace; and compliance with legal obligations.',
    ],
  },
  {
    id: 'sharing',
    title: '6. How We Share Information',
    paragraphs: [
      'We do not sell your personal information. We may share information in the following circumstances:',
    ],
    bullets: [
      'With artisans or customers as needed to complete transactions (for example, shipping details shared with the artisan fulfilling an order).',
      'With verification agents and administrators involved in artisan onboarding, product review, and platform operations—subject to role-based access controls.',
      'With service providers that help us run the platform, such as cloud hosting, media storage (for example, Cloudinary), email delivery (SMTP), payment processors (Telebirr, Chapa), and AI providers used for chat support.',
      'When required by law, regulation, court order, or governmental request, or to protect the rights, safety, and security of EthioCraft, our users, or the public.',
      'In connection with a merger, acquisition, restructuring, or sale of assets, subject to appropriate confidentiality safeguards.',
    ],
  },
  {
    id: 'international',
    title: '7. International Data Transfers',
    paragraphs: [
      'EthioCraft is based in Ethiopia. Some of our service providers may process data in other countries. When information is transferred internationally, we take reasonable steps to ensure appropriate safeguards are in place consistent with applicable law.',
    ],
  },
  {
    id: 'retention',
    title: '8. Data Retention',
    paragraphs: [
      'We retain personal information for as long as your account is active or as needed to provide services, resolve disputes, enforce agreements, and meet legal, tax, or accounting requirements. Order, payment, and verification records may be kept for longer periods where required for compliance or legitimate business purposes. When data is no longer needed, we delete or anonymize it where feasible.',
    ],
  },
  {
    id: 'security',
    title: '9. Security',
    paragraphs: [
      'We implement administrative, technical, and organizational measures designed to protect personal information, including access controls, encrypted connections (HTTPS), and hashed password storage. No method of transmission or storage is completely secure; you are responsible for maintaining the confidentiality of your login credentials.',
    ],
  },
  {
    id: 'your-rights',
    title: '10. Your Rights and Choices',
    paragraphs: [
      'Depending on applicable law, you may have the right to access, correct, update, or delete certain personal information; object to or restrict certain processing; withdraw consent where processing is consent-based; and lodge a complaint with a relevant supervisory authority.',
      'You can update much of your profile information through your account settings. To exercise other rights, contact support@ethiocraft.com. We may need to verify your identity before responding.',
    ],
  },
  {
    id: 'children',
    title: '11. Children\'s Privacy',
    paragraphs: [
      'EthioCraft is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so we can take appropriate action.',
    ],
  },
  {
    id: 'cookies',
    title: '12. Cookies and Similar Technologies',
    paragraphs: [
      'We use cookies and similar technologies to keep you signed in, remember preferences, maintain cart state, and support security. You can control cookies through your browser settings, but disabling certain cookies may limit platform functionality.',
    ],
  },
  {
    id: 'third-party',
    title: '13. Third-Party Links and Services',
    paragraphs: [
      'Our platform may link to third-party websites or services (such as social media or payment gateways). Their privacy practices are governed by their own policies. We encourage you to review those policies before providing information to third parties.',
    ],
  },
  {
    id: 'ai-chat',
    title: '14. AI Chat Support',
    paragraphs: [
      'Our AI chat feature may process your messages and limited account or marketplace context to generate responses. Chat sessions may be stored to provide continuity and improve support quality. Do not share sensitive information (such as full payment card numbers or government ID numbers) in chat unless explicitly requested through a secure, verified channel.',
    ],
  },
  {
    id: 'changes',
    title: '15. Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page indicates when changes take effect. Material changes may be communicated through the platform or by email where appropriate. Continued use after an update constitutes acceptance of the revised policy.',
    ],
  },
  {
    id: 'contact',
    title: '16. Contact Us',
    paragraphs: [
      'For privacy questions, requests, or complaints, contact us at support@ethiocraft.com or visit our Contact page. We aim to respond within a reasonable timeframe.',
    ],
  },
]
