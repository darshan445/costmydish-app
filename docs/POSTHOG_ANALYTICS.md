# PostHog behavioral analytics

CostMyDish tracks user actions in **release builds only** (`__DEV__` is excluded). Each signed-in user is identified by their Supabase `user.id`, so you can see per-person activity in PostHog.

## Setup

1. Create a PostHog project at [posthog.com](https://posthog.com).
2. Copy the **Project API key** (`phc_…`).
3. Set env vars (local `.env` and EAS `eas.json` production profile):
   - `EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_real_key`
   - `EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` (or EU host)
4. Every event includes super properties `app_name: costmydish` and `app_version` — use these to filter when multiple apps share one PostHog project.
5. **Analytics-only setup:** we use `PostHogProvider` in JS (no `posthog-react-native/expo` plugin). The Expo plugin is only needed for **error-tracking source map uploads** and requires `@posthog/cli` on the build machine — it is not required for event capture.
6. Ship a **new native build** after adding PostHog. After that, analytics-only JS changes can go out via OTA.

## How to see what each user does

### Person profile (best for “what did this user do?”)

1. PostHog → **People** → search by email or distinct ID (Supabase user UUID).
2. Open the person → **Activity** tab shows every event in order.
3. **Properties** tab shows live traits synced from the app:
   - `ingredient_count`, `recipe_count`
   - `subscription_tier`, `default_food_cost_percent`, `currency`, `unit_system`
   - `onboarding_completed`, `email`

### Session replay (optional)

Enable in PostHog project settings if you want screen recordings. Mobile replay support depends on your PostHog plan and SDK version.

---

## Event catalog

### Auth & onboarding

| Event | When | Key properties |
|-------|------|----------------|
| `onboarding_get_started` | Welcome → Get Started | — |
| `onboarding_sign_in_tapped` | Welcome → Sign in | — |
| `auth_signup_completed` | Sign up success | `has_full_name` |
| `auth_signup_failed` | Sign up error | `message` |
| `auth_login_completed` | Login success | — |
| `auth_login_failed` | Login error | `message` |
| `auth_signed_out` | User signs out | — |

### Navigation

| Event | When | Key properties |
|-------|------|----------------|
| `$screen` | Route change (PostHog native screen event) | `$screen_name` (e.g. `/recipe/create`), `route_segments` |
| `tab_viewed` | Tab bar tap | `tab` (`index`, `recipes`, `ingredients`, `settings`) |

**Note:** PostHog’s Activity table “Url / Screen” column reads `$screen_name`. Custom events like `food_cost_step_viewed` show their step in event properties (`step_name`), not in that column.

### Ingredients

| Event | When | Key properties |
|-------|------|----------------|
| `ingredient_add_tapped` | + on Library tab | `ingredient_count`, `at_limit` |
| `ingredient_create_opened` | Create screen focused | `source` (`library` / `recipe_wizard`), `ingredient_count` |
| `ingredient_created` | Save success | `count`, `failed_count`, `source`, `total_ingredients_after` |
| `ingredient_create_failed` | Save failed | `count`, `message` |
| `ingredient_updated` | Edit saved | `price_changed`, `affected_recipe_count` |

### Food cost wizard (recipes / dishes)

| Event | When | Key properties |
|-------|------|----------------|
| `food_cost_wizard_started` | User starts calculate flow | `source` (`home`, `dishes`, `fab`, `cta`, `new`), `fresh` |
| `food_cost_draft_resumed` | Continues saved draft | `source` |
| `food_cost_draft_discarded` | Draft thrown away | `source` (`home`, `conflict`) |
| `food_cost_step_viewed` | Wizard step shown | `step` (1–3), `step_name` (`dish_details` / `ingredients` / `pricing`), `direction`, `source` |
| `food_cost_ingredient_picker_opened` | Taps Add ingredient in wizard | `wizard_step` |
| `food_cost_add_to_library_tapped` | Taps save new item to library from wizard | `wizard_step` |
| `food_cost_returned_from_library` | Returns from library create to wizard | `wizard_step`, `flow`, `pending_count` |
| `food_cost_ingredient_added` | Adds ingredient qty to recipe | `wizard_step`, `recipe_ingredient_count`, `from_queue` |
| `food_cost_selling_format_added` | Sets selling price in step 3 | `wizard_step`, `selling_format_count`, `unit` |
| `food_cost_wizard_completed` | Recipe saved | `recipeId`, `ingredient_count`, `selling_format_count` |

### Settings

| Event | When | Key properties |
|-------|------|----------------|
| `settings_food_cost_target_changed` | Default food cost % saved | `from`, `to` |
| `settings_currency_changed` | Currency changed | `from`, `to` |
| `settings_unit_system_changed` | Metric / imperial | `from`, `to` |
| `settings_upgrade_tapped` | Free user taps Upgrade | `tier` |
| `settings_subscription_tapped` | Hobbyist taps Change plan | `tier`, `billing_period` |
| `settings_restore_purchases_tapped` | Restore from settings | — |

### Paywall & subscription

| Event | When | Key properties |
|-------|------|----------------|
| `paywall_viewed` | Modal opens | `reason` (`recipe`, `ingredient`, `upgrade`, …), `mode`, `source` |
| `paywall_dismissed` | Modal closed | `reason`, `mode` |
| `paywall_billing_toggled` | Monthly ↔ annual | `billing` |
| `paywall_purchase_started` | Subscribe tapped | `reason`, `mode`, `billing` |
| `paywall_purchase_completed` | Purchase success | `reason`, `mode`, `billing` |
| `paywall_purchase_cancelled` | User cancelled | `reason`, `mode` |
| `paywall_purchase_failed` | Purchase error | `reason`, `mode`, `message` |
| `paywall_restore_*` | Restore flow | `reason`, `mode` |

---

## Recommended funnels (PostHog → Insights → New funnel)

### 1. Signup → first ingredient → first dish

Steps:

1. `auth_signup_completed`
2. `ingredient_created`
3. `food_cost_wizard_completed`

**Use for:** “Users who sign up but never add ingredients” vs “add ingredients but never create a dish.”

### 2. Signup → wizard started → wizard completed

Steps:

1. `auth_signup_completed`
2. `food_cost_wizard_started`
3. `food_cost_wizard_completed`

**Use for:** Drop-off inside the food cost flow (even before ingredients).

### 3. Wizard step drop-off

Steps:

1. `food_cost_wizard_started`
2. `food_cost_step_viewed` where `step = 1`
3. `food_cost_step_viewed` where `step = 2`
4. `food_cost_step_viewed` where `step = 3`
5. `food_cost_wizard_completed`

**Use for:** Which wizard step users abandon.

### 4. Paywall conversion

Steps:

1. `paywall_viewed`
2. `paywall_purchase_started`
3. `paywall_purchase_completed`

Break down by `reason` (`ingredient`, `recipe`, `upgrade`) to see which limit drives upgrades.

### 5. Ingredients-only users (cohort)

1. Create **Cohort**: performed `ingredient_created` at least once.
2. Create **Cohort**: performed `food_cost_wizard_completed` at least once.
3. **Insight → Trends**: cohort A minus cohort B over time.

**Use for:** Users stuck after adding library items but never costing a dish.

---

## Suggested dashboards

1. **Activation** — weekly unique users hitting `ingredient_created` and `food_cost_wizard_completed`.
2. **Onboarding funnel** — funnel #1 with 7-day conversion window.
3. **Paywall** — `paywall_viewed` by `reason`, conversion rate to `paywall_purchase_completed`.
4. **Settings engagement** — `settings_food_cost_target_changed`, `settings_currency_changed`.
5. **Entry points** — `food_cost_wizard_started` broken down by `source` (`home`, `fab`, `dishes`).

---

## Code map

| File | Role |
|------|------|
| `lib/posthog.js` | Provider, capture toggle |
| `lib/analytics.js` | `track()`, `identifyUser()`, `setUserTraits()` |
| `constants/analyticsEvents.js` | Event name constants |
| `components/analytics/AnalyticsBridge.jsx` | Screen views, identity, trait sync |
| `lib/foodCostAnalytics.js` | Wizard funnel events |

---

## Testing

- Analytics are **off in Expo dev** (`__DEV__`). Test with a preview/production EAS build or `npx expo run:ios --configuration Release`.
- In PostHog → **Activity** → **Live events**, trigger actions on a test account and confirm events arrive within ~30 seconds.
