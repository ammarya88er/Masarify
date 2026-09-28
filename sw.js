/* مصاريفي — يخلي البرنامج يفتح ويشتغل من غير إنترنت */
const CACHE = 'masareef-v2';
const SHELL = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // أي حاجة من موقع تاني (أسعار العملات، المزامنة، قراية الفواتير) بتتجاب من النت على طول ومتتخزنش —
  // ما عدا الخطوط، دي بتتخزن عشان البرنامج يفتح من غير نت
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  // صفحة البرنامج: هات من الشبكة وحدّث النسخة، ولو مفيش نت هات المحفوظة
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          /* بنحفظ النسخة بس لو الصفحة جت سليمة */
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // الخطوط وغيرها: من الكاش الأول وبعدين الشبكة
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      /* الخطوط جاية من جوجل كـ«opaque» (من غير status) — بتتخزن برضو */
      if (res && (res.status === 200 || res.type === 'opaque') && (url.protocol === 'https:' || url.protocol === 'http:')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
