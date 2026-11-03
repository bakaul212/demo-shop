# Demo Shop Backend v2 - MongoDB Atlas + customer accounts

Backend attempt for Demo Shop. Frontend is the existing single HTML shop;
this API gives it a shared database, real login, and server-side order,
coupon, dashboard and export logic.

## What's new in v2

- MongoDB Atlas: set `MONGODB_URI` (and `MONGODB_DB=demo-shop`) as an
  environment variable. Shop data and customer accounts are then stored
  in Atlas collections (`settings`, `categories`, `products`, `coupons`,
  `orders`, `messages`, `customers`). Without `MONGODB_URI`, or if Atlas
  cannot be reached, the server keeps working with `data/db.json`.
  Never put a real connection string in code, in the frontend, or in chat.
- Customer accounts: `POST /api/customers/register`,
  `POST /api/customers/login`, `GET /api/customers/me`,
  `GET /api/customers/my-orders`. Passwords are stored only as scrypt
  hashes. Orders placed while logged in are linked to the customer
  (`customerId` / `customerEmail`), so "My Orders" works on any device.
- Health now reports the database mode: `/api/health` returns
  `db: "mongodb"` or `db: "json"`.

## Atlas + Render setup (no secret in chat)

1. Atlas: create a database user, allow Network Access for Render
   (`0.0.0.0/0` for this assignment demo), and copy the connection string.
2. Render dashboard > demo-shop > Environment: add `MONGODB_URI` with
   that string (replace `<password>` with the Atlas database user
   password, only in the Render dashboard) and `MONGODB_DB=demo-shop`,
   then Manual Deploy > Deploy latest commit.
3. Check `/api/health` - it should show `db: "mongodb"`.

## Run in VS Code (5 minutes)

1. Open this `demo-shop-backend` folder in VS Code.
2. Copy `.env.example` to `.env` and change `JWT_SECRET` (and
   `PASSWORD_SALT` if you change the demo passwords).
3. Run:
   ```
   npm install
   npm start
   ```
4. Check: http://localhost:4000/api/health
   It should return `{"ok":true,...}`.
5. First run creates `data/db.json` from the seed data. Delete that file
   to reset to the demo seed.

## Demo login (change before any public use)

- Admin: admin@demo.shop / admin123
- Staff: staff@demo.shop / staff123 (view only, edits return 403)

Only password hashes are stored in `server.js`. In production use
bcrypt, a real database, HTTPS, and rate limiting.

## Connect the frontend

Use the integrated frontend file `Demo_Shop_With_Backend.html`
(delivered with this backend):

1. Open that HTML file and set the backend URL in Admin > Settings >
   "Backend API URL", for example `http://localhost:4000`, then reload.
   Or edit the `API_BASE` value near the top of the script.
2. The shop then loads products/categories/settings from
   `GET /api/public`.
3. A customer order is also sent to `POST /api/orders`, so an admin on
   another device (with the same backend URL and login) can see it in
   `GET /api/orders`.
4. Admin catalog/settings/coupon changes are pushed to
   `POST /api/admin/sync` when the admin is logged in.

Important: `http://localhost:4000` only works on the same computer.
For a phone test, run the backend on the same Wi-Fi and use the
computer's LAN IP, e.g. `http://192.168.1.10:4000`, or host the backend
(Render / Railway / a VPS). A Netlify static site alone cannot host
this Express server; for Netlify you would need Netlify Functions,
which is the next step, not included here.

## Main endpoints

- GET  /api/health, /api/public, /api/settings
- POST /api/auth/login
- GET/POST/PUT/DELETE /api/products, /api/categories
- GET/POST /api/orders, PATCH /api/orders/:id/status,
  POST /api/orders/bulk-confirm, GET /api/track?q=
- GET/POST/PATCH /api/coupons, POST /api/coupons/validate
- GET /api/dashboard?range=daily|weekly|monthly
- GET /api/payments, GET /api/export/orders.csv, /api/export/products.csv
- GET /api/sitemap.xml, GET/POST /api/backup
- POST /api/admin/sync

Test them with `test-api.sh` (needs the server running).

## What is NOT real yet (honest stubs)

- bKash and SSLCommerz: `POST /api/payments/bkash/init` and
  `/api/payments/sslcommerz/init` return 501 "not-configured".
  Implement them only with sandbox merchant credentials, token +
  create/execute + callback/IPN validation, never in the frontend.
- Steadfast / Pathao: `POST /api/orders/:id/courier` creates a DEMO
  consignment only. A real booking needs the courier API, merchant
  keys in `.env`, and webhook/status sync.
- Images: backend products use `assets/...` paths. The frontend keeps
  its embedded seed images for the seed IDs; upload real images to an
  `assets/` folder or a storage service for new products.
- Database: JSON file (`data/db.json`). It is fine for a school demo
  and for one server, but for many users at once use MongoDB or
  PostgreSQL and move the DB code into a separate layer.
