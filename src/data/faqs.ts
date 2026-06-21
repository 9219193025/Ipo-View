// Homepage FAQ content. Shared by the rendered accordion (FaqAccordion.astro)
// and the FAQPage JSON-LD injected into <head> — keep answers plain text (no
// markdown) so they serialise cleanly into structured data.

export interface Faq {
  q: string;
  a: string;
}

export const HOMEPAGE_FAQS: Faq[] = [
  {
    q: 'What is GMP in IPO?',
    a: "GMP (Grey Market Premium) is the extra amount over the issue price at which an IPO's shares trade in the unofficial grey market before they list on the exchange. It reflects how much demand investors expect on listing day — a ₹100 GMP on a ₹500 issue means buyers are paying around ₹600 ahead of listing. It is an informal sentiment indicator, not an official or guaranteed price.",
  },
  {
    q: 'How is IPO GMP calculated?',
    a: "GMP isn't worked out from a formula — it is a live price discovered by dealers and investors trading IPO applications and shares informally before listing. It is simply the premium buyers are currently willing to pay over the issue price, quoted by grey-market operators and tracked across community channels. Because it is demand-driven, it rises and falls daily through the subscription period.",
  },
  {
    q: 'Is IPO GMP legal in India?',
    a: 'Grey-market trading itself is unofficial and unregulated — it operates outside SEBI and the stock exchanges, and deals are settled on trust with no legal recourse. Simply tracking or discussing GMP, as IPO Views does, is not illegal because it is public information. However, actually participating in grey-market transactions carries counterparty risk and no regulatory protection.',
  },
  {
    q: 'What is Kostak rate in IPO?',
    a: 'Kostak is a fixed amount a buyer pays an applicant to purchase their entire IPO application in the grey market, regardless of whether shares are allotted. The seller receives this guaranteed payment up front and gives up any allotment they might get. Kostak rates are usually quoted for a single retail-sized application.',
  },
  {
    q: 'What is Sub2 / Subject to Sauda in IPO?',
    a: 'Subject to Sauda (Sub2) is a grey-market deal to sell an IPO application where the payment is conditional on actually receiving an allotment. If shares are allotted, the buyer pays an agreed premium; if nothing is allotted, no money changes hands. Unlike Kostak, the payout depends entirely on getting an allotment.',
  },
  {
    q: 'How accurate is grey market premium?',
    a: 'GMP is only a rough, real-time sentiment gauge, not a prediction — a high GMP often points to a strong listing, but it can swing sharply or mislead, especially in thin or hyped grey markets. Listings regularly open above or below the level the GMP implied. Treat it as one input alongside subscription data and fundamentals, never a guarantee.',
  },
  {
    q: 'How to check IPO allotment status?',
    a: "You can check allotment status on the registrar's website (such as Link Intime or KFin Technologies) by entering your PAN, application number, or demat details once the basis of allotment is finalised. The NSE and BSE IPO portals and most brokers also display your status. IPO Views links directly to the relevant registrar for each IPO.",
  },
  {
    q: 'What is the difference between Mainboard and SME IPO?',
    a: 'Mainboard IPOs are larger companies that list on the main NSE and BSE platforms, with stricter eligibility and a small minimum lot value. SME IPOs are smaller companies listing on the NSE Emerge or BSE SME platforms, with lighter listing norms but a much larger minimum investment (lot value typically around ₹1–1.5 lakh) and lower liquidity.',
  },
  {
    q: 'How to apply for an IPO using UPI?',
    a: 'In your broker or banking app, select the IPO, enter your bid (price and number of lots) and your UPI ID, then submit. You will receive a mandate request in your UPI app — approve it, and the application amount is blocked (not debited) in your bank account via ASBA. If you get an allotment the money is debited; otherwise the block is released.',
  },
  {
    q: "What happens if I don't get IPO allotment?",
    a: "If you are not allotted shares, the money blocked under the ASBA UPI mandate is simply unblocked and stays in your bank account — you are not charged. This usually happens within a day or two of the allotment being finalised. Because over-subscribed IPOs are allotted by lottery, not getting an allotment is common.",
  },
  {
    q: 'When does IPO GMP stop trading?',
    a: 'Grey-market activity typically winds down around listing day, since once shares list on the exchange there is a real, regulated market price and no need for grey-market quotes. GMP is most active from a few days before the IPO opens, through the subscription period, up to listing. After listing, the actual market price takes over.',
  },
  {
    q: 'Can GMP be negative?',
    a: 'Yes. A negative GMP (sometimes shown as a discount) means grey-market buyers expect the shares to list below the issue price, signalling weak demand. It is a warning sign that the IPO may have a flat or discounted debut — though, like all GMP, it is not guaranteed.',
  },
];
