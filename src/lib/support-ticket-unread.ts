/** Ticket needs admin attention when the user replied after last admin read. */
export function isSupportTicketUnread(ticket: {
  lastMessageRole?: string | null;
  lastMessageAt?: Date | string | null;
  adminReadAt?: Date | string | null;
  status: string;
}): boolean {
  if (ticket.status === "resolved") return false;
  if (ticket.lastMessageRole !== "user") return false;
  if (!ticket.lastMessageAt) return true;
  if (!ticket.adminReadAt) return true;
  return new Date(ticket.adminReadAt).getTime() < new Date(ticket.lastMessageAt).getTime();
}
