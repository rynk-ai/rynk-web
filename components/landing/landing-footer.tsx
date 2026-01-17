import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-12 bg-secondary/30 border-t border-border">
      <div className="container px-4 md:px-6 mx-auto flex flex-col items-center gap-6">
          <Link href="/" className="inline-block">
            <span className="font-bold text-xl tracking-tight">rynk.</span>
          </Link>

          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Rynk AI. All rights reserved.
          </p>

          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="https://twitter.com/rynkdotio" target="_blank" className="hover:text-foreground transition-colors">Twitter</Link>
          </div>
      </div>
    </footer>
  );
}
