"use client";

import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import type { FieldOrigin } from "@/lib/offers/prefill";

export type FieldOriginsState = Partial<Record<string, FieldOrigin>>;

export type SetFieldOrigins = (
  next:
    | FieldOriginsState
    | ((prev: FieldOriginsState) => FieldOriginsState),
) => void;

/**
 * Wrap react-hook-form register so any user edit marks origin as "user".
 * Prevents Offer prefill from silently overwriting typed values.
 */
export function registerOriginAware<TFieldValues extends FieldValues>(
  register: UseFormRegister<TFieldValues>,
  setFieldOrigins: SetFieldOrigins,
  name: Path<TFieldValues>,
) {
  const reg = register(name);
  return {
    ...reg,
    onChange: (event: Parameters<typeof reg.onChange>[0]) => {
      setFieldOrigins((prev) => ({
        ...prev,
        [String(name)]: "user",
      }));
      return reg.onChange(event);
    },
  };
}

export function markFieldOriginUser(
  setFieldOrigins: SetFieldOrigins,
  field: string,
): void {
  setFieldOrigins((prev) => ({ ...prev, [field]: "user" }));
}
