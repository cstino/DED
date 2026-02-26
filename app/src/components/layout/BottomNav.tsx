"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
    href: string;
    icon: string;
    label: string;
    badge?: number;
}

const navItems: NavItem[] = [
    { href: "/character", icon: "📋", label: "Scheda" },
    { href: "/spells", icon: "✨", label: "Incantesimi" },
    { href: "/party", icon: "👥", label: "Party" },
    { href: "/campaign", icon: "🗺️", label: "Campagna" },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? "active" : ""}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                        {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </Link>
                );
            })}
        </nav>
    );
}
