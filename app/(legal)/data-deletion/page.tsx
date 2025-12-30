import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Deletion",
  description: "Learn how to delete your account and data from rynk.",
};

export default function DataDeletionPage() {
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
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Data Deletion</h1>
          <p className="text-muted-foreground text-sm mb-8">Instructions for deleting your account and data from rynk.</p>

          {/* Overview */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              We respect your right to control your personal data. This page explains how to request deletion of your account and associated data from rynk.
            </p>
          </section>

          {/* How to Request Deletion */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">How to Request Account Deletion</h2>
            
            <div className="space-y-6">
              {/* Method 1 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center flex-shrink-0">1</span>
                  Via Email Request
                </h3>
                <p className="text-foreground/80 mb-3">
                  Send an email to <a href="mailto:farseenmanekhan1232@gmail.com?subject=Account%20Deletion%20Request" className="text-accent hover:underline">farseenmanekhan1232@gmail.com</a> with:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/80">
                  <li>Subject: &quot;Account Deletion Request&quot;</li>
                  <li>The email address associated with your account</li>
                  <li>Confirmation that you want to delete your account and all associated data</li>
                </ul>
              </div>

              {/* Method 2 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm flex items-center justify-center flex-shrink-0">2</span>
                  In-App Deletion (Coming Soon)
                </h3>
                <p className="text-foreground/80">
                  We are adding an in-app account deletion feature. Once available, you&apos;ll be able to delete your account directly from Settings &gt; Account &gt; Delete Account.
                </p>
              </div>
            </div>
          </section>

          {/* What Gets Deleted */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">What Data Gets Deleted</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              When you request account deletion, the following data will be permanently removed:
            </p>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Data Type</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Deleted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Account information (name, email)</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Chat conversations and messages</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Uploaded files and documents</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Learning progress (quizzes, flashcards)</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Projects and workspaces</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Subscription information</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-foreground/80">Saved preferences and settings</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">✓ Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Data Retention */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
            <div className="space-y-4 text-foreground/80">
              <p className="leading-relaxed">
                <strong className="text-foreground">Processing Time:</strong> Account deletion requests are processed within <strong>30 days</strong> of receipt.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">Backup Systems:</strong> Data may persist in encrypted backups for up to <strong>90 days</strong> after deletion before being permanently purged.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">Legal Requirements:</strong> Some data may be retained longer if required by law (e.g., transaction records for tax purposes).
              </p>
            </div>
          </section>

          {/* Before You Delete */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Before You Delete</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3">⚠️ Important Considerations</h3>
              <ul className="list-disc pl-6 space-y-2 text-yellow-800 dark:text-yellow-200">
                <li>Account deletion is <strong>permanent and irreversible</strong></li>
                <li>All your conversations, files, and learning progress will be lost</li>
                <li>If you have an active subscription, cancel it first through the App Store or Google Play</li>
                <li>Consider exporting any important data before requesting deletion</li>
              </ul>
            </div>
          </section>

          {/* Cancel Subscription First */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Cancel Your Subscription</h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              If you have an active subscription, please cancel it before requesting account deletion:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">iOS / App Store</h3>
                <ol className="list-decimal pl-4 space-y-1 text-sm text-foreground/80">
                  <li>Open Settings on your iPhone/iPad</li>
                  <li>Tap your name at the top</li>
                  <li>Tap Subscriptions</li>
                  <li>Select rynk.</li>
                  <li>Tap Cancel Subscription</li>
                </ol>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-2">Android / Google Play</h3>
                <ol className="list-decimal pl-4 space-y-1 text-sm text-foreground/80">
                  <li>Open Google Play Store</li>
                  <li>Tap your profile icon</li>
                  <li>Tap Payments & subscriptions</li>
                  <li>Tap Subscriptions</li>
                  <li>Select rynk. and tap Cancel</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Questions?</h2>
            <p className="text-foreground/80 leading-relaxed">
              If you have questions about data deletion or need assistance, please contact us at <a href="mailto:farseenmanekhan1232@gmail.com" className="text-accent hover:underline">farseenmanekhan1232@gmail.com</a> or call <a href="tel:+919686446001" className="text-accent hover:underline">+91 9686446001</a>.
            </p>
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
