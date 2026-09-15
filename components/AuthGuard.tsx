"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function check() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    check();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

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
