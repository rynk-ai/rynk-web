"use client";

import { motion } from "motion/react";
import { PiArrowRight, PiLightning, PiSpeakerHigh, PiSpeakerSlash, PiPlay, PiPause, PiCornersOut } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function LandingHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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
        // Request Fullscreen
        if (videoRef.current.requestFullscreen) {
            await videoRef.current.requestFullscreen();
        } else if ((videoRef.current as any).webkitRequestFullscreen) { /* Safari */
            await (videoRef.current as any).webkitRequestFullscreen();
        } else if ((videoRef.current as any).msRequestFullscreen) { /* IE11 */
            await (videoRef.current as any).msRequestFullscreen();
        } else if ((videoRef.current as any).webkitEnterFullscreen) { /* iOS Video Element specific */
             (videoRef.current as any).webkitEnterFullscreen();
        }
        
        setIsMuted(false); // Auto-unmute on fullscreen

        // Attempt to lock orientation to landscape (Works on many Android devices + Chrome)
        // Note: iOS Safari handles this natively with its video player usually.
        if (screen.orientation && 'lock' in screen.orientation) {
            try {
                // @ts-ignore - lock type is valid string but TS might complain depending on lib version
                await screen.orientation.lock("landscape");
            } catch (err) {
                // Orientation lock failed (not supported or denied), we swallow this as it's an enhancement
                console.log("Orientation lock not supported or denied");
            }
        }
    } catch (err) {
        console.error("Fullscreen request failed:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/chat?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/chat");
    }
  };

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-background">
      
      {/* Background decorations - simplified */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/5 blur-[100px] -z-10 opacity-50" />
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground border border-border text-xs font-medium mb-6"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="tracking-wide uppercase text-[10px]">Research Engine</span>
            <PiArrowRight className="h-3 w-3 ml-1 opacity-50" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-7xl font-bold font-display tracking-tighter mb-6 text-foreground"
          >
            Ask once. <br />
            <span className="text-foreground/90">Get it your way.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed text-balance"
          >
             Timelines, comparisons, quizzes, courses—<br/>
             <span className="text-foreground">pick the format that fits your brain.</span>
          </motion.p>
          
          {/* Hero CTA */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.3 }}
             className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mx-auto mb-10"
          >
            <form onSubmit={handleSearch} className="relative w-full flex items-center">
                <Input 
                    placeholder="Ask anything..." 
                    className="h-12 rounded-full pl-6 pr-12 bg-secondary/50 border-border/50 focus:bg-background transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <Button 
                    type="submit"
                    size="icon"
                    className="absolute right-1 top-1 bottom-1 h-10 w-10 rounded-full"
                >
                    <PiArrowRight className="h-4 w-4" />
                    <span className="sr-only">Search</span>
                </Button>
            </form>
          </motion.div>
        
        </div>

        {/* Hero Visual Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.5, type: "spring", stiffness: 50 }}
          className="mt-12 relative mx-auto max-w-5xl"
        >
             {/* Mockup Content Placement - Video */}
            <div className="relative rounded-xl bg-background overflow-hidden shadow-2xl border border-border/50 group">
                <div 
                    className="aspect-[16/9] w-full bg-muted relative"
                    onClick={togglePlay} // Allow clicking video to toggle play on mobile
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
                        Your browser does not support the video tag.
                    </video>

                    {/* Mobile Controls Overlay */}
                    <div className="absolute inset-0 z-20 md:hidden flex items-end justify-between p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                        {/* Left: Mute Toggle */}
                         <button
                            onClick={toggleMute}
                             className="pointer-events-auto w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center border border-white/20 active:scale-95 transition-transform"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <PiSpeakerSlash className="h-5 w-5" /> : <PiSpeakerHigh className="h-5 w-5" />}
                        </button>

                         {/* Right: Fullscreen */}
                         <button
                            onClick={toggleFullscreen}
                            className="pointer-events-auto px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-medium border border-white/20 active:scale-95 transition-transform flex items-center gap-2"
                        >
                            <PiCornersOut className="h-4 w-4" />
                         </button>
                    </div>

                    {/* Desktop Controls */}
                    <button
                        onClick={toggleMute}
                        className={`hidden md:flex absolute z-20 rounded-full bg-black/80 text-white transition-all duration-500 ease-in-out items-center justify-center border border-white/10 md:opacity-0 md:group-hover:opacity-100 ${
                            isMuted 
                                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20" 
                                : "bottom-6 right-6 w-10 h-10"
                        }`}
                        aria-label={isMuted ? "Unmute video" : "Mute video"}
                    >
                        {isMuted ? (
                            <PiSpeakerSlash className="h-8 w-8" />
                        ) : (
                            <PiSpeakerHigh className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
      </div>
    </section>
  );
}
