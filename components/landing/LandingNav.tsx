import Link from "next/link";

const NAV_LINKS = [
  { label: "關於我們", href: "#about" },
  { label: "大量訂製", href: "#bulk" },
  { label: "幫助中心", href: "#help" },
] as const;

export function LandingNav() {
  return (
    <header className="shrink-0 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[72rem] items-center justify-between px-5 py-4 lg:px-6 lg:py-5">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-gray-900 lg:text-3xl">
          TIIIGO
        </Link>
        <nav className="flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-base text-gray-500 transition-colors hover:text-gray-900 lg:text-lg"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
