import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export default function RegisterPage() {
  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Create your account"
        description="Gratis untuk mulai. Plan Free dapat 50 kredit generate tiap bulan."
      >
        <RegisterForm />
        <AuthSwitch question="Sudah punya akun?" href="/login" label="Sign in" />
      </AuthShell>
    </>
  );
}
