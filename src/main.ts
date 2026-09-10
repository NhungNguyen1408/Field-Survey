import './style.css'

import {
  Camera,
  CameraResultType,
  CameraSource
} from '@capacitor/camera'

import {
  Geolocation
} from '@capacitor/geolocation'

interface Survey {
  id?: number
  location: string
  equipment: string
  status: string
  note: string
  latitude: number | null
  longitude: number | null
  photo: string
  createdAt: string
  synced: boolean
}

/* =========================
   GIAO DIỆN
========================= */

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">

    <header>
      <h1>📋 VKU Field Survey</h1>
      <p>Offline Data Collection</p>

      <div id="networkStatus" class="online">
        ● Online
      </div>
    </header>

    <main>

      <section class="card">

        <h2>Khảo sát cơ sở vật chất</h2>

        <label for="location">
          Địa điểm
        </label>

        <input
          id="location"
          type="text"
          placeholder="Ví dụ: Phòng K101"
        >

        <label for="equipment">
          Thiết bị
        </label>

        <select id="equipment">

          <option value="">
            -- Chọn thiết bị --
          </option>

          <option value="Projector">
            Máy chiếu
          </option>

          <option value="Air Conditioner">
            Điều hòa
          </option>

          <option value="Electrical">
            Thiết bị điện
          </option>

          <option value="Computer">
            Máy tính
          </option>

          <option value="Other">
            Khác
          </option>

        </select>

        <label for="status">
          Tình trạng
        </label>

        <select id="status">

          <option value="Good">
            Tốt
          </option>

          <option value="Need Repair">
            Cần sửa chữa
          </option>

          <option value="Broken">
            Hỏng
          </option>

        </select>

        <label for="note">
          Ghi chú
        </label>

        <textarea
          id="note"
          placeholder="Nhập ghi chú khảo sát..."
        ></textarea>

        <div class="gps-box">

          <button id="gpsBtn">
            📍 Lấy vị trí GPS
          </button>

          <p id="gpsResult">
            Chưa lấy vị trí
          </p>

        </div>

       <div class="photo-box">

        <label>
          📷 Ảnh hiện trường
        </label>

        <button
          type="button"
          id="photoBtn"
        >
          📷 Chụp ảnh
        </button>

        <img
          id="photoPreview"
          class="photo-preview"
          alt="Ảnh khảo sát"
        >

      </div>  

        <button
          id="saveBtn"
          class="save-btn"
        >
          💾 Lưu khảo sát
        </button>

      </section>


      <section class="card">

        <div class="list-title">

          <h2>
            Dữ liệu đã lưu
          </h2>

          <span id="surveyCount">
            0 bản ghi
          </span>

        </div>

        <div id="surveyList">

          <p class="empty">
            Chưa có dữ liệu khảo sát.
          </p>

        </div>

      </section>

    </main>

  </div>
