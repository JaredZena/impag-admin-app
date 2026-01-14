import dayjs from 'dayjs';
import {
  DaySuggestions,
  GeneratorConfig,
  ImportantDate,
  MonthPattern,
  ProductCategory,
} from '../types/socialCalendar';

export class CategorySelector {
  async selectCategories(
    targetDate: Date,
    monthPattern: MonthPattern,
    nearbyDates: ImportantDate[],
    recentHistory: DaySuggestions[],
    config: GeneratorConfig
  ): Promise<{
    categories: ProductCategory[];
    scores: Record<ProductCategory, number>;
  }> {
    const scores: Record<ProductCategory, number> = {} as Record<ProductCategory, number>;

    // Base scores from monthly pattern
    for (const entry of monthPattern.categories) {
      scores[entry.category] = entry.weight;
    }

    // Boost categories tied to nearby important dates
    nearbyDates.forEach(date => {
      date.relatedCategories.forEach(cat => {
        if (!scores[cat]) scores[cat] = 0.3;
        scores[cat] *= config.dateBoostMultiplier;
      });
    });

    // Penalize categories used recently (within dedup window)
    const target = dayjs(targetDate);
    const recentUsage = new Map<ProductCategory, number>();

    recentHistory.forEach(day => {
      const dayDiff = Math.abs(target.diff(dayjs(day.date), 'day'));
      if (dayDiff <= config.dedupWindowDays) {
        day.suggestions.forEach(suggestion => {
          suggestion.products.forEach(product => {
            if (product.category) {
              const current = recentUsage.get(product.category) ?? 0;
              recentUsage.set(product.category, current + 1);
            }
          });
        });
      }
    });

    recentUsage.forEach((count, cat) => {
      if (!scores[cat]) scores[cat] = 0.3;
      scores[cat] *= Math.pow(config.recentPenaltyMultiplier, count);
    });

    // Sort and pick top categories (up to 3)
    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, score]) => ({ cat: cat as ProductCategory, score }));

    const selected = sorted
      .slice(0, Math.max(1, Math.min(3, sorted.length)))
      .map(entry => entry.cat);

    const normalizedScores: Record<ProductCategory, number> = {} as Record<ProductCategory, number>;
    sorted.forEach(({ cat, score }) => {
      normalizedScores[cat] = Number(score.toFixed(3));
    });

    const fallbackCategory =
      monthPattern.categories[0]?.category || ('vivero' as ProductCategory);

    return {
      categories: selected.length ? selected : [fallbackCategory],
      scores: normalizedScores,
    };
  }
}






