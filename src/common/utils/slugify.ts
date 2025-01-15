// src/utils/slugify.ts
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-'); // Replace spaces and non-alphanumeric characters with hyphens
}
