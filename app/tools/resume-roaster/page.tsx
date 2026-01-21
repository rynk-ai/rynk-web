import type { Metadata } from 'next';
import ResumeRoasterClient from './client';

export const metadata: Metadata = {
  title: 'Resume Roaster - AI Resume Checker | rynk.',
  description: 'A brutal, 6-second screening by an AI FAANG recruiter. Warning: Not for the sensitive. Free resume checker.',
  keywords: ["resume review", "resume critique", "cv checker", "resume feedback"],
  openGraph: {
    title: 'Resume Roaster - AI Resume Checker | rynk.',
    description: 'A brutal, 6-second screening by an AI FAANG recruiter. Warning: Not for the sensitive. Free resume checker.',
    url: 'https://rynk.io/tools/resume-roaster',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Resume%20Roaster&description=Get%20a%20brutal%206-second%20critique%20from%20a%20FAANG%20recruiter%20persona.',
        width: 1200,
        height: 630,
        alt: 'Resume Roaster',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resume Roaster - AI Resume Checker | rynk.',
    description: 'A brutal, 6-second screening by an AI FAANG recruiter.',
    images: ['https://og.rynk.io/api/tools?title=Resume%20Roaster&description=Get%20a%20brutal%206-second%20critique%20from%20a%20FAANG%20recruiter%20persona.'],
  },
  alternates: {
    canonical: '/tools/resume-roaster',
  },
};

export default function ResumeRoasterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Resume Roaster',
    applicationCategory: 'Analysis',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Get a brutal 6-second critique from a FAANG recruiter persona.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResumeRoasterClient />
    </>
  );
}
