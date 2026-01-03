import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-20 bg-background border-t border-border">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-20">
          
          <div className="md:col-span-6 flex flex-col items-start">
            <Link href="/" className="mb-6 flex items-center">
              <span className="font-bold text-2xl tracking-tighter">rynk.</span>
            </Link>
            <p className="text-lg font-medium leading-relaxed max-w-sm">
              The AI research platform <br/>for deep thinkers.
            </p>
          </div>
          
          <div className="md:col-span-2">
               <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">Product</h4>
               <ul className="space-y-4 text-sm font-medium">
                   <li><Link href="#features" className="hover:text-muted-foreground transition-colors">Features</Link></li>
                   <li><Link href="#pricing" className="hover:text-muted-foreground transition-colors">Pricing</Link></li>
                   <li><Link href="/login" className="hover:text-muted-foreground transition-colors">Login</Link></li>
               </ul>
          </div>

          <div className="md:col-span-2">
               <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">Legal</h4>
               <ul className="space-y-4 text-sm font-medium">
                   <li><Link href="/privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link></li>
                   <li><Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms</Link></li>
               </ul>
          </div>
          
          <div className="md:col-span-2">
               <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">Social</h4>
               <ul className="space-y-4 text-sm font-medium">
                   <li><Link href="https://twitter.com/rynkdotio" target="_blank" className="hover:text-muted-foreground transition-colors">Twitter</Link></li>
                   <li><Link href="https://discord.gg/dq7U4Ydx" target="_blank" className="hover:text-muted-foreground transition-colors">Discord</Link></li>
               </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} rynk. All rights reserved.
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-green-600">
            <span className="w-1.5 h-1.5 rounded-none bg-green-600 animate-pulse" />
            System Operational
          </div>
        </div>
      </div>
    </footer>
  );
}
