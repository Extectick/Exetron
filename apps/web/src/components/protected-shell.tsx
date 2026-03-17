"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminNavigation } from "../lib/navigation";
import { useAuth } from "./auth-provider";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, status, logout } = useAuth();

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return <div className="loading-screen">Loading Exetron control plane...</div>;
  }

  if (!session?.me) {
    return null;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="brand-kicker">Exetron</span>
          <h1>Control Plane</h1>
          <p>Phase 1 platform core workspace</p>
        </div>
        <nav className="nav-list">
          {adminNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="ghost-button" onClick={() => void logout()}>
          Sign out
        </button>
      </aside>
      <main className="content-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">Authenticated as</span>
            <strong>
              {session.me.user.firstName} {session.me.user.lastName}
            </strong>
          </div>
          <div className="topbar-meta">
            <span>{session.me.user.email}</span>
            <span>
              {session.me.claims.scope === "platform_admin"
                ? "Platform Admin"
                : session.me.claims.tenantId ?? "Tenant Member"}
            </span>
          </div>
        </header>
        <section className="content-grid">{children}</section>
      </main>
    </div>
  );
}
