-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('ADMIN', 'POS', 'KIOSK', 'DELIVERY');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('OPEN', 'CONVERTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'IN_PREPARATION', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'NOT_REQUIRED', 'PENDING_MANUAL');

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "channel" "OrderChannel" NOT NULL DEFAULT 'ADMIN',
    "status" "CartStatus" NOT NULL DEFAULT 'OPEN',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "note" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "modifierTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deviceId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "priceListId" UUID,
    "unitBasePrice" DECIMAL(12,2),
    "modifierTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItemModifier" (
    "id" UUID NOT NULL,
    "cartItemId" UUID NOT NULL,
    "modifierGroupId" UUID NOT NULL,
    "modifierOptionId" UUID NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "cartId" UUID,
    "number" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "note" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "modifierTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "deviceId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "unitBasePrice" DECIMAL(12,2),
    "modifierTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemModifier" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "modifierGroupId" UUID NOT NULL,
    "modifierOptionId" UUID NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_tenantId_storeId_status_idx" ON "Cart"("tenantId", "storeId", "status");
CREATE INDEX "Cart_storeId_createdAt_idx" ON "Cart"("storeId", "createdAt");
CREATE INDEX "CartItem_cartId_createdAt_idx" ON "CartItem"("cartId", "createdAt");
CREATE INDEX "CartItemModifier_cartItemId_createdAt_idx" ON "CartItemModifier"("cartItemId", "createdAt");
CREATE UNIQUE INDEX "Order_cartId_key" ON "Order"("cartId");
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE INDEX "Order_tenantId_storeId_status_placedAt_idx" ON "Order"("tenantId", "storeId", "status", "placedAt");
CREATE INDEX "Order_storeId_placedAt_idx" ON "Order"("storeId", "placedAt");
CREATE INDEX "OrderItem_orderId_createdAt_idx" ON "OrderItem"("orderId", "createdAt");
CREATE INDEX "OrderItemModifier_orderItemId_createdAt_idx" ON "OrderItemModifier"("orderItemId", "createdAt");
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
CREATE INDEX "OrderEvent_tenantId_storeId_createdAt_idx" ON "OrderEvent"("tenantId", "storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItemModifier" ADD CONSTRAINT "CartItemModifier_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItemModifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItemModifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderEvent" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS cart_access_policy ON "Cart";
DROP POLICY IF EXISTS cart_item_access_policy ON "CartItem";
DROP POLICY IF EXISTS cart_item_modifier_access_policy ON "CartItemModifier";
DROP POLICY IF EXISTS order_access_policy ON "Order";
DROP POLICY IF EXISTS order_item_access_policy ON "OrderItem";
DROP POLICY IF EXISTS order_item_modifier_access_policy ON "OrderItemModifier";
DROP POLICY IF EXISTS order_event_access_policy ON "OrderEvent";

CREATE POLICY cart_access_policy ON "Cart"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY cart_item_access_policy ON "CartItem"
  USING (
    EXISTS (
      SELECT 1
      FROM "Cart" cart_ref
      WHERE cart_ref."id" = "CartItem"."cartId"
        AND app.can_access_tenant(cart_ref."tenantId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Cart" cart_ref
      WHERE cart_ref."id" = "CartItem"."cartId"
        AND app.can_access_tenant(cart_ref."tenantId")
    )
  );

CREATE POLICY cart_item_modifier_access_policy ON "CartItemModifier"
  USING (
    EXISTS (
      SELECT 1
      FROM "CartItem" cart_item_ref
      JOIN "Cart" cart_ref ON cart_ref."id" = cart_item_ref."cartId"
      WHERE cart_item_ref."id" = "CartItemModifier"."cartItemId"
        AND app.can_access_tenant(cart_ref."tenantId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "CartItem" cart_item_ref
      JOIN "Cart" cart_ref ON cart_ref."id" = cart_item_ref."cartId"
      WHERE cart_item_ref."id" = "CartItemModifier"."cartItemId"
        AND app.can_access_tenant(cart_ref."tenantId")
    )
  );

CREATE POLICY order_access_policy ON "Order"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY order_item_access_policy ON "OrderItem"
  USING (
    EXISTS (
      SELECT 1
      FROM "Order" order_ref
      WHERE order_ref."id" = "OrderItem"."orderId"
        AND app.can_access_tenant(order_ref."tenantId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Order" order_ref
      WHERE order_ref."id" = "OrderItem"."orderId"
        AND app.can_access_tenant(order_ref."tenantId")
    )
  );

CREATE POLICY order_item_modifier_access_policy ON "OrderItemModifier"
  USING (
    EXISTS (
      SELECT 1
      FROM "OrderItem" order_item_ref
      JOIN "Order" order_ref ON order_ref."id" = order_item_ref."orderId"
      WHERE order_item_ref."id" = "OrderItemModifier"."orderItemId"
        AND app.can_access_tenant(order_ref."tenantId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "OrderItem" order_item_ref
      JOIN "Order" order_ref ON order_ref."id" = order_item_ref."orderId"
      WHERE order_item_ref."id" = "OrderItemModifier"."orderItemId"
        AND app.can_access_tenant(order_ref."tenantId")
    )
  );

CREATE POLICY order_event_access_policy ON "OrderEvent"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));
