import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export default function LoginPage() {
  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Masuk ke Publiora"
        description="Selamat datang kembali. Lanjutkan karya Anda dari ruang kerja editorial."
        footer={null}
      >
        <LoginForm />
        <AuthSwitch question="Belum punya akun?" href="/register" label="Buat akun baru" />
      </AuthShell>
    </>
  );
}
