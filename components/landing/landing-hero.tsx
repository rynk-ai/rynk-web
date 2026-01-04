"use client";

import { useRef, useState } from "react";
import { PiArrowRight, PiSpeakerHigh, PiSpeakerSlash, PiCornersOut } from "react-icons/pi";
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

    tl.from(".hero-line", {
      y: 80,
      opacity: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: "power4.out",
      delay: 0.1
    })
    .from(".hero-sub", {
      y: 20,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out"
    }, "-=0.5")
    .from(".hero-search", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out"
    }, "-=0.5");

    gsap.from(".hero-video-container", {
      x: 60,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
      delay: 0.4
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative pt-32 pb-24 md:pt-48 md:pb-40 overflow-hidden bg-background min-h-screen flex flex-col justify-center">
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          
          {/* Left Content */}
          <div className="md:col-span-6 flex flex-col items-start">
            
            {/* Headline */}
            <div className="mb-8">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter text-foreground">
                    <div className="overflow-hidden"><span className="hero-line block">Ask once.</span></div>
                    <div className="overflow-hidden"><span className="hero-line block text-muted-foreground">Get it</span></div>
                    <div className="overflow-hidden"><span className="hero-line block">your way.</span></div>
                </h1>
            </div>

            {/* Description */}
            <p className="hero-sub text-lg md:text-xl text-muted-foreground mb-10 max-w-md leading-relaxed">
               The AI research platform that gives you <span className="text-foreground">structured answers</span>—not walls of text.
            </p>
            
            {/* Search Input */}
            <div className="hero-search w-full max-w-sm">
                <form onSubmit={handleSearch} className="relative flex items-center">
                    <Input 
                        placeholder="Ask anything..." 
                        className="h-14 rounded-none pl-5 pr-14 bg-transparent border-2 border-border focus:border-foreground transition-all text-base"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button 
                        type="submit"
                        size="icon"
                        className="absolute right-1.5 top-1.5 bottom-1.5 h-11 w-11 rounded-none bg-foreground text-background hover:bg-foreground/80"
                    >
                        <PiArrowRight className="h-5 w-5" />
                        <span className="sr-only">Search</span>
                    </Button>
                </form>
            </div>
          </div>

          {/* Right Content - Video */}
          <div className="md:col-span-6 relative hero-video-container">
             <div className="relative aspect-video w-full bg-secondary">
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
                        className="w-full h-full object-cover"
                    >
                        <source src="https://files.rynk.io/demo%20rynk.webm" type="video/webm" />
                    </video>

                    {/* Controls */}
                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <button onClick={toggleMute} className="w-9 h-9 bg-white/90 text-black flex items-center justify-center hover:bg-white transition-colors">
                             {isMuted ? <PiSpeakerSlash className="w-4 h-4"/> : <PiSpeakerHigh className="w-4 h-4"/>}
                         </button>
                         <button onClick={toggleFullscreen} className="w-9 h-9 bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors">
                            <PiCornersOut className="w-4 h-4"/>
                         </button>
                    </div>
                </div>
             </div>
          </div>
        
        </div>
      </div>
    </section>
  );
}
