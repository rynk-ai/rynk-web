import type { Metadata } from 'next';
import RepoVisualizerClient from './client';

export const metadata: Metadata = {
  title: 'GitHub Repo Visualizer - Visualize Codebase Architecture | rynk.',
  description: 'Visualize your GitHub repository\'s architecture and potential issues. Free codebase visualization tool.',
  keywords: ["github visualizer", "codebase visualizer", "repo map", "code structure"],
  openGraph: {
    title: 'GitHub Repo Visualizer - Visualize Codebase Architecture | rynk.',
    description: 'Visualize your GitHub repository\'s architecture and potential issues. Free codebase visualization tool.',
    url: 'https://rynk.io/tools/github-repo-visualizer',
    images: [
      {
        url: 'https://og.rynk.io/api/tools?title=Repo%20Visualizer&description=Understand%20any%20codebase%20instantly%20with%20interactive%20node%20graphs.',
        width: 1200,
        height: 630,
        alt: 'GitHub Repo Visualizer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitHub Repo Visualizer - Visualize Codebase Architecture | rynk.',
    description: 'Visualize your GitHub repository\'s architecture and potential issues.',
    images: ['https://og.rynk.io/api/tools?title=Repo%20Visualizer&description=Understand%20any%20codebase%20instantly%20with%20interactive%20node%20graphs.'],
  },
  alternates: {
    canonical: '/tools/github-repo-visualizer',
  },
};

export default function RepoVisualizerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GitHub Repo Visualizer',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Visualize your GitHub repository\'s architecture and potential issues.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RepoVisualizerClient />
    </>
  );
}
