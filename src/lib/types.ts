export type Genre =
  | "house"
  | "techno"
  | "drum-bass"
  | "hip-hop"
  | "trance"
  | "disco"
  | "ambient";

export interface DJ {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  genres: Genre[];
  followers: number;
  isLive: boolean;
  streamTitle?: string;
  viewers?: number;
  totalEarned: number;
  achievementIds: string[];
}

export interface Stream {
  id: string;
  djId: string;
  title: string;
  genre: Genre;
  viewers: number;
  thumbnail: string;
  isLive: boolean;
  startedAt: string;
}

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  rewardTokens: number;
  requirement: string;
  category: "streaming" | "community" | "earnings" | "milestones";
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isTip?: boolean;
  tipAmount?: number;
}

export interface Tip {
  id: string;
  from: string;
  amount: number;
  message?: string;
  timestamp: string;
}
