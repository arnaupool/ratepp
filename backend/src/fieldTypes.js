// Field types a note can have. Must match the CHECK constraint (migration 006).
const FIELD_TYPES = [
  'text_long', 'number', 'date', 'location', 'photo', 'gallery', 'list', 'tag',
  'price', 'criteria', 'duration', 'link', 'boolean', 'ingredients', 'steps', 'difficulty',
];

module.exports = { FIELD_TYPES };
