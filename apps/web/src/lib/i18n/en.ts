/**
 * English strings. Every user-facing string goes through this file so adding a
 * language later means adding one more file with the same keys.
 *
 * Use {name} placeholders for values: t("gallery.count", { count: 3 }).
 */
export const en = {
  "app.name": "Boomerang",
  "app.tagline": "Lost something at school? See what's been found.",

  "visibility.full": "Full",
  "visibility.limited": "Limited",
  "visibility.staff_only": "Staff-only",
  "visibility.full.help": "Students see the photo and details.",
  "visibility.limited.help": "Students see the category, color, and where it was found. No photo.",
  "visibility.staff_only.help": "Not listed for students. They ask at the office.",
  "visibility.wallet_rule": "Wallets, IDs, and cards can never show a photo.",

  "preset.standard": "Standard",
  "preset.strict": "Strict",
  "preset.open": "Open",

  "category.clothing": "Clothing",
  "category.bottle_lunchbox": "Water bottle or lunchbox",
  "category.bag": "Bag or backpack",
  "category.books_stationery": "Books and stationery",
  "category.calculator_supplies": "Calculator or school supplies",
  "category.sports_gear": "Sports gear",
  "category.electronics": "Phone, tablet, or laptop",
  "category.earbuds_headphones": "Earbuds or headphones",
  "category.keys": "Keys",
  "category.wallet_id": "Wallet, ID, or cards",
  "category.glasses_medical": "Glasses or medical item",
  "category.jewelry_watch": "Jewelry or watch",
  "category.instrument": "Musical instrument",
  "category.other": "Other",

  "color.black": "Black",
  "color.white": "White",
  "color.gray": "Gray",
  "color.red": "Red",
  "color.orange": "Orange",
  "color.yellow": "Yellow",
  "color.green": "Green",
  "color.blue": "Blue",
  "color.purple": "Purple",
  "color.pink": "Pink",
  "color.brown": "Brown",
  "color.beige": "Beige",
  "color.silver": "Silver",
  "color.gold": "Gold",
  "color.multicolor": "Multicolor",

  "item.hasNameLabel": "Has a name label",

  "home.placeholder": "The app is being built. Check back soon.",
} as const;

export type MessageKey = keyof typeof en;
