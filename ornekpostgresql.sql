-- ============================================
-- PostgreSQL e-commerce schema (final)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Customers
-- ============================================

CREATE TABLE "Customers" (
    "Id" SERIAL PRIMARY KEY,

    "FullName" VARCHAR(200) NOT NULL,

    "Phone" VARCHAR(30),

    "Email" VARCHAR(200),

    "DefaultAddress" TEXT,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- Products
-- ============================================

CREATE TABLE "Products" (
    "Id" SERIAL PRIMARY KEY,

    "Name" VARCHAR(200) NOT NULL,

    "Description" TEXT,

    "Sku" VARCHAR(100) UNIQUE,

    "Barcode" VARCHAR(100),

    "Price" NUMERIC(18,2) NOT NULL,

    "Currency" VARCHAR(10) NOT NULL DEFAULT 'TRY',

    "Stock" INTEGER NOT NULL DEFAULT 0,

    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- Orders
-- ============================================

CREATE TABLE "Orders" (
    "Id" SERIAL PRIMARY KEY,

    "CustomerId" INTEGER,

    "TotalPrice" NUMERIC(18,2) NOT NULL,

    "CustomerName" VARCHAR(200) NOT NULL,

    "Address" TEXT NOT NULL,

    "Status" VARCHAR(50) NOT NULL DEFAULT 'Preparing',

    "Notes" TEXT,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_Orders_Customer"
        FOREIGN KEY ("CustomerId")
        REFERENCES "Customers"("Id")
        ON DELETE SET NULL
);

-- ============================================
-- OrderItems
-- ============================================

CREATE TABLE "OrderItems" (
    "Id" SERIAL PRIMARY KEY,

    "OrderId" INTEGER NOT NULL,

    "ProductId" INTEGER NOT NULL,

    "Quantity" INTEGER NOT NULL,

    "UnitPrice" NUMERIC(18,2) NOT NULL,

    "TotalPrice" NUMERIC(18,2) NOT NULL,

    CONSTRAINT "FK_OrderItems_Order"
        FOREIGN KEY ("OrderId")
        REFERENCES "Orders"("Id")
        ON DELETE CASCADE,

    CONSTRAINT "FK_OrderItems_Product"
        FOREIGN KEY ("ProductId")
        REFERENCES "Products"("Id")
);

-- ============================================
-- Cargo
-- ============================================

CREATE TABLE "Cargo" (
    "Id" SERIAL PRIMARY KEY,

    "OrderId" INTEGER NOT NULL UNIQUE,

    "TrackingNumber" VARCHAR(100) NOT NULL UNIQUE,

    "Company" VARCHAR(100) NOT NULL,

    "Status" VARCHAR(50) NOT NULL DEFAULT 'Preparing',

    "EstimatedDelivery" TIMESTAMP,

    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT "FK_Cargo_Order"
        FOREIGN KEY ("OrderId")
        REFERENCES "Orders"("Id")
        ON DELETE CASCADE
);

-- ============================================
-- Indexler
-- ============================================

CREATE INDEX "IX_Customers_FullName"
ON "Customers"("FullName");

CREATE INDEX "IX_Products_Name"
ON "Products"("Name");

CREATE INDEX "IX_Products_Name_Trgm"
ON "Products"
USING gin ("Name" gin_trgm_ops);

CREATE INDEX "IX_Products_IsActive"
ON "Products"("IsActive");

CREATE INDEX "IX_OrderItems_OrderId"
ON "OrderItems"("OrderId");

CREATE INDEX "IX_OrderItems_ProductId"
ON "OrderItems"("ProductId");

CREATE INDEX "IX_Orders_CustomerId"
ON "Orders"("CustomerId");

CREATE INDEX "IX_Orders_Status"
ON "Orders"("Status");

CREATE INDEX "IX_Cargo_OrderId"
ON "Cargo"("OrderId");

CREATE INDEX "IX_Cargo_TrackingNumber"
ON "Cargo"("TrackingNumber");

-- ============================================
-- UpdatedAt trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON "Customers"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON "Products"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON "Orders"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cargo_updated_at
BEFORE UPDATE ON "Cargo"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();