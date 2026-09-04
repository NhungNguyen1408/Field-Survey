import { openDB, type DBSchema } from 'idb';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

interface SurveyReport {
  id?: number;
  auditorId: string;
  auditorName: string;
  building: string;
  room: string;
  category: string;
  severity: 'normal' | 'warning' | 'danger';
  notes: string;
  coords: string;
  photoBase64: string;
  status: 'pending' | 'synced';
  createdAt: number;
}

interface MyDB extends DBSchema {
  surveys: {
    key: number;
    value: SurveyReport;
    indexes: { 'by-status': string };
  };
}

// Khởi tạo IndexedDB
async function getDB() {
  return openDB<MyDB>('vku-campus-care-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('surveys')) {
        const store = db.createObjectStore('surveys', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status');
      }
    },
  });
}

let currentPhotoBase64 = '';

// Hiển thị thông báo Toast nổi
function showToast(msg: string) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-text');
  if (toast && text) {
    text.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

// Kiểm tra mạng
function checkNetwork() {
  const pill = document.getElementById('network-pill');
  const label = document.getElementById('network-label');
  if (pill && label) {
    if (navigator.onLine) {
      pill.className = 'network-capsule online';
      label.textContent = 'Online';
      syncData();
    } else {
      pill.className = 'network-capsule offline';
      label.textContent = 'Offline';
    }
  }
}
window.addEventListener('online', checkNetwork);
window.addEventListener('offline', checkNetwork);

// XỬ LÝ CHỌN MỨC ĐỘ (Bình thường / Cần sửa sớm / Khẩn cấp)
const chips = document.querySelectorAll('.chip');
const severityHidden = document.getElementById('severity') as HTMLInputElement;

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    // Xóa active cũ
    chips.forEach((c) => {
      c.className = 'chip';
    });
    // Gán active mới
    const val = chip.getAttribute('data-val') || 'normal';
    if (severityHidden) severityHidden.value = val;
    chip.classList.add(`active-${val}`);
  });
});

// XỬ LÝ NÚT LẤY GPS
document.getElementById('btn-gps')?.addEventListener('click', async () => {
  const coordsInput = document.getElementById('coords') as HTMLInputElement;
  if (!coordsInput) return;
  coordsInput.value = 'Đang lấy vị trí...';

  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 6000 });
    coordsInput.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    showToast('Đã lấy tọa độ GPS!');
  } catch (err) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coordsInput.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
          showToast('Đã lấy tọa độ từ trình duyệt!');
        },
        () => {
          coordsInput.value = '15.975298, 108.253198 (VKU)';
          showToast('Dùng tọa độ khuôn viên VKU');
        }
      );
    }
  }
});

// XỬ LÝ CHỤP ẢNH / TẢI ẢNH
document.getElementById('btn-photo')?.addEventListener('click', async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
    });
    if (image.base64String) {
      currentPhotoBase64 = `data:image/jpeg;base64,${image.base64String}`;
      showImagePreview(currentPhotoBase64);
    }
  } catch (e) {
    // Nếu chạy trên Web trình duyệt thì mở file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (evt: any) => {
      const file = evt.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        currentPhotoBase64 = loadEvt.target?.result as string;
        showImagePreview(currentPhotoBase64);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
});

function showImagePreview(base64: string) {
  const wrap = document.getElementById('photo-preview-wrap');
  const img = document.getElementById('photo-preview') as HTMLImageElement;
  if (wrap && img) {
    img.src = base64;
    wrap.style.display = 'block';
    showToast('Đã đính kèm ảnh minh chứng!');
  }
}

document.getElementById('btn-delete-photo')?.addEventListener('click', (e) => {
  e.stopPropagation();
  currentPhotoBase64 = '';
  const wrap = document.getElementById('photo-preview-wrap');
  if (wrap) wrap.style.display = 'none';
});

