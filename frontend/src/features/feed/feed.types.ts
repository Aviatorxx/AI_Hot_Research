export interface FeedArticle {
  title: string;
  url: string;
  keyword: string;
  source?: string;
}

export interface FeedState {
  articles: FeedArticle[];
  loading: boolean;
}
