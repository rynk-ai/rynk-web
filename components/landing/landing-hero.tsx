"use client";

import { motion } from "motion/react";
import { PiArrowRight, PiLightning, PiSpeakerHigh, PiSpeakerSlash, PiPlay, PiPause } from "react-icons/pi";
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-sm text-muted-foreground mb-8 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-medium text-xs uppercase tracking-wide">Research</span>
            <PiArrowRight className="h-3 w-3 ml-1" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
          >
            Choose how your <br />
            <span className="text-foreground">AI responds.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed font-light text-balance"
          >
             The perfect interface for your <br/>
             <span className="text-foreground/80">research, studies, and exploration.</span>
          </motion.p>
        
        </div>

        {/* Hero Visual Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
          className="mt-20 relative mx-auto max-w-6xl perspective-1000"
        >
             {/* Mockup Content Placement - Video */}
            {/* Mockup Content Placement - Video */}
            <div className=" relative rounded-xl bg-background/50 backdrop-blur-xl overflow-hidden shadow-sm border-4  border-black/50 group">
                <div className="aspect-[16/9] w-full bg-black/5 dark:bg-black/20 relative">
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

                    {/* Controls */}
                    
                    {/* Mobile Play/Pause (Bottom Right) */}
                    <div className="absolute bottom-4 right-4 z-20 md:hidden">
                        <button
                            onClick={togglePlay}
                            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                            aria-label={isPlaying ? "Pause video" : "Play video"}
                        >
                            {isPlaying ? <PiPause className="h-4 w-4" /> : <PiPlay className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Mute/Unmute (Animated Position) */}
                    <button
                        onClick={toggleMute}
                        className={`absolute z-20 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-500 ease-in-out flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 ${
                            isMuted 
                                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black/60" 
                                : "top-4 left-1/2 -translate-x-1/2 w-10 h-10"
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
