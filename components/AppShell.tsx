"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LiviaAssistant from "@/components/LiviaAssistant";

import {
  Home,
  Utensils,
  TrendingDown,
  LogOut,
  UserRound,
  HeartPulse,
  Dumbbell,
} from "lucide-react";

const links = [
  {
    href: "/",
    label: "Início",
    icon: Home,
  },
  {
    href: "/diario",
    label: "Diário",
    icon: Utensils,
  },
  {
    href: "/evolucao",
    label: "Evolução",
    icon: TrendingDown,
  },
  {
    href: "/treino",
    label: "Treino",
    icon: Dumbbell,
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: UserRound,
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  /*
   * LOGIN É PÁGINA PÚBLICA.
   *
   * Não mostra:
   * - sidebar
   * - menu mobile
   * - Lívia
   */
  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <HeartPulse size={20} />
          </div>

          <div>
            <strong>Levia</strong>
            <span>evolução com leveza</span>
          </div>
        </div>

        <nav>
          {links.map(
            ({
              href,
              label,
              icon: Icon,
            }) => (
              <Link
                key={href}
                href={href}
                className={
                  pathname === href
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                <Icon size={19} />
                {label}
              </Link>
            )
          )}
        </nav>

        <button
          className="nav-link logout-button"
          onClick={logout}
        >
          <LogOut size={19} />
          Sair
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <LiviaAssistant />

      <nav className="mobile-nav">
        {links.map(
          ({
            href,
            label,
            icon: Icon,
          }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href
                  ? "mobile-nav-link active"
                  : "mobile-nav-link"
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        )}
      </nav>
    </div>
  );
}