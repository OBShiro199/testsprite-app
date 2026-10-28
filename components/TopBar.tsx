"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { switchWorkspace, type Context } from "@/lib/store";
import { logOutAndLeave } from "./RequireAuth";
import { Logo, pill } from "./ui";

const navItem =
  "flex h-8 items-center rounded-md px-2.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function TopBar({ ctx }: { ctx: Context }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const workspace = ctx.workspace!;
  const isOwner = ctx.role === "owner";
  const isPro = workspace.plan === "pro";

  const links = [
    { href: "/app", label: "Inbox", active: pathname === "/app" || pathname.startsWith("/app/requests") },
    { href: "/app/team", label: "Team", active: pathname.startsWith("/app/team") },
    ...(isOwner
      ? [
          { href: "/app/settings", label: "Settings", active: pathname.startsWith("/app/settings") },
          { href: "/app/billing", label: "Billing", active: pathname.startsWith("/app/billing") },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-[92] border-b border-hairline bg-surface">
      <div className="mx-auto flex min-h-12 max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:py-0">
        <Link href="/app" aria-label="Signalboard inbox" className="rounded-md">
          <Logo />
        </Link>
        <span className="text-ghost" aria-hidden="true">
          /
        </span>
        {ctx.memberships.length > 1 ? (
          <label className="flex items-center">
            <span className="sr-only">Workspace</span>
            <select
              data-testid="workspace-switcher"
              value={workspace.id}
              onChange={(e) => {
                switchWorkspace(e.target.value);
                router.push("/app");
              }}
              className="h-8 rounded-md border border-btn-edge bg-surface px-2 font-medium text-ink"
            >
              {ctx.memberships.map((m) => (
                <option key={m.workspace.id} value={m.workspace.id}>
                  {m.workspace.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span data-testid="workspace-name" className="font-medium text-ink">
            {workspace.name}
          </span>
        )}
        <span
          data-testid="plan-badge"
          className={`${pill} ${isPro ? "border-accent-edge bg-accent-soft text-[#3559b0]" : "border-hairline bg-hover text-muted"}`}
        >
          {isPro ? "Pro" : "Free"}
        </span>

        <button
          type="button"
          className="ml-auto flex h-8 items-center rounded-md border border-btn-edge px-2.5 font-medium text-ink md:hidden"
          aria-expanded={menuOpen}
          aria-controls="app-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          Menu
        </button>

        <nav
          id="app-nav"
          aria-label="App"
          className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-0.5 pb-2 md:ml-auto md:flex md:h-12 md:w-auto md:flex-row md:items-center md:pb-0`}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={`${navItem} ${l.active ? "bg-accent-soft font-medium text-ink" : "text-muted hover:bg-hover hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={`/b/${workspace.slug}`}
            target="_blank"
            rel="noopener"
            className={`${navItem} text-muted hover:bg-hover hover:text-ink`}
          >
            View public board
          </a>
          <button
            type="button"
            onClick={logOutAndLeave}
            className={`${navItem} text-left text-muted hover:bg-hover hover:text-ink`}
          >
            Log out
          </button>
        </nav>
      </div>
      <p className="sr-only">Logged in as {ctx.user.email}</p>
    </header>
  );
}
