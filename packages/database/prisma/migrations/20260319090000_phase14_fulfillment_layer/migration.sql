ALTER TABLE "Cart"
ADD COLUMN "fulfillmentFee" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN "fulfillmentMode" TEXT,
ADD COLUMN "fulfillmentStatus" TEXT,
ADD COLUMN "fulfillmentPayload" JSONB,
ADD COLUMN "promisedAt" TIMESTAMP(3),
ADD COLUMN "etaAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN "fulfillmentFee" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN "fulfillmentMode" TEXT,
ADD COLUMN "fulfillmentStatus" TEXT,
ADD COLUMN "fulfillmentPayload" JSONB,
ADD COLUMN "promisedAt" TIMESTAMP(3),
ADD COLUMN "etaAt" TIMESTAMP(3);
