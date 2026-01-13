import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help and support for rynk. - Contact us, FAQs, and bug reporting.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-normal hover:opacity-80 transition-opacity">
            rynk.
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-normal mb-2">Support</h1>
          <p className="text-muted-foreground text-sm mb-8">We&apos;re here to help you get the most out of rynk.</p>

          {/* Contact Information */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Email</h3>
                  <a href="mailto:farseenmanekhan1232@gmail.com" className="text-accent hover:underline">farseenmanekhan1232@gmail.com</a>
                  <p className="text-sm text-muted-foreground mt-1">We typically respond within 24-48 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Phone</h3>
                  <a href="tel:+919686446001" className="text-accent hover:underline">+91 9686446001</a>
                  <p className="text-sm text-muted-foreground mt-1">Available Monday-Friday, 10 AM - 6 PM IST</p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">How do I create an account?</h3>
                <p className="text-foreground/80 text-sm">
                  You can create an account by clicking the &quot;Sign In&quot; button and choosing to sign in with Google or Apple. Your account will be created automatically using your email from the selected provider.
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">Is there a free tier?</h3>
                <p className="text-foreground/80 text-sm">
                  Yes! rynk. offers a free tier with 100 queries per month. You can start using the service immediately without signing up. Creating an account unlocks additional features.
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">How do I cancel my subscription?</h3>
                <p className="text-foreground/80 text-sm">
                  You can cancel your subscription through the platform where you subscribed (App Store or Google Play). Go to your device&apos;s subscription settings to manage or cancel your plan.
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">How do I delete my account and data?</h3>
                <p className="text-foreground/80 text-sm">
                  Visit our <Link href="/data-deletion" className="text-accent hover:underline">Data Deletion page</Link> for detailed instructions on how to request account deletion and understand what data is removed.
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">What are Learning Surfaces?</h3>
                <p className="text-foreground/80 text-sm">
                  Learning Surfaces transform AI responses into interactive formats like courses, quizzes, flashcards, timelines, and comparison tables. They help you learn and retain information more effectively.
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">Can I use rynk. offline?</h3>
                <p className="text-foreground/80 text-sm">
                  rynk. requires an internet connection to function as it relies on cloud-based AI services. However, your conversation history is cached locally for quick access when you reconnect.
                </p>
              </div>
            </div>
          </section>

          {/* Bug Reporting */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Report a Bug</h2>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-foreground/80 mb-4">
                Found a bug or issue? We&apos;d love to hear about it so we can fix it. When reporting a bug, please include:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/80">
                <li>Description of the issue</li>
                <li>Steps to reproduce</li>
                <li>Device and OS version (e.g., iPhone 14, iOS 17.2)</li>
                <li>App version (found in Settings)</li>
                <li>Screenshots or screen recordings (if applicable)</li>
              </ul>
              <p className="text-foreground/80">
                Send bug reports to <a href="mailto:farseenmanekhan1232@gmail.com?subject=Bug%20Report" className="text-accent hover:underline">farseenmanekhan1232@gmail.com</a> with the subject &quot;Bug Report&quot;.
              </p>
            </div>
          </section>

          {/* Feature Requests */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Feature Requests</h2>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-foreground/80">
                Have an idea for a new feature? We love hearing from our users! Send your suggestions to <a href="mailto:farseenmanekhan1232@gmail.com?subject=Feature%20Request" className="text-accent hover:underline">farseenmanekhan1232@gmail.com</a> with the subject &quot;Feature Request&quot;.
              </p>
            </div>
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
