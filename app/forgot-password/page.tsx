import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Reset password"
        description="Kami akan kirim link reset ke email Anda."
      >
        <ForgotPasswordForm />
        <AuthSwitch question="Sudah ingat password?" href="/login" label="Kembali ke login" />
      </AuthShell>
    </>
  );
}
