"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Settings,
  Coins,
  Moon,
  Sun,
  CreditCard,
  Sparkles,
  Zap,
  Crown,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getUserCredits } from "@/app/actions";
import { useTheme } from "next-themes";
import { useFont } from "@/components/providers/font-provider";
import { useRouter } from "next/navigation";

const tierIcons = {
  free: Sparkles,
  standard: Zap,
  standard_plus: Crown,
};

const tierColors = {
  free: "text-muted-foreground",
  standard: "text-blue-500",
  standard_plus: "text-amber-500",
};

const tierNames = {
  free: "Free",
  standard: "Standard",
  standard_plus: "Standard+",
};

export function UserProfileDropdown() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const { font, setFont, options } = useFont();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      getUserCredits()
        .then(setCredits)
        .catch(() => setCredits(null));
    }
  }, [session?.user?.id]);

  if (!session?.user) return null;

  const user = session.user;
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const tier =
    // @ts-ignore - custom session fields
    (user.subscriptionTier as "free" | "standard" | "standard_plus") || "free";
  const TierIcon = tierIcons[tier];

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleManageSubscription = () => {
    router.push("/subscription");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-sidebar-accent transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.image || undefined} alt={user.name || ""} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{user.name}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  tier === "standard_plus"
                    ? "bg-amber-500/10 text-amber-500"
                    : tier === "standard"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {tierNames[tier]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {credits !== null && (
          <>
            <DropdownMenuItem disabled>
              <Coins className="mr-2 h-4 w-4" />
              <span className="flex-1">Credits</span>
              <span className="text-sm font-medium">
                {credits.toLocaleString()}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleManageSubscription}>
          <CreditCard className="mr-2 h-4 w-4" />
          <span className="flex-1">Subscription</span>
          {tier === "free" && (
            <span className="text-xs text-primary font-medium">Upgrade</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Type className="mr-2 h-4 w-4" />
            <span>Font</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {options.map((option) => (
              <DropdownMenuItem
                key={option.name}
                onClick={() => setFont(option.name)}
                className={font === option.name ? "bg-accent" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
