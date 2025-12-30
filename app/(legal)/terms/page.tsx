import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for rynk. - Read our terms and conditions for using the service.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity">
            rynk.
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: December 30, 2024</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              By accessing or using rynk. (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              rynk. is an AI-powered chat application that provides intelligent conversation capabilities, learning surfaces (courses, quizzes, flashcards, timelines, comparisons), document analysis, web search, and cross-conversation memory features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li>You may use some features as a guest without an account.</li>
              <li>To access full features, you must create an account with accurate information.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized account access.</li>
              <li>You must be at least 13 years old to use the Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li>Violate any applicable laws or regulations</li>
              <li>Generate, distribute, or promote illegal, harmful, or offensive content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to bypass security measures or access systems without authorization</li>
              <li>Reverse engineer or attempt to extract source code from the Service</li>
              <li>Use automated systems to access the Service beyond normal usage</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Upload malware, viruses, or other harmful content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. User Content</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li>You retain ownership of content you create or upload.</li>
              <li>You grant us a license to use your content to provide the Service.</li>
              <li>You are responsible for ensuring you have rights to content you upload.</li>
              <li>We may remove content that violates these terms.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. AI-Generated Content</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The Service uses artificial intelligence to generate responses. AI-generated content may not always be accurate, complete, or appropriate. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li>AI responses are for informational purposes and should not replace professional advice.</li>
              <li>You are responsible for verifying AI-generated information before relying on it.</li>
              <li>We are not liable for decisions made based on AI-generated content.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Subscriptions and Payments</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li>Some features require a paid subscription.</li>
              <li>Subscriptions are billed in advance on a recurring basis.</li>
              <li>You may cancel at any time; access continues until the end of the billing period.</li>
              <li>Refunds are provided according to applicable platform policies (App Store, Google Play).</li>
              <li>We reserve the right to modify pricing with reasonable notice.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The Service, including its original content, features, and functionality, is owned by rynk. and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Termination</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We may suspend or terminate your access to the Service at any time for violations of these terms or for any other reason at our discretion. You may terminate your account at any time by following the account deletion process. See our <Link href="/data-deletion" className="text-accent hover:underline">Data Deletion page</Link> for details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RYNK. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Indemnification</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              You agree to indemnify and hold harmless rynk. from any claims, damages, or expenses arising from your use of the Service or violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We may update these Terms of Service from time to time. We will notify you of significant changes by posting the new terms and updating the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">14. Governing Law</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <ul className="list-none pl-0 space-y-2 text-foreground/80">
              <li><strong>Email:</strong> <a href="mailto:farseenmanekhan1232@gmail.com" className="text-accent hover:underline">farseenmanekhan1232@gmail.com</a></li>
              <li><strong>Phone:</strong> +91 9686446001</li>
            </ul>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} rynk. All rights reserved.</p>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <Link href="/data-deletion" className="hover:text-foreground transition-colors">Data Deletion</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
