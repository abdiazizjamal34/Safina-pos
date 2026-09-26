export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  WAITER: 'WAITER',
  CASHIER: 'CASHIER',
  KITCHEN: 'KITCHEN',
  BAR: 'BAR',
  INVENTORY: 'INVENTORY',
};

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.MANAGER, label: 'Manager' },
  { value: ROLES.WAITER, label: 'Waiter' },
  { value: ROLES.CASHIER, label: 'Cashier' },
  { value: ROLES.KITCHEN, label: 'Kitchen' },
  { value: ROLES.BAR, label: 'Bar' },
  { value: ROLES.INVENTORY, label: 'Inventory' },
];

export const POS_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAITER];
export const SESSION_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER];
export const KITCHEN_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN];
export const BAR_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.BAR];
export const KDS_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN, ROLES.BAR];
export const BACKEND_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

export const hasRole = (user, allowedRoles) => Boolean(user?.role && allowedRoles.includes(user.role));

export const getHomePath = (role) => {
  if (role === ROLES.ADMIN || role === ROLES.MANAGER) return '/backend';
  if (role === ROLES.CASHIER) return '/cashier';
  if (role === ROLES.KITCHEN) return '/kitchen';
  if (role === ROLES.BAR) return '/bar';
  if (role === ROLES.INVENTORY) return '/inventory';
  return '/pos';
};
