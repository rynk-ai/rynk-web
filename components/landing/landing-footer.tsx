import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Brand */}
          <Link href="/" className="inline-block">
            <span className="font-display font-bold text-xl tracking-normal">rynk.</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="https://twitter.com/rynkdotio" target="_blank" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link href="https://discord.gg/dq7U4Ydx" target="_blank" className="hover:text-foreground transition-colors">Discord</Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
