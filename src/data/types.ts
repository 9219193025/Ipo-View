/**
 * Core domain types for IPO Views.
 * The `IPO` interface follows the brief exactly; helper-derived types are added below.
 */

export type IpoType = 'mainboard' | 'sme';
export type Exchange = 'NSE' | 'BSE' | 'NSE+BSE';
export type IpoStatus = 'upcoming' | 'open' | 'closed' | 'allotment' | 'listed';

export interface GmpPoint {
  date: string; // ISO yyyy-mm-dd
  gmp: number; // ₹
}

export interface Subscription {
  qib: number; // times subscribed (x)
  nii: number;
  rii: number;
  total: number;
}

/** Per-day subscription snapshot (feature #4: day-wise tracker). */
export interface SubscriptionDay {
  day: number; // 1,2,3
  date: string;
  qib: number;
  nii: number;
  rii: number;
  total: number;
}

export interface IPO {
  slug: string;
  name: string;
  type: IpoType;
  exchange: Exchange;
  priceBand: { min: number; max: number };
  lotSize: number;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  gmp: number; // current GMP in ₹
  gmpHistory: GmpPoint[];
  subscription: Subscription;
  registrar: string;
  status: IpoStatus;
  listingPrice?: number;

  // --- extra fields powering "better than competitor" features ---
  /** Short company description for detail page + meta. */
  about?: string;
  /** Day-wise subscription (feature #4). */
  subscriptionDays?: SubscriptionDay[];
  /** Issue size, e.g. "₹2,500 Cr". */
  issueSize?: string;
  /** Lead manager(s). */
  leadManagers?: string[];
}
