


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."measurement_unit" AS ENUM (
    'g',
    'kg',
    'oz',
    'lb',
    'ml',
    'l',
    'tsp',
    'tbsp',
    'cup',
    'fl_oz',
    'piece',
    'each',
    'gallon',
    'quart',
    'pint',
    'dozen'
);


ALTER TYPE "public"."measurement_unit" OWNER TO "postgres";


CREATE TYPE "public"."recipe_category" AS ENUM (
    'bakery',
    'beverage',
    'breakfast',
    'dessert',
    'main_course',
    'snack',
    'sauce_condiment',
    'other',
    'appetizer',
    'salad',
    'soup',
    'pasta',
    'pizza',
    'sandwich',
    'side',
    'bread'
);


ALTER TYPE "public"."recipe_category" OWNER TO "postgres";


CREATE TYPE "public"."subscription_tier" AS ENUM (
    'free',
    'hobbyist',
    'pro'
);


ALTER TYPE "public"."subscription_tier" OWNER TO "postgres";


CREATE TYPE "public"."unit_system" AS ENUM (
    'metric',
    'imperial'
);


ALTER TYPE "public"."unit_system" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.recipe_ingredients
    WHERE recipe_id IN (SELECT id FROM public.recipes WHERE user_id = auth.uid());
  DELETE FROM public.recipes WHERE user_id = auth.uid();
  DELETE FROM public.ingredients WHERE user_id = auth.uid();
  DELETE FROM public.user_settings WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_ingredient_price_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.purchase_price IS NOT NULL
     AND NEW.purchase_price IS NOT NULL
     AND OLD.purchase_price IS DISTINCT FROM NEW.purchase_price THEN
    INSERT INTO public.ingredient_price_history (
      ingredient_id,
      old_price,
      new_price,
      changed_at,
      change_source
    ) VALUES (
      NEW.id,
      OLD.purchase_price,
      NEW.purchase_price,
      now(),
      'manual'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."record_ingredient_price_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_recipe"("p_recipe_id" "uuid", "p_recipe" "jsonb", "p_ingredients" "jsonb", "p_formats" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_recipe_id uuid;
  v_name text := btrim(coalesce(p_recipe->>'name', ''));
  v_ingredient_count int;
  v_owned_count int;
  v_default_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Recipe name is required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_ingredients) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Ingredients must be an array' USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NULL AND jsonb_array_length(p_ingredients) = 0 THEN
    RAISE EXCEPTION 'At least one ingredient is required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_formats) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_formats) = 0 THEN
    RAISE EXCEPTION 'At least one selling format is required' USING ERRCODE = '22023';
  END IF;

  -- Ingredients must belong to the caller (recipe_ingredients RLS only checks the recipe).
  SELECT count(DISTINCT x.ingredient_id) INTO v_ingredient_count
  FROM jsonb_to_recordset(p_ingredients) AS x(ingredient_id uuid);

  SELECT count(*) INTO v_owned_count
  FROM public.ingredients i
  WHERE i.user_id = v_uid
    AND i.id IN (SELECT x.ingredient_id FROM jsonb_to_recordset(p_ingredients) AS x(ingredient_id uuid));

  IF v_owned_count <> v_ingredient_count THEN
    RAISE EXCEPTION 'Unknown ingredient' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) FILTER (WHERE coalesce(x.is_default, false))
  INTO v_default_count
  FROM jsonb_to_recordset(p_formats) AS x(is_default boolean);

  IF v_default_count > 1 THEN
    RAISE EXCEPTION 'Only one default selling format is allowed' USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NULL THEN
    INSERT INTO public.recipes (user_id, name, description, category, target_food_cost_percent)
    VALUES (
      v_uid,
      v_name,
      nullif(btrim(coalesce(p_recipe->>'description', '')), ''),
      coalesce((p_recipe->>'category')::public.recipe_category, 'other'),
      coalesce((p_recipe->>'target_food_cost_percent')::numeric, 30)
    )
    RETURNING id INTO v_recipe_id;
  ELSE
    UPDATE public.recipes r
    SET
      name = v_name,
      description = CASE
        WHEN p_recipe ? 'description' THEN nullif(btrim(coalesce(p_recipe->>'description', '')), '')
        ELSE r.description
      END,
      category = coalesce((p_recipe->>'category')::public.recipe_category, r.category),
      target_food_cost_percent = coalesce((p_recipe->>'target_food_cost_percent')::numeric, r.target_food_cost_percent)
    WHERE r.id = p_recipe_id
      AND r.user_id = v_uid
    RETURNING r.id INTO v_recipe_id;

    IF v_recipe_id IS NULL THEN
      RAISE EXCEPTION 'Recipe not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.recipe_ingredients WHERE recipe_id = v_recipe_id;
    DELETE FROM public.recipe_selling_formats WHERE recipe_id = v_recipe_id;
  END IF;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes)
  SELECT v_recipe_id, x.ingredient_id, x.quantity, x.unit, nullif(btrim(coalesce(x.notes, '')), '')
  FROM jsonb_to_recordset(p_ingredients)
    AS x(ingredient_id uuid, quantity numeric, unit public.measurement_unit, notes text);

  INSERT INTO public.recipe_selling_formats (
    recipe_id, name, selling_unit_id, unit_quantity, selling_price, is_default
  )
  SELECT
    v_recipe_id,
    coalesce(nullif(btrim(coalesce(e.value->>'name', '')), ''), 'Default'),
    (e.value->>'selling_unit_id')::uuid,
    coalesce((e.value->>'unit_quantity')::numeric, 1),
    (e.value->>'selling_price')::numeric,
    CASE
      WHEN v_default_count = 0 THEN e.ord = 1
      ELSE coalesce((e.value->>'is_default')::boolean, false)
    END
  FROM jsonb_array_elements(p_formats) WITH ORDINALITY AS e(value, ord);

  RETURN v_recipe_id;
