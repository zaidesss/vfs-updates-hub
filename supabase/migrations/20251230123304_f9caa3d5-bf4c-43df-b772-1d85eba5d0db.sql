-- Create update_category enum
CREATE TYPE update_category AS ENUM (
  'orders_transactions',
  'payments_billing',
  'shipping_tracking',
  'delivery_issues',
  'international_customs',
  'product_issues',
  'product_information',
  'subscriptions',
  'warehouse_fulfillment',
  'internal_operations'
);

-- Add category column to updates table
ALTER TABLE public.updates
ADD COLUMN category update_category NULL;