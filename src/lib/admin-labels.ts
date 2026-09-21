/** Human-readable ledger types for admin treasury views. */
export function formatLedgerType(type: string): string {
  const labels: Record<string, string> = {
    tip_sent: "Tip sent",
    tip_received: "Tip received",
    tip_received_onchain: "On-chain tip (beta)",
    track_unlock: "Track unlock",
    track_unlock_earned: "Unlock earned",
    request_escrow: "Request escrow",
    request_earned: "Request earned",
    request_refund: "Request refund",
    membership: "Membership",
    membership_join: "Membership join",
    membership_renewal: "Membership renewal",
    membership_upgrade: "Membership upgrade",
    membership_earned: "Membership earned",
    subscription: "VIP subscription (legacy)",
    subscription_earned: "VIP earned (legacy)",
    stripe_purchase: "Stripe purchase",
    purchase: "DROP purchase",
    daily_login: "Daily login",
    quest_reward: "Quest reward",
    quest_daily_clear: "Daily quest bonus",
    first_tip_bonus: "First tip bonus",
    withdraw_request: "Cash-out request",
    withdraw_paid: "Cash-out paid",
    withdraw_refund: "Cash-out refund",
    station_tip: "Station tip share",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}