END;
$$;


ALTER FUNCTION "public"."save_recipe"("p_recipe_id" "uuid", "p_recipe" "jsonb", "p_ingredients" "jsonb", "p_formats" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "message" "text" NOT NULL,
    "dont_ask_again" boolean DEFAULT false NOT NULL,
    "platform" "text",
    "app_version" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_feedback_source_check" CHECK (("source" = ANY (ARRAY['yes_prompt'::"text", 'declined_prompt'::"text", 'send_feedback_link'::"text", 'settings'::"text"])))
);


ALTER TABLE "public"."app_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_feedback" IS 'User feedback and support messages from in-app forms (review prompt + Settings).';



CREATE TABLE IF NOT EXISTS "public"."app_version_config" (
    "id" smallint DEFAULT 1 NOT NULL,
    "latest_version" "text" NOT NULL,
    "message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ios_latest_version" "text",
    "android_latest_version" "text",
    CONSTRAINT "app_version_config_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."app_version_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_version_config" IS 'Single-row config: set latest_version after each store release. App shows Settings update banner when installed version is older.';



COMMENT ON COLUMN "public"."app_version_config"."ios_latest_version" IS 'Latest App Store marketing version — auto-synced; client may also fetch live.';



COMMENT ON COLUMN "public"."app_version_config"."android_latest_version" IS 'Latest Play Store marketing version — auto-synced; client may also fetch live.';



CREATE TABLE IF NOT EXISTS "public"."food_cost_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "step" smallint DEFAULT 1 NOT NULL,
    "dish" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ingredients" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "selling_formats" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "food_cost_drafts_step_check" CHECK ((("step" >= 1) AND ("step" <= 3)))
);


ALTER TABLE "public"."food_cost_drafts" OWNER TO "postgres";


COMMENT ON TABLE "public"."food_cost_drafts" IS 'In-progress calculate-food-cost wizard state. One row per user; cleared when the dish is saved or discarded.';



CREATE TABLE IF NOT EXISTS "public"."ingredient_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6366F1'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ingredient_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredient_price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "old_price" numeric NOT NULL,
    "new_price" numeric NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "change_source" "text" DEFAULT 'manual'::"text" NOT NULL
);


ALTER TABLE "public"."ingredient_price_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "purchase_price" numeric NOT NULL,
    "purchase_quantity" numeric NOT NULL,
    "purchase_unit" "public"."measurement_unit" NOT NULL,
    "waste_percent" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ingredients_purchase_price_check" CHECK (("purchase_price" > (0)::numeric)),
    CONSTRAINT "ingredients_purchase_quantity_check" CHECK (("purchase_quantity" > (0)::numeric)),
    CONSTRAINT "ingredients_waste_percent_check" CHECK ((("waste_percent" >= (0)::numeric) AND ("waste_percent" < (100)::numeric)))
);


ALTER TABLE "public"."ingredients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ingredients"."purchase_price" IS 'Price paid for purchase_quantity of purchase_unit.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "subscription_tier" "public"."subscription_tier" DEFAULT 'free'::"public"."subscription_tier" NOT NULL,
    "subscription_expires_at" timestamp with time zone,
    "revenuecat_user_id" "text",
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_ingredients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "public"."measurement_unit" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_ingredients_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."recipe_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_selling_formats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "selling_unit_id" "uuid" NOT NULL,
    "unit_quantity" numeric DEFAULT 1 NOT NULL,
    "selling_price" numeric,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_selling_formats_selling_price_check" CHECK ((("selling_price" IS NULL) OR ("selling_price" > (0)::numeric))),
    CONSTRAINT "recipe_selling_formats_unit_quantity_check" CHECK (("unit_quantity" > (0)::numeric))
);


