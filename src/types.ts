export type ShirtSize = 'M' | 'L' | 'XL' | 'XXL' | '3XL' | '4XL' | string;

export type ShirtColorId = 'black' | 'white' | 'red' | 'pink';

export type JacketSize = ShirtSize;
export type JacketColorId = ShirtColorId;

export interface ShirtProduct {
  id: ShirtColorId;
  name: string;
  banglaName: string;
  colorName: string;
  price: number;
  originalPrice: number;
  image: string;
  altText: string;
}

export type JacketProduct = ShirtProduct;

export interface SelectedColorItem {
  id: ShirtColorId;
  quantity: number;
}

export interface OrderedProductItem {
  id: ShirtColorId | string;
  name: string;
  colorName: string;
  price: number;
  quantity: number;
}

export interface OrderData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  size: ShirtSize;
  selectedColors: Record<ShirtColorId, boolean>;
  colorQuantities: Record<ShirtColorId, number>;
  shippingZone: 'outside_dhaka' | 'inside_dhaka';
  shippingCost: number;
  orderNotes?: string;
  orderedItems?: OrderedProductItem[];
}

export interface OrderConfirmation extends OrderData {
  orderId: string;
  orderTime: string;
  subtotal: number;
  total: number;
  orderedItems?: OrderedProductItem[];
  status?: 'Processing' | 'Completed' | 'Cancelled' | 'Pending' | string;
  steadfastSent?: boolean;
  consignmentId?: string;
  trackingCode?: string;
  deliveryStatus?: 'PENDING' | 'DELIVERED' | 'IN_REVIEW' | 'CANCELLED' | 'PARTIAL_DELIVERED_APPROVAL_PENDING' | 'DELIVERED_APPROVAL_PENDING' | string;
  customerScore?: string;
  createdAt?: string;
}
