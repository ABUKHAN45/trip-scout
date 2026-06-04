import * as React from "react";
import { Link, useLocation } from "wouter";
import { Compass, Map, PlaneTakeoff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Scout Flights", href: "/", icon: PlaneTakeoff },
    { name: "My Trips", href: "/trips", icon: Map },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <nav className="w-full md:w-64 border-r bg-card flex flex-col p-4 md:h-screen sticky top-0 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2 mt-2">
          <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-display font-bold tracking-tight text-xl">Trip Scout</span>
        </div>

        <div className="space-y-1 flex-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
