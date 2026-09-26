export const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  SENT_TO_KITCHEN: 'SENT_TO_KITCHEN',
  READY: 'READY',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
};

export const KDS_STAGE = {
  TO_COOK: 'TO_COOK',
  PREPARING: 'PREPARING',
  COMPLETED: 'COMPLETED',
};

export const KDS_ITEM_STATUS = {
  PENDING: 'PENDING',
  DONE: 'DONE',
};

export const SOCKET_EVENTS = {
  JOIN_KDS: 'join-kds',
  NEW_ORDER: 'new-order',
  TICKET_UPDATED: 'ticket-updated',
  ITEM_DONE: 'item-done',
  ITEM_STATUS_UPDATED: 'item-status-updated',
  ORDER_PAID: 'order-paid',
  ORDER_CANCELLED: 'order-cancelled',
};

export const EDITABLE_ORDER_STATUSES = [
  ORDER_STATUS.DRAFT,
  ORDER_STATUS.SENT_TO_KITCHEN,
  ORDER_STATUS.READY,
];
