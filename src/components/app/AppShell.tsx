import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { BarChart3, Megaphone, Link2, Wand2, ShoppingBag, Plug, Settings, LogOut, Menu, Moon, Sun } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { useWorkspace } from "@/lib/workspace";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/campaigns", label: "Campanhas", icon: Megaphone },
  { to: "/utm", label: "Gerador de UTMs", icon: Wand2 },
  { to: "/conversions", label: "Conversões", icon: ShoppingBag },
  { to: "/links", label: "Rastreamento", icon: Link2 },
  { to: "/integrations", label: "Integrações", icon: Plug },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = path.startsWith(to);
        return (
          <Link key={to} to={to} onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"}`}>
            <Icon className={`size-4 ${active ? "text-sidebar-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { data: ws } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <Logo className="px-2 pt-1 [&_span]:text-sidebar-foreground" />
      <div className="rounded-lg border border-sidebar-border px-3 py-2">
        <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">Workspace</p>
        <p className="truncate text-sm font-medium">{ws?.name ?? "…"}</p>
      </div>
      <NavList onNavigate={onNavigate} />
      <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent">
        <LogOut className="size-4" /> Terminar sessão
      </button>
    </div>
  );
}

export function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SidebarBody />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu"><Menu className="size-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-0 p-0">
                <SheetTitle className="sr-only">Navegação</SheetTitle>
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Logo />
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">Moeda: Kwanza (AOA)</div>
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
