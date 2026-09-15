"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LiviaAssistant from "@/components/LiviaAssistant";
import {
  Home,
  Utensils,
  TrendingDown,
  Sparkles,
  LogOut,
  HeartPulse,
} from "lucide-react";

const links = [
  { href: "/", label: "Início", icon: Home },
  { href: "/diario", label: "Diário", icon: Utensils },
  { href: "/evolucao", label: "Evolução", icon: TrendingDown },
  { href: "/ia", label: "Lívia", icon: Sparkles },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "nav-link active" : "nav-link"}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>

        <button className="nav-link logout-button" onClick={logout}>
          <LogOut size={19} />
          Sair
        </button>
      </aside>

      <main className="main-content">{children}</main>

      <LiviaAssistant />

      <nav className="mobile-nav">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "mobile-nav-link active" : "mobile-nav-link"}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
