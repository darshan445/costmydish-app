import { BASE_CURRENCY, getCurrency } from '@/lib/currency';
import { formatMoney, formatPercent } from '@/lib/food-cost';
import { FREE_DISH_LIMIT, FREE_PLAN_LIMITS, HOBBYIST_ANNUAL_PRICE, HOBBYIST_MONTHLY_PRICE } from '@/lib/plans';
import { pizzaExample } from '@/lib/presets';

export function pizzaFoodCostAnswer(code = BASE_CURRENCY) {
  const pizza = pizzaExample(code);
  const money = (value) => formatMoney(value, getCurrency(code).symbol);
  return `Divide your total ingredient cost by your selling price and multiply by 100. For example, if a pizza costs ${money(pizza.totalCost)} to make and you sell it for ${money(pizza.wholePrice)}, your food cost percentage is ${formatPercent(pizza.wholePercent)}. CostMyDish calculates this automatically for every dish and every way you sell it. You can also try the free food cost calculator on this site.`;
}

/** Answers whose example money follows the visitor's currency (key → builder). */
export const LOCAL_ANSWERS = { pizzaFoodCost: pizzaFoodCostAnswer };

export const MARKETING_FAQ = [
  {
    q: 'How do I calculate food cost percentage?',
    a: pizzaFoodCostAnswer(),
    localAnswer: 'pizzaFoodCost',
  },
  {
    q: 'What is a good food cost percentage for a restaurant?',
    a: 'Most restaurants target 28–35% food cost. Cafés and bakeries often aim for 25–35%. CostMyDish lets you set your own target and shows green, yellow, or red status so you always know when a dish is off target.',
  },
  {
    q: 'What is the best free food cost calculator app?',
    a: `CostMyDish offers a free plan with full food cost %, profit, and margin calculations for up to ${FREE_DISH_LIMIT} dishes. Unlike spreadsheets, it handles unit conversion and recalculates every dish when ingredient prices change.`,
  },
  {
    q: 'Can I use CostMyDish as a bakery pricing calculator?',
    a: 'Yes. Add your ingredients (flour, butter, eggs, sugar) with the price you paid and pack size. Build your recipe, set how you sell (whole cake or by the slice), and CostMyDish shows your food cost % and profit for each format instantly.',
  },
  {
    q: 'Does CostMyDish work for food trucks and caterers?',
    a: 'Yes. CostMyDish is built for any food business — restaurants, food trucks, caterers, home bakers, and cafés. You can add more than one way to sell each dish, so a food truck selling a combo and single items can price both from one recipe.',
  },
  {
    q: 'How is CostMyDish different from meez or xtraCHEF?',
    a: 'Enterprise tools like meez and xtraCHEF target larger operations with invoice scanning and integrations — often $75+/month. CostMyDish is a mobile-first food cost calculator: faster to start, free tier, and focused on recipe costing and margin math.',
  },
  {
    q: 'Does CostMyDish work in the UK, Canada, Australia, and India?',
    a: 'Yes. Use any currency (USD, GBP, CAD, AUD, INR, and more) and metric or imperial units. CostMyDish is used by food businesses worldwide.',
  },
  {
    q: 'Is CostMyDish free?',
    a: `Yes. The free plan gives you ${FREE_PLAN_LIMITS} with full cost calculations, profit for each way you sell, and margin status badges. Upgrade to Hobbyist (${HOBBYIST_MONTHLY_PRICE}/mo or ${HOBBYIST_ANNUAL_PRICE}/year in the US; local prices vary by country) for unlimited dishes and ingredients, price history, and cloud sync.`,
  },
];

export const SUPPORT_FAQ = [
  {
    q: 'How do I reset my password?',
    a: 'On the login screen, use the password reset option. A reset link will be sent to your registered email.',
  },
  {
    q: 'How do I cancel my Hobbyist subscription?',
    a: 'Subscriptions are managed through the App Store (iOS) or Google Play (Android). Open your store account → Subscriptions → CostMyDish → Cancel.',
  },
  {
    q: 'Will changing currency convert my recipe prices?',
    a: 'No. Changing currency in Settings updates display symbols only. You will need to update ingredient and selling prices manually.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Delete Account in the app. This permanently removes your recipes, ingredients, and profile data.',
  },
];
