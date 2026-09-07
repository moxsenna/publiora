import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import {
  approveSignupReturnPath,
  withSignupReturnPath,
} from "@/lib/auth/return-path";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[] }>;
}) {
  const { return_to } = await searchParams;
  const returnTo = approveSignupReturnPath(
    Array.isArray(return_to) ? return_to[0] : return_to
  );

  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Buat akun Publiora"
        description="Gratis untuk mulai. Plan Free dapat 50 kredit generate tiap bulan."
      >
        <RegisterForm returnTo={returnTo} />
        <AuthSwitch
          question="Sudah punya akun?"
          href={withSignupReturnPath("/login", returnTo)}
          label="Masuk"
        />
      </AuthShell>
    </>
  );
}