ALTER TABLE "public"."recipe_selling_formats" OWNER TO "postgres";


COMMENT ON COLUMN "public"."recipe_selling_formats"."selling_price" IS 'Owner-set price for one unit of this format. NULL = not set (suggested price is derived, never stored).';



COMMENT ON COLUMN "public"."recipe_selling_formats"."is_default" IS 'At most one per recipe. The default format''s unit_quantity/selling_unit is the dish yield.';



CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "public"."recipe_category" DEFAULT 'other'::"public"."recipe_category" NOT NULL,
    "target_food_cost_percent" numeric DEFAULT 30.00 NOT NULL,
    "image_url" "text",
    "is_archived" boolean DEFAULT false NOT NULL,
    "is_sample" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_recipe_id" "uuid",
    CONSTRAINT "recipes_target_food_cost_check" CHECK ((("target_food_cost_percent" > (0)::numeric) AND ("target_food_cost_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_prompt_state" (
    "user_id" "uuid" NOT NULL,
    "never_ask" boolean DEFAULT false NOT NULL,
    "last_outcome" "text",
    "last_soft_at" timestamp with time zone,
    "last_native_at" timestamp with time zone,
    "soft_ask_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_prompt_state_last_outcome_check" CHECK ((("last_outcome" IS NULL) OR ("last_outcome" = ANY (ARRAY['yes'::"text", 'declined'::"text", 'later'::"text"])))),
    CONSTRAINT "review_prompt_state_soft_ask_count_check" CHECK (("soft_ask_count" >= 0))
);


ALTER TABLE "public"."review_prompt_state" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_prompt_state" IS 'Enjoying…? soft-ask outcomes and cooldowns. One row per user; synced across devices.';



CREATE TABLE IF NOT EXISTS "public"."selling_units" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "label" "text" NOT NULL,
    "is_system" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."selling_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "currency_symbol" "text" DEFAULT '$'::"text" NOT NULL,
    "default_food_cost_percent" numeric DEFAULT 30.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "unit_system" "text" DEFAULT 'metric'::"text" NOT NULL,
    CONSTRAINT "user_settings_food_cost_check" CHECK ((("default_food_cost_percent" > (0)::numeric) AND ("default_food_cost_percent" <= (100)::numeric))),
    CONSTRAINT "user_settings_unit_system_check" CHECK (("unit_system" = ANY (ARRAY['metric'::"text", 'imperial'::"text"])))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_feedback"
    ADD CONSTRAINT "app_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_version_config"
    ADD CONSTRAINT "app_version_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_cost_drafts"
    ADD CONSTRAINT "food_cost_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_cost_drafts"
    ADD CONSTRAINT "food_cost_drafts_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ingredient_categories"
    ADD CONSTRAINT "ingredient_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredient_price_history"
    ADD CONSTRAINT "ingredient_price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_revenuecat_user_id_key" UNIQUE ("revenuecat_user_id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_selling_formats"
    ADD CONSTRAINT "recipe_selling_formats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_prompt_state"
    ADD CONSTRAINT "review_prompt_state_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."selling_units"
    ADD CONSTRAINT "selling_units_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."selling_units"
    ADD CONSTRAINT "selling_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



CREATE INDEX "app_feedback_created_at_idx" ON "public"."app_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "app_feedback_user_id_idx" ON "public"."app_feedback" USING "btree" ("user_id");



CREATE INDEX "food_cost_drafts_updated_at_idx" ON "public"."food_cost_drafts" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_ingredient_categories_user_id" ON "public"."ingredient_categories" USING "btree" ("user_id");



CREATE INDEX "idx_ingredient_price_history_ingredient_id" ON "public"."ingredient_price_history" USING "btree" ("ingredient_id");



CREATE INDEX "idx_ingredients_category_id" ON "public"."ingredients" USING "btree" ("category_id");



CREATE INDEX "idx_ingredients_is_archived" ON "public"."ingredients" USING "btree" ("is_archived");



CREATE INDEX "idx_ingredients_user_id" ON "public"."ingredients" USING "btree" ("user_id");



CREATE INDEX "idx_recipe_ingredients_ingredient_id" ON "public"."recipe_ingredients" USING "btree" ("ingredient_id");



CREATE INDEX "idx_recipe_ingredients_recipe_id" ON "public"."recipe_ingredients" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_selling_formats_recipe_id" ON "public"."recipe_selling_formats" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipes_is_archived" ON "public"."recipes" USING "btree" ("is_archived");



CREATE INDEX "idx_recipes_user_id" ON "public"."recipes" USING "btree" ("user_id");



CREATE UNIQUE INDEX "recipe_selling_formats_one_default_idx" ON "public"."recipe_selling_formats" USING "btree" ("recipe_id") WHERE "is_default";



CREATE INDEX "recipes_parent_recipe_id_idx" ON "public"."recipes" USING "btree" ("parent_recipe_id") WHERE ("parent_recipe_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."recipe_ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."recipe_selling_formats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."recipes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_record_ingredient_price_change" AFTER UPDATE OF "purchase_price" ON "public"."ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."record_ingredient_price_change"();



ALTER TABLE ONLY "public"."app_feedback"
    ADD CONSTRAINT "app_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_cost_drafts"
    ADD CONSTRAINT "food_cost_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingredient_categories"
    ADD CONSTRAINT "ingredient_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingredient_price_history"
    ADD CONSTRAINT "ingredient_price_history_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ingredient_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_selling_formats"
    ADD CONSTRAINT "recipe_selling_formats_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_selling_formats"
    ADD CONSTRAINT "recipe_selling_formats_selling_unit_id_fkey" FOREIGN KEY ("selling_unit_id") REFERENCES "public"."selling_units"("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_parent_recipe_id_fkey" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_prompt_state"
    ADD CONSTRAINT "review_prompt_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can read app version config" ON "public"."app_version_config" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Users insert own feedback" ON "public"."app_feedback" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own review prompt state" ON "public"."review_prompt_state" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own food cost drafts" ON "public"."food_cost_drafts" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own feedback" ON "public"."app_feedback" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own ingredient price history" ON "public"."ingredient_price_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ingredients" "i"
  WHERE (("i"."id" = "ingredient_price_history"."ingredient_id") AND ("i"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users read own review prompt state" ON "public"."review_prompt_state" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own review prompt state" ON "public"."review_prompt_state" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_version_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_cost_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient_price_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_selling_formats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_prompt_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."selling_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "selling_units_readable_by_all" ON "public"."selling_units" FOR SELECT USING (true);



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_own_ingredient_categories" ON "public"."ingredient_categories" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_own_ingredients" ON "public"."ingredients" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_own_price_history" ON "public"."ingredient_price_history" USING (("auth"."uid"() = ( SELECT "ingredients"."user_id"
   FROM "public"."ingredients"
  WHERE ("ingredients"."id" = "ingredient_price_history"."ingredient_id"))));



CREATE POLICY "users_own_profile" ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "users_own_recipe_ingredients" ON "public"."recipe_ingredients" USING (("auth"."uid"() = ( SELECT "recipes"."user_id"
   FROM "public"."recipes"
  WHERE ("recipes"."id" = "recipe_ingredients"."recipe_id"))));



CREATE POLICY "users_own_recipes" ON "public"."recipes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_own_selling_formats" ON "public"."recipe_selling_formats" USING (("auth"."uid"() = ( SELECT "recipes"."user_id"
   FROM "public"."recipes"
  WHERE ("recipes"."id" = "recipe_selling_formats"."recipe_id"))));



CREATE POLICY "users_own_settings" ON "public"."user_settings" USING (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_ingredient_price_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_ingredient_price_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_ingredient_price_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_recipe"("p_recipe_id" "uuid", "p_recipe" "jsonb", "p_ingredients" "jsonb", "p_formats" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_recipe"("p_recipe_id" "uuid", "p_recipe" "jsonb", "p_ingredients" "jsonb", "p_formats" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_recipe"("p_recipe_id" "uuid", "p_recipe" "jsonb", "p_ingredients" "jsonb", "p_formats" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."app_feedback" TO "anon";
GRANT ALL ON TABLE "public"."app_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."app_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."app_version_config" TO "anon";
GRANT ALL ON TABLE "public"."app_version_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_version_config" TO "service_role";



GRANT ALL ON TABLE "public"."food_cost_drafts" TO "anon";
GRANT ALL ON TABLE "public"."food_cost_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."food_cost_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_categories" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_categories" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_price_history" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_price_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_price_history" TO "service_role";



GRANT ALL ON TABLE "public"."ingredients" TO "anon";
GRANT ALL ON TABLE "public"."ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_selling_formats" TO "anon";
GRANT ALL ON TABLE "public"."recipe_selling_formats" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_selling_formats" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."review_prompt_state" TO "anon";
GRANT ALL ON TABLE "public"."review_prompt_state" TO "authenticated";
GRANT ALL ON TABLE "public"."review_prompt_state" TO "service_role";



GRANT ALL ON TABLE "public"."selling_units" TO "anon";
GRANT ALL ON TABLE "public"."selling_units" TO "authenticated";
GRANT ALL ON TABLE "public"."selling_units" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







