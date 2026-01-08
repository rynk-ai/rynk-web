"use client";

import { useRef, useState } from "react";
import { PiArrowRight, PiSpeakerHigh, PiSpeakerSlash, PiCornersOut, PiPlay } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

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

    tl.from(".hero-word", {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: "power4.out",
      delay: 0.1
    })
    .from(".hero-desc", {
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
    }, "-=0.6")
     .from(".hero-video-border", {
      scaleX: 0,
      duration: 1,
      ease: "expo.out"
    }, "-=0.8")
    .from(".hero-video-content", {
      opacity: 0,
      y: 20,
      duration: 1,
      ease: "power3.out"
    }, "-=0.6");

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative pt-32 pb-20 md:pt-40 md:pb-32 bg-background data-[theme=dark]:bg-black min-h-[90vh] flex flex-col justify-center border-b border-border">
      
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
          
          {/* Left Content - Typography Dominant */}
          <div className="lg:col-span-7 flex flex-col items-start z-20">
            
            {/* Headline - Massive Swiss Style */}
            <div className="mb-10 relative">
                <h1 className="text-[12vw] lg:text-[7rem] leading-[0.85] font-bold tracking-tighter text-foreground uppercase font-display">
                    <div className="overflow-hidden"><span className="hero-word block">Intelligence,</span></div>
                    <div className="overflow-hidden"><span className="hero-word block text-muted-foreground">Adapted.</span></div>
                </h1>
            </div>

            {/* Description - Technical & Precise */}
            <p className="hero-desc text-lg md:text-xl text-muted-foreground mb-12 max-w-xl leading-relaxed font-light tracking-wide">
               From deep reasoning to interactive surfaces. Rynk transforms raw AI intelligence into the exact format you need—whether that's a <span className="text-foreground font-medium">course</span>, a <span className="text-foreground font-medium">report</span>, or a <span className="text-foreground font-medium">dashboard</span>.
            </p>
            
            {/* Search Input - Architectural */}
            <div className="hero-search w-full max-w-md">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-border to-border opacity-50 blur-[1px] group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative flex items-center bg-background">
                        <Input 
                            placeholder="Type to start formatting..." 
                            className="h-16 rounded-none pl-6 pr-16 bg-background border-2 border-foreground/10 focus:border-foreground transition-all text-lg tracking-tight placeholder:text-muted-foreground/50"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <Button 
                            type="submit"
                            size="icon"
                            className="absolute right-2 top-2 bottom-2 h-12 w-12 rounded-none bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95"
                        >
                            <PiArrowRight className="h-5 w-5" />
                            <span className="sr-only">Start</span>
                        </Button>
                    </div>
                </form>
                <div className="mt-4 flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground font-medium opacity-60">
                    <span>Research</span>
                    <span className="w-1 h-1 bg-current rounded-full" />
                    <span>Analysis</span>
                    <span className="w-1 h-1 bg-current rounded-full" />
                    <span>Learning</span>
                </div>
            </div>
          </div>

          {/* Right Content - Video Surface */}
          <div className="lg:col-span-5 relative mt-8 lg:mt-0">
             <div className="hero-video-border absolute -inset-4 border border-border/50 border-dashed z-0 hidden lg:block" />
             
             <div className="relative aspect-[4/5] w-full bg-secondary hero-video-content z-10 shadow-2xl shadow-black/5">
                <div 
                    className="absolute inset-0 bg-black overflow-hidden group cursor-pointer"
                    onClick={togglePlay}
                >
                    <video 
                        ref={videoRef}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                    >
                        <source src="https://files.rynk.io/demo%20rynk.webm" type="video/webm" />
                    </video>

                    {/* Play Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all duration-300 ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md flex items-center justify-center rounded-full border border-white/20">
                            <PiPlay className="w-8 h-8 text-white fill-current translate-x-1" />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-6 right-6 flex gap-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                         <button onClick={toggleMute} className="w-10 h-10 bg-background/90 text-foreground flex items-center justify-center hover:bg-background transition-colors border border-border">
                             {isMuted ? <PiSpeakerSlash className="w-4 h-4"/> : <PiSpeakerHigh className="w-4 h-4"/>}
                         </button>
                         <button onClick={toggleFullscreen} className="w-10 h-10 bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors">
                            <PiCornersOut className="w-4 h-4"/>
                         </button>
                    </div>
                </div>
             </div>
             
             {/* Decorative Grid Lines */}
             <div className="absolute -right-12 top-1/2 w-24 h-px bg-border hidden lg:block" />
             <div className="absolute -bottom-12 left-1/2 w-px h-24 bg-border hidden lg:block" />

          </div>
        
        </div>
      </div>
    </section>
  );
}
