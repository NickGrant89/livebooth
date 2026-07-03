import { WalletKitScope } from "@/components/WalletKitScope";

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <WalletKitScope>{children}</WalletKitScope>;
}
