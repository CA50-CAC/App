/**
 * English strings. Every user-facing string goes through this file so adding a
 * language later means adding one more file with the same keys.
 *
 * Use {name} placeholders for values: t("gallery.count", { count: 3 }).
 */
export const en = {
  "app.name": "LostBox",
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

  "common.saving": "Saving…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.back": "Back",
  "common.continue": "Continue",
  "common.optional": "optional",
  "common.error.generic": "Something went wrong on our side. Please try again.",
  "common.error.rateLimited": "Too many tries. Please wait a few minutes and try again.",
  "common.skipToContent": "Skip to main content",
  "common.demoBanner": "Demo mode: sample data only. Nothing here is real.",

  "home.title": "Lost something at school?",
  "home.lead": "Enter your school's join code to see what's been found. No account needed.",
  "home.staffTitle": "School staff",
  "home.staffSignIn": "Staff sign in",
  "home.setup": "Set up LostBox for your school",
  "home.demoHint": "Try the demo school with code {code}.",

  "join.label": "Join code",
  "join.help": "8 letters and numbers, from a poster or your school's announcement.",
  "join.submit": "Find my school",
  "join.pending": "Looking…",
  "join.error.notFound": "We couldn't find a school with that code. Check it and try again.",
  "join.error.empty": "Enter your school's join code.",

  "login.title": "Staff sign in",
  "login.lead": "We'll email you a sign-in link. No password needed.",
  "login.email": "School email",
  "login.submit": "Email me a sign-in link",
  "login.pending": "Sending…",
  "login.sent.title": "Check your email",
  "login.sent.body": "If {email} can sign in, a link is on its way. It works once and expires in 15 minutes.",
  "login.devLink.title": "Development sign-in link",
  "login.devLink.body": "There's no email in development and demo mode, so here is the link that would have been sent:",
  "login.devLink.open": "Open sign-in link",
  "login.demoHint": "Demo staff account: {email}",
  "login.error.email": "Enter a valid email address.",
  "login.error.link": "That sign-in link didn't work. It may have expired or already been used. Request a new one below.",

  "confirm.title": "Finish signing in",
  "confirm.lead": "Press the button to sign in to LostBox on this device.",
  "confirm.submit": "Sign in",
  "confirm.pending": "Signing in…",

  "nav.items": "Items",
  "nav.newItem": "Add item",
  "nav.claims": "Claims",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",
  "nav.signedInAs": "Signed in as {email}",
  "nav.staffNav": "Staff",

  "admin.pending.title": "Waiting for approval",
  "admin.pending.body": "You can set everything up and add items now. Students can join once LostBox approves your school.",
  "admin.error.owner": "Only a school owner can do that.",
} as const;

export type MessageKey = keyof typeof en;
