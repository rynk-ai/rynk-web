"use client";

import { useRef, useState } from "react";
import { PiArrowRight, PiSpeakerHigh, PiSpeakerSlash, PiCornersOut } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LandingHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef(null);

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsMuted(!isMuted);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!videoRef.current) return;
      try {
          if (videoRef.current.requestFullscreen) await videoRef.current.requestFullscreen();
          else if ((videoRef.current as any).webkitEnterFullscreen) (videoRef.current as any).webkitEnterFullscreen();
          setIsMuted(false); 
      } catch (err) { console.error(err); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/chat?q=${encodeURIComponent(query)}` : "/chat");
  };

  useGSAP(() => {
    const tl = gsap.timeline();

    // Staggered Text Reveal
    tl.from(".hero-line", {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: "power4.out",
      delay: 0.2
    })
    .from(".hero-sub", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.5")
    .from(".hero-search", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    }, "-=0.6");

    // Video Slide In
    gsap.from(".hero-video-container", {
      x: 100,
      opacity: 0,
      duration: 1.2,
      ease: "expo.out",
      delay: 0.6
    });

    // Parallax
    gsap.to(".hero-video-container", {
        y: 100,
        scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true
        }
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-background min-h-screen flex flex-col justify-center">
      
      {/* Decorative Grid Lines - Swiss Style */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border/50" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/50" />
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Content - Typography */}
          <div className="md:col-span-7 flex flex-col items-start z-20">
            
            {/* Minimal Badge */}
            <div className="hero-sub mb-8 flex items-center gap-3">
               <div className="h-px w-8 bg-foreground"></div>
               <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Research Engine v2.0</span>
            </div>

            {/* Massive Swiss Headline */}
            <div className="mb-10 relative overflow-hidden">
                <h1 className="text-7xl md:text-8xl lg:text-[7rem] font-bold leading-[0.9] tracking-tighter text-foreground">
                    <div className="overflow-hidden"><span className="hero-line block">ASK ONCE.</span></div>
                    <div className="overflow-hidden"><span className="hero-line block text-muted-foreground">GET IT</span></div>
                    <div className="overflow-hidden"><span className="hero-line block">YOUR WAY.</span></div>
                </h1>
            </div>

            {/* Description */}
            <p className="hero-sub text-lg md:text-xl text-muted-foreground mb-12 max-w-lg leading-relaxed text-balance">
               Timelines, comparisons, quizzes, courses—<br/>
               <span className="text-foreground font-medium">pick the format that fits your brain.</span>
            </p>
            
            {/* Search Input */}
            <div className="hero-search w-full max-w-md">
                <form onSubmit={handleSearch} className="relative flex items-center group">
                    <Input 
                        placeholder="Ask anything..." 
                        className="h-16 rounded-none pl-6 pr-16 bg-transparent border-2 border-foreground/10 focus:border-foreground transition-all text-lg placeholder:text-muted-foreground/50"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button 
                        type="submit"
                        size="icon"
                        className="absolute right-2 top-2 bottom-2 h-12 w-12 rounded-none bg-foreground text-background hover:bg-foreground/80 transition-transform active:scale-95"
                    >
                        <PiArrowRight className="h-5 w-5" />
                        <span className="sr-only">Search</span>
                    </Button>
                </form>
                <div className="mt-4 flex gap-4 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                    <span>Try:</span>
                    <button onClick={() => setQuery("iPhone 15 vs Pixel 9")} className="hover:text-foreground underline decoration-dotted underline-offset-4">iPhone vs Pixel</button>
                    <button onClick={() => setQuery("History of Roman Empire")} className="hover:text-foreground underline decoration-dotted underline-offset-4">Roman History</button>
                </div>
            </div>
          </div>

          {/* Right Content - Visual Mockup */}
          <div className="md:col-span-5 relative hero-video-container mt-12 md:mt-0">
             <div className="relative aspect-[4/5] w-full bg-secondary md:translate-y-12">
                {/* Sharp container, offset placement */}
                <div 
                    className="absolute inset-0 bg-black overflow-hidden group border border-border"
                    onClick={togglePlay}
                >
                    <video 
                        ref={videoRef}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        className="w-full h-full object-cover opacity-90"
                    >
                        <source src="https://files.rynk.io/demo%20rynk.webm" type="video/webm" />
                    </video>

                    {/* Minimal Controls */}
                    <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <button onClick={toggleMute} className="w-10 h-10 bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors">
                             {isMuted ? <PiSpeakerSlash className="w-5 h-5"/> : <PiSpeakerHigh className="w-5 h-5"/>}
                         </button>
                         <button onClick={toggleFullscreen} className="w-10 h-10 bg-black text-white border border-white/20 flex items-center justify-center hover:bg-neutral-900 transition-colors">
                            <PiCornersOut className="w-5 h-5"/>
                         </button>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-dots-pattern opacity-20 -z-10" />
                <div className="absolute -top-6 -left-6 w-12 h-12 border-t-2 border-l-2 border-foreground/20" />
             </div>
          </div>
        
        </div>
      </div>
    </section>
  );
}
