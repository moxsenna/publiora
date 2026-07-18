import type { PaymentMethodCode } from "@/lib/paycore/methods";
import { cn } from "@/lib/utils";

/** Compact brand marks for checkout (local SVG, no external CDN). */
export function PaymentMethodIcon({
  code,
  className,
}: {
  code: PaymentMethodCode;
  className?: string;
}) {
  const wrap = cn(
    "h-10 w-10 shrink-0 rounded-xl border border-[var(--color-publiora-border)] bg-white grid place-items-center overflow-hidden",
    className
  );

  switch (code) {
    case "NQ":
    case "GQ":
      return (
        <span className={wrap} aria-hidden>
          <QrisMark />
        </span>
      );
    case "SP":
      return (
        <span className={wrap} aria-hidden>
          <ShopeePayMark />
        </span>
      );
    case "BR":
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#00529C" text="BRI" />
        </span>
      );
    case "I1":
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#F15A22" text="BNI" />
        </span>
      );
    case "M2":
      return (
        <span className={wrap} aria-hidden>
          <MandiriMark />
        </span>
      );
    case "BT":
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#00A651" text="PRM" small />
        </span>
      );
    case "BV":
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#00A651" text="BSI" />
        </span>
      );
    case "DM":
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#FF6600" text="DNM" small />
        </span>
      );
    case "NC":
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#6B21A8" text="NEO" small />
        </span>
      );
    case "A1":
      return (
        <span className={wrap} aria-hidden>
          <AtmBersamaMark />
        </span>
      );
    case "FT":
      return (
        <span className={wrap} aria-hidden>
          <AlfamartMark />
        </span>
      );
    case "SQ":
      return (
        <span className={wrap} aria-hidden>
          <QrisMark />
        </span>
      );
    default:
      return (
        <span className={wrap} aria-hidden>
          <BankWord color="#111" text="PAY" small />
        </span>
      );
  }
}

function BankWord({
  color,
  text,
  small,
}: {
  color: string;
  text: string;
  small?: boolean;
}) {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" role="img">
      <rect width="40" height="40" fill={color} />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,Segoe UI,sans-serif"
        fontWeight="700"
        fontSize={small ? "11" : "13"}
        letterSpacing="0.02em"
      >
        {text}
      </text>
    </svg>
  );
}

function QrisMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
      <rect x="4" y="4" width="14" height="14" rx="1.5" stroke="#111" strokeWidth="2" />
      <rect x="8" y="8" width="6" height="6" fill="#111" />
      <rect x="22" y="4" width="14" height="14" rx="1.5" stroke="#111" strokeWidth="2" />
      <rect x="26" y="8" width="6" height="6" fill="#111" />
      <rect x="4" y="22" width="14" height="14" rx="1.5" stroke="#111" strokeWidth="2" />
      <rect x="8" y="26" width="6" height="6" fill="#111" />
      <rect x="22" y="22" width="4" height="4" fill="#E11D48" />
      <rect x="28" y="22" width="8" height="3" fill="#111" />
      <rect x="22" y="28" width="3" height="8" fill="#111" />
      <rect x="28" y="28" width="8" height="8" fill="#111" />
    </svg>
  );
}

function ShopeePayMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" role="img">
      <rect width="40" height="40" fill="#EE4D2D" />
      <text
        x="20"
        y="18"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,sans-serif"
        fontWeight="800"
        fontSize="9"
      >
        shopee
      </text>
      <text
        x="20"
        y="29"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,sans-serif"
        fontWeight="700"
        fontSize="10"
      >
        pay
      </text>
    </svg>
  );
}

function MandiriMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" role="img">
      <rect width="40" height="40" fill="#003D79" />
      <rect x="0" y="28" width="40" height="6" fill="#FDB913" />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,sans-serif"
        fontWeight="700"
        fontSize="8"
        letterSpacing="0.04em"
      >
        mandiri
      </text>
    </svg>
  );
}

function AtmBersamaMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" role="img">
      <rect width="40" height="40" fill="#0B3D91" />
      <circle cx="14" cy="18" r="6" fill="#E31C23" />
      <circle cx="26" cy="18" r="6" fill="#F7B500" opacity="0.95" />
      <text
        x="20"
        y="33"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,sans-serif"
        fontWeight="700"
        fontSize="7"
      >
        ATM
      </text>
    </svg>
  );
}

function AlfamartMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" role="img">
      <rect width="40" height="40" fill="#ED1C24" />
      <text
        x="20"
        y="23"
        textAnchor="middle"
        fill="#fff"
        fontFamily="system-ui,sans-serif"
        fontWeight="800"
        fontSize="8"
        letterSpacing="-0.02em"
      >
        Alfamart
      </text>
    </svg>
  );
}
