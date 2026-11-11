// Product Item Code & Category Sequence Utilities
// Prefix Rules:
// - Wood: WD-xxx (e.g. WD-001, WD-002)
// - Melamine: MEL-xxx (e.g. MEL-001, MEL-002)
// - Electrical Items: ELC-xxx (e.g. ELC-001, ELC-002)

export const CATEGORY_CODE_PREFIXES = {
  wood: 'WD-',
  melamine: 'MEL-',
  electrical_item: 'ELC-',
};

export const getCategoryPrefix = (category) => {
  if (!category) return 'WD-';
  const cat = String(category).toLowerCase().trim();
  if (cat === 'wood' || cat.includes('wood') || cat === 'living_room' || cat === 'bedroom' || cat === 'dining') {
    return 'WD-';
  }
  if (cat === 'melamine' || cat.includes('melamine') || cat === 'office') {
    return 'MEL-';
  }
  if (cat === 'electrical_item' || cat === 'electrical' || cat.includes('electric')) {
    return 'ELC-';
  }
  return 'WD-';
};

export const generateNextItemCode = (category, currentProducts = []) => {
  const prefix = getCategoryPrefix(category);
  const numbers = (Array.isArray(currentProducts) ? currentProducts : [])
    .filter((p) => p && p.item_code && String(p.item_code).toUpperCase().startsWith(prefix))
    .map((p) => {
      const match = String(p.item_code).toUpperCase().match(new RegExp(`^${prefix}(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};
