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
        title="Masuk ke Publiora"
        description="Selamat datang kembali. Lanjutkan ebook Anda dari workspace."
        footer={null}
      >
        <LoginForm returnTo={returnTo} />
        <AuthSwitch
          question="Belum punya akun?"
          href={signupEntryUrl(returnTo)}
          label="Buat akun baru"
        />
      </AuthShell>
    </>
  );
}