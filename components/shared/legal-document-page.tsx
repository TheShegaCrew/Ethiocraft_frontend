'use client'

import Link from 'next/link'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import type { LegalSection } from '@/lib/legal/privacy-policy'

type LegalDocumentPageProps = {
  eyebrow: string
  title: string
  subtitle: string
  lastUpdated: string
  sections: LegalSection[]
  relatedLinks?: { href: string; label: string }[]
}

export function LegalDocumentPage({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  sections,
  relatedLinks = [],
}: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C] font-inter selection:bg-[#1C1C1C] selection:text-[#FAFAF9]">
      <Header />

      <main className="mx-auto max-w-[900px] px-6 pb-24 pt-32 md:px-12 md:pt-48">
        <section className="border-b border-[#e8e3d9] pb-12 md:pb-16">
          <p className="font-aeonik text-xs md:text-sm uppercase tracking-[0.2em] text-[#7a746d] mb-6">
            {eyebrow}
          </p>
          <h1 className="font-druk-medium text-4xl uppercase leading-[1.1] tracking-[0.02em] md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-base md:text-lg leading-relaxed text-[#4f4b45]">{subtitle}</p>
          <p className="mt-4 text-sm text-[#7a746d]">Last updated: {lastUpdated}</p>
        </section>

        {relatedLinks.length > 0 && (
          <nav
            aria-label="Related legal documents"
            className="mt-10 flex flex-wrap gap-4 text-sm"
          >
            {relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-aeonik uppercase tracking-[0.12em] text-[#4f4b45] underline-offset-4 hover:text-[#1C1C1C] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <article className="prose-legal mt-12 space-y-12 md:mt-16">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <h2 className="font-aeonik text-sm uppercase tracking-[0.16em] text-[#1C1C1C]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-sm md:text-base leading-relaxed text-[#4f4b45]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((item) => (
                      <li key={item.slice(0, 48)}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </article>

        <section className="mt-16 rounded-2xl border border-[#e3dccf] bg-[#efeae0] p-8 md:p-10">
          <h2 className="font-druk-medium text-xl uppercase tracking-[0.04em] md:text-2xl">
            Questions?
          </h2>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-[#4f4b45]">
            Contact us at{' '}
            <a
              href="mailto:support@ethiocraft.com"
              className="text-[#1C1C1C] underline underline-offset-2"
            >
              support@ethiocraft.com
            </a>{' '}
            or visit our{' '}
            <Link href="/contact" className="text-[#1C1C1C] underline underline-offset-2">
              Contact page
            </Link>
            .
          </p>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .font-druk-medium {
          font-family: var(--font-druk-medium), sans-serif;
        }
        .font-aeonik {
          font-family: var(--font-aeonik), sans-serif;
        }
        .font-inter {
          font-family: var(--font-inter), sans-serif;
        }
      `}</style>
    </div>
  )
}
