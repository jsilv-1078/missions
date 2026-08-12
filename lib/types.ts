export type MarketStoryKind =
  | "high_sales_30d"
  | "biggest_gain"
  | "biggest_loss"
  | "recent_sale"
  | "grade_gap"
  | "sales_surge"
  | "rookie_watch"
  | "vintage_mover"
  | "player_index"
  | "player_snapshot"
  | "price_volume"
  | "market_matchup";

export type MarketGradePrice = { grade: string; price: number };
export type MarketSale = { date: string; price: number; venue?: string };

export type MarketInsightItem = {
  id: string;
  player: string;
  sport: string;
  cardTitle: string;
  imageUrl: string;
  grade: string;
  currentValue: number;
  change30d: number;
  sales30d: number;
};

export type MarketInsight = {
  label?: string;
  volumePercentile?: number;
  cardsTracked?: number;
  risingCount?: number;
  fallingCount?: number;
  flatCount?: number;
  totalSales30d?: number;
  averageChange30d?: number;
  totalValue30d?: number;
  averageSale30d?: number;
  priorTotalSales30d?: number;
  priorTotalValue30d?: number;
  priorAverageSale30d?: number;
  salesChange30d?: number;
  totalValueChange30d?: number;
  averageSaleChange30d?: number;
  trackedCardMovement30d?: number;
  catalogMatches?: number;
  coverageDays?: number;
  score?: number;
  scoreLabel?: string;
  scoreBreakdown?: {
    liquidity: number;
    momentum: number;
    breadth: number;
    stability: number;
    evidence: number;
  };
  items?: MarketInsightItem[];
};

export type MarketStory = {
  id: string;
  type: "market";
  storyKind: MarketStoryKind;
  player: string;
  sport: string;
  headline: string;
  summary: string;
  cardId: string;
  cardTitle: string;
  imageUrl: string;
  grade: string;
  currentValue: number;
  change7d: number;
  change30d: number;
  sales7d: number;
  sales30d: number;
  confidenceGrade: string;
  freshnessDays: number;
  chart: number[];
  comps: Array<{ date: string; price: number; venue?: string }>;
  rookie: boolean;
  cardYear: number;
  gradePrices: MarketGradePrice[];
  gradeGapMultiple: number;
  salesPaceMultiple: number;
  previous23DaySales: number;
  recentSale?: MarketSale;
  insight?: MarketInsight;
  updatedAt: string;
  demo: boolean;
};

export type NewsStory = {
  id: string;
  type: "news";
  player: string;
  sport: string;
  category: string;
  headline: string;
  summary: string;
  imageUrl: string;
  source: string;
  articleUrl: string;
  publishedAt: string;
  relatedCardId?: string;
  updatedAt: string;
  demo: boolean;
};

export type FeedStory = MarketStory | NewsStory;

export type NewArticleInput = {
  articleUrl: string;
  source: string;
  headline: string;
  summary: string;
  imageUrl: string;
  player: string;
  sport: string;
  category: string;
  publishedAt: string;
  relatedCardId?: string;
};
