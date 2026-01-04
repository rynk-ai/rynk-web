import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-16 bg-background border-t border-border">
      <div className="container px-4 mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          
          <div>
            <Link href="/" className="mb-4 inline-block">
              <span className="font-bold text-xl tracking-tighter">rynk.</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs">
              AI research for deep thinkers.
            </p>
          </div>
          
          <div className="flex gap-12 text-sm">
            <div className="space-y-3">
               <Link href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">Features</Link>
               <Link href="#pricing" className="block text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <div className="space-y-3">
               <Link href="/privacy" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
               <Link href="/terms" className="block text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            </div>
            <div className="space-y-3">
               <Link href="https://twitter.com/rynkdotio" target="_blank" className="block text-muted-foreground hover:text-foreground transition-colors">Twitter</Link>
               <Link href="https://discord.gg/dq7U4Ydx" target="_blank" className="block text-muted-foreground hover:text-foreground transition-colors">Discord</Link>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-border text-xs text-muted-foreground">
          © {new Date().getFullYear()} rynk. All rights reserved.
        </div>

      </div>
    </footer>
  );
}
