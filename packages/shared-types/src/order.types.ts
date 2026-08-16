export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface CreateOrderRequestDTO {
  ticketTierId: string;
  quantity: number;
}

export interface CreateOrderResponseDTO {
  orderId: string;
  paymentAuthorizationUrl: string;
}

export interface OrderDTO {
  id: string;
  status: OrderStatus;
  totalKobo: string;
  createdAt: string;
  paidAt: string | null;
}
