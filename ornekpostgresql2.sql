-- ============================================
-- Voice Ordering Platform Database Schema
-- PostgreSQL
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE order_source_enum AS ENUM (
    'Internal',
    'UberEats',
    'DeliveryHero'
);

CREATE TYPE order_status_enum AS ENUM (
    'Pending',
    'Accepted',
    'Preparing',
    'Ready',
    'CourierAssigned',
    'PickedUp',
    'Delivered',
    'Cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
    'Pending',
    'Paid',
    'Refunded'
);

CREATE TYPE delivery_provider_enum AS ENUM (
    'Internal',
    'UberEats',
    'DeliveryHero'
);

CREATE TYPE delivery_status_enum AS ENUM (
    'Pending',
    'Assigned',
    'PickedUp',
    'Delivered',
    'Cancelled'
);

CREATE TYPE integration_provider_enum AS ENUM (
    'UberEats',
    'DeliveryHero'
);

-- ============================================
-- RESTAURANTS
-- ============================================

CREATE TABLE "Restaurants" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(200) NOT NULL,
    "Phone" VARCHAR(50),
    "Email" VARCHAR(200),
    "Address" TEXT,
    "Currency" VARCHAR(10) NOT NULL DEFAULT 'TRY',
    "Timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE "Customers" (
    "Id" SERIAL PRIMARY KEY,
    "FullName" VARCHAR(200) NOT NULL,
    "Phone" VARCHAR(50),
    "Email" VARCHAR(200),
    "DefaultAddress" TEXT,
    "LastOrderSource" VARCHAR(30),
    "TotalOrders" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- INTEGRATION ACCOUNTS
-- ============================================

