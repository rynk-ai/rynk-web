import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for rynk. - Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-normal hover:opacity-80 transition-opacity">
            rynk.
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-normal mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: December 30, 2024</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Welcome to rynk. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI chat application and related services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-medium mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and profile picture (if provided through social sign-in).</li>
              <li><strong>Chat Content:</strong> Messages, conversations, and any files you upload to the service.</li>
              <li><strong>Learning Data:</strong> Your progress in learning surfaces, quiz scores, and flashcard interactions.</li>
              <li><strong>Subscription Information:</strong> Payment details processed through our payment providers.</li>
            </ul>

            <h3 className="text-lg font-medium mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li><strong>Usage Data:</strong> How you interact with our service, features used, and time spent.</li>
              <li><strong>Device Information:</strong> Device type, operating system, browser type, and unique device identifiers.</li>
              <li><strong>Log Data:</strong> IP address, access times, and pages viewed.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li>Provide, maintain, and improve our AI chat services</li>
              <li>Enable cross-conversation memory and context features</li>
              <li>Generate personalized learning surfaces (courses, quizzes, flashcards)</li>
              <li>Process your transactions and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Third-Party Services</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">We integrate with the following third-party services:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li><strong>Google Sign-In:</strong> For authentication purposes. Subject to Google&apos;s Privacy Policy.</li>
              <li><strong>Apple Sign-In:</strong> For authentication on Apple devices. Subject to Apple&apos;s Privacy Policy.</li>
              <li><strong>AI Providers:</strong> We use various AI models to power our chat features. Your conversations may be processed by these services.</li>
              <li><strong>Payment Processors:</strong> Subscription payments are handled by secure third-party processors.</li>
              <li><strong>Analytics:</strong> We use analytics tools to understand service usage.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Storage and Security</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest. Your data is stored on secure cloud infrastructure. While we strive to protect your information, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (see our <Link href="/data-deletion" className="text-accent hover:underline">Data Deletion page</Link>)</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, we will delete or anonymize your data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we discover such data has been collected, we will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
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
