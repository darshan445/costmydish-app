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
    saveDish: 'See full result',
    saveChanges: 'Save changes',
    addToDish: 'Add to dish',
    addIngredient: 'Add ingredient',
    addAnotherIngredient: 'Add another ingredient',
    setMyPrice: 'Set my price',
    editMyPrice: 'Edit my price',
    addSellingPrice: 'Add selling price',
    addAnotherWayToSell: 'Add another way to sell',
    editSellingPrice: 'Edit selling price',
    editWayToSell: 'Edit way to sell',
    save: 'Save',
  },

  nav: {
    home: 'Home',
    dishes: 'Dishes',
    library: 'Library',
    settings: 'Settings',
  },

  home: {
    startTitle: 'What does your dish really cost?',
    startSub: 'Get your cost and a selling price in 2 minutes.',
    startLabel: 'What are you making?',
    startPlaceholder: 'e.g. Brownies',
    orPick: 'Or pick one:',
    nextAddIngredients: 'Next: add ingredients →',
    yieldInvalid: 'Enter a number above 0',
    sampleTitle: 'See an example result',
    sampleSub: 'Chocolate chip cookies, worked out for you',
    loadError: 'Couldn’t load your dishes.',
    retry: 'Try again',
    greetingSubtitle: 'A quick look at your recent food costs',
    recentTitle: 'Recent food costs',
    totalDishes: 'Total dishes',
  },

  sample: {
    eyebrow: 'Example food cost result',
    note: 'This is an example. Your own dish shows the same breakdown with your ingredients and prices.',
    cta: 'Calculate my own dish',
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
    loadError: 'Couldn’t load your library.',
    emptyTitle: 'Library is empty',
    emptyDescription:
      'Add buy prices here, or save ingredients while you calculate food cost for a dish.',
  },

  settings: {
    usageDishes: 'Dishes',
    usageLibrary: 'Library',
  },

  wizard: {
    header: 'Calculate food cost',
    dishName: 'Dish name',
    untitledDish: 'Untitled dish',
    dishNamePlaceholder: 'e.g. Chocolate chip cookies',
    yieldLabel: 'Yield',
    yieldPlaceholder: 'e.g. 12',
    yieldHelper: 'How many this recipe makes',
    yieldUnitLabel: 'Unit',
    categoryLabel: 'Category',
    targetLabel: 'Food cost target',
    targetHint: 'A common food cost target is 25–35%.',
    ingredientsTitle: 'Ingredients',
    ingredientsEmptyTitle: 'No ingredients yet',
    ingredientsEmptySub: 'Add what goes into this dish.',
    totalCost: 'Total cost',
    costPer: (unit) => `Cost per ${unit}`,
    suggestedPer: (unit) => `Suggested per ${unit}`,
    yourPricePer: (unit) => `Your price per ${unit}`,
    foodCost: 'Food cost',
    priceSheetTitle: (unit) => `Your price per ${unit}`,
    priceSheetHint: (qty, unit) => (qty != null && unit !== 'whole dish'
      ? `Your dish makes ${qty} ${unit}. Enter the price for 1 ${unit}. Leave empty to use the suggested price.`
      : 'Leave empty to use the suggested price.'),
    useSuggested: (price) => `Use suggested ${price}`,
    removePrice: 'Remove my price',
    formatPreviewCost: (cost, price) => `cost ${cost} · price ${price}`,
    waysToSellTitle: 'Ways you sell it',
    usedUnitMismatch: (family, unit) => (family === 'count'
      ? `You bought this by count (${unit}). Use piece, each or dozen.`
      : `You bought this by ${family} (${unit}). Pick a ${family} unit to work out the cost.`),
    marginStatus: { good: 'On target', warning: 'Slightly over', danger: 'Over budget' },
    sellingAtLoss: 'Selling at a loss',
    formatsOnTarget: 'All on target',
    formatsOverTarget: (n) => `${n} over target`,
    saveNeedsIngredient: 'Add an ingredient — your dish saves automatically',
    saveFailedStatus: 'Couldn’t save. Tap to retry',
    scrollForMoreCategories: 'Scroll to see more categories',
    scrollForMoreIngredients: 'Scroll to see more ingredients',
  },

  result: {
    justSaved: 'Your food cost result',
    default: 'Food cost result',
    summary: 'Food cost summary',
    totalDishCost: 'Total dish cost',
    dishCost: 'Dish cost',
    noSellingPrice: 'No selling price set yet. Showing the suggested price for your target.',
    noSellingPriceBadge: 'No selling price',
    deleteTitle: 'Delete this food cost?',
    deleteMessage:
      'This permanently removes this dish and its cost breakdown. This cannot be undone.',
    deleteConfirm: 'Delete food cost',
    deleteCancel: 'Keep it',
    addAnotherWay: 'Sell it another way',
    addAnotherWayHint: 'e.g. by the slice and as a whole cake',
  },

  sellingFormat: {
    hint: 'Unit is just a label. Enter how many this dish makes in that unit and your price for one.',
    unitLabel: 'Unit',
    qtyLabel: 'How many this dish makes',
    qtyRequired: 'Enter how many this dish makes',
    priceRequired: 'Enter a price above 0',
    remove: 'Remove this way to sell',
    removeConfirm: 'Remove',
    removeTitle: 'Remove this way to sell?',
    removeMessage: (name) => `${name} will be removed from this dish. Your ingredients and other ways to sell stay as they are.`,
    removeCancel: 'Keep it',
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
