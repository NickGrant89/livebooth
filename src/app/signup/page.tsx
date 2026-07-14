import { getPlatformSettings } from "@/lib/platform-settings";
import { SignupForm } from "./SignupForm";
import { SignupClosed } from "./SignupClosed";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const platform = await getPlatformSettings();
  if (!platform.signupEnabled) {
    return <SignupClosed />;
  }
  return <SignupForm />;
}
