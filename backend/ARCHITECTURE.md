# Cafe POS Backend Architecture

This document explains the current backend implementation for the Cafe POS system. It describes what the code does today, including important limitations and security considerations.

## 1. Runtime Architecture

The backend is a Node.js application built with Express 5. The main entrypoint is [server.js](server.js).

```text
Client / POS UI
      |
      | HTTP + JSON, cookie refresh token
      v
Express application
      |
      +-- Authentication and authorization middleware
      +-- REST route modules under src/routes
      +-- Prisma Client
      |       |
      |       v
      |   PostgreSQL database
      |
      +-- Socket.IO over the HTTP server
              |
              +-- KDS and order update events
```

Startup configures Helmet, CORS, JSON parsing, cookies, Socket.IO, and the route modules. The port is read from `PORT`, with `5000` as the fallback. The public health endpoint is `GET /api/health`.

Registered API groups:

| Prefix | Responsibility |
| --- | --- |
| `/api/auth` | Signup, login, refresh, logout |
| `/api/products` | Product catalog and recommendations |
| `/api/categories` | Product categories |
| `/api/payment-methods` | Organization payment settings |
| `/api/floors` | Floor management |
| `/api/tables` | Table layout and table management |
| `/api/coupons` | Coupon management and validation |
| `/api/promotions` | Promotion management |
| `/api/users` | Organization user management |
| `/api/orders` | Order creation, editing, kitchen, payment, cancellation |
| `/api/customers` | Customer CRUD and search |
| `/api/kds` | Kitchen display tickets |
| `/api/session` | POS session lifecycle and totals |
| `/api/reports` | Dashboard and exports |

## 2. Database Schema

The schema is defined in [prisma/schema.prisma](prisma/schema.prisma). Prisma connects to PostgreSQL using `DATABASE_URL`.

### Tenant model

`Organization` is the tenant root. Most operational data belongs to one organization through `organizationId`:

```text
Organization
  +-- User
  +-- ProductCategory -- Product -- OrderLine -- Order
  +-- PaymentMethod
  +-- Floor -- Table -- Order
  +-- Coupon
  +-- Promotion
  +-- PosSession -- Order
  +-- Order
```

An `Order` also relates to its creating user, optional table, POS session, customers, order lines, optional KDS ticket, and payments.

### Main models

| Model | Purpose |
| --- | --- |
| `Organization` | Tenant and owner of most business data |
| `User` | Employee or administrator belonging to an organization |
| `ProductCategory` | Organization-owned product grouping |
| `Product` | Sellable catalog item with price, tax, and active state |
| `Floor` | Organization-owned floor or seating area |
| `Table` | Physical table with layout coordinates and shape |
| `PosSession` | Open register/session that owns orders and totals |
| `Order` | Customer order and its lifecycle state |
| `OrderLine` | Product snapshot, quantity, calculated pricing, and KDS status |
| `KdsTicket` | Kitchen ticket associated one-to-one with an order |
| `Payment` | Payment record associated with an order |
| `PaymentMethod` | Configurable organization payment option |
| `Customer` | Customer record used by orders |
| `Coupon` / `Promotion` | Discount rules used during pricing |

Important enums include:

- `UserRole`: `ADMIN`, `EMPLOYEE`
- `OrderStatus`: `DRAFT`, `SENT_TO_KITCHEN`, `READY`, `PAID`, `CANCELLED`
- `KdsStage`: `TO_COOK`, `PREPARING`, `COMPLETED`
- `KdsItemStatus`: `PENDING`, `DONE`
- `PaymentMethodName`: `CASH`, `CARD`, `UPI`

`OrderLine` stores calculated values such as quantity, unit price, discount, tax, and line total. This preserves the pricing used for the order even if the product changes later.

### Customer scope

`Customer` currently has no `organizationId`, so customers are global rather than tenant-owned. Customer CRUD and order customer connections therefore do not provide the same organization boundary as products, orders, or tables.

## 3. Authentication

Authentication is implemented by [src/routes/auth.js](src/routes/auth.js), [src/controllers/authController.js](src/controllers/authController.js), and [src/middleware/auth.js](src/middleware/auth.js).

### Signup

`POST /api/auth/signup` accepts `name`, `email`, `password`, and `businessName`.

The controller uses one Prisma transaction to:

