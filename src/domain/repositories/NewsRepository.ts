import type { ArticleList } from '../entities/Article.js';

export interface GetArticlesParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface NewsRepository {
  getArticles(params?: GetArticlesParams): Promise<ArticleList>;
}
