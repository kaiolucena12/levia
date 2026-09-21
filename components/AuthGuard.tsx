"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = pathname === "/login";

  const [checking, setChecking] = useState(!isPublicPage);

  useEffect(() => {
    if (isPublicPage) {
      setChecking(false);
      return;
    }

    let active = true;

    async function checkSession() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          console.error(
            "Erro ao verificar sessão:",
            error
          );

          setChecking(false);
          router.replace("/login");
          return;
        }

        if (!data.session) {
          setChecking(false);
          router.replace("/login");
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error(
          "Erro inesperado ao verificar sessão:",
          error
        );

        if (!active) return;

        setChecking(false);
        router.replace("/login");
      }
    }

    checkSession();

    const {
      data: subscription,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        if (!session) {
          router.replace("/login");
        }
      }
    );

    return () => {
      active = false;

      subscription.subscription.unsubscribe();
    };
  }, [isPublicPage, router]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="screen-center">
        <div className="loader" />
        <p>Carregando o Levia...</p>
      </div>
    );
  }

  return <>{children}</>;
}