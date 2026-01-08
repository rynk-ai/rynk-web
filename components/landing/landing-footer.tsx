import Link from "next/link";
import { PiArrowUpRight } from "react-icons/pi";

export function LandingFooter() {
  return (
    <footer className="bg-background border-t border-border text-foreground">
      <div className="container px-4 md:px-6 mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-4 border-l border-foreground/10 bg-foreground/10 gap-px">
           
           {/* Brand Column */}
           <div className="col-span-1 md:col-span-1 bg-background p-8 md:p-12 min-h-[300px] flex flex-col justify-between">
              <Link href="/" className="inline-block">
                <span className="font-display font-bold text-2xl tracking-tighter">rynk.</span>
              </Link>
              <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                      Intelligence, Adapted.
                  </p>
              </div>
           </div>

           {/* Sitemap Columns */}
           <div className="col-span-1 md:col-span-1 bg-background p-8 md:p-12 min-h-[300px]">
               <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8">Platform</h4>
               <ul className="space-y-4">
                   <li><Link href="#features" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Features</Link></li>
                   <li><Link href="#pricing" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Pricing</Link></li>
                   <li><Link href="/login" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Login</Link></li>
                   <li><Link href="/chat" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Dashboard</Link></li>
               </ul>
           </div>

           <div className="col-span-1 md:col-span-1 bg-background p-8 md:p-12 min-h-[300px]">
               <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8">Resources</h4>
               <ul className="space-y-4">
                   <li><Link href="/blog" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Blog</Link></li>
                   <li><Link href="/changelog" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Changelog</Link></li>
                   <li><Link href="/docs" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Documentation</Link></li>
                   <li><Link href="/status" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors">Status</Link></li>
               </ul>
           </div>

            <div className="col-span-1 md:col-span-1 bg-background p-8 md:p-12 min-h-[300px]">
               <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8">Socials</h4>
               <ul className="space-y-4">
                   <li>
                       <Link href="https://twitter.com/rynkdotio" target="_blank" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors flex items-center group">
                           Twitter <PiArrowUpRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </Link>
                   </li>
                   <li>
                       <Link href="https://discord.gg/dq7U4Ydx" target="_blank" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors flex items-center group">
                           Discord <PiArrowUpRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </Link>
                   </li>
                   <li>
                       <Link href="https://github.com/rynk-ai" target="_blank" className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors flex items-center group">
                           GitHub <PiArrowUpRight className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </Link>
                   </li>
               </ul>
           </div>

        </div>

        <div className="border-t border-border py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
             <div className="flex gap-8">
                 <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                 <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
             </div>
        </div>

      </div>
    </footer>
  );
}
