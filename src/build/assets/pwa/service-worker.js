const CACHE_PREFIX = '[[shortname]]-pwa-cache-'
const CACHE_NAME = CACHE_PREFIX + '[[version]]'
const BUILD_TIME = [[buildtime]]
const urlsToCache = ['/', '/index.html']

const url = self.location.href
const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)

const initCache = async () => {
    self.skipWaiting()

    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(urlsToCache)
}

const deleteOldCaches = async () => {
    const keys = await caches.keys()
    const deleteKeys = keys.filter(
        key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME
    )
    await Promise.all(deleteKeys.map(key => caches.delete(key)))
    self.clients.claim();
}

const handleFetch = async (request) => {
    let requestUrl = request.url.substring(baseUrl.length - 1)
    const doCache = urlsToCache.includes(requestUrl)

    if (doCache) {
        const cache = await caches.open(CACHE_NAME)
        const response = await cache.match(request)
        if (response) return response
    }
    try {
        const fetched = await fetch(request)
        if (doCache) {
            let fetchedClone = fetched.clone()
            cache.put(request, fetchedClone)
        }
        return fetched
    } catch (e) {
        return new Response('', { status: 503 })
    }
}

self.addEventListener('install', event => {
    event.waitUntil(initCache())
})

self.addEventListener('activate', event => {
    event.waitUntil(deleteOldCaches())
})

self.addEventListener('fetch', event => {
    event.respondWith(handleFetch(event.request))
})

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'checkVersion' && event.data.time !== BUILD_TIME) {
        event.source.postMessage({ type: 'refresh' });
    }
})