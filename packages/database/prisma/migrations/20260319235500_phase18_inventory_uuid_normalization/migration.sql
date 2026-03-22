-- Phase 18: inventory physical normalization from text core keys to UUID-backed storage

DROP POLICY IF EXISTS inventory_warehouses_access_policy ON inventory_warehouses;
DROP POLICY IF EXISTS inventory_ingredients_access_policy ON inventory_ingredients;
DROP POLICY IF EXISTS inventory_items_access_policy ON inventory_items;
DROP POLICY IF EXISTS inventory_recipe_boms_access_policy ON inventory_recipe_boms;
DROP POLICY IF EXISTS inventory_receiving_records_access_policy ON inventory_receiving_records;
DROP POLICY IF EXISTS inventory_adjustments_access_policy ON inventory_adjustments;
DROP POLICY IF EXISTS inventory_stock_reservations_access_policy ON inventory_stock_reservations;
DROP POLICY IF EXISTS inventory_stock_ledger_entries_access_policy ON inventory_stock_ledger_entries;
DROP POLICY IF EXISTS inventory_stop_list_rules_access_policy ON inventory_stop_list_rules;

ALTER TABLE IF EXISTS inventory_warehouses
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN store_id TYPE UUID USING NULLIF(store_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_ingredients
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_items
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN warehouse_id TYPE UUID USING NULLIF(warehouse_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_recipe_boms
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN product_id TYPE UUID USING NULLIF(product_id, '')::uuid,
  ALTER COLUMN variant_id TYPE UUID USING NULLIF(variant_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_receiving_records
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN warehouse_id TYPE UUID USING NULLIF(warehouse_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_receiving_lines
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN record_id TYPE UUID USING NULLIF(record_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_adjustments
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN warehouse_id TYPE UUID USING NULLIF(warehouse_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_stock_reservations
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN warehouse_id TYPE UUID USING NULLIF(warehouse_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_stock_ledger_entries
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN warehouse_id TYPE UUID USING NULLIF(warehouse_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE IF EXISTS inventory_stop_list_rules
  ALTER COLUMN id TYPE UUID USING NULLIF(id, '')::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING NULLIF(tenant_id, '')::uuid,
  ALTER COLUMN store_id TYPE UUID USING NULLIF(store_id, '')::uuid,
  ALTER COLUMN warehouse_id TYPE UUID USING NULLIF(warehouse_id, '')::uuid,
  ALTER COLUMN ingredient_id TYPE UUID USING NULLIF(ingredient_id, '')::uuid;

ALTER TABLE inventory_warehouses DROP CONSTRAINT IF EXISTS inventory_warehouses_tenant_id_fkey;
ALTER TABLE inventory_warehouses DROP CONSTRAINT IF EXISTS inventory_warehouses_store_id_fkey;
ALTER TABLE inventory_ingredients DROP CONSTRAINT IF EXISTS inventory_ingredients_tenant_id_fkey;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_tenant_id_fkey;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_warehouse_id_fkey;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_ingredient_id_fkey;
ALTER TABLE inventory_recipe_boms DROP CONSTRAINT IF EXISTS inventory_recipe_boms_tenant_id_fkey;
ALTER TABLE inventory_recipe_boms DROP CONSTRAINT IF EXISTS inventory_recipe_boms_product_id_fkey;
ALTER TABLE inventory_recipe_boms DROP CONSTRAINT IF EXISTS inventory_recipe_boms_variant_id_fkey;
ALTER TABLE inventory_recipe_boms DROP CONSTRAINT IF EXISTS inventory_recipe_boms_ingredient_id_fkey;
ALTER TABLE inventory_receiving_records DROP CONSTRAINT IF EXISTS inventory_receiving_records_tenant_id_fkey;
ALTER TABLE inventory_receiving_records DROP CONSTRAINT IF EXISTS inventory_receiving_records_warehouse_id_fkey;
ALTER TABLE inventory_receiving_lines DROP CONSTRAINT IF EXISTS inventory_receiving_lines_record_id_fkey;
ALTER TABLE inventory_receiving_lines DROP CONSTRAINT IF EXISTS inventory_receiving_lines_ingredient_id_fkey;
ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_tenant_id_fkey;
ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_warehouse_id_fkey;
ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_ingredient_id_fkey;
ALTER TABLE inventory_stock_reservations DROP CONSTRAINT IF EXISTS inventory_stock_reservations_tenant_id_fkey;
ALTER TABLE inventory_stock_reservations DROP CONSTRAINT IF EXISTS inventory_stock_reservations_warehouse_id_fkey;
ALTER TABLE inventory_stock_reservations DROP CONSTRAINT IF EXISTS inventory_stock_reservations_ingredient_id_fkey;
ALTER TABLE inventory_stock_ledger_entries DROP CONSTRAINT IF EXISTS inventory_stock_ledger_entries_tenant_id_fkey;
ALTER TABLE inventory_stock_ledger_entries DROP CONSTRAINT IF EXISTS inventory_stock_ledger_entries_warehouse_id_fkey;
ALTER TABLE inventory_stock_ledger_entries DROP CONSTRAINT IF EXISTS inventory_stock_ledger_entries_ingredient_id_fkey;
ALTER TABLE inventory_stop_list_rules DROP CONSTRAINT IF EXISTS inventory_stop_list_rules_tenant_id_fkey;
ALTER TABLE inventory_stop_list_rules DROP CONSTRAINT IF EXISTS inventory_stop_list_rules_store_id_fkey;
ALTER TABLE inventory_stop_list_rules DROP CONSTRAINT IF EXISTS inventory_stop_list_rules_warehouse_id_fkey;
ALTER TABLE inventory_stop_list_rules DROP CONSTRAINT IF EXISTS inventory_stop_list_rules_ingredient_id_fkey;

ALTER TABLE inventory_warehouses
  ADD CONSTRAINT inventory_warehouses_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_warehouses_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES "Store"(id) ON DELETE SET NULL;

ALTER TABLE inventory_ingredients
  ADD CONSTRAINT inventory_ingredients_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_items_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_items_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE CASCADE;

ALTER TABLE inventory_recipe_boms
  ADD CONSTRAINT inventory_recipe_boms_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_recipe_boms_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES "Product"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_recipe_boms_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES "ProductVariant"(id) ON DELETE SET NULL,
  ADD CONSTRAINT inventory_recipe_boms_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE CASCADE;

ALTER TABLE inventory_receiving_records
  ADD CONSTRAINT inventory_receiving_records_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_receiving_records_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE CASCADE;

ALTER TABLE inventory_receiving_lines
  ADD CONSTRAINT inventory_receiving_lines_record_id_fkey
    FOREIGN KEY (record_id) REFERENCES inventory_receiving_records(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_receiving_lines_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE CASCADE;

ALTER TABLE inventory_adjustments
  ADD CONSTRAINT inventory_adjustments_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_adjustments_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_adjustments_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE CASCADE;

ALTER TABLE inventory_stock_reservations
  ADD CONSTRAINT inventory_stock_reservations_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_stock_reservations_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_stock_reservations_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE CASCADE;

ALTER TABLE inventory_stock_ledger_entries
  ADD CONSTRAINT inventory_stock_ledger_entries_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_stock_ledger_entries_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_stock_ledger_entries_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE CASCADE;

ALTER TABLE inventory_stop_list_rules
  ADD CONSTRAINT inventory_stop_list_rules_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) ON DELETE CASCADE,
  ADD CONSTRAINT inventory_stop_list_rules_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES "Store"(id) ON DELETE SET NULL,
  ADD CONSTRAINT inventory_stop_list_rules_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id) ON DELETE SET NULL,
  ADD CONSTRAINT inventory_stop_list_rules_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES inventory_ingredients(id) ON DELETE SET NULL;

CREATE POLICY inventory_warehouses_access_policy ON inventory_warehouses
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_ingredients_access_policy ON inventory_ingredients
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_items_access_policy ON inventory_items
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_recipe_boms_access_policy ON inventory_recipe_boms
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_receiving_records_access_policy ON inventory_receiving_records
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_adjustments_access_policy ON inventory_adjustments
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_stock_reservations_access_policy ON inventory_stock_reservations
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_stock_ledger_entries_access_policy ON inventory_stock_ledger_entries
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));

CREATE POLICY inventory_stop_list_rules_access_policy ON inventory_stop_list_rules
  USING (app.can_access_tenant(tenant_id))
  WITH CHECK (app.can_access_tenant(tenant_id));
