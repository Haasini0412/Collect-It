export type GroupType = 'Class' | 'Friends' | 'Club' | 'Community' | 'Fest';

export type CollectionTheme = 'aurora' | 'sunset' | 'ocean' | 'forest' | 'candy' | 'midnight';

export type CollectionMode = 'goal' | 'fixed';

export type CollectionStatus = 'active' | 'closed';

export type MemberSource = 'manual' | 'paste' | 'file' | 'contacts' | 'ai' | 'join' | 'demo';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  paypalEmail?: string;
  paypalEmailVerified?: boolean;
  paypalEmailChangedAt?: string;
  pendingPaypalEmail?: string;
  verifyCodeHash?: string;
  verifyCodeExpiresAt?: string;
  verifyAttempts?: number;
}

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  type: GroupType;
  emoji: string;
  description?: string;
  joinCode: string;
  joinOpen: boolean;
  memberCount: number;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: MemberSource;
  createdAt: string;
}

export interface Collection {
  id: string;
  groupId: string;
  ownerId: string;
  slug: string;
  title: string;
  purpose: string;
  emoji: string;
  theme: CollectionTheme;
  mode: CollectionMode;
  goalAmount?: number | null;
  fixedAmount?: number | null;
  currency: 'INR';
  deadline: string;
  status: CollectionStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  collectionId: string;
  memberId?: string | null;
  payerName: string;
  payerEmail?: string | null;
  amount: number; // INR
  currency: 'INR';
  chargedAmount: number;
  chargeCurrency: string;
  fxRate: number;
  note?: string | null;
  isAnonymous: boolean;
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  status: 'pending' | 'completed' | 'failed';
  isDemo: boolean;
  createdAt: string;
  completedAt?: string | null;
}

export interface Expense {
  id: string;
  collectionId: string;
  description: string;
  amount: number;
  spentOn: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  collectionId: string;
  amount: number;
  paypalEmail: string;
  status: 'requested' | 'sent' | 'failed';
  isSimulated: boolean;
  requestedBy: string;
  destinationEmailMasked: string;
  ip?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  type: 'paypal_email_set' | 'paypal_email_verified' | 'payout_requested' | 'payout_sent' | 'payout_failed' | 'payout_blocked';
  uid: string;
  collectionId?: string;
  amount?: number;
  reason?: string;
  destinationEmailMasked?: string;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  uid: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PublicCollectionData {
  collection: Collection;
  group: {
    id: string;
    name: string;
    emoji: string;
    type: string;
  };
  lead: {
    name: string;
    avatarUrl?: string;
  };
  stats: {
    raised: number;
    target: number;
    percent: number;
    supportersCount: number;
    daysLeft: number;
    isClosed: boolean;
    unpaidCount: number;
    totalMembers: number;
    paidOut: number;
  };
  supporters: Array<{
    id: string;
    name: string;
    amount: number;
    note?: string | null;
    isTopSupporter: boolean;
    isAnonymous: boolean;
    createdAt: string;
  }>;
  expenses: Expense[];
  balance: number;
  spendingStory?: string;
  spendingStoryAi?: boolean;
}

export interface ForecastData {
  pacePerDay: number;
  projectedTotal: number;
  projectedCompletionDate: string;
  status: 'on_track' | 'at_risk' | 'behind';
}

export interface PayoutConfig {
  paypalEmail: string | null;
  paypalEmailMasked: string | null;
  paypalEmailVerified: boolean;
  pendingPaypalEmail: string | null;
  coolingActive: boolean;
  coolingEndsAt: string | null;
  coolingHoursLeft: number;
  canRequestPayout: boolean;
  blockedReason: string | null;
  isOwner: boolean;
}

export interface ManageStatsResponse {
  collection: Collection;
  group: Group;
  stats: {
    raised: number;
    target: number;
    percent: number;
    supportersCount: number;
    daysLeft: number;
    unpaidCount: number;
    totalMembers: number;
    spent: number;
    paidOut: number;
    available: number;
  };
  forecast: ForecastData;
  timeline: Array<{
    date: string;
    amount: number;
    cumulative: number;
  }>;
  payments: Payment[];
  paidMembers: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    amountPaid: number;
    paidAt: string;
  }>;
  unpaidMembers: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }>;
  expenses: Expense[];
  payouts: Payout[];
  payoutConfig: PayoutConfig;
  activity: AuditLog[];
}

export interface ConfigResponse {
  paypalClientId: string;
  paypalEnabled: boolean;
  aiEnabled: boolean;
  chargeCurrency: string;
  inrPerUsd: number;
}
