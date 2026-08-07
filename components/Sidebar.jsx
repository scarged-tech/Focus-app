"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ListChecks,
  CalendarDays,
  Repeat,
  Wallet,
  Target,
  Dumbbell,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "../lib/supabaseClient";

const navItems = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/tasks", icon: ListChecks, label: "Tareas" },
  { href: "/planner", icon: CalendarDays, label: "Planner" },
  { href: "/habits", icon: Repeat, label: "Hábitos" },
  { href: "/finance", icon: Wallet, label: "Finanzas" },
  { href: "/goals", icon: Target, label: "Metas" },
  { href: "/training", icon: Dumbbell, label: "Entreno" },
  { href: "/studies", icon: BookOpen, label: "Estudios" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden sm:flex flex-col w-16 lg:w-56 border-r border-onyx py-6 px-2 lg:px-4 shrink-0 justify-between h-screen sticky top-0 overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-7 h-7 rounded-md bg-gradient-brand flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <span className="hidden lg:block font-semibold tracking-tight text-gradient">
            Focus
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-surface2 text-smoke"
                    : "text-dimgray hover:text-silver hover:bg-surface"
                }`}
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-1">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-surface2 text-smoke"
              : "text-dimgray hover:text-silver hover:bg-surface"
          }`}
        >
          <Settings size={18} strokeWidth={1.75} />
          <span className="hidden lg:block">Ajustes</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-dimgray hover:text-silver hover:bg-surface"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span className="hidden lg:block">Salir</span>
        </button>
      </div>
    </aside>
  );
}

// Barra de navegación inferior para pantallas pequeñas (iOS/Android).
// La sidebar de arriba se oculta con `hidden sm:flex`, así que en
// móvil esta es la única navegación visible. Es horizontalmente
// scrolleable para no perder ningún módulo en pantallas angostas.
export function MobileNav() {
  const pathname = usePathname();
  const allItems = [...navItems, { href: "/settings", icon: Settings, label: "Ajustes" }];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 bg-base/95 backdrop-blur border-t border-onyx flex overflow-x-auto z-50"
      style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}
    >
      {allItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3.5 pt-2 text-[10px] shrink-0 ${
              active ? "text-accent" : "text-dimgray"
            }`}
          >
            <Icon size={19} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
