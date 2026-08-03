export type MarketStory = {
  id: string;
  type: "market";
  storyKind: "gain" | "decline" | "volume" | "watchlist";
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
