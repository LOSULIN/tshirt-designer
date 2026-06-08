import Link from "next/link";
import type { ReactNode } from "react";

type OptionCardProps = {
  theme: "green" | "blue";
  icon: ReactNode;
  title: string;
  subtitle: string;
  features: string[];
  illustration: ReactNode;
  ctaLabel: string;
  ctaHref: string;
};

const THEME_STYLES = {
  green: {
    iconBg: "bg-emerald-500",
    check: "text-emerald-500",
    button: "bg-emerald-500 hover:bg-emerald-600",
  },
  blue: {
    iconBg: "bg-blue-500",
    check: "text-blue-500",
    button: "bg-blue-500 hover:bg-blue-600",
  },
} as const;

function CheckIcon({ className }: { className: string }) {
  return (
    <svg className={`h-3.5 w-3.5 shrink-0 ${className}`} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function OptionCard({
  theme,
  icon,
  title,
  subtitle,
  features,
  illustration,
  ctaLabel,
  ctaHref,
}: OptionCardProps) {
  const styles = THEME_STYLES[theme];

  return (
    <article className="flex min-h-[520px] w-full flex-col rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/70 transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <div className="flex h-14 shrink-0 items-start gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${styles.iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">{subtitle}</p>
        </div>
      </div>

      <ul className="mt-3 h-[10.5rem] shrink-0 space-y-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs text-gray-600">
            <CheckIcon className={styles.check} />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex h-32 shrink-0 items-center justify-center">
        {illustration}
      </div>

      <Link
        href={ctaHref}
        className={`mt-auto flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium text-white transition-colors ${styles.button}`}
      >
        {ctaLabel}
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
