export interface ArticleAuthor {
  name: string;
}

export interface Article {
  id: number;
  title: string;
  summary: string;
  url: string;
  imageUrl: string;
  newsSite: string;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
  authors: ArticleAuthor[];
}

export interface ArticleList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Article[];
}
