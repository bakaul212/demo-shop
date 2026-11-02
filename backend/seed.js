// Seed data for Demo Shop backend. Images are file paths on purpose:
// the frontend keeps its embedded seed images for these IDs.
function seed() {
  const now = new Date();
  const daysAgo = (n, h) => { const d = new Date(now); d.setDate(d.getDate() - n); d.setHours(h, 24, 0, 0); return d.toISOString(); };
  const categories = [
    { id: "watch", name: "ঘড়ি", img: "assets/watch.jpg", note: "প্রিমিয়াম কালেকশন", subs: ["মেনস", "লেডিস"] },
    { id: "gadget", name: "গ্যাজেট", img: "assets/headphones.webp", note: "হেডফোন, ইয়ারবাডস", subs: ["হেডফোন", "স্মার্ট ওয়াচ"] },
    { id: "fashion", name: "ফ্যাশন", img: "assets/tshirt.jpg", note: "টি-শার্ট, সানগ্লাস", subs: ["টি-শার্ট", "সানগ্লাস"] },
    { id: "shoes", name: "জুতা", img: "assets/sneakers.jpg", note: "রানিং ও স্পোর্টস", subs: ["রানিং", "স্পোর্টস"] },
    { id: "lifestyle", name: "লাইফস্টাইল", img: "assets/perfume.jpg", note: "পারফিউম, ওয়ালেট, ব্যাগ", subs: ["পারফিউম", "ব্যাগ"] }
  ];
  const mk = (id, name, cat, price, oldPrice, stock, sku, sizes, colors, flash, sold, rating, desc) => ({
    id, name, cat, price, old: oldPrice, cost: 0, subcat: "", video: "", stock, sku,
    status: "published", flash, sold, rating, sizes, colors,
    img: "assets/product.jpg", gallery: [], desc, reviews: []
  });
  const products = [
    mk(1, "Ai Crouse প্রিমিয়াম মেনস ওয়াচ", "watch", 1199, 1899, 34, "WATCH-001", ["স্ট্যান্ডার্ড"], ["কালো", "সিলভার"], true, 412, 4.8, "স্টেইনলেস স্টিল বডি, প্রিমিয়াম মেটাল চেইন।"),
    mk(2, "স্মার্ট ওয়াচ Ultra — কলিং ফিচারসহ", "watch", 2499, 3500, 18, "WATCH-002", ["স্ট্যান্ডার্ড"], ["কালো"], true, 268, 4.6, "ব্লুটুথ কলিং, হার্ট-রেট মনিটর, ৭ দিনের ব্যাটারি।"),
    mk(3, "ওয়্যারলেস ব্লুটুথ হেডফোন — নয়েজ ক্যান্সেলিং", "gadget", 1450, 2200, 52, "GAD-001", ["স্ট্যান্ডার্ড"], ["কালো", "সাদা"], true, 530, 4.7, "৪০ ঘণ্টা প্লেব্যাক, ডিপ বেস, ব্লুটুথ 5.3।"),
    mk(4, "ওয়্যারলেস ইয়ারবাডস প্রো", "gadget", 999, 1599, 40, "GAD-002", ["স্ট্যান্ডার্ড"], ["কালো", "সাদা"], false, 310, 4.5, "কমপ্যাক্ট কেস, ক্লিয়ার কলিং।"),
    mk(5, "প্রিমিয়াম কটন টি-শার্ট", "fashion", 499, 799, 80, "FASH-001", ["M", "L", "XL"], ["কালো", "সাদা", "নীল"], false, 420, 4.4, "১০০% কটন, আরামদায়ক ফিট।")
  ];
  products.push(
    mk(6, "UV প্রোটেকশন সানগ্লাস", "fashion", 699, 1199, 25, "FASH-002", ["স্ট্যান্ডার্ড"], ["কালো"], false, 180, 4.6, "UV400 প্রোটেকশন, হালকা ফ্রেম।"),
    mk(7, "রানিং স্নিকার্স", "shoes", 1899, 2799, 30, "SHOE-001", ["40", "41", "42", "43"], ["কালো", "সাদা"], true, 240, 4.7, "হালকা ও আরামদায়ক রানিং জুতা।"),
    mk(8, "লেদার ওয়ালেট", "lifestyle", 599, 999, 45, "LIFE-001", ["স্ট্যান্ডার্ড"], ["বাদামি", "কালো"], false, 195, 4.5, "আসল লেদার, একাধিক কার্ড স্লট।"),
    mk(9, "ট্রাভেল ব্যাকপ্যাক", "lifestyle", 1299, 1999, 22, "LIFE-002", ["স্ট্যান্ডার্ড"], ["কালো", "নীল"], false, 150, 4.6, "ল্যাপটপ কম্পার্টমেন্টসহ ট্রাভেল ব্যাগ।"),
    mk(10, "প্রিমিয়াম পারফিউম", "lifestyle", 899, 1499, 28, "LIFE-003", ["স্ট্যান্ডার্ড"], ["স্ট্যান্ডার্ড"], false, 275, 4.8, "দীর্ঘস্থায়ী সুবাস।")
  );
  const item = (pid) => { const p = products.find((x) => x.id === pid); return { pid: p.id, name: p.name, price: p.price, qty: 1, variant: p.colors[0] }; };
  const mkOrder = (id, days, items, name, phone, area, payment, status, courier) => {
    const sub = items.reduce((s, it) => s + it.price * it.qty, 0);
    const delivery = area === "inside" ? 60 : 120;
    return { id, items, customer: { name, phone, address: area === "inside" ? "মিরপুর ১০, ঢাকা" : "সদর রোড" }, payment, subtotal: sub, discount: 0, delivery, total: sub + delivery, status, courier: courier || null, date: daysAgo(days, 10), source: "ওয়েবসাইট" };
  };
  const orders = [
    mkOrder("DS1031", 0, [item(1)], "রাকিব হাসান", "01712345678", "inside", "ক্যাশ অন ডেলিভারি", "Pending", null),
    mkOrder("DS1038", 0, [item(3)], "মেহেদী হাসান", "01812345678", "inside", "বিকাশ", "Confirmed", null),
    mkOrder("DS1045", 1, [item(7), item(5)], "জাহিদ হাসান", "01912345678", "outside", "ক্যাশ অন ডেলিভারি", "Processing", null),
    mkOrder("DS1052", 1, [item(10)], "নুসরাত জাহান", "01612345678", "inside", "কার্ড (SSLCommerz)", "Shipped", { name: "Steadfast", consignment: "STF884120", synced: "In Transit" }),
    mkOrder("DS1059", 2, [item(8)], "কামরুল ইসলাম", "01512345678", "inside", "ক্যাশ অন ডেলিভারি", "Delivered", { name: "Pathao", consignment: "PTH552310", synced: "Delivered" })
  ];
  return {
    settings: { name: "Demo Shop", tag: "বাংলাদেশের বিশ্বস্ত অনলাইন শপ", phone: "০১৭১২-৩৪৫৬৭৮", phoneRaw: "+8801712345678", whatsapp: "8801712345678", email: "support@demo.shop", address: "বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৫", inside: 60, outside: 120, pixelId: "", ga4Id: "", metaTitle: "Demo Shop — অনলাইন শপিং বাংলাদেশ", metaDesc: "ক্যাশ অন ডেলিভারিসহ সারাদেশে দ্রুত ডেলিভারি।", facebook: "", instagram: "", youtube: "" },
    categories, products,
    coupons: [
      { code: "WELCOME10", type: "percent", value: 10, min: 500, active: true, note: "১০% ছাড় (সর্বনিম্ন অর্ডার ৳৫০০)" },
      { code: "FREEDLV", type: "freedel", value: 0, min: 1000, active: true, note: "ফ্রি ডেলিভারি (সর্বনিম্ন অর্ডার ৳১০০০)" },
      { code: "EID200", type: "flat", value: 200, min: 1500, active: true, note: "৳২০০ ছাড় (সর্বনিম্ন অর্ডার ৳১৫০০)" }
    ],
    orders, messages: [], nextOrderSeq: 6000
  };
}
module.exports = { seed };
