import type { ArticleList } from '../../domain/entities/Article.js';
import type {
  GetArticlesParams,
  NewsRepository,
} from '../../domain/repositories/NewsRepository.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';

export class GetNewsUseCase {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly translationService: TranslationService,
  ) {}

  async execute(
    params: GetArticlesParams & { locale: Locale },
  ): Promise<ArticleList> {
    const articles = await this.newsRepository.getArticles({
      limit: params.limit,
      offset: params.offset,
      search: params.search,
    });

    if (params.locale === 'en') return articles;

    const results = await Promise.all(
      articles.results.map(async (article) => {
        const [title, summary] = await this.translationService.translateMany(
          [article.title, article.summary],
          params.locale,
        );

        return {
          ...article,
          title,
          summary,
        };
      }),
    );

    return {
      ...articles,
      results,
    };
  }
}
