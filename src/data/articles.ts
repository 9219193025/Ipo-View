/**
 * Financial-education article content (Improvement #2).
 *
 * Static, dependency-free content model. Each article is a list of sections;
 * each section has a stable `id` (used for the table-of-contents anchors) and a
 * list of typed blocks. The article page renders these and auto-derives:
 *   - read time (from total word count)
 *   - TOC (from section headings)
 *   - meta description (first ~160 chars of the intro)
 */

export type Block =
  | { p: string }
  | { list: string[] }
  | { ol: string[] }
  | { sub: string };

export interface Section {
  id: string;
  heading: string;
  blocks: Block[];
}

export type ArticleCategory =
  | 'IPO Basics'
  | 'Grey Market'
  | 'How to Apply'
  | 'Investment Strategy';

export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  /** One-line teaser for the hub cards. */
  teaser: string;
  /** Short intro paragraph shown under the H1; also seeds the meta description. */
  intro: string;
  sections: Section[];
}

/* ------------------------------------------------------------------ *
 * Word-count + read-time + meta helpers
 * ------------------------------------------------------------------ */

function blockText(b: Block): string {
  if ('p' in b) return b.p;
  if ('sub' in b) return b.sub;
  if ('list' in b) return b.list.join(' ');
  if ('ol' in b) return b.ol.join(' ');
  return '';
}

