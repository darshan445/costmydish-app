/**
 * User-facing copy for the Calculate food cost experience.
 * Keep routes/DB named recipes — only UI language lives here.
 */

export const FOOD_COST_COPY = {
  action: {
    calculate: 'Calculate food cost',
    calculateAnother: 'Calculate another food cost',
    calculateA11y: 'Calculate food cost',
    fabLabel: 'Calculate',
    continue: 'Continue',
    discard: 'Discard',
    keep: 'Keep it',
    keepDraft: 'Keep it',
    resume: 'Resume',
    discardAndStartNew: 'Discard and start new',
    seeResult: 'See food cost result',
    saveChanges: 'Save changes',
    addToDish: 'Add to dish',
  },

  nav: {
    home: 'Home',
    dishes: 'Dishes',
    library: 'Library',
    settings: 'Settings',
  },

  home: {
    coachTitle: 'Calculate food cost for your dish',
    coachSub:
      'See what your dish costs and how much you make, so you can set a confident menu price.',
    coachSteps: [
      { n: 1, title: 'Dish', hint: 'Name it & set your food cost goal' },
      { n: 2, title: 'Ingredients', hint: 'What you use in the dish' },
      { n: 3, title: 'Price', hint: 'Set your selling price & see your profit' },
    ],
    greetingSubtitle: 'A quick look at your recent food costs',
    recentTitle: 'Recent food costs',
    totalDishes: 'Total dishes',
    draftEyebrow: 'UNFINISHED',
    draftTitle: 'Finish calculating food cost',
    discardTitle: 'Discard unfinished calculation?',
    discardMessage: 'This clears your saved progress for this food cost. You can’t undo this.',
  },

  dishes: {
    title: 'Dishes',
    subtitle: 'Your food cost results',
    emptyTitle: 'No food costs yet',
    emptyDescription:
      'Calculate food cost for your first dish to see cost, food cost %, and profit.',
  },

  library: {
    title: 'Library',
    subtitle: 'Your buy prices — reuse across dishes',
    emptyTitle: 'Library is empty',
    emptyDescription:
      'Add buy prices here, or save ingredients while you calculate food cost for a dish.',
  },

  settings: {
    usageDishes: 'Dishes',
    usageLibrary: 'Library',
  },

  draft: {
    conflictTitle: 'Unfinished calculation',
    conflictMessage: (name) =>
      `You have an unfinished food cost for "${name}". Resume it, or discard and start fresh.`,
    untitled: 'Untitled dish',
    stepLabels: {
      1: 'Step 1 of 3 — Dish',
      2: 'Step 2 of 3 — Ingredients',
      3: 'Step 3 of 3 — Price',
    },
  },

  wizard: {
    header: 'Calculate food cost',
    dishName: 'Dish name',
    dishNameRequired: 'Dish name is required',
    dishNamePlaceholder: 'Dish name',
    totalDishCost: 'Total dish cost',
    stepTitles: {
      1: "What's the dish?",
      2: 'What ingredients do you use in this recipe?',
      3: "What's your selling price?",
    },
    stepSubs: {
      1: "We'll calculate food cost for this.",
      2: 'Add each ingredient and how much you use.',
      3: "We'll show food cost % and profit. You can add more selling formats if needed.",
    },
  },

  result: {
    justSaved: 'Your food cost result',
    default: 'Food cost result',
    summary: 'Food cost summary',
    totalDishCost: 'Total dish cost',
    dishCost: 'Dish cost',
    noFormats: 'No selling prices set yet. Edit this food cost to add formats.',
    deleteTitle: 'Delete this food cost?',
    deleteMessage:
      'This permanently removes this dish and its cost breakdown. This cannot be undone.',
    deleteConfirm: 'Delete food cost',
    deleteCancel: 'Keep it',
  },

  edit: {
    header: 'Edit food cost',
  },

  paywall: {
    recipe: "You've reached the 5 dish limit on the free plan.",
    ingredient: "You've reached the 20 library item limit on the free plan.",
    priceHistory: 'Price history is a Hobbyist feature.',
    upgrade: 'Unlock unlimited food cost calculations, price history, and more.',
    changePlan:
      'Switch between monthly and annual billing. Your store account handles proration.',
  },
};
