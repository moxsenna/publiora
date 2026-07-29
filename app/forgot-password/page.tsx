import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Atur ulang kata sandi"
        description="Masukkan email akun Anda. Kami akan mengirim petunjuk pengaturan ulang bila alamat tersebut terdaftar."
      >
        <ForgotPasswordForm />
        <AuthSwitch question="Sudah ingat kata sandi?" href="/login" label="Kembali untuk masuk" />
      </AuthShell>
    </>
  );
}