export function articleWordCount(a: Article): number {
  let text = a.intro + ' ';
  for (const s of a.sections) {
    text += s.heading + ' ';
    for (const b of s.blocks) text += blockText(b) + ' ';
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readTimeMinutes(a: Article): number {
  return Math.max(1, Math.round(articleWordCount(a) / 200)); // ~200 wpm
}

export function metaDescription(a: Article): string {
  const base = a.intro.replace(/\s+/g, ' ').trim();
  return base.length > 160 ? base.slice(0, 157).trimEnd() + '…' : base;
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function relatedArticles(slug: string, n = 3): Article[] {
  const current = getArticle(slug);
  if (!current) return ARTICLES.slice(0, n);
  // Prefer same-category articles, then fill with others.
  const sameCat = ARTICLES.filter((a) => a.slug !== slug && a.category === current.category);
  const others = ARTICLES.filter((a) => a.slug !== slug && a.category !== current.category);
  return [...sameCat, ...others].slice(0, n);
}

/* ------------------------------------------------------------------ *
 * The articles
 * ------------------------------------------------------------------ */

export const ARTICLES: Article[] = [
  // 1 ------------------------------------------------------------------
  {
    slug: 'what-is-ipo',
    title: 'What is an IPO? Complete Guide for Indian Investors',
    category: 'IPO Basics',
    teaser: 'How companies go public, mainboard vs SME, and how retail investors can apply.',
    intro:
      'An IPO (Initial Public Offering) is the process through which a privately held company sells its shares to the public for the first time and gets listed on a stock exchange. For Indian retail investors, an IPO is often the first chance to buy into a fast-growing company — but understanding how the process works is essential before you apply.',
    sections: [
      {
        id: 'what-is-an-ipo',
        heading: 'What exactly is an IPO?',
        blocks: [
          {
            p: 'When a company is private, its shares are held by founders, employees, early investors and venture-capital or private-equity funds. An IPO converts that private ownership into publicly traded shares. After listing, anyone with a demat account can buy or sell the stock on the NSE or BSE.',
          },
          {
            p: 'The company files a draft prospectus — the DRHP (Draft Red Herring Prospectus) — with SEBI, the market regulator. This document discloses the business, financials, risks, promoter holding and the planned use of the funds raised. Once SEBI clears it, the company announces the price band and the subscription dates.',
          },
        ],
      },
      {
        id: 'why-companies-go-public',
        heading: 'Why do companies go public?',
        blocks: [
          { p: 'Companies launch an IPO for several reasons:' },
          {
            list: [
              'Raise fresh capital to fund expansion, repay debt, or invest in new projects (a "fresh issue").',
              'Give early investors and promoters a way to sell part of their stake (an "offer for sale", or OFS).',
              'Gain visibility, credibility and a public valuation that helps with future fundraising.',
              'Create liquid stock that can be used to attract and reward employees through ESOPs.',
            ],
          },
          {
            p: 'Most IPOs are a mix of a fresh issue and an OFS. The fresh-issue money goes to the company; the OFS money goes to the selling shareholders, not the business.',
          },
        ],
      },
      {
        id: 'mainboard-vs-sme',
        heading: 'Mainboard vs SME IPOs',
        blocks: [
          {
            p: 'India has two IPO tracks. Mainboard IPOs are larger, more established companies that list on the main NSE and BSE platforms. SME IPOs are smaller companies that list on the dedicated NSE Emerge or BSE SME platforms, with lighter listing requirements.',
          },
          {
            list: [
              'Mainboard: typically large issue sizes, minimum application of one lot worth roughly ₹14,000–₹15,000, wide investor participation.',
              'SME: smaller issues, much larger lot values (often ₹1–1.5 lakh+ minimum), lower liquidity after listing and higher risk.',
            ],
          },
          {
            p: 'Beginners usually start with mainboard IPOs because of lower entry cost, better liquidity and stricter disclosure norms.',
          },
        ],
      },
      {
        id: 'how-retail-can-apply',
        heading: 'How retail investors can apply',
        blocks: [
          {
            p: 'Every IPO reserves a portion of shares for different investor categories: QIB (Qualified Institutional Buyers), NII/HNI (Non-Institutional Investors) and the retail category. As a retail investor you can apply for up to ₹2 lakh in a single IPO under the retail quota.',
          },
          {
            p: 'To apply you need two things: a demat + trading account, and a way to block the application money — either via ASBA through your bank, or via a UPI mandate through your broker app. You bid for one or more lots at the cut-off price (the top of the band) and the money is only blocked, not debited, until shares are allotted.',
          },
        ],
      },
      {
        id: 'asba-vs-upi',
        heading: 'ASBA vs UPI: the two payment methods',
        blocks: [
          {
            sub: 'ASBA (Applications Supported by Blocked Amount)',
          },
          {
            p: 'With ASBA, you apply through your bank\'s net banking. The application amount stays in your account but is "blocked" (frozen) until allotment. If you get shares, the money is debited; if not, the block is released. You earn interest on the blocked amount throughout.',
          },
          {
            sub: 'UPI mandate',
          },
          {
            p: 'When you apply through a broker app like Zerodha, Groww or Upstox, you approve a UPI mandate in your payment app (Google Pay, PhonePe, BHIM, etc.). This blocks the money just like ASBA but is faster to set up. UPI applications are capped at ₹5 lakh per the current rules, which comfortably covers the ₹2 lakh retail limit.',
          },
        ],
      },
      {
        id: 'lot-size',
        heading: 'Lot size explained',
        blocks: [
          {
            p: 'You cannot buy a single share in an IPO — you apply in fixed bundles called lots. The lot size is set so that one lot costs roughly ₹14,000–₹15,000 at the upper price band for mainboard IPOs. For example, if the price band is ₹100–₹105 and the lot size is 140 shares, one lot at cut-off costs ₹14,700.',
          },
          {
            p: 'Retail investors can apply for a minimum of one lot and a maximum number of lots that keeps the total under ₹2 lakh. In a heavily oversubscribed IPO, applying for more lots does not improve your odds in the retail category — allotment is done by lottery in multiples of one lot.',
          },
        ],
      },
      {
        id: 'key-takeaways',
        heading: 'Key takeaways',
        blocks: [
          {
            list: [
              'An IPO is a company\'s first sale of shares to the public, regulated by SEBI.',
              'Companies go public to raise capital and let early investors exit.',
              'Mainboard IPOs suit beginners; SME IPOs are riskier and need larger capital.',
              'You apply with a demat account using ASBA or a UPI mandate — money is only blocked, not spent.',
              'You bid in lots at the cut-off price; in oversubscribed retail IPOs, allotment is a lottery.',
            ],
          },
        ],
      },
    ],
  },

  // 2 ------------------------------------------------------------------
  {
    slug: 'what-is-gmp',
    title: 'What is GMP (Grey Market Premium)? How to Use It',
    category: 'Grey Market',
    teaser: 'How GMP is calculated, what high/low GMP means, and the risks of relying on it.',
    intro:
      'GMP, or Grey Market Premium, is the unofficial price at which an upcoming IPO\'s shares trade in the grey market before they are listed on the exchange. It is one of the most-watched — and most misunderstood — indicators retail investors use to gauge listing-day demand.',
    sections: [
      {
        id: 'what-is-the-grey-market',
        heading: 'What is the grey market?',
        blocks: [
          {
            p: 'The grey market is an informal, unofficial marketplace where IPO shares (and application rights) are bought and sold before the official listing. It operates entirely on trust between dealers and is not regulated by SEBI or any exchange. There is no official price feed — quotes are circulated by a network of dealers, mostly in a few trading hubs.',
          },
          {
            p: 'Because it is unregulated, you should treat the grey market as a sentiment signal, not a place to actually trade. IPO Views tracks reported GMP numbers purely as an indicator of demand.',
          },
        ],
      },
      {
        id: 'how-gmp-is-calculated',
        heading: 'How is GMP calculated?',
        blocks: [
          {
            p: 'GMP is simply the premium over the IPO\'s issue price that buyers are willing to pay in the grey market. If an IPO is priced at ₹100 and the GMP is ₹45, it means grey-market buyers are paying ₹145 per share — implying an expected listing around ₹145.',
          },
          {
            p: 'The estimated listing price is therefore: issue price + GMP. The estimated listing gain percentage is: (GMP ÷ issue price) × 100. In the example above, that is a 45% expected listing gain. This is exactly the calculation behind the listing estimates on IPO Views.',
          },
        ],
      },
      {
        id: 'high-vs-low-gmp',
        heading: 'What high and low GMP mean',
        blocks: [
          {
            list: [
              'High GMP (e.g. 30%+ of issue price): strong grey-market demand, signalling that the market expects a healthy listing pop.',
              'Low or flat GMP: muted demand — the market expects the stock to list near or only slightly above the issue price.',
              'Negative GMP: shares trade below the issue price in the grey market, signalling expected listing losses.',
            ],
          },
          {
            p: 'A rising GMP through the subscription window is generally more reassuring than a high GMP that is falling, because it shows demand building rather than fading.',
          },
        ],
      },
      {
        id: 'gmp-vs-actual-listing',
        heading: 'GMP vs actual listing: how accurate is it?',
        blocks: [
          {
            p: 'GMP is a directional indicator, not a guarantee. It is often right about direction (a high GMP usually means a positive listing) but frequently wrong about magnitude. GMP can swing sharply in the final two days before listing as dealers adjust to subscription data and broader market mood.',
          },
          {
            p: 'IPO Views publishes a GMP-accuracy score that compares our GMP-based estimate against actual listing prices, so you can see how reliable the signal has been historically rather than taking it on faith.',
          },
        ],
      },
      {
        id: 'risks-of-relying-on-gmp',
        heading: 'Risks of relying on GMP',
        blocks: [
          {
            list: [
              'It is unofficial and unregulated — numbers can be manipulated to create hype.',
              'It is thinly traded, so a few trades can move the quoted premium dramatically.',
              'It reflects short-term listing sentiment, not the company\'s long-term value.',
              'It can collapse overnight if the broader market falls before listing.',
            ],
          },
          {
            p: 'Use GMP as one input alongside the company\'s fundamentals, subscription data and your own risk appetite — never as the sole reason to apply.',
          },
        ],
      },
      {
        id: 'kostak-and-sub2',
        heading: 'Kostak and Subject-to-Sauda (Sub2) explained',
        blocks: [
          {
            sub: 'Kostak',
          },
          {
            p: 'Kostak is the fixed price someone pays to buy your entire IPO application in the grey market before allotment — regardless of whether you actually get an allotment. If the Kostak rate is ₹600, a buyer pays you ₹600 to take over your application, and they keep whatever the application earns.',
          },
          {
            sub: 'Subject-to-Sauda (Sub2)',
          },
          {
            p: 'Sub2 is a conditional deal: a price agreed for your application that is only payable if you actually receive an allotment. If you don\'t get allotted, the deal is void and no money changes hands. Sub2 rates are usually higher than Kostak because the buyer only pays when shares are actually allotted.',
          },
          {
            p: 'Both Kostak and Sub2 are grey-market mechanisms used mainly by HNIs to lock in a guaranteed return. For most retail investors they are best understood as sentiment indicators rather than something to act on.',
          },
        ],
      },
    ],
  },

  // 3 ------------------------------------------------------------------
  {
    slug: 'how-to-apply-ipo',
    title: 'How to Apply for an IPO in India — Step by Step',
    category: 'How to Apply',
    teaser: 'Demat, UPI mandate, cut-off bidding and exactly what happens after the close date.',
    intro:
      'Applying for an IPO in India takes just a few minutes once your demat account is set up. This step-by-step guide walks you through the requirements, the application process on popular broker apps, and what happens after you submit your bid.',
    sections: [
      {
        id: 'requirements',
        heading: 'What you need before you start',
        blocks: [
          {
            list: [
              'A demat + trading account with a SEBI-registered broker (Zerodha, Groww, Upstox, Angel One, etc.).',
              'A UPI ID linked to your bank account (e.g. yourname@okhdfcbank), used to approve the payment mandate.',
              'Sufficient balance in that bank account to cover at least one lot — the money is blocked, not debited.',
              'Your PAN, which must be linked to the demat account.',
            ],
          },
          {
            p: 'You can apply for only one IPO application per PAN in the retail category. Submitting multiple applications on the same PAN gets all of them rejected.',
          },
        ],
      },
      {
        id: 'step-by-step',
        heading: 'Step-by-step: applying through your broker',
        blocks: [
          {
            p: 'The process is broadly identical across Zerodha (Console/Kite), Groww and Upstox:',
          },
          {
            ol: [
              'Open the IPO section in your broker app and select the open IPO you want to apply for.',
              'Enter your UPI ID in the application form.',
              'Choose the number of lots. Apply for one lot to maximise your odds in a heavily oversubscribed retail IPO.',
              'Tick the cut-off price option (explained below) and submit the application.',
              'Open your UPI app (Google Pay, PhonePe, BHIM) where you\'ll receive a mandate request, and approve it before the deadline.',
              'Once approved, the application amount is blocked in your bank account. You\'re done.',
            ],
          },
        ],
      },
      {
        id: 'cut-off-price',
        heading: 'Bidding at the cut-off price',
        blocks: [
          {
            p: 'IPOs are offered in a price band, for example ₹100–₹105. As a retail investor, the simplest and recommended choice is to bid at the "cut-off price" — this means you agree to pay whatever final price the company sets within the band, usually the top.',
          },
          {
            p: 'Bidding at cut-off ensures your application is considered at the final issue price. If you bid below the eventual cut-off, your application is rejected. So unless you have a strong reason, always tick cut-off.',
          },
        ],
      },
      {
        id: 'lot-size-calculation',
        heading: 'Calculating your application amount',
        blocks: [
          {
            p: 'Your blocked amount = lot size × number of lots × cut-off price. If the lot size is 140 shares, the cut-off is ₹105, and you apply for one lot, the blocked amount is 140 × 1 × 105 = ₹14,700.',
          },
          {
            p: 'The retail category caps a single application at ₹2 lakh. To stay within it, divide ₹2,00,000 by the per-lot cost to find the maximum lots you can apply for. Remember that in an oversubscribed IPO, extra lots do not improve retail allotment odds.',
          },
        ],
      },
      {
        id: 'upi-mandate',
        heading: 'Approving the UPI mandate',
        blocks: [
          {
            p: 'After you submit, the exchange sends a collect request (mandate) to your UPI app. You must approve it — typically within 24 hours and before the IPO closes — by entering your UPI PIN. This blocks the funds; it does not transfer them.',
          },
          {
            p: 'If you miss the mandate approval window, your application will not be processed. Approve it promptly and keep enough balance in the account so the block doesn\'t fail.',
          },
        ],
      },
      {
        id: 'after-close-date',
        heading: 'What happens after the close date',
        blocks: [
          {
            ol: [
              'Subscription closes (usually after 3 days) and the registrar tallies all valid applications.',
              'Allotment is finalised — by lottery if the retail portion is oversubscribed.',
              'If you get shares, the blocked money is debited and shares are credited to your demat account. If not, the block is released.',
              'The stock lists on the NSE/BSE on the listing date, where you can sell or hold.',
            ],
          },
          {
            p: 'You can check your allotment status on the registrar\'s website (KFin, Link Intime or Bigshare) or in your broker app once allotment is finalised.',
          },
        ],
      },
    ],
  },

  // 4 ------------------------------------------------------------------
  {
    slug: 'ipo-allotment',
    title: 'How IPO Allotment Works — Increase Your Chances',
    category: 'How to Apply',
    teaser: 'The lottery system, oversubscription, checking status and tips to improve your odds.',
    intro:
      'When an IPO is oversubscribed, not everyone who applies gets shares. Allotment in the retail category is done by a computerised lottery overseen by the registrar. Understanding how it works helps you set realistic expectations and improve your genuine chances.',
    sections: [
      {
        id: 'lottery-system',
        heading: 'The lottery system explained',
        blocks: [
          {
            p: 'For retail investors, SEBI mandates that allotment be fair and transparent. When demand exceeds supply, the registrar runs a randomised lottery. Crucially, every valid retail application is treated as equal at the one-lot level — applying for ten lots does not give you ten times the chance of allotment in an oversubscribed retail issue.',
          },
          {
            p: 'SEBI rules guarantee that the maximum number of retail applicants receive at least one lot wherever possible. So in a very popular IPO, applying for a single lot is often the most efficient strategy.',
          },
        ],
      },
      {
        id: 'oversubscription',
        heading: 'What oversubscription means for you',
        blocks: [
          {
            p: 'Oversubscription is the ratio of shares applied for to shares available. A retail oversubscription of 5x means there were five times more retail applications than shares reserved for retail — so, very roughly, about a one-in-five chance of allotment per application.',
          },
          {
            list: [
              'Undersubscribed or near 1x: almost everyone gets a full allotment.',
              'Moderately oversubscribed (2x–10x): allotment by lottery; one-lot applications maximise odds.',
              'Heavily oversubscribed (50x+): allotment becomes a long shot regardless of how you apply.',
            ],
          },
        ],
      },
      {
        id: 'check-allotment-status',
        heading: 'How to check your allotment status',
        blocks: [
          {
            p: 'Once allotment is finalised (usually a few days after the IPO closes), you can check your status using your PAN, application number, or demat ID on the registrar\'s website. The registrar is named in the IPO prospectus and on the IPO\'s detail page on IPO Views.',
          },
          {
            sub: 'Main registrars and their status pages',
          },
          {
            list: [
              'KFin Technologies — ipostatus.kfintech.com',
              'Link Intime — linkintime.co.in (Public Issues section)',
              'Bigshare Services — ipo.bigshareonline.com',
            ],
          },
          {
            p: 'You can also see allotment and credited shares directly in your broker app and in your CDSL/NSDL demat statement.',
          },
        ],
      },
      {
        id: 'refund-timeline',
        heading: 'Refund and credit timeline',
        blocks: [
          {
            p: 'If you don\'t get an allotment, the blocked amount in your bank account is released — there is no actual refund because the money was never debited under ASBA/UPI. The block is typically lifted within a day of allotment finalisation.',
          },
          {
            p: 'If you do get allotted, the exact amount for your shares is debited and the shares are credited to your demat account, usually a day or two before listing.',
          },
        ],
      },
      {
        id: 'improve-your-chances',
        heading: 'Tips to improve your allotment chances',
        blocks: [
          {
            list: [
              'Apply for one lot, not many — in an oversubscribed retail IPO, each application is one lottery ticket regardless of size.',
              'Use multiple demat accounts held by different family members, each with its own PAN — every distinct PAN is a separate lottery entry. (Never apply twice on the same PAN; that disqualifies all applications.)',
              'Apply at the cut-off price so your bid is always valid at the final price.',
              'Ensure the UPI mandate is approved and funds are available, so your application isn\'t rejected on a technicality.',
              'Avoid last-minute applications that can fail due to UPI or bank delays.',
            ],
          },
          {
            p: 'Family applications are legitimate as long as each applicant is a genuine account holder applying once on their own PAN with their own funds.',
          },
        ],
      },
    ],
  },

  // 5 ------------------------------------------------------------------
  {
    slug: 'mainboard-vs-sme',
    title: 'Mainboard vs SME IPO — Key Differences Explained',
    category: 'IPO Basics',
    teaser: 'Exchanges, lot sizes, minimum investment, risk and liquidity — and who should apply.',
    intro:
      'India has two distinct IPO segments: mainboard and SME. They differ in size, cost of entry, risk and liquidity. Knowing the difference helps you choose IPOs that match your capital and risk appetite.',
    sections: [
      {
        id: 'exchange-differences',
        heading: 'Where they list',
        blocks: [
          {
            p: 'Mainboard IPOs list on the primary platforms of the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE). SME IPOs list on dedicated platforms designed for smaller companies: NSE Emerge and BSE SME.',
          },
          {
            p: 'The SME platforms have lighter eligibility and disclosure requirements, which lets smaller, younger companies raise public capital — but also means less information and oversight for investors.',
          },
        ],
      },
      {
        id: 'lot-size-and-investment',
        heading: 'Lot size and minimum investment',
        blocks: [
          {
            p: 'This is the biggest practical difference for retail investors.',
          },
          {
            list: [
              'Mainboard: one lot is engineered to cost roughly ₹14,000–₹15,000 at the upper band, keeping IPOs accessible to small investors.',
              'SME: lot sizes are far larger, with a minimum application often running ₹1,00,000–₹1,50,000 or more. SME IPOs are effectively aimed at investors with bigger tickets.',
            ],
          },
        ],
      },
      {
        id: 'risk-profile',
        heading: 'Risk profile',
        blocks: [
          {
            p: 'SME companies are typically smaller, younger and less proven than mainboard companies. Their financials can be more volatile, promoter concentration is often higher, and there is less analyst coverage. That translates into higher potential reward but also materially higher risk.',
          },
          {
            p: 'Mainboard companies face stricter listing norms, more disclosure and broader institutional scrutiny, which generally makes them lower-risk than SME issues — though no IPO is risk-free.',
          },
        ],
      },
      {
        id: 'liquidity',
        heading: 'Liquidity after listing',
        blocks: [
          {
            p: 'Mainboard stocks trade actively with many buyers and sellers, so you can usually enter or exit easily near the market price. SME stocks are far less liquid: trading volumes are thin, bid-ask spreads are wide, and SME shares trade in fixed market lots rather than single shares.',
          },
          {
            p: 'Low liquidity means it can be hard to sell an SME stock quickly without moving the price, which is an important consideration if you may need to exit.',
          },
        ],
      },
      {
        id: 'who-should-apply',
        heading: 'Who should apply to which?',
        blocks: [
          {
            list: [
              'Beginners and small investors: start with mainboard IPOs — lower entry cost, better liquidity, more information.',
              'Experienced investors with larger capital and higher risk tolerance: SME IPOs can offer outsized gains but demand careful due diligence on the company.',
            ],
          },
          {
            p: 'Whatever the segment, read the prospectus, check the financials and use GMP and subscription data as supporting signals — not as the whole decision.',
          },
        ],
      },
    ],
  },

  // 6 ------------------------------------------------------------------
  {
    slug: 'ipo-listing-gains',
    title: 'How to Maximise IPO Listing Gains — Strategy Guide',
    category: 'Investment Strategy',
    teaser: 'When to sell, profit after tax, using GMP and subscription data, and common mistakes.',
    intro:
      'Getting an allotment is only half the job — deciding when and whether to sell determines your actual return. This strategy guide covers timing your exit on listing day, calculating profit after tax, and the data that should inform your decision.',
    sections: [
      {
        id: 'when-to-sell',
        heading: 'When to sell on listing day',
        blocks: [
          {
            p: 'There is no single right answer, but listing-day price action tends to follow recognisable patterns. Many strong listings open high, see early profit-booking, and then stabilise. Common approaches:',
          },
          {
            list: [
              'Sell at open: capture the listing pop immediately if the opening price meets your target. Lowest risk if you only wanted the listing gain.',
              'Wait until ~10am: let the initial volatility settle; sometimes the price recovers after early profit-booking.',
              'Hold to close or beyond: appropriate only if you believe in the company\'s longer-term prospects, not just the listing pop.',
            ],
          },
        ],
      },
      {
        id: 'profit-after-tax',
        heading: 'Calculating profit after tax',
        blocks: [
          {
            p: 'Gains on shares sold within 12 months are short-term capital gains (STCG). For listing-day selling, your gain is short-term and taxed accordingly — historically at 15%, though investors should confirm the current STCG rate, as it has been revised.',
          },
          {
            p: 'A quick example: you\'re allotted one lot of 140 shares at ₹105 (cost ₹14,700) and sell at ₹150 (₹21,000). Your gross gain is ₹6,300. At a 15% STCG rate that\'s ₹945 in tax, leaving roughly ₹5,355 net — before brokerage and statutory charges. Always compute the after-tax, after-cost figure, not just the headline pop.',
          },
        ],
      },
      {
        id: 'using-gmp',
        heading: 'Using GMP to decide',
        blocks: [
          {
            p: 'GMP gives you a market-implied estimate of the listing price (issue price + GMP). A strong, stable or rising GMP suggests a healthy listing and supports selling into strength on day one. A collapsing GMP in the final days is a warning that listing-day demand may disappoint.',
          },
          {
            p: 'Treat GMP as directional. Use the IPO Views GMP-accuracy score to judge how reliable the signal has historically been before leaning on it.',
          },
        ],
      },
      {
        id: 'subscription-data',
        heading: 'Reading subscription data',
        blocks: [
          {
            p: 'Subscription numbers reveal the depth of demand across investor categories. The QIB (institutional) figure is especially telling — strong QIB demand signals informed, large-scale conviction, which often correlates with better listings.',
          },
          {
            list: [
              'High QIB + high overall subscription: typically supportive of a strong listing.',
              'Retail-heavy but weak QIB: be cautious — institutional money is staying away.',
              'Weak across the board: higher chance of a flat or negative listing.',
            ],
          },
        ],
      },
      {
        id: 'hold-vs-sell',
        heading: 'When to hold versus sell',
        blocks: [
          {
            p: 'If you applied purely for listing gains, sell once your target is hit and move on — don\'t let a good gain turn into a loss while waiting for more. If you genuinely believe in the business and bought as a long-term investor, listing-day volatility is noise; hold based on fundamentals, not the GMP.',
          },
          {
            p: 'The mistake is applying for a quick flip and then holding a falling stock out of hope. Decide your plan before listing day.',
          },
        ],
      },
      {
        id: 'common-mistakes',
        heading: 'Common mistakes to avoid',
        blocks: [
          {
            list: [
              'Chasing every IPO on GMP hype without reading the fundamentals.',
              'Confusing a listing-gain trade with a long-term investment after the fact.',
              'Ignoring taxes and charges when calculating "profit".',
              'Holding a weak listing hoping it recovers, instead of cutting a small loss.',
              'Applying for many lots expecting better allotment odds in an oversubscribed retail IPO.',
            ],
          },
          {
            p: 'A clear, pre-decided plan — entry reason, target, and exit rule — beats reacting emotionally to listing-day swings.',
          },
        ],
      },
    ],
  },
];
