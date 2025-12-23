"use client";

import { PiMedal, PiLock, PiCheckCircle } from "react-icons/pi";
import { cn } from "@/lib/utils";
import type { CourseBadge } from "@/lib/services/domain-types";

/**
 * BadgesPanel - Display achievement badges earned and locked
 */

// Predefined badge definitions
export const BADGE_DEFINITIONS: Omit<CourseBadge, 'earnedAt'>[] = [
  {
    id: 'first_section',
    name: 'First Steps',
    description: 'Complete your first section',
    icon: '🎯',
    tier: 'bronze'
  },
  {
    id: 'first_chapter',
    name: 'Chapter Champion',
    description: 'Complete your first chapter',
    icon: '📖',
    tier: 'bronze'
  },
  {
    id: 'first_assessment',
    name: 'Quiz Master',
    description: 'Complete your first assessment',
    icon: '✅',
    tier: 'bronze'
  },
  {
    id: 'streak_3',
    name: 'Consistent Learner',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    tier: 'bronze'
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    tier: 'silver'
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    tier: 'gold'
  },
  {
    id: 'xp_100',
    name: 'Centurion',
    description: 'Earn 100 XP',
    icon: '💯',
    tier: 'bronze'
  },
  {
    id: 'xp_500',
    name: 'Knowledge Seeker',
    description: 'Earn 500 XP',
    icon: '🌟',
    tier: 'silver'
  },
  {
    id: 'xp_1000',
    name: 'Scholar',
    description: 'Earn 1000 XP',
    icon: '🎓',
    tier: 'gold'
  },
  {
    id: 'first_course',
    name: 'Graduate',
    description: 'Complete your first course',
    icon: '🎉',
    tier: 'gold'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 5 sections in one day',
    icon: '⚡',
    tier: 'silver'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study after midnight',
    icon: '🦉',
    tier: 'bronze'
  }
];

interface BadgesPanelProps {
  earnedBadges: CourseBadge[];
  className?: string;
  compact?: boolean;
}

const tierStyles = {
  bronze: 'from-amber-700 to-amber-500 border-amber-600',
  silver: 'from-gray-400 to-gray-300 border-gray-400',
  gold: 'from-yellow-400 to-yellow-300 border-yellow-500',
  platinum: 'from-cyan-300 to-cyan-100 border-cyan-400'
};

const tierBgStyles = {
  bronze: 'bg-amber-500/10',
  silver: 'bg-gray-400/10',
  gold: 'bg-yellow-400/10',
  platinum: 'bg-cyan-300/10'
};

export function BadgesPanel({ earnedBadges, className, compact = false }: BadgesPanelProps) {
  const earnedIds = new Set(earnedBadges.map(b => b.id));
  
  if (compact) {
    // Just show count and recent badges
    const recentBadges = earnedBadges.slice(-3);
    
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <PiMedal className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium">{earnedBadges.length} badges</span>
        <div className="flex -space-x-2">
          {recentBadges.map(badge => (
            <div 
              key={badge.id}
              className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-sm border-2 border-background"
              title={badge.name}
            >
              {badge.icon}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <PiMedal className="h-5 w-5 text-yellow-500" />
          Achievements
        </h3>
        <span className="text-sm text-muted-foreground">
          {earnedBadges.length} / {BADGE_DEFINITIONS.length} earned
        </span>
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {BADGE_DEFINITIONS.map(badge => {
          const isEarned = earnedIds.has(badge.id);
          const earnedBadge = earnedBadges.find(b => b.id === badge.id);
          
          return (
            <div
              key={badge.id}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all",
                isEarned 
                  ? cn("border-transparent bg-gradient-to-br", tierStyles[badge.tier])
                  : "border-border/40 bg-secondary/30 opacity-50"
              )}
            >
              {/* Badge icon */}
              <div className={cn(
                "text-3xl mb-2",
                !isEarned && "grayscale"
              )}>
                {badge.icon}
              </div>
              
              {/* Badge name */}
              <div className={cn(
                "text-xs font-medium",
                isEarned ? "text-white" : "text-muted-foreground"
              )}>
                {badge.name}
              </div>
              
              {/* Lock overlay for unearned */}
              {!isEarned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <PiLock className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
              
              {/* Earned check */}
              {isEarned && (
                <div className="absolute top-1 right-1">
                  <PiCheckCircle className="h-4 w-4 text-white/80" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Function to check and award badges based on progress
export function checkBadgeProgress(
  xp: number,
  currentStreak: number,
  completedSections: number,
  completedChapters: number,
  completedCourses: number,
  completedAssessments: number
): string[] {
  const newBadges: string[] = [];
  
  // Section badges
  if (completedSections >= 1) newBadges.push('first_section');
  
  // Chapter badges
  if (completedChapters >= 1) newBadges.push('first_chapter');
  
  // Assessment badges
  if (completedAssessments >= 1) newBadges.push('first_assessment');
  
  // Streak badges
  if (currentStreak >= 3) newBadges.push('streak_3');
  if (currentStreak >= 7) newBadges.push('streak_7');
  if (currentStreak >= 30) newBadges.push('streak_30');
  
  // XP badges
  if (xp >= 100) newBadges.push('xp_100');
  if (xp >= 500) newBadges.push('xp_500');
  if (xp >= 1000) newBadges.push('xp_1000');
  
  // Course completion
  if (completedCourses >= 1) newBadges.push('first_course');
  
  return newBadges;
}
