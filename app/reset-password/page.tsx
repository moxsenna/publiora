import type { Metadata } from "next";
import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { authId } from "@/lib/i18n/id/auth";
import { approveSignupReturnPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: authId.resetPasswordTitle,
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ return_to?: string | string[] }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const rawReturnTo = resolvedParams.return_to;
  const returnTo = approveSignupReturnPath(
    Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo
  );

  return (
    <AuthShell
      title={authId.resetPasswordTitle}
      description={authId.resetPasswordDesc}
    >
      <ResetPasswordForm returnTo={returnTo} />
      <AuthSwitch
        question="Sudah ingat kata sandi?"
        href="/login"
        label="Kembali ke login"
      />
    </AuthShell>
  );
}
