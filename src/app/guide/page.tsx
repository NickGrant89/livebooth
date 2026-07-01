"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getGuidePath } from "@/lib/guidance";

/** Sends users to the right guide for their role */
export default function GuideRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/help");
      return;
    }
    router.replace(getGuidePath(user.role));
  }, [user, loading, router]);

  return (
    <div className="py-20 text-center text-zinc-500">
      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
      Opening your guide…
      <p className="text-xs mt-4">
        <Link href="/help" className="text-[#53fc18] hover:underline">
          Help center
        </Link>
      </p>
    </div>
  );
}
