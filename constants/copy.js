/**
 * User-facing copy for the Calculate food cost experience.
 * Keep routes/DB named recipes — only UI language lives here.
 */

function cleanDishName(dishName, maxLen = 40) {
  const name = String(dishName ?? '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1).trimEnd()}…`;
}

export const FOOD_COST_COPY = {
  action: {
    calculate: 'Calculate food cost',
    calculateAnother: 'Calculate another food cost',
    calculateA11y: 'Calculate food cost',
    fabLabel: 'Calculate',
    continue: 'Continue',
    continueToPricing: 'Continue to pricing',
    discard: 'Discard',
    keep: 'Keep it',
    keepDraft: 'Keep it',
    resume: 'Resume',
    discardAndStartNew: 'Discard and start new',
    seeResult: 'Save & see food cost',
    saveChanges: 'Save changes',
    addToDish: 'Add to dish',
    addIngredient: 'Add an ingredient',
    addAnotherIngredient: 'Add another ingredient',
    addSellingPrice: 'Add selling price',
    addSellingPriceFor: (dishName) => {
      const name = cleanDishName(dishName);
      return name ? `Add selling price for ${name}` : 'Add selling price';
    },
    addAnotherSellingPrice: 'Add another selling price',
    editSellingPriceFor: (dishName) => {
      const name = cleanDishName(dishName);
      return name ? `Edit selling price for ${name}` : 'Edit selling price';
    },
    updateSellingPrice: 'Update selling price',
    leaveWithoutSaving: 'Leave without saving',
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
    step2CostHint: 'Next you’ll set a selling price to see food cost % and profit.',
    step2SuggestedPrefix: (pct) => `At ${pct}% food cost, sell from about`,
    pricesUpdatedTitle: 'Suggested prices updated',
    pricesUpdatedSub: 'Your selling prices were refreshed to match the new dish cost.',
    priceUpdatedBadge: 'Updated',
    sheetPriceRefreshed: 'Price refreshed from your latest dish cost',
    unsavedPricesTitle: 'Food cost not saved',
    unsavedPricesMessage:
      'You’ve updated selling prices, but this dish isn’t saved yet. Save to keep your food cost result.',
    scrollForMoreCategories: 'Scroll to see more categories',
    scrollForMoreIngredients: 'Scroll to see more ingredients',
    scrollForMoreLiveCost: 'Scroll to see full live food cost',
    stepTitles: {
      1: "What's the dish?",
      2: 'What ingredients do you use in this dish?',
      3: (dishName) => {
        const name = cleanDishName(dishName, 36);
        return name
          ? `What's your selling price for ${name}?`
          : "What's your selling price?";
      },
    },
    stepSubs: {
      1: "We'll calculate food cost for this.",
      2: 'Tap Add an ingredient for each item in the dish.',
      3: 'Enter what customers pay so you can see food cost % and profit.',
    },
    sellingFormatHint:
      'Unit is just a label. Change quantity and price for each way you sell this dish.',
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
    stepTitles: {
      1: "What's the dish?",
      2: 'What ingredients do you use in this dish?',
      3: (dishName) => {
        const name = cleanDishName(dishName, 36);
        return name
          ? `What's your selling price for ${name}?`
          : "What's your selling price?";
      },
    },
    stepSubs: {
      1: 'Update the name, category, or food cost goal.',
      2: 'Change used amounts, or add and remove ingredients.',
      3: 'Update selling prices and check your margins.',
    },
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
