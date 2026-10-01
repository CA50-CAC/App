"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Staff navigation. Highlights the current section and marks it for screen readers. */
export function AdminNav({ links, label }: { links: Array<{ href: string; label: string; badge?: number }>; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 pb-2">
        {links.map((l) => {
          const active =
            l.href === "/admin"
              ? pathname === "/admin" || (pathname.startsWith("/admin/items/") && !pathname.endsWith("/new"))
              : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.95rem] font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {l.label}
                {l.badge ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">{l.badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
