// Demo Shop backend v1 - Express API with a JSON-file database.
// Run: npm install && npm start  (then http://localhost:4000/api/health)
// This is a backend ATTEMPT for a school demo. Real bKash / SSLCommerz /
// Steadfast / Pathao integrations are stubs below: they return a clear
// "not configured" response instead of faking a live payment or booking.
// Never put a real API secret in the frontend HTML file.
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { seed } = require("./seed");

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-before-any-public-use";
const SALT = process.env.PASSWORD_SALT || "demo-shop-salt-change-me";
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) { console.error("DB read failed, reseeding", e.message); }
  const d = seed();
  saveDb(d);
  return d;
}
function saveDb(d) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), "utf8");
}
let db = loadDb();

// Demo users: only SHA-256 hashes are stored here, not plain passwords.
// Hash = sha256(SALT + password). Demo: admin123 / staff123.
// In production use bcrypt + a database, and change these credentials.
const USERS = [
  { email: "admin@demo.shop", passHash: "bd756037aa80f555e2f753d3cceb845a6c6237a90ae35493803eb2f9640e55f0", role: "Admin" },
  { email: "staff@demo.shop", passHash: "49efaa12b9353a26e75358420204c57240b21ff1b8adc99918d6af16048e2928", role: "Staff" },
];
const hashPw = (pw) => crypto.createHash("sha256").update(SALT + pw).digest("hex");
const b64u = (s) => Buffer.from(s).toString("base64url");
const signToken = (u) => {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ email: u.email, role: u.role, exp: Date.now() + 24 * 3600 * 1000 }));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(head + "." + body).digest("base64url");
  return head + "." + body + "." + sig;
};
function authUser(req) {
  try {
    const h = req.headers.authorization || "";
    const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!tok) return null;
    const [head, body, sig] = tok.split(".");
    const expect = crypto.createHmac("sha256", JWT_SECRET).update(head + "." + body).digest("base64url");
    if (sig !== expect) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}
const requireAuth = (req, res, next) => { const u = authUser(req); if (!u) return res.status(401).json({ error: "Login required" }); req.user = u; next(); };
const requireAdmin = (req, res, next) => { const u = authUser(req); if (!u) return res.status(401).json({ error: "Login required" }); if (u.role !== "Admin") return res.status(403).json({ error: "Staff can only view, cannot edit" }); req.user = u; next(); };

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
const validPhone = (p) => /^01[3-9]\d{8}$/.test(String(p || "").replace(/[\s-]/g, ""));
const STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
const couponDiscount = (code, subtotal, delivery) => {
  if (!code) return { discount: 0, deliveryDiscount: 0 };
  const c = db.coupons.find((x) => x.code === String(code).toUpperCase() && x.active);
  if (!c) throw new Error("Coupon not found or inactive");
  if (subtotal < c.min) throw new Error("Minimum order not reached for this coupon");
  if (c.type === "percent") return { discount: Math.round(subtotal * c.value / 100), deliveryDiscount: 0 };
  if (c.type === "flat") return { discount: Math.min(c.value, subtotal), deliveryDiscount: 0 };
  if (c.type === "freedel") return { discount: 0, deliveryDiscount: delivery };
  return { discount: 0, deliveryDiscount: 0 };
};
const csvEscape = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
const toCsv = (rows) => "\ufeff" + rows.map((r) => r.map(csvEscape).join(",")).join("\n");

app.get("/api/health", (req, res) => res.json({ ok: true, service: "demo-shop-backend", version: "1.0.0" }));
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = USERS.find((x) => x.email === String(email || "").toLowerCase() && x.passHash === hashPw(password || ""));
  if (!u) return res.status(401).json({ error: "Email or password did not match" });
  res.json({ token: signToken(u), user: { email: u.email, role: u.role } });
});
app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: req.user }));