// LƯU PHIẾU VÀO INDEXEDDB
const form = document.getElementById('survey-form') as HTMLFormElement;
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const db = await getDB();

  const report: SurveyReport = {
    auditorId: (document.getElementById('auditor-id') as HTMLInputElement).value,
    auditorName: (document.getElementById('auditor-name') as HTMLInputElement).value,
    building: (document.getElementById('building') as HTMLSelectElement).value,
    room: (document.getElementById('room') as HTMLInputElement).value,
    category: (document.getElementById('category') as HTMLSelectElement).value,
    severity: ((document.getElementById('severity') as HTMLInputElement)?.value || 'normal') as any,
    notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
    coords: (document.getElementById('coords') as HTMLInputElement)?.value || '15.975298, 108.253198',
    photoBase64: currentPhotoBase64,
    status: 'pending',
    createdAt: Date.now(),
  };

  await db.add('surveys', report);
  showToast('Đã lưu phản ánh vào máy (Offline)!');

  // Reset form sau khi gửi
  (document.getElementById('room') as HTMLInputElement).value = '';
  (document.getElementById('notes') as HTMLTextAreaElement).value = '';
  (document.getElementById('coords') as HTMLInputElement).value = '';
  const wrap = document.getElementById('photo-preview-wrap');
  if (wrap) wrap.style.display = 'none';
  currentPhotoBase64 = '';

  await renderData();

  if (navigator.onLine) {
    await syncData();
  }
});

// HIỂN THỊ DỮ LIỆU & SỐ LƯỢNG
async function renderData() {
  const db = await getDB();
  const list = await db.getAll('surveys');

  const pending = list.filter((r) => r.status === 'pending').length;
  const synced = list.filter((r) => r.status === 'synced').length;

  const statPending = document.getElementById('stat-pending');
  const statSynced = document.getElementById('stat-synced');
  const navCount = document.getElementById('nav-count');

  if (statPending) statPending.textContent = pending.toString();
  if (statSynced) statSynced.textContent = synced.toString();
  if (navCount) navCount.textContent = list.length.toString();

  const container = document.getElementById('audit-list-box');
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-sub); font-size: 13px; padding: 24px 0;">Bạn chưa gửi phản ánh nào.</p>`;
    return;
  }

  list.reverse().forEach((item) => {
    const card = document.createElement('div');
    card.className = 'audit-card';

    let badgeClass = 'badge-normal';
    let badgeText = 'Bình thường';
    if (item.severity === 'warning') {
      badgeClass = 'badge-warning';
      badgeText = 'Cần sửa sớm';
    } else if (item.severity === 'danger') {
      badgeClass = 'badge-danger';
      badgeText = 'Khẩn cấp';
    }

    const syncStatus =
      item.status === 'synced'
        ? `<span style="color: var(--success); font-size: 11.5px; font-weight: 700;"><i class="bi bi-check2-all"></i> Đã gửi trường</span>`
        : `<span style="color: var(--warning); font-size: 11.5px; font-weight: 700;"><i class="bi bi-clock-history"></i> Đang chờ mạng</span>`;

    card.innerHTML = `
      <div class="audit-top">
        <strong style="font-size: 13.5px; color: var(--navy);">${item.building} - ${item.room}</strong>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div style="font-size: 12.5px; color: #334155; margin-bottom: 6px;">
        <span style="font-weight: 700; color: var(--text-sub);">${item.category}:</span> ${item.notes}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        <small style="color: var(--text-sub); font-size: 11px;"><i class="bi bi-geo-alt"></i> ${item.coords}</small>
        ${syncStatus}
      </div>
    `;
    container.appendChild(card);
  });
}

// ĐỒNG BỘ NGOẠI TUYẾN
async function syncData() {
  if (!navigator.onLine) return;
  const db = await getDB();
  const tx = db.transaction('surveys', 'readwrite');
  const pendings = await tx.store.index('by-status').getAll('pending');

  if (pendings.length === 0) return;

  for (const item of pendings) {
    item.status = 'synced';
    await db.put('surveys', item);
  }
  showToast('Đã đồng bộ toàn bộ phản ánh lên server!');
  await renderData();
}

// CHUYỂN TAB (Báo sự cố / Đã gửi)
const tabFormBtn = document.getElementById('nav-btn-form');
const tabListBtn = document.getElementById('nav-btn-list');
const tabForm = document.getElementById('tab-form');
const tabList = document.getElementById('tab-list');

tabFormBtn?.addEventListener('click', () => {
  tabFormBtn.classList.add('active');
  tabListBtn?.classList.remove('active');
  if (tabForm) tabForm.style.display = 'block';
  if (tabList) tabList.style.display = 'none';
});

tabListBtn?.addEventListener('click', () => {
  tabListBtn.classList.add('active');
  tabFormBtn?.classList.remove('active');
  if (tabForm) tabForm.style.display = 'none';
  if (tabList) tabList.style.display = 'block';
});

document.getElementById('btn-sync-action')?.addEventListener('click', () => {
  if (!navigator.onLine) {
    showToast('Thiết bị đang offline!');
    return;
  }
  syncData();
});

// Chạy khởi tạo
checkNetwork();
renderData();