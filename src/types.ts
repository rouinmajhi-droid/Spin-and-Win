export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  hasSpun: boolean;
  spinOutcome: string | null;
  spunAt: string | null;
  blocked: boolean;
  createdAt: string;
  remainingSpins?: number;
}

export interface AppConfig {
  youtubeLink: string;
  instagramLink: string;
  subscribeLink: string;
  whatsappNumber: string;
  whatsappMessage: string;
  freeWebsiteProbability: number; // probability value from 0 to 100
}

export interface LiveStats {
  totalUsers: number;
  totalSpins: number;
  freeWebsiteWinners: number;
  otherWinners: number;
}
