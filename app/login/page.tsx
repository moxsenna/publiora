import { AuthShell, AuthSwitch } from "@/components/layout/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import {
  approveSignupReturnPath,
  signupEntryUrl,
} from "@/lib/auth/return-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[]; error?: string | string[] }>;
}) {
  const { return_to, error } = await searchParams;
  const returnTo = approveSignupReturnPath(
    Array.isArray(return_to) ? return_to[0] : return_to
  );
  const callbackError = Array.isArray(error) ? error[0] : error;

  return (
    <>
      <AuthRedirect />
      <AuthShell
        title="Masuk ke Publiora"
        description="Selamat datang kembali. Lanjutkan ebook Anda dari workspace."
        footer={null}
      >
        <LoginForm returnTo={returnTo} callbackError={callbackError} />
        <AuthSwitch
          question="Belum punya akun?"
          href={signupEntryUrl(returnTo)}
          label="Buat akun baru"
        />
      </AuthShell>
    </>
  );
}