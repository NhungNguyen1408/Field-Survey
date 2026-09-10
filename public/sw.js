const CACHE_NAME =
  'vku-field-survey-v3'


const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
]


/* =========================
   INSTALL
========================= */

self.addEventListener(
  'install',
  (event) => {

    console.log(
      'SW: Install'
    )


    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(
          (cache) => {

            console.log(
              'SW: Creating cache'
            )

            return cache.addAll(
              APP_SHELL
            )

          }
        )

    )


    self.skipWaiting()

  }
)


/* =========================
   ACTIVATE
========================= */

self.addEventListener(
  'activate',
  (event) => {

    console.log(
      'SW: Activate'
    )


    event.waitUntil(

      caches
        .keys()

        .then(
          (cacheNames) => {

            return Promise.all(

              cacheNames.map(
                (name) => {

                  if (
                    name !== CACHE_NAME
                  ) {

                    return caches.delete(
                      name
                    )

                  }

                }
              )

            )

          }
        )

    )


    self.clients.claim()

  }
)


/* =========================
   FETCH - CACHE FIRST
========================= */

self.addEventListener(
  'fetch',
  (event) => {

    const request =
      event.request


    /*
      Chỉ xử lý GET
    */

    if (
      request.method !== 'GET'
    ) {

      return
    }


    /*
      Chỉ cache tài nguyên
      cùng domain localhost
    */

    const requestUrl =
      new URL(
        request.url
      )


    if (
      requestUrl.origin !==
      self.location.origin
    ) {

      return
    }


    event.respondWith(

      caches
        .match(request)

        .then(
          async (cachedResponse) => {

            /*
              CACHE FIRST
            */

            if (
              cachedResponse
            ) {

              return cachedResponse

            }


            try {

              const networkResponse =
                await fetch(
                  request
                )


              if (
                networkResponse &&
                networkResponse.status === 200
              ) {

                const cache =
                  await caches.open(
                    CACHE_NAME
                  )


                await cache.put(
                  request,
                  networkResponse.clone()
                )

              }


              return networkResponse

            }

            catch (error) {

              /*
                Nếu Offline và đang
                load trang HTML
              */

              if (
                request.mode ===
                'navigate'
              ) {

                const fallback =
                  await caches.match(
                    '/'
                  )


                if (
                  fallback
                ) {

                  return fallback

                }

              }


              throw error

            }

          }
        )

    )

  }
)