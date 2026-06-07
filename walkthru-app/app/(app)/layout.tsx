"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, LogOut } from "lucide-react";
import { useAuth, initials } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, needsGithub, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(needsGithub ? "/connect-github" : "/signin");
    }
  }, [loading, user, needsGithub, router]);

  if (loading || !user) return <FullScreenLoader />;

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  const displayName = user.githubUsername || user.name;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo href="/dashboard" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                {user.githubAvatar && (
                  <AvatarImage src={user.githubAvatar} alt={displayName} />
                )}
                <AvatarFallback className="bg-vermillion text-xs font-medium text-hero-ink">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {displayName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                <span className="text-sm font-medium">{displayName}</span>
                {user.githubUsername && (
                  <span className="text-xs font-normal text-muted-foreground">
                    @{user.githubUsername}
                  </span>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {children}
    </div>
  );
}
