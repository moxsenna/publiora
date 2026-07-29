import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export default function RegisterPage() {
  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Buat akun Publiora"
        description="Mulai dengan paket Free dan 50 kredit setiap bulan untuk menyusun ebook pertama Anda."
      >
        <RegisterForm />
        <AuthSwitch question="Sudah punya akun?" href="/login" label="Masuk" />
      </AuthShell>
    </>
  );
}
