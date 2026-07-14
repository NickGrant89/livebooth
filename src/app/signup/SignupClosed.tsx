import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SignupClosed() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showTagline link={false} />
          <h1 className="text-2xl font-bold mt-6">Closed beta</h1>
          <p className="text-zinc-400 mt-3 text-sm leading-relaxed">
            Public signups are off right now. If you&apos;ve been invited, check your email for login details
            or sign in with the account an admin created for you.
          </p>
        </div>

        <div className="glass rounded-2xl p-8 space-y-4">
          <Link
            href="/login"
            className="btn-primary block w-full rounded-xl py-3.5 text-sm font-bold text-center"
          >
            Sign in
          </Link>
          <p className="text-sm text-zinc-500">
            Need access?{" "}
            <Link href="/support" className="text-[#53fc18] hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
