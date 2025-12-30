export type UpdateCategory = 
  | 'orders_transactions'
  | 'payments_billing'
  | 'shipping_tracking'
  | 'delivery_issues'
  | 'international_customs'
  | 'product_issues'
  | 'product_information'
  | 'subscriptions'
  | 'warehouse_fulfillment'
  | 'internal_operations';

export const CATEGORY_CONFIG: Record<UpdateCategory, { label: string; color: string }> = {
  orders_transactions: { label: 'Orders & Transactions', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  payments_billing: { label: 'Payments & Billing', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  shipping_tracking: { label: 'Shipping & Tracking', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  delivery_issues: { label: 'Delivery Issues', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  international_customs: { label: 'International & Customs', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  product_issues: { label: 'Product Issues', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  product_information: { label: 'Product Information', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  subscriptions: { label: 'Subscriptions', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  warehouse_fulfillment: { label: 'Warehouse & Fulfillment', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  internal_operations: { label: 'Internal Operations', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
};

export const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
  value: value as UpdateCategory,
  label: config.label,
}));

export function getCategoryLabel(category: UpdateCategory | null | undefined): string {
  if (!category) return '';
  return CATEGORY_CONFIG[category]?.label || category;
}

export function getCategoryColor(category: UpdateCategory | null | undefined): string {
  if (!category) return '';
  return CATEGORY_CONFIG[category]?.color || '';
}
