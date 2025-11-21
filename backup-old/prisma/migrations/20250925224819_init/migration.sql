-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "country" TEXT,
    "birth_date" DATETIME,
    "notes" TEXT,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "total_stays" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "beds_count" INTEGER NOT NULL,
    "max_occupancy" INTEGER NOT NULL,
    "base_price" DECIMAL NOT NULL,
    "description" TEXT,
    "amenities" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_type_id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "floor" INTEGER DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_id" TEXT NOT NULL,
    "bed_number" TEXT NOT NULL,
    "bed_type" TEXT NOT NULL DEFAULT 'single',
    "status" TEXT NOT NULL DEFAULT 'clean',
    "current_guest_id" TEXT,
    "housekeeping_notes" TEXT,
    "last_cleaned" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "beds_current_guest_id_fkey" FOREIGN KEY ("current_guest_id") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "confirmation_code" TEXT NOT NULL,
    "primary_guest_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "check_in" DATETIME NOT NULL,
    "check_out" DATETIME NOT NULL,
    "guests_count" INTEGER NOT NULL DEFAULT 1,
    "nights_count" INTEGER NOT NULL,
    "base_amount" DECIMAL NOT NULL,
    "tax_amount" DECIMAL NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "booking_source" TEXT NOT NULL DEFAULT 'direct',
    "requires_deposit" BOOLEAN NOT NULL DEFAULT true,
    "deposit_amount" DECIMAL NOT NULL DEFAULT 0.00,
    "pre_auth_amount" DECIMAL NOT NULL DEFAULT 50.00,
    "special_requests" TEXT,
    "arrival_time" DATETIME,
    "booking_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_in_time" DATETIME,
    "check_out_time" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reservations_primary_guest_id_fkey" FOREIGN KEY ("primary_guest_id") REFERENCES "guests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reservations_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "folios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservation_id" TEXT NOT NULL,
    "folio_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "total_charges" DECIMAL NOT NULL DEFAULT 0.00,
    "total_payments" DECIMAL NOT NULL DEFAULT 0.00,
    "balance" DECIMAL NOT NULL DEFAULT 0.00,
    "has_pre_auth" BOOLEAN NOT NULL DEFAULT false,
    "pre_auth_reference" TEXT,
    "opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "folios_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "folio_charges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folio_id" TEXT NOT NULL,
    "charge_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL NOT NULL,
    "product_id" TEXT,
    "charged_by_user_id" TEXT,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "charge_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "folio_charges_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "folio_charges_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "folio_charges_charged_by_user_id_fkey" FOREIGN KEY ("charged_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folio_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_reference" TEXT,
    "amount" DECIMAL NOT NULL,
    "card_last_four" TEXT,
    "card_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "processed_by_user_id" TEXT,
    "notes" TEXT,
    "payment_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cost_price" DECIMAL NOT NULL DEFAULT 0.00,
    "sale_price" DECIMAL NOT NULL,
    "volunteer_price" DECIMAL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "minimum_stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_age_verification" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "guests_document_number_key" ON "guests"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_number_key" ON "rooms"("room_number");

-- CreateIndex
CREATE UNIQUE INDEX "beds_current_guest_id_key" ON "beds"("current_guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "beds_room_id_bed_number_key" ON "beds"("room_id", "bed_number");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_confirmation_code_key" ON "reservations"("confirmation_code");

-- CreateIndex
CREATE INDEX "reservations_check_in_check_out_idx" ON "reservations"("check_in", "check_out");

-- CreateIndex
CREATE UNIQUE INDEX "folios_reservation_id_key" ON "folios"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "folios_folio_number_key" ON "folios"("folio_number");

-- CreateIndex
CREATE INDEX "folios_balance_idx" ON "folios"("balance");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
