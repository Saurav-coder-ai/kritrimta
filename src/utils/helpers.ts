export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const CATEGORIES = [
  { name: 'AI Tools', slug: 'ai-tools' },
  { name: 'Gadget Reviews', slug: 'gadget-reviews' },
  { name: 'Tech News', slug: 'tech-news' },
  { name: 'Tutorials', slug: 'tutorials' },
] as const;

export function getCategorySlug(category: string): string {
  const found = CATEGORIES.find((c) => c.name === category);
  return found ? found.slug : slugify(category);
}

export function getCategoryFromSlug(slug: string): string | undefined {
  const found = CATEGORIES.find((c) => c.slug === slug);
  return found?.name;
}
