import { WalletKitScope } from "@/components/WalletKitScope";

export default function StreamLayout({ children }: { children: React.ReactNode }) {
  return <WalletKitScope>{children}</WalletKitScope>;
}
