// AgriCRM Service Worker v1.0
// キャッシュ戦略: App Shell + ネットワーク優先（CDNリソース）

const CACHE_NAME = 'agricrm-v1';
const APP_SHELL_CACHE = 'agricrm-shell-v1';

// ── アプリシェル（必ずキャッシュするファイル） ──
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// ── 外部CDNリソース（キャッシュ優先） ──
const CDN_RESOURCES = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap',
  'https://fonts.gstatic.com',
];

// ════════════════════════════════════════
//  INSTALL: アプリシェルをキャッシュ
// ════════════════════════════════════════
self.addEventListener('install', event => {
  console.log('[SW] Installing AgriCRM Service Worker...');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // CDNは失敗してもインストールを続行
        const appShellPromise = cache.addAll(APP_SHELL).catch(err => {
          console.warn('[SW] App shell cache partial failure:', err);
        });
        return appShellPromise;
      })
      .then(() => {
        console.log('[SW] App shell cached. Skipping waiting...');
        return self.skipWaiting();
      })
  );
});

// ════════════════════════════════════════
//  ACTIVATE: 古いキャッシュを削除
// ════════════════════════════════════════
self.addEventListener('activate', event => {
  console.log('[SW] Activating AgriCRM Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== APP_SHELL_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Now controlling all clients');
        return self.clients.claim();
      })
  );
});

// ════════════════════════════════════════
//  FETCH: キャッシュ戦略
// ════════════════════════════════════════
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // POST/PUT/DELETE はキャッシュしない
  if (request.method !== 'GET') return;

  // ── 戦略1: アプリ本体（同一オリジン） ──
  // ネットワーク優先 → 失敗時にキャッシュフォールバック
  if (url.origin === self.location.origin) {
    event.respondWith(
      networkFirstWithCache(request, APP_SHELL_CACHE)
    );
    return;
  }

  // ── 戦略2: Googleフォント（キャッシュ優先） ──
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      cacheFirstWithNetwork(request, CACHE_NAME)
    );
    return;
  }

  // ── 戦略3: CDNスクリプト（キャッシュ優先・長期保存） ──
  if (url.hostname.includes('jsdelivr.net') || url.hostname === 'cdn.tailwindcss.com') {
    event.respondWith(
      cacheFirstWithNetwork(request, CACHE_NAME)
    );
    return;
  }

  // ── その他：ネットワーク優先 ──
  event.respondWith(
    networkFirstWithCache(request, CACHE_NAME)
  );
});

// ════════════════════════════════════════
//  ヘルパー関数
// ════════════════════════════════════════

/**
 * ネットワーク優先: ネット失敗時にキャッシュを返す
 * → アプリ本体（常に最新を優先したいが、オフラインでも動く）
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    // 正常レスポンスのみキャッシュ
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // オフライン: キャッシュから返す
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Offline - serving from cache:', request.url);
      return cachedResponse;
    }
    // キャッシュもない場合はオフラインページ
    return offlineFallback(request);
  }
}

/**
 * キャッシュ優先: キャッシュヒット → そのまま返す / ミス → ネットワーク取得してキャッシュ
 * → CDN・フォント（変更頻度が低い外部リソース）
 */
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network and cache both failed:', request.url);
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * オフラインフォールバック（HTMLリクエスト向け）
 */
function offlineFallback(request) {
  const acceptHeader = request.headers.get('Accept') || '';
  if (acceptHeader.includes('text/html')) {
    return caches.match('/') || caches.match('/index.html') || new Response(
      `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>オフライン - AgriCRM</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1a3a2a;color:#fff;text-align:center;}
      .box{padding:32px;}.icon{font-size:64px;margin-bottom:16px;}.title{font-size:22px;font-weight:700;margin-bottom:8px;}
      .msg{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:24px;line-height:1.6;}
      button{background:#40916c;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:16px;cursor:pointer;}</style>
      </head><body><div class="box">
      <div class="icon">🌾</div>
      <div class="title">AgriCRM</div>
      <div class="msg">現在オフラインです。<br>ネットワークに接続後、再度お試しください。<br>（一度読み込んだデータはローカルに保存されています）</div>
      <button onclick="location.reload()">再接続して開く</button>
      </div></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('', { status: 503 });
}

// ════════════════════════════════════════
//  BACKGROUND SYNC（オプション）
//  オフライン中の操作はlocalStorageに保存済みなので
//  接続回復時に自動でUIを更新するメッセージを送信
// ════════════════════════════════════════
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
