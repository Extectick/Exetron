-- CreateEnum
CREATE TYPE "KitchenTicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "KitchenTicket" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "stationKey" TEXT NOT NULL,
    "status" "KitchenTicketStatus" NOT NULL DEFAULT 'NEW',
    "sourceChannel" "OrderChannel" NOT NULL,
    "displayNumber" TEXT NOT NULL,
    "note" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicketItem" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitchenTicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitchenTicket_tenantId_storeId_status_createdAt_idx" ON "KitchenTicket"("tenantId", "storeId", "status", "createdAt");
CREATE INDEX "KitchenTicket_storeId_stationKey_status_createdAt_idx" ON "KitchenTicket"("storeId", "stationKey", "status", "createdAt");
CREATE UNIQUE INDEX "KitchenTicket_orderId_stationKey_key" ON "KitchenTicket"("orderId", "stationKey");
CREATE INDEX "KitchenTicketItem_ticketId_createdAt_idx" ON "KitchenTicketItem"("ticketId", "createdAt");
CREATE INDEX "KitchenTicketItem_orderItemId_idx" ON "KitchenTicketItem"("orderItemId");

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "KitchenTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KitchenTicketItem" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS kitchen_ticket_access_policy ON "KitchenTicket";
DROP POLICY IF EXISTS kitchen_ticket_item_access_policy ON "KitchenTicketItem";

CREATE POLICY kitchen_ticket_access_policy ON "KitchenTicket"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY kitchen_ticket_item_access_policy ON "KitchenTicketItem"
  USING (
    EXISTS (
      SELECT 1
      FROM "KitchenTicket" kitchen_ticket_ref
      WHERE kitchen_ticket_ref."id" = "KitchenTicketItem"."ticketId"
        AND app.can_access_tenant(kitchen_ticket_ref."tenantId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "KitchenTicket" kitchen_ticket_ref
      WHERE kitchen_ticket_ref."id" = "KitchenTicketItem"."ticketId"
        AND app.can_access_tenant(kitchen_ticket_ref."tenantId")
    )
  );
