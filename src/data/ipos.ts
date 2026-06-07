/**
 * Seed dataset — realistic sample IPOs spanning every status.
 * Dates are anchored around June 2026 so the homepage shows a live mix.
 *
 * ⚠️ This is illustrative sample data, NOT live grey-market quotes. Swap this
 * module for a live API/feed behind the same `IPO[]` shape — nothing else changes.
 */
import type { IPO } from './types';

// helper to build a 7-day gmp history ending at `current`
function hist(start: string, vals: number[]): { date: string; gmp: number }[] {
  const d0 = new Date(start + 'T00:00:00');
  return vals.map((gmp, i) => {
    const d = new Date(d0);
    d.setDate(d0.getDate() + i);
    return { date: d.toISOString().slice(0, 10), gmp };
  });
}

export const ipos: IPO[] = [
  /* ---------------------------------------------------------------- OPEN */
  {
    slug: 'zenith-solar-energy',
    name: 'Zenith Solar Energy',
    type: 'mainboard',
    exchange: 'NSE+BSE',
    priceBand: { min: 615, max: 648 },
    lotSize: 23,
    openDate: '2026-06-05',
    closeDate: '2026-06-09',
    allotmentDate: '2026-06-10',
    listingDate: '2026-06-12',
    gmp: 196,
    gmpHistory: hist('2026-06-01', [120, 138, 155, 162, 178, 190, 196]),
    subscription: { qib: 18.4, nii: 42.7, rii: 12.3, total: 21.6 },
    registrar: 'KFin Technologies',
    status: 'open',
    about:
      'Zenith Solar Energy is an integrated solar EPC and module manufacturer with 4.2 GW capacity, serving utility-scale and C&I customers across India.',
    issueSize: '₹2,460 Cr',
    leadManagers: ['Kotak Mahindra Capital', 'Axis Capital', 'JM Financial'],
    subscriptionDays: [
      { day: 1, date: '2026-06-05', qib: 1.1, nii: 6.2, rii: 4.8, total: 3.9 },
      { day: 2, date: '2026-06-08', qib: 4.3, nii: 21.5, rii: 9.1, total: 11.0 },
      { day: 3, date: '2026-06-09', qib: 18.4, nii: 42.7, rii: 12.3, total: 21.6 },
    ],
  },
  {
    slug: 'aether-fintech',
    name: 'Aether Fintech',
    type: 'mainboard',
    exchange: 'NSE+BSE',
    priceBand: { min: 384, max: 402 },
    lotSize: 37,
    openDate: '2026-06-06',
    closeDate: '2026-06-10',
    allotmentDate: '2026-06-11',
    listingDate: '2026-06-13',
    gmp: 34,
    gmpHistory: hist('2026-06-01', [58, 52, 47, 44, 40, 36, 34]),
    subscription: { qib: 2.1, nii: 5.4, rii: 3.2, total: 3.3 },
    registrar: 'Link Intime India',
    status: 'open',
    about:
      'Aether Fintech runs a digital lending and wealth-distribution platform with 9M+ users, focused on tier-2/3 India.',
    issueSize: '₹1,180 Cr',
    leadManagers: ['ICICI Securities', 'Nuvama Wealth'],
    subscriptionDays: [
      { day: 1, date: '2026-06-06', qib: 0.3, nii: 1.1, rii: 1.4, total: 0.9 },
      { day: 2, date: '2026-06-09', qib: 1.0, nii: 3.0, rii: 2.5, total: 2.0 },
      { day: 3, date: '2026-06-10', qib: 2.1, nii: 5.4, rii: 3.2, total: 3.3 },
    ],
  },
  {
    slug: 'kisan-agritech-sme',
    name: 'Kisan Agritech',
    type: 'sme',
    exchange: 'NSE',
    priceBand: { min: 138, max: 145 },
    lotSize: 1000,
    openDate: '2026-06-06',
    closeDate: '2026-06-10',
    allotmentDate: '2026-06-11',
    listingDate: '2026-06-13',
    gmp: 62,
    gmpHistory: hist('2026-06-01', [30, 38, 44, 50, 55, 60, 62]),
    subscription: { qib: 32.0, nii: 188.5, rii: 96.2, total: 102.4 },
    registrar: 'Bigshare Services',
    status: 'open',
    about:
      'Kisan Agritech makes precision-farming sensors and drone-spraying systems for Indian agriculture.',
    issueSize: '₹64 Cr',
    leadManagers: ['Hem Securities'],
    subscriptionDays: [
      { day: 1, date: '2026-06-06', qib: 2.0, nii: 28.0, rii: 22.0, total: 18.0 },
      { day: 2, date: '2026-06-09', qib: 12.0, nii: 96.0, rii: 60.0, total: 55.0 },
      { day: 3, date: '2026-06-10', qib: 32.0, nii: 188.5, rii: 96.2, total: 102.4 },
    ],
  },

  /* ------------------------------------------------------------ UPCOMING */
  {
    slug: 'orbit-defence-systems',
    name: 'Orbit Defence Systems',
    type: 'mainboard',
    exchange: 'NSE+BSE',
    priceBand: { min: 920, max: 970 },
    lotSize: 15,
    openDate: '2026-06-16',
    closeDate: '2026-06-18',
    allotmentDate: '2026-06-19',
    listingDate: '2026-06-23',
    gmp: 285,
    gmpHistory: hist('2026-06-01', [180, 205, 230, 248, 260, 275, 285]),
    subscription: { qib: 0, nii: 0, rii: 0, total: 0 },
    registrar: 'KFin Technologies',
    status: 'upcoming',
    about:
      'Orbit Defence Systems supplies guidance electronics and UAV subsystems to defence PSUs and the armed forces.',
    issueSize: '₹3,900 Cr',
    leadManagers: ['Kotak Mahindra Capital', 'Morgan Stanley India'],
  },
  {
    slug: 'verdant-foods',
    name: 'Verdant Foods',
    type: 'mainboard',
    exchange: 'BSE',
    priceBand: { min: 256, max: 270 },
    lotSize: 55,
    openDate: '2026-06-18',
    closeDate: '2026-06-20',
    allotmentDate: '2026-06-23',
    listingDate: '2026-06-25',
    gmp: 18,
    gmpHistory: hist('2026-06-02', [10, 12, 14, 15, 16, 17, 18]),
    subscription: { qib: 0, nii: 0, rii: 0, total: 0 },
    registrar: 'Link Intime India',
    status: 'upcoming',
    about:
      'Verdant Foods is a packaged health-foods and plant-protein brand with a pan-India D2C and modern-trade presence.',
    issueSize: '₹880 Cr',
    leadManagers: ['Axis Capital'],
  },
  {
    slug: 'spinta-robotics-sme',
    name: 'Spinta Robotics',
    type: 'sme',
    exchange: 'NSE',
    priceBand: { min: 76, max: 80 },
    lotSize: 1600,
    openDate: '2026-06-17',
    closeDate: '2026-06-19',
    allotmentDate: '2026-06-20',
    listingDate: '2026-06-24',
    gmp: 41,
    gmpHistory: hist('2026-06-02', [22, 26, 30, 34, 37, 39, 41]),
    subscription: { qib: 0, nii: 0, rii: 0, total: 0 },
    registrar: 'Maashitla Securities',
    status: 'upcoming',
    about:
      'Spinta Robotics builds warehouse automation AMRs and robotic arms for e-commerce fulfilment centres.',
    issueSize: '₹48 Cr',
    leadManagers: ['Beeline Capital Advisors'],
  },

  /* ----------------------------------------------- CLOSED / ALLOTMENT */
  {
    slug: 'meridian-logistics',
    name: 'Meridian Logistics',
    type: 'mainboard',
    exchange: 'NSE+BSE',
    priceBand: { min: 410, max: 432 },
    lotSize: 34,
    openDate: '2026-06-02',
    closeDate: '2026-06-04',
    allotmentDate: '2026-06-05',
    listingDate: '2026-06-09',
    gmp: 88,
    gmpHistory: hist('2026-05-29', [60, 68, 74, 79, 83, 86, 88]),
    subscription: { qib: 44.2, nii: 78.9, rii: 14.1, total: 38.7 },
    registrar: 'KFin Technologies',
    status: 'allotment',
    about:
      'Meridian Logistics is an asset-light 3PL and express-cargo network operating 120+ hubs nationwide.',
    issueSize: '₹1,640 Cr',
    leadManagers: ['ICICI Securities', 'HDFC Bank'],
    subscriptionDays: [
      { day: 1, date: '2026-06-02', qib: 2.0, nii: 9.0, rii: 4.0, total: 4.5 },
      { day: 2, date: '2026-06-03', qib: 14.0, nii: 40.0, rii: 9.0, total: 18.0 },
      { day: 3, date: '2026-06-04', qib: 44.2, nii: 78.9, rii: 14.1, total: 38.7 },
    ],
  },
  {
    slug: 'cobalt-pharma-sme',
    name: 'Cobalt Pharma',
    type: 'sme',
    exchange: 'BSE',
    priceBand: { min: 92, max: 96 },
    lotSize: 1200,
    openDate: '2026-06-02',
    closeDate: '2026-06-04',
    allotmentDate: '2026-06-05',
    listingDate: '2026-06-09',
    gmp: 8,
    gmpHistory: hist('2026-05-29', [16, 14, 12, 11, 10, 9, 8]),
    subscription: { qib: 6.4, nii: 12.0, rii: 8.8, total: 9.1 },
    registrar: 'Bigshare Services',
    status: 'closed',
    about:
      'Cobalt Pharma is a contract manufacturer of generic formulations and nutraceuticals.',
    issueSize: '₹38 Cr',
    leadManagers: ['Gretex Corporate Services'],
    subscriptionDays: [
      { day: 1, date: '2026-06-02', qib: 0.5, nii: 2.0, rii: 3.0, total: 1.8 },
      { day: 2, date: '2026-06-03', qib: 2.5, nii: 6.0, rii: 6.0, total: 4.7 },
      { day: 3, date: '2026-06-04', qib: 6.4, nii: 12.0, rii: 8.8, total: 9.1 },
    ],
  },

  /* ---------------------------------------------------------------- LISTED */
  {
    slug: 'helios-renewables',
    name: 'Helios Renewables',
    type: 'mainboard',
    exchange: 'NSE+BSE',
    priceBand: { min: 530, max: 560 },
    lotSize: 26,
    openDate: '2026-05-19',
    closeDate: '2026-05-21',
    allotmentDate: '2026-05-22',
    listingDate: '2026-05-26',
    gmp: 0,
    gmpHistory: hist('2026-05-18', [165, 172, 180, 188, 192, 198, 205]),
    subscription: { qib: 96.0, nii: 142.0, rii: 28.0, total: 78.4 },
    registrar: 'KFin Technologies',
    status: 'listed',
    listingPrice: 772,
    about:
      'Helios Renewables develops and operates wind-solar hybrid power assets with 2.6 GW under management.',
    issueSize: '₹2,900 Cr',
    leadManagers: ['Kotak Mahindra Capital', 'Citigroup'],
  },
  {
    slug: 'novacore-semiconductors',
    name: 'Novacore Semiconductors',
    type: 'mainboard',
    exchange: 'NSE+BSE',
    priceBand: { min: 1180, max: 1240 },
    lotSize: 12,
    openDate: '2026-05-12',
    closeDate: '2026-05-14',
    allotmentDate: '2026-05-15',
    listingDate: '2026-05-19',
    gmp: 0,
    gmpHistory: hist('2026-05-11', [410, 440, 470, 495, 510, 528, 540]),
    subscription: { qib: 110.0, nii: 205.0, rii: 41.0, total: 118.0 },
    registrar: 'Link Intime India',
    status: 'listed',
    listingPrice: 1798,
    about:
      'Novacore Semiconductors designs power-management ICs and provides OSAT packaging services.',
    issueSize: '₹4,300 Cr',
    leadManagers: ['Morgan Stanley India', 'Axis Capital'],
  },
  {
    slug: 'pinnacle-realty',
    name: 'Pinnacle Realty',
    type: 'mainboard',
    exchange: 'BSE',
    priceBand: { min: 295, max: 310 },
    lotSize: 48,
    openDate: '2026-05-05',
    closeDate: '2026-05-07',
    allotmentDate: '2026-05-08',
    listingDate: '2026-05-12',
    gmp: 0,
    gmpHistory: hist('2026-05-04', [22, 20, 18, 15, 12, 10, 9]),
    subscription: { qib: 3.2, nii: 2.1, rii: 1.8, total: 2.5 },
    registrar: 'Bigshare Services',
    status: 'listed',
    listingPrice: 298,
    about:
      'Pinnacle Realty is a residential and commercial real-estate developer focused on the western India market.',
    issueSize: '₹1,050 Cr',
    leadManagers: ['JM Financial'],
  },
  {
    slug: 'lumen-edtech-sme',
    name: 'Lumen EdTech',
    type: 'sme',
    exchange: 'NSE',
    priceBand: { min: 104, max: 110 },
    lotSize: 1200,
    openDate: '2026-05-06',
    closeDate: '2026-05-08',
    allotmentDate: '2026-05-09',
    listingDate: '2026-05-13',
    gmp: 0,
    gmpHistory: hist('2026-05-05', [70, 76, 82, 88, 92, 96, 100]),
    subscription: { qib: 48.0, nii: 320.0, rii: 140.0, total: 168.0 },
    registrar: 'Skyline Financial',
    status: 'listed',
    listingPrice: 209,
    about:
      'Lumen EdTech runs an AI-driven exam-prep platform for competitive Indian examinations.',
    issueSize: '₹56 Cr',
    leadManagers: ['Hem Securities'],
  },
];

/* ------------------------------ accessors ------------------------------ */

export function getAllIpos(): IPO[] {
  return ipos;
}

export function getIpoBySlug(slug: string): IPO | undefined {
  return ipos.find((i) => i.slug === slug);
}

export function getByStatus(...statuses: IPO['status'][]): IPO[] {
  return ipos.filter((i) => statuses.includes(i.status));
}
