-- Add quantity field to additional_fees table
ALTER TABLE additional_fees ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;
