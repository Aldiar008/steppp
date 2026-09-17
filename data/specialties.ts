/**
 * The field vocabulary, in Russian.
 *
 * The engine matches on canonical tokens (`computer_science`, `ux`), and those
 * tokens are what the catalogue and the profile both speak. This is the one
 * place that turns them into words a sixteen-year-old reads, so the same token
 * cannot be "Компьютерные науки" on one screen and "IT" on another.
 *
 * A token nobody has translated yet falls back to itself rather than to a
 * guess, which is visible in the UI and easy to fix.
 */
export interface Specialty {
  id: string;
  label: string;
}

export const SPECIALTIES: readonly Specialty[] = [
  { id: "programming", label: "Программирование" },
  { id: "natural_sciences", label: "Естественные науки" },
  { id: "humanities", label: "Гуманитарные науки" },
  { id: "education", label: "Педагогика" },
  { id: "architecture", label: "Архитектура" },
  { id: "veterinary", label: "Ветеринария" },
  { id: "agriculture", label: "Сельское хозяйство" },
  { id: "arts", label: "Искусство" },
  { id: "languages", label: "Языки и лингвистика" },
  { id: "computer_science", label: "Компьютерные науки" },
  { id: "data_science", label: "Данные и аналитика" },
  { id: "ux", label: "Дизайн интерфейсов" },
  { id: "design", label: "Дизайн и искусство" },
  { id: "engineering", label: "Инженерия" },
  { id: "medicine", label: "Медицина" },
  { id: "business", label: "Бизнес" },
  { id: "economics", label: "Экономика" },
  { id: "mathematics", label: "Математика" },
  { id: "physics", label: "Физика" },
  { id: "law", label: "Право" },
];

export function specialtyLabel(fieldId: string): string {
  return SPECIALTIES.find((item) => item.id === fieldId)?.label ?? fieldId;
}
