// Single source of truth for post category colors.
// "Current" categories are the ones offered in the article editor (see CURRENT_CATEGORIES).
// "Legacy" categories no longer appear when writing a new post, but older posts in the
// database still carry them, so they still need a color instead of falling back to gray.
const CATEGORY_COLORS = {
  // Current taxonomy
  ICS: '#6f42c1',
  WORLD: '#0f6674',
  ACADEMIC: '#2f5fa8',
  SCIENCE_TECH: '#0f7a5c',
  STUDENT_LIFE: '#a3236a',
  CULTURE: '#563d7c',
  // Legacy taxonomy
  SPORTS: '#1e7e34',
  EVENTS: '#fd7e14',
  CLUBS: '#6f42c1',
  ANNOUNCEMENTS: '#dc3545',
  NEWS: '#6c757d',
  TECHNOLOGY: '#0f6674',
  ARTS: '#563d7c',
  SCIENCE: '#0f7a5c'
};

const DEFAULT_COLOR = '#6c757d';

export const CURRENT_CATEGORIES = ['ICS', 'WORLD', 'ACADEMIC', 'SCIENCE_TECH', 'STUDENT_LIFE', 'CULTURE'];

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

export function getCategoryLabel(category) {
  if (!category) return '';
  return category === 'SCIENCE_TECH' ? 'Science/Tech' : category.replace(/_/g, ' ');
}
