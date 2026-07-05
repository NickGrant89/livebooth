export type SupportMessagePayload = {
  id: string;
  senderRole: "user" | "admin";
  body: string;
  createdAt: string;
};