1. Create an `Organization`.
2. Create an `ADMIN` user in that organization.
3. Create default `CASH`, `CARD`, and `UPI` payment methods.
4. Return an access token and set the refresh cookie.

Passwords are hashed with bcrypt. Email addresses are normalized to lowercase and trimmed.

### Login

`POST /api/auth/login` validates the email and password, loads the user and organization, compares the bcrypt hash, checks `isActive`, and returns an access token. It also sets a refresh token cookie.

The access JWT lasts 15 minutes and contains:

- User ID
- Email
- Name
- Role
- Organization ID

The refresh JWT lasts 7 days, contains the user ID, and is stored in an HTTP-only `refreshToken` cookie. In development the cookie uses strict same-site behavior; in production it is configured for secure cross-site use.

### Refresh and logout

`POST /api/auth/refresh` reads the refresh cookie, verifies it, reloads the user, checks that the user is active, and issues a new access token and refresh cookie.

`POST /api/auth/logout` clears the refresh cookie. There is no server-side refresh-token store or revocation list.

## 4. Roles and Authorization

The middleware in [src/middleware/auth.js](src/middleware/auth.js) provides three main controls:

### `verifyToken`

Reads the access token from either:

```text
Authorization: Bearer <access-token>
```

or the `token` query parameter, which supports download-style links. On success it places the decoded identity on `req.user`.

If an older token does not contain `organizationId`, the middleware loads the user from the database to recover it.

### `requireAdmin`

Allows only users whose role is `ADMIN`. It protects catalog administration, floor/table administration, payment settings, promotions, coupons, and user management.

### `requireEmployee`

Allows both `ADMIN` and `EMPLOYEE`. It protects operational actions such as orders, customers, POS sessions, and reports.

Most route queries also filter by `req.user.organizationId` to enforce tenant isolation.

## 5. Products, Categories, and Pricing

Product and category routes are implemented in [src/routes/products.js](src/routes/products.js) and [src/routes/categories.js](src/routes/categories.js).

Product endpoints:

- `GET /api/products`
- `GET /api/products/frequently-together/:productId`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Category endpoints:

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

Product deletion is a soft delete: the product is marked inactive with `isActive = false`. Product creation can create a category inline. Product and category writes are administrator-only.

Order pricing is calculated in [src/routes/orders.js](src/routes/orders.js), using the promotion logic in [src/utils/promotionEngine.js](src/utils/promotionEngine.js):

1. Load current product prices and tax rates.
2. Calculate line totals.
3. Apply promotions.
4. Apply a coupon, when supplied.
5. Recalculate tax proportionally against the discounted subtotal.
6. Store the calculated values in `OrderLine`.

Coupons and promotions have their own organization-scoped management routes.

## 6. Floors and Tables

Floor and table behavior is implemented in [src/routes/floors.js](src/routes/floors.js) and [src/routes/tables.js](src/routes/tables.js).

Floor endpoints:

- `GET /api/floors`
- `POST /api/floors`
- `DELETE /api/floors/:id`

Table endpoints:

- `GET /api/tables`
- `POST /api/tables`
- `PUT /api/tables/:id`
- `DELETE /api/tables/:id`

Tables belong to both an organization and a floor. Layout data includes `x`, `y`, and `shape`. Active table responses include orders in `DRAFT`, `SENT_TO_KITCHEN`, or `READY` states.

When an order is assigned to a table, `Table.currentOrderId` points to that order. Payment and cancellation clear the current order reference.

## 7. Orders

Order behavior is centralized in [src/routes/orders.js](src/routes/orders.js).

Endpoints:

- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id`
- `PUT /api/orders/:id/send-kitchen`
- `PUT /api/orders/:id/pay`
- `PUT /api/orders/:id/cancel`
- `POST /api/orders/:id/send-receipt`

### Order creation

Creating an order requires an organization-owned open POS session. The optional table must also belong to the authenticated organization. The route calculates the order price, creates order lines, connects customer IDs, and associates the order with the table when applicable.

### State lifecycle

```text
DRAFT
  |
  | send-kitchen
  v
SENT_TO_KITCHEN
  |
  | KDS completes ticket
  v
READY
  |
  | pay
  v