`


/* =========================
   TRẠNG THÁI INTERNET
========================= */

function updateNetworkStatus() {

  const status =
    document.querySelector<HTMLDivElement>(
      '#networkStatus'
    )!

  if (navigator.onLine) {

    status.textContent =
      '● Online'

    status.className =
      'online'

  } else {

    status.textContent =
      '● Offline'

    status.className =
      'offline'

  }
}

updateNetworkStatus()

/* =========================
   GPS BẰNG CAPACITOR
========================= */

let latitude: number | null = null
let longitude: number | null = null

const gpsBtn =
  document.querySelector<HTMLButtonElement>(
    '#gpsBtn'
  )!

gpsBtn.addEventListener(
  'click',
  async () => {

    const result =
      document.querySelector<HTMLParagraphElement>(
        '#gpsResult'
      )!

    try {

      result.textContent =
        'Đang xin quyền vị trí...'

      // Kiểm tra quyền
      let permission =
        await Geolocation.checkPermissions()

      console.log(
        'Quyền GPS hiện tại:',
        permission
      )

      // Nếu chưa cấp quyền thì hỏi người dùng
      if (
        permission.location !== 'granted' &&
        permission.coarseLocation !== 'granted'
      ) {

        permission =
          await Geolocation.requestPermissions()

        console.log(
          'Quyền sau khi yêu cầu:',
          permission
        )
      }

      // Kiểm tra lại
      if (
        permission.location !== 'granted' &&
        permission.coarseLocation !== 'granted'
      ) {

        result.textContent =
          'Bạn chưa cấp quyền vị trí'

        alert(
          'Vui lòng cấp quyền Location cho ứng dụng'
        )

        return
      }

      result.textContent =
        'Đang lấy vị trí GPS...'

      const position =
        await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        })

      latitude =
        position.coords.latitude

      longitude =
        position.coords.longitude

      result.textContent =
        `Lat: ${latitude.toFixed(6)} - Lng: ${longitude.toFixed(6)}`

      console.log(
        'GPS thành công:',
        latitude,
        longitude
      )

    } catch (error) {

      console.error(
        'Lỗi lấy GPS:',
        error
      )

      result.textContent =
        'Không thể lấy vị trí GPS'

      alert(
        'Không lấy được vị trí. Hãy kiểm tra quyền Location và GPS của máy.'
      )

    }

  }
)

/* =========================
   CAMERA BẰNG CAPACITOR
========================= */

let photoData = ''

const photoBtn =
  document.querySelector<HTMLButtonElement>(
    '#photoBtn'
  )!

photoBtn.addEventListener(
  'click',
  async () => {

    try {

      const image =
        await Camera.getPhoto({

          quality: 70,

          allowEditing: false,

          resultType:
            CameraResultType.DataUrl,

          source:
            CameraSource.Camera

        })


      if (image.dataUrl) {

        photoData =
          image.dataUrl

        const preview =
          document.querySelector<HTMLImageElement>(
            '#photoPreview'
          )!

        preview.src =
          photoData

        preview.style.display =
          'block'

      }

    } catch (error) {

      console.error(
        'Lỗi Camera:',
        error
      )

    }

  }
)
/* =========================
   INDEXEDDB
========================= */

const DB_NAME =
  'VKUFieldSurveyDB'

const DB_VERSION =
  1

const STORE_NAME =
  'surveys'


function openDatabase():
Promise<IDBDatabase> {

  return new Promise(
    (resolve, reject) => {

      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        )


      request.onupgradeneeded =
        () => {

          const db =
            request.result

          if (
            !db.objectStoreNames.contains(
              STORE_NAME
            )
          ) {

            db.createObjectStore(
              STORE_NAME,
              {
                keyPath: 'id',
                autoIncrement: true
              }
            )

          }

        }


      request.onsuccess =
        () => {

          resolve(
            request.result
          )

        }


      request.onerror =
        () => {

          reject(
            request.error
          )

        }

    }
  )
}


/* =========================
   LƯU KHẢO SÁT
========================= */

const saveBtn =
  document.querySelector<HTMLButtonElement>(
    '#saveBtn'
  )!


saveBtn.addEventListener(
  'click',
  async () => {

    const locationInput =
      document.querySelector<HTMLInputElement>(
        '#location'
      )!


    const equipmentInput =
      document.querySelector<HTMLSelectElement>(
        '#equipment'
      )!


    const statusInput =
      document.querySelector<HTMLSelectElement>(
        '#status'
      )!


    const noteInput =
      document.querySelector<HTMLTextAreaElement>(
        '#note'
      )!


    if (
      locationInput.value.trim() === ''
    ) {

      alert(
        'Vui lòng nhập địa điểm khảo sát!'
      )

      return
    }


    if (
      equipmentInput.value === ''
    ) {

      alert(
        'Vui lòng chọn thiết bị!'
      )

      return
    }


    const survey: Survey = {

      location:
        locationInput.value.trim(),

      equipment:
        equipmentInput.value,

      status:
        statusInput.value,

      note:
        noteInput.value.trim(),

      latitude,

      longitude,

      photo:
        photoData,

      createdAt:
        new Date().toLocaleString(),

      synced:
        false

    }


    try {

      const db =
        await openDatabase()


      const transaction =
        db.transaction(
          STORE_NAME,
          'readwrite'
        )


      const store =
        transaction.objectStore(
          STORE_NAME
        )


      store.add(
        survey
      )


      transaction.oncomplete =
        async () => {

          alert(
            'Lưu khảo sát thành công!'
          )


          locationInput.value =
            ''

          equipmentInput.value =
            ''

          statusInput.value =
            'Good'

          noteInput.value =
            ''


          latitude =
            null

          longitude =
            null

          photoData =
            ''


          document.querySelector<HTMLParagraphElement>(
            '#gpsResult'
          )!.textContent =
            'Chưa lấy vị trí'

            ''


          const preview =
            document.querySelector<HTMLImageElement>(
              '#photoPreview'
            )!


          preview.src =
            ''

          preview.style.display =
            'none'


          await loadSurveys()


          /*
            Nếu đang Online thì
            thử đồng bộ ngay
          */

          if (
            navigator.onLine
          ) {

            syncPendingSurveys()

          }

        }

    }

    catch (error) {

      console.error(
        'Lỗi lưu:',
        error
      )

      alert(
        'Có lỗi khi lưu dữ liệu!'
      )

    }

  }
)


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(
  value: unknown
): string {

  const div =
    document.createElement(
      'div'
    )

  div.textContent =
    String(value ?? '')

  return div.innerHTML
}


/* =========================
   HIỂN THỊ DỮ LIỆU
========================= */

async function loadSurveys():
Promise<void> {

  const surveyList =
    document.querySelector<HTMLDivElement>(
      '#surveyList'
    )!


  const surveyCount =
    document.querySelector<HTMLSpanElement>(
      '#surveyCount'
    )!


  const db =
    await openDatabase()


  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          'readonly'
        )


      const store =
        transaction.objectStore(
          STORE_NAME
        )


      const request =
        store.getAll()


      request.onsuccess =
        () => {

          const surveys:
          Survey[] =
            request.result


          surveyCount.textContent =
            `${surveys.length} bản ghi`


          if (
            surveys.length === 0
          ) {

            surveyList.innerHTML = `
              <p class="empty">
                Chưa có dữ liệu khảo sát.
              </p>
            `

            resolve()

            return

          }


          surveyList.innerHTML =
            ''


          surveys
            .reverse()
            .forEach(
              (survey) => {

                const item =
                  document.createElement(
                    'div'
                  )


                item.style.border =
                  '1px solid #e2e8f0'

                item.style.padding =
                  '15px'

                item.style.marginTop =
                  '12px'

                item.style.borderRadius =
                  '8px'


                const hasGPS =
                  survey.latitude !== null &&
                  survey.latitude !== undefined &&
                  survey.longitude !== null &&
                  survey.longitude !== undefined


                item.innerHTML = `

                  <strong>
                    ${escapeHTML(
                      survey.location
                    )}
                  </strong>


                  <p>
                    Thiết bị:
                    ${escapeHTML(
                      survey.equipment
                    )}
                  </p>


                  <p>
                    Tình trạng:
                    ${escapeHTML(
                      survey.status
                    )}
                  </p>


                  <p>
                    Ghi chú:
                    ${escapeHTML(
                      survey.note ||
                      'Không có'
                    )}
                  </p>


                  ${
                    hasGPS

                    ? `
                      <p>
                        GPS:
                        ${survey.latitude},
                        ${survey.longitude}
                      </p>
                    `

                    : `
                      <p>
                        GPS:
                        Chưa lấy vị trí
                      </p>
                    `
                  }


                  ${
                    survey.photo

                    ? `
                      <img
                        src="${survey.photo}"
                        alt="Ảnh khảo sát"
                        style="
                          width:100%;
                          max-width:250px;
                          margin-top:10px;
                          border-radius:8px;
                        "
                      >
                    `

                    : ''
                  }


                  <p>
                    <small>
                      ${escapeHTML(
                        survey.createdAt
                      )}
                    </small>
                  </p>


                  <p>
                    ${
                      survey.synced

                        ? '✅ Đã đồng bộ'

                        : '⏳ Chưa đồng bộ'
                    }
                  </p>

                `


                surveyList.appendChild(
                  item
                )

              }
            )


          resolve()

        }


      request.onerror =
        () => {

          reject(
            request.error
          )

        }

    }
  )
}


/* =========================
   LẤY TOÀN BỘ KHẢO SÁT
========================= */

async function getAllSurveys():
Promise<Survey[]> {

  const db =
    await openDatabase()


  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          'readonly'
        )


      const store =
        transaction.objectStore(
          STORE_NAME
        )


      const request =
        store.getAll()


      request.onsuccess =
        () => {

          resolve(
            request.result
          )

        }


      request.onerror =
        () => {

          reject(
            request.error
          )

        }

    }
  )
}


/* =========================
   ĐÁNH DẤU ĐÃ ĐỒNG BỘ
========================= */

async function markSurveySynced(
  id: number
): Promise<void> {

  const db =
    await openDatabase()


  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          'readwrite'
        )


      const store =
        transaction.objectStore(
          STORE_NAME
        )


      const getRequest =
        store.get(id)


      getRequest.onsuccess =
        () => {

          const survey:
          Survey =
            getRequest.result


          if (!survey) {

            resolve()

            return

          }


          survey.synced =
            true


          const updateRequest =
            store.put(
              survey
            )


          updateRequest.onsuccess =
            () => {

              console.log(
                'Đã cập nhật synced:',
                id
              )

              resolve()

            }


          updateRequest.onerror =
            () => {

              reject(
                updateRequest.error
              )

            }

        }


      getRequest.onerror =
        () => {

          reject(
            getRequest.error
          )

        }

    }
  )
}


/* =========================
   ĐỒNG BỘ SERVER
========================= */

let isSyncing =
  false


async function syncPendingSurveys() {

  if (isSyncing) {
    return
  }


  console.log(
    'Kiểm tra đồng bộ - Online:',
    navigator.onLine
  )


  if (
    !navigator.onLine
  ) {

    console.log(
      '📴 Đang Offline'
    )

    return
  }


  isSyncing =
    true


  try {

    const surveys =
      await getAllSurveys()


    const pendingSurveys =
      surveys.filter(
        survey =>
          survey.synced !== true
      )


    console.log(
      'Số bản ghi chưa đồng bộ:',
      pendingSurveys.length
    )


    if (
      pendingSurveys.length === 0
    ) {

      console.log(
        '✅ Không có dữ liệu cần đồng bộ'
      )

      return
    }


    for (
      const survey
      of pendingSurveys
    ) {

      try {

        console.log(
          '⬆️ Đang gửi:',
          survey.location
        )


        const response =
          await fetch(
            'https://jsonplaceholder.typicode.com/posts',
            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json'

              },

              body:
                JSON.stringify({

                  location:
                    survey.location,

                  equipment:
                    survey.equipment,

                  status:
                    survey.status,

                  note:
                    survey.note,

                  latitude:
                    survey.latitude,

                  longitude:
                    survey.longitude,

                  createdAt:
                    survey.createdAt

                })

            }
          )


        console.log(
          'HTTP Status:',
          response.status
        )


        if (
          !response.ok
        ) {

          throw new Error(
            'HTTP ' +
            response.status
          )

        }


        if (
          survey.id !== undefined
        ) {

          await markSurveySynced(
            survey.id
          )

        }


        console.log(
          '✅ Đồng bộ thành công:',
          survey.location
        )

      }

      catch (error) {

        console.error(
          '❌ Đồng bộ thất bại:',
          survey.location,
          error
        )

      }

    }


    await loadSurveys()

  }

  catch (error) {

    console.error(
      'Lỗi đồng bộ:',
      error
    )

  }

  finally {

    isSyncing =
      false

  }
}


/* =========================
   ONLINE / OFFLINE
========================= */

window.addEventListener(
  'online',
  () => {

    console.log(
      '🌐 Có Internet trở lại'
    )

    updateNetworkStatus()

    syncPendingSurveys()

  }
)


window.addEventListener(
  'offline',
  () => {

    console.log(
      '📴 Mất Internet'
    )

    updateNetworkStatus()

  }
)


/* =========================
   SERVICE WORKER
========================= */

async function registerServiceWorker() {

  if (
    !(
      'serviceWorker'
      in navigator
    )
  ) {

    console.log(
      'Trình duyệt không hỗ trợ Service Worker'
    )

    return
  }


  try {

    const registration =
      await navigator.serviceWorker.register(
        '/sw.js'
      )


    console.log(
      '✅ Service Worker registered:',
      registration.scope
    )


    await navigator.serviceWorker.ready


    console.log(
      '✅ Service Worker ready'
    )

  }

  catch (error) {

    console.error(
      '❌ Service Worker registration failed:',
      error
    )

  }

}


/* =========================
   KHI APP KHỞI ĐỘNG
========================= */

window.addEventListener(
  'load',
  async () => {

    updateNetworkStatus()

    await loadSurveys()

    await registerServiceWorker()


    if (
      navigator.onLine
    ) {

      setTimeout(
        () => {

          syncPendingSurveys()

        },
        1500
      )

    }

  }
)


/* =========================
   TỰ KIỂM TRA SYNC
   MỖI 5 GIÂY
========================= */

setInterval(
  () => {

    if (
      navigator.onLine
    ) {

      syncPendingSurveys()

    }

  },
  5000
)