// Public shop data (published products only). Admin can get all via /api/products with a token.
app.get("/api/public", (req, res) => {
  res.json({ settings: db.settings, categories: db.categories, products: db.products.filter((p) => p.status === "published"), coupons: db.coupons.filter((c) => c.active) });
});
app.get("/api/settings", (req, res) => res.json(db.settings));
app.put("/api/settings", requireAdmin, (req, res) => { db.settings = { ...db.settings, ...(req.body || {}) }; saveDb(db); res.json(db.settings); });

app.get("/api/products", (req, res) => {
  const u = authUser(req);
  const list = u && u.role === "Admin" ? db.products : db.products.filter((p) => p.status === "published");
  res.json(list);
});
app.get("/api/products/:id", (req, res) => {
  const p = db.products.find((x) => String(x.id) === req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});
app.post("/api/products", requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !(Number(b.price) > 0)) return res.status(400).json({ error: "Name and a valid price are required" });
  const p = { id: Math.max(0, ...db.products.map((x) => x.id)) + 1, status: "published", sold: 0, rating: 5, reviews: [], gallery: [], ...b, price: Number(b.price), old: Number(b.old) || 0, stock: Number(b.stock) || 0, cost: Number(b.cost) || 0 };
  db.products.unshift(p); saveDb(db); res.status(201).json(p);
});
app.put("/api/products/:id", requireAdmin, (req, res) => {
  const p = db.products.find((x) => String(x.id) === req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  Object.assign(p, req.body || {}); saveDb(db); res.json(p);
});
app.delete("/api/products/:id", requireAdmin, (req, res) => {
  db.products = db.products.filter((x) => String(x.id) !== req.params.id); saveDb(db); res.json({ ok: true });
});

app.get("/api/categories", (req, res) => res.json(db.categories));
app.post("/api/categories", requireAdmin, (req, res) => {
  if (!req.body || !req.body.name) return res.status(400).json({ error: "Category name required" });
  const c = { id: "cat" + Date.now(), name: req.body.name, img: req.body.img || "assets/product.jpg", note: "নতুন কালেকশন", subs: [] };
  db.categories.push(c); saveDb(db); res.status(201).json(c);
});
app.put("/api/categories/:id", requireAdmin, (req, res) => {
  const c = db.categories.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Category not found" });
  if (req.body.name) c.name = req.body.name; saveDb(db); res.json(c);
});
app.delete("/api/categories/:id", requireAdmin, (req, res) => {
  if (db.products.some((p) => p.cat === req.params.id)) return res.status(400).json({ error: "Category has products, move them first" });
  db.categories = db.categories.filter((x) => x.id !== req.params.id); saveDb(db); res.json({ ok: true });
});
app.post("/api/categories/:id/subs", requireAdmin, (req, res) => {
  const c = db.categories.find((x) => x.id === req.params.id);
  if (!c || !req.body.sub) return res.status(400).json({ error: "Category or sub-category missing" });
  c.subs = c.subs || []; if (!c.subs.includes(req.body.sub)) c.subs.push(req.body.sub); saveDb(db); res.json(c);
});
app.delete("/api/categories/:id/subs/:index", requireAdmin, (req, res) => {
  const c = db.categories.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Category not found" });
  c.subs.splice(Number(req.params.index), 1); saveDb(db); res.json(c);
});

app.get("/api/coupons", requireAuth, (req, res) => res.json(db.coupons));
app.post("/api/coupons", requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.code) return res.status(400).json({ error: "Coupon code required" });
  const c = { code: String(b.code).toUpperCase(), type: b.type || "percent", value: Number(b.value) || 0, min: Number(b.min) || 0, active: true, note: b.note || "" };
  db.coupons.push(c); saveDb(db); res.status(201).json(c);
});
app.patch("/api/coupons/:code", requireAdmin, (req, res) => {
  const c = db.coupons.find((x) => x.code === req.params.code.toUpperCase());
  if (!c) return res.status(404).json({ error: "Coupon not found" });
  c.active = !c.active; saveDb(db); res.json(c);
});
app.post("/api/coupons/validate", (req, res) => {
  try {
    const { code, subtotal, delivery } = req.body || {};
    const d = couponDiscount(code, Number(subtotal) || 0, Number(delivery) || 0);
    res.json({ valid: true, ...d });
  } catch (e) { res.status(400).json({ valid: false, error: e.message }); }
});

function createOrderFromPayload(b) {
  const customer = b.customer || {};
  if (!customer.name || customer.name.trim().length < 3) throw new Error("Customer name required");
  if (!validPhone(customer.phone)) throw new Error("Valid 11-digit mobile number required (01...)");
  if (!customer.address || customer.address.trim().length < 8) throw new Error("Delivery address required");
  const area = b.area === "outside" ? "outside" : "inside";
  const payment = b.payment || "ক্যাশ অন ডেলিভারি";
  const rawItems = b.items || [];
  if (!rawItems.length) throw new Error("Order must have at least one item");
  const items = rawItems.map((it) => {
    const p = db.products.find((x) => x.id === Number(it.pid));
    if (!p) throw new Error("Product not found: " + it.pid);
    const qty = Math.max(1, Number(it.qty) || 1);
    if (p.stock < qty) throw new Error("Out of stock: " + p.name);
    return { pid: p.id, name: p.name, price: p.price, qty, variant: it.variant || p.colors[0] || "" };
  });
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryBase = area === "outside" ? db.settings.outside : db.settings.inside;
  let discount = 0, delivery = deliveryBase;
  if (b.couponCode) { const d = couponDiscount(b.couponCode, sub, deliveryBase); discount = d.discount; delivery = deliveryBase - d.deliveryDiscount; }
  items.forEach((i) => { const p = db.products.find((x) => x.id === i.pid); p.stock = Math.max(0, p.stock - i.qty); p.sold += i.qty; });
  const order = { id: b.id || ("DS" + (db.nextOrderSeq++)), items, customer, payment, subtotal: sub, discount, delivery, total: sub - discount + delivery, status: "Pending", courier: null, date: new Date().toISOString(), source: b.source || "ওয়েবসাইট" };
  db.orders.unshift(order); saveDb(db);
  return order;
}
app.get("/api/orders", requireAuth, (req, res) => {
  const q = (req.query.status || "").trim();
  res.json(q ? db.orders.filter((o) => o.status === q) : db.orders);
});
app.get("/api/orders/:id", requireAuth, (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  res.json(o);
});
app.post("/api/orders", (req, res) => {
  try {
    const b = req.body || {};
    // Frontend sync: if this order id already exists, do not create a duplicate.
    if (b.id) { const ex = db.orders.find((x) => x.id === b.id); if (ex) return res.json(ex); }
    // Accept both frontend shape {customer, area, items} and a simple shape.
    const payload = { ...b, customer: b.customer || { name: b.name, phone: b.phone, address: b.address }, area: b.area || "inside" };
    const order = createOrderFromPayload(payload);
    res.status(201).json(order);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.patch("/api/orders/:id/status", requireAdmin, (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o || !STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Order or status invalid" });
  o.status = req.body.status; saveDb(db); res.json(o);
});
app.post("/api/orders/bulk-confirm", requireAdmin, (req, res) => {
  const ids = req.body.ids || [];
  db.orders.forEach((o) => { if (ids.includes(o.id) && o.status === "Pending") o.status = "Confirmed"; });
  saveDb(db); res.json({ ok: true, count: ids.length });
});
app.get("/api/track", (req, res) => {
  const q = String(req.query.q || "").toUpperCase().replace(/[\s-]/g, "");
  if (!q) return res.status(400).json({ error: "Order ID or phone required" });
  const list = db.orders.filter((o) => o.id.toUpperCase() === q || String(o.customer.phone).replace(/[\s-]/g, "") === q);
  res.json(list);
});
app.post("/api/orders/:id/courier", requireAdmin, (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  const name = req.body.courier;
  if (!["Steadfast", "Pathao"].includes(name)) return res.status(400).json({ error: "Courier must be Steadfast or Pathao" });
  // DEMO booking only. A real booking needs the courier API + merchant keys
  // in .env, implemented in courier.js (not included in this v1 attempt).
  o.courier = { name, consignment: (name === "Steadfast" ? "STF" : "PTH") + Math.floor(100000 + Math.random() * 899999), synced: "In Transit", mode: "demo" };
  if (["Confirmed", "Processing"].includes(o.status)) o.status = "Shipped";
  saveDb(db); res.json({ order: o, mode: "demo", note: "Demo booking only. Real Steadfast/Pathao API is not connected." });
});
app.post("/api/messages", (req, res) => {
  const { name, contact, msg } = req.body || {};
  if (!name || !contact || !msg) return res.status(400).json({ error: "Name, contact and message are required" });
  const m = { name, contact, msg, date: new Date().toISOString() };
  db.messages.unshift(m); saveDb(db); res.status(201).json({ ok: true });
});
app.get("/api/messages", requireAuth, (req, res) => res.json(db.messages));

app.get("/api/dashboard", requireAuth, (req, res) => {
  const range = ["daily", "weekly", "monthly"].includes(req.query.range) ? req.query.range : "daily";
  const valid = db.orders.filter((o) => o.status !== "Cancelled");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const today = new Date().toDateString();
  const todaySales = valid.filter((o) => new Date(o.date).toDateString() === today).reduce((s, o) => s + o.total, 0);
  let profit = 0, profitRev = 0;
  valid.forEach((o) => o.items.forEach((i) => { const p = db.products.find((x) => x.id === i.pid); const cost = p && p.cost ? Number(p.cost) : 0; if (cost > 0) { profit += (i.price - cost) * i.qty; profitRev += i.price * i.qty; } }));
  const statusCounts = {}; STATUSES.forEach((s) => { statusCounts[s] = db.orders.filter((o) => o.status === s).length; });
  const lowStock = db.products.filter((p) => p.stock > 0 && p.stock <= 10 && p.status === "published");
  const outStock = db.products.filter((p) => p.stock <= 0);
  let chart = [];
  if (range === "daily") { for (let k = 6; k >= 0; k--) { const d = new Date(); d.setDate(d.getDate() - k); chart.push({ label: d.toLocaleDateString("en-GB"), sum: valid.filter((o) => new Date(o.date).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0) }); } }
  else if (range === "weekly") { for (let w = 7; w >= 0; w--) { const end = new Date(); end.setDate(end.getDate() - w * 7); const start = new Date(end); start.setDate(start.getDate() - 6); chart.push({ label: start.toLocaleDateString("en-GB"), sum: valid.filter((o) => { const dd = new Date(o.date); return dd >= start && dd <= end; }).reduce((s, o) => s + o.total, 0) }); } }
  else { for (let m = 5; m >= 0; m--) { const ref = new Date(); ref.setMonth(ref.getMonth() - m); chart.push({ label: ref.getFullYear() + "-" + String(ref.getMonth() + 1).padStart(2, "0"), sum: valid.filter((o) => { const dd = new Date(o.date); return dd.getFullYear() === ref.getFullYear() && dd.getMonth() === ref.getMonth(); }).reduce((s, o) => s + o.total, 0) }); } }
  res.json({ revenue, todaySales, totalOrders: db.orders.length, totalProducts: db.products.length, profit, profitRevenue: profitRev, margin: profitRev ? Math.round(profit / profitRev * 100) : 0, statusCounts, lowStock, outStock, chart, recentOrders: db.orders.slice(0, 5) });
});
app.get("/api/payments", requireAuth, (req, res) => {
  const paid = db.orders.filter((o) => o.status === "Delivered");
  const codPending = db.orders.filter((o) => o.payment === "ক্যাশ অন ডেলিভারি" && !["Delivered", "Cancelled", "Returned"].includes(o.status));
  res.json({ paidTotal: paid.reduce((s, o) => s + o.total, 0), codPendingTotal: codPending.reduce((s, o) => s + o.total, 0), onlineCount: db.orders.filter((o) => o.payment !== "ক্যাশ অন ডেলিভারি").length, orders: db.orders });
});
// Payment stubs: honest 501 responses, not fake successes.
app.post("/api/payments/bkash/init", requireAuth, (req, res) => res.status(501).json({ mode: "not-configured", error: "bKash merchant keys are not configured. Set BKASH_* in .env and implement the bKash Checkout flow (see README)." }));
app.post("/api/payments/sslcommerz/init", requireAuth, (req, res) => res.status(501).json({ mode: "not-configured", error: "SSLCommerz store credentials are not configured. Set SSLCOMMERZ_* in .env and implement init + IPN validation (see README)." }));
app.get("/api/export/orders.csv", requireAuth, (req, res) => {
  let list = db.orders;
  if (req.query.from) list = list.filter((o) => new Date(o.date) >= new Date(req.query.from));
  if (req.query.to) { const end = new Date(req.query.to); end.setHours(23, 59, 59, 999); list = list.filter((o) => new Date(o.date) <= end); }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders-report.csv");
  res.send(toCsv([["Order ID", "Date", "Customer", "Phone", "Items", "Payment", "Subtotal", "Discount", "Delivery", "Total", "Status", "Courier"], ...list.map((o) => [o.id, new Date(o.date).toLocaleDateString("en-GB"), o.customer.name, o.customer.phone, o.items.map((i) => i.name + " x" + i.qty).join("; "), o.payment, o.subtotal, o.discount, o.delivery, o.total, o.status, o.courier ? o.courier.name + " " + o.courier.consignment : ""])]));
});
app.get("/api/export/products.csv", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=products-report.csv");
  res.send(toCsv([["SKU", "Name", "Category", "Price", "Old Price", "Stock", "Status", "Sold"], ...db.products.map((p) => [p.sku, p.name, p.cat, p.price, p.old, p.stock, p.status, p.sold])]));
});
app.get("/api/sitemap.xml", (req, res) => {
  const urls = ["/", "/shop", ...db.products.map((p) => "/product/" + p.id), ...db.products.map((p) => "/landing/" + p.id)];
  res.setHeader("Content-Type", "application/xml");
  res.send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n") + "\n</urlset>");
});
// Admin sync from the frontend (catalog/settings/coupons only; orders use /api/orders).
app.post("/api/admin/sync", requireAdmin, (req, res) => {
  const b = req.body || {};
  if (b.settings) db.settings = { ...db.settings, ...b.settings };
  if (Array.isArray(b.categories)) db.categories = b.categories;
  if (Array.isArray(b.products)) db.products = b.products;
  if (Array.isArray(b.coupons)) db.coupons = b.coupons;
  saveDb(db);
  res.json({ ok: true, products: db.products.length, categories: db.categories.length, coupons: db.coupons.length });
});
app.get("/api/backup", requireAdmin, (req, res) => res.json(db));
app.post("/api/backup", requireAdmin, (req, res) => {
  const d = req.body || {};
  if (d.settings) db.settings = d.settings; if (d.categories) db.categories = d.categories; if (d.products) db.products = d.products; if (d.coupons) db.coupons = d.coupons; if (d.orders) db.orders = d.orders;
  saveDb(db); res.json({ ok: true });
});
// Frontend sync: store a frontend-created order as-is (totals already
// calculated on the frontend, including any coupon). Dedupes by id and
// decrements backend stock once per unique order id.
app.post("/api/orders/sync", (req, res) => {
  try {
    const o = req.body || {};
    if (!o.id || !o.customer || !validPhone(o.customer.phone)) return res.status(400).json({ error: "Valid order id and mobile number required" });
    const ex = db.orders.find((x) => x.id === o.id);
    if (ex) return res.json(ex);
    if (!Array.isArray(o.items) || !o.items.length) return res.status(400).json({ error: "Order items required" });
    o.items.forEach((i) => { const p = db.products.find((x) => x.id === Number(i.pid)); if (p) { p.stock = Math.max(0, p.stock - (Number(i.qty) || 1)); p.sold += Number(i.qty) || 1; } });
    db.orders.unshift(o); saveDb(db); res.status(201).json(o);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.use((req, res) => res.status(404).json({ error: "Route not found: " + req.method + " " + req.path }));
app.listen(PORT, () => console.log("Demo Shop backend running on http://localhost:" + PORT));