PAID
```

Cancellation is available before the order reaches `READY`. Cancellation removes the KDS ticket and clears the table association.

## 8. Kitchen Display System (KDS)

KDS behavior is implemented in [src/routes/kds.js](src/routes/kds.js).

Endpoints:

- `GET /api/kds/tickets`
- `PUT /api/kds/tickets/:id/stage`
- `PUT /api/kds/tickets/:ticketId/items/:lineId/done`

Sending an order to the kitchen creates or reuses its `KdsTicket`, starting at `TO_COOK`. The normal stage progression is:

```text
TO_COOK -> PREPARING -> COMPLETED
```

When a ticket reaches `COMPLETED`, the related order becomes `READY`. Moving a ticket backward changes the order back to `SENT_TO_KITCHEN`. Individual order lines can be toggled between `PENDING` and `DONE`.

Completed tickets remain queryable for approximately 30 minutes unless the order is already paid.

## 9. Socket.IO

Socket.IO is created in [server.js](server.js) on the same HTTP server as Express. The frontend joins a KDS room by emitting:

```text
join-kds(orgId)
```

The server joins the client to:

- `kds-room-${orgId}` when an organization ID is supplied
- `kds-room` when no organization ID is supplied

Order and KDS routes emit events such as:

| Event | Meaning |
| --- | --- |
| `new-order` | An order was sent to the kitchen |
| `ticket-updated` | A KDS stage changed |
| `item-status-updated` | An order-line kitchen status changed |
| `order-paid` | An order was paid |
| `order-cancelled` | An order was cancelled |

The HTTP routes use the authenticated user's organization when selecting the destination room. The Socket.IO connection itself does not perform a token handshake.

## 10. Payment Flow

Payment-method configuration is implemented in [src/routes/paymentMethods.js](src/routes/paymentMethods.js).

Endpoints:

- `GET /api/payment-methods`
- `PUT /api/payment-methods/:id`

Administrators can enable or disable an organization's `CASH`, `CARD`, or `UPI` method and update the UPI ID.

Order payment is handled by `PUT /api/orders/:id/pay`:

1. Load the organization-owned order.
2. Accept either one payment (`paymentMethod` and `paymentReference`) or a `payments` array for split payment.
3. Create payment records.
4. Set the order status to `PAID`.
5. Clear the table's current order.
6. Update POS session totals.
7. Emit `order-paid` through Socket.IO.

Payment records are associated with an order and are deleted when the order is deleted.

## 11. POS Sessions and Reporting

The session routes in [src/routes/session.js](src/routes/session.js) open and close register sessions and expose the current session and draft count. Orders belong to a POS session, and payment updates session totals.

The report routes in [src/routes/reports.js](src/routes/reports.js) consume organization-scoped order and payment data for dashboard and CSV/XLSX exports.

## 12. Current Caveats and Risks

These are observations about the current implementation, not changes made by this document:

- Socket.IO room joining is unauthenticated. A client can request a room for another organization by supplying its ID.
- Customers are global because `Customer` has no `organizationId`; customer data is not tenant-isolated.
- Customer IDs are checked for existence, but not for organization ownership.
- Payment methods in orders and payments are stored as strings rather than validated foreign keys or enums.
- The payment endpoint does not verify that a method exists, is enabled, or belongs to the organization.
- Split payment amounts are not checked against the order total.
- The payment endpoint does not clearly reject repeated payment of an already-paid order.
- Payment creation, table clearing, and POS session updates are separate database operations rather than one transaction.
- Existing access tokens trust their embedded role and do not re-check `isActive`; a deactivated user may retain access until the access token expires.
- Refresh tokens are rotated but are not stored server-side, so logout cannot revoke an already-issued refresh token on the server.
- Sending an order to the kitchen does not explicitly reject every terminal order state.
- KDS stage input is passed to Prisma without complete application-level enum validation, so invalid values can become server errors.
- The Socket.IO connection has no authentication handshake; authorization is applied to the HTTP route that emits events, not to the socket connection itself.

## 13. Useful Starting Points

For a new developer, read the backend in this order:

1. [server.js](server.js) for composition and route registration.
2. [prisma/schema.prisma](prisma/schema.prisma) for the data model.
3. [src/middleware/auth.js](src/middleware/auth.js) for request identity and roles.
4. [src/controllers/authController.js](src/controllers/authController.js) for token flow.
5. [src/routes/orders.js](src/routes/orders.js) for the central business workflow.
6. [src/routes/kds.js](src/routes/kds.js) and [src/routes/paymentMethods.js](src/routes/paymentMethods.js) for kitchen and payment operations.