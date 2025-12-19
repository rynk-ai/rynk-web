import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-20 bg-background border-t border-border/40">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-20">
          <div className="flex-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="font-bold text-lg tracking-tight">rynk.</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              The AI research platform built for deep thinkers.
            </p>
          </div>
          
          <div className="flex gap-8 text-sm text-muted-foreground">
             <Link href="https://discord.gg/dq7U4Ydx" target="_blank" className="hover:text-foreground transition-colors">Discord</Link>
             <Link href="https://twitter.com/rynkdotio" target="_blank" className="hover:text-foreground transition-colors">Twitter</Link>
          </div>
        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 rynk. All rights reserved.
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-500/10 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
