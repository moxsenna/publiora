import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export default function LoginPage() {
  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Sign in"
        description="Masuk ke workspace Publiora Anda."
        footer={null}
      >
        <LoginForm />
        <AuthSwitch question="Belum punya akun?" href="/register" label="Buat baru" />
      </AuthShell>
    </>
  );
}