CREATE TABLE "IntegrationAccounts" (
    "Id" SERIAL PRIMARY KEY,
    "RestaurantId" INTEGER NOT NULL,
    "Provider" integration_provider_enum NOT NULL,
    "ExternalStoreId" VARCHAR(100) NOT NULL,
    "AccessToken" TEXT,
    "RefreshToken" TEXT,
    "ApiKey" TEXT,
    "SecretKey" TEXT,
    "WebhookSecret" TEXT,
    "ExpiresAt" TIMESTAMP,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_integration_restaurant
        FOREIGN KEY ("RestaurantId")
        REFERENCES "Restaurants"("Id")
        ON DELETE CASCADE
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE "Products" (
    "Id" SERIAL PRIMARY KEY,
    "RestaurantId" INTEGER NOT NULL,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "Category" VARCHAR(100),
    "ExternalProductId" VARCHAR(100),
    "Sku" VARCHAR(100),
    "Barcode" VARCHAR(100),
    "Price" NUMERIC(18,2) NOT NULL,
    "Currency" VARCHAR(10) NOT NULL DEFAULT 'TRY',
    "Stock" INTEGER NOT NULL DEFAULT 0,
    "PreparationTime" INTEGER NOT NULL DEFAULT 10,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
    "LastSyncedAt" TIMESTAMP,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_product_restaurant
        FOREIGN KEY ("RestaurantId")
        REFERENCES "Restaurants"("Id")
        ON DELETE CASCADE
);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE "Orders" (
    "Id" SERIAL PRIMARY KEY,
    "RestaurantId" INTEGER NOT NULL,
    "IntegrationAccountId" INTEGER,
    "CustomerId" INTEGER,

    "OrderNumber" VARCHAR(50) NOT NULL UNIQUE,

    "Source" order_source_enum NOT NULL DEFAULT 'Internal',

    "ExternalOrderId" VARCHAR(100),
    "ExternalStoreId" VARCHAR(100),
    "ExternalStatus" VARCHAR(50),

    "CustomerName" VARCHAR(200) NOT NULL,
    "Phone" VARCHAR(50),
    "Address" TEXT,
    "Notes" TEXT,

    "Subtotal" NUMERIC(18,2) NOT NULL,
    "DeliveryFee" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "PlatformFee" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "TaxAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,
    "TotalPrice" NUMERIC(18,2) NOT NULL,

    "Currency" VARCHAR(10) NOT NULL DEFAULT 'TRY',

    "Status" order_status_enum NOT NULL DEFAULT 'Pending',

    "PaymentMethod" VARCHAR(30),

    "PaymentStatus" payment_status_enum NOT NULL DEFAULT 'Pending',

    "AcceptedAt" TIMESTAMP,
    "ReadyAt" TIMESTAMP,
    "DeliveredAt" TIMESTAMP,
    "CancelledAt" TIMESTAMP,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_order_restaurant
        FOREIGN KEY ("RestaurantId")
        REFERENCES "Restaurants"("Id"),

    CONSTRAINT fk_order_customer
        FOREIGN KEY ("CustomerId")
        REFERENCES "Customers"("Id"),

    CONSTRAINT fk_order_integration
        FOREIGN KEY ("IntegrationAccountId")
        REFERENCES "IntegrationAccounts"("Id")
);

-- ============================================
-- DELIVERIES
-- ============================================

CREATE TABLE "Deliveries" (
    "Id" SERIAL PRIMARY KEY,

    "OrderId" INTEGER NOT NULL UNIQUE,

    "Provider" delivery_provider_enum NOT NULL,

    "ExternalDeliveryId" VARCHAR(100),

    "CourierName" VARCHAR(200),
    "CourierPhone" VARCHAR(50),

    "Status" delivery_status_enum NOT NULL DEFAULT 'Pending',

    "TrackingUrl" TEXT,

    "EstimatedPickupTime" TIMESTAMP,
    "EstimatedDeliveryTime" TIMESTAMP,

    "PickedUpAt" TIMESTAMP,
    "DeliveredAt" TIMESTAMP,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_delivery_order
        FOREIGN KEY ("OrderId")
        REFERENCES "Orders"("Id")
        ON DELETE CASCADE
);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE "OrderItems" (
    "Id" SERIAL PRIMARY KEY,

    "OrderId" INTEGER NOT NULL,

    "ProductId" INTEGER,

    "ExternalProductId" VARCHAR(100),

    "ProductName" VARCHAR(255) NOT NULL,

    "Quantity" INTEGER NOT NULL,

    "UnitPrice" NUMERIC(18,2) NOT NULL,

    "DiscountAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,

    "TaxAmount" NUMERIC(18,2) NOT NULL DEFAULT 0,

    "TotalPrice" NUMERIC(18,2) NOT NULL,

    "Currency" VARCHAR(10) NOT NULL DEFAULT 'TRY',

    "Modifiers" JSONB,

    "Notes" TEXT,

    CONSTRAINT fk_orderitem_order
        FOREIGN KEY ("OrderId")
        REFERENCES "Orders"("Id")
        ON DELETE CASCADE,

    CONSTRAINT fk_orderitem_product
        FOREIGN KEY ("ProductId")
        REFERENCES "Products"("Id")
        ON DELETE SET NULL
);

-- ============================================
-- ORDER EVENTS
-- ============================================

CREATE TABLE "OrderEvents" (
    "Id" SERIAL PRIMARY KEY,

    "OrderId" INTEGER NOT NULL,

    "Provider" VARCHAR(30) NOT NULL,

    "EventType" VARCHAR(100) NOT NULL,

    "ExternalEventId" VARCHAR(100),

    "Payload" JSONB NOT NULL,

    "Processed" BOOLEAN NOT NULL DEFAULT FALSE,

    "ProcessedAt" TIMESTAMP,

    "ErrorMessage" TEXT,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_orderevent_order
        FOREIGN KEY ("OrderId")
        REFERENCES "Orders"("Id")
        ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_products_restaurant
ON "Products"("RestaurantId");

CREATE INDEX idx_products_name
ON "Products"("Name");

CREATE INDEX idx_orders_restaurant
ON "Orders"("RestaurantId");

CREATE INDEX idx_orders_customer
ON "Orders"("CustomerId");

CREATE INDEX idx_orders_external
ON "Orders"("ExternalOrderId");

CREATE INDEX idx_orders_status
ON "Orders"("Status");

CREATE INDEX idx_orderitems_order
ON "OrderItems"("OrderId");

CREATE INDEX idx_deliveries_order
ON "Deliveries"("OrderId");

CREATE INDEX idx_events_order
ON "OrderEvents"("OrderId");

CREATE INDEX idx_events_external
ON "OrderEvents"("ExternalEventId");

CREATE INDEX idx_integrations_restaurant
ON "IntegrationAccounts"("RestaurantId");

CREATE INDEX idx_integrations_provider
ON "IntegrationAccounts"("Provider");

-- ============================================
-- END OF SCHEMA
-- ============================================