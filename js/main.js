// js/main.js
import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// ======== Firebase setup ==========
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dataRef = ref(database, "idnumber");

// ======== Biến toàn cục ==========
let tableData = [];
let currentRegion = "tatca";
let currentIPFilter = "";
let currentProfileFilter = "";

// ======== Hàm parse thời gian linh hoạt ==========
function parseFlexibleDate(dateStr) {
  try {
    let cleanStr = dateStr.trim()
      .replace(" SA", " AM")
      .replace(" CH", " PM");

    if (cleanStr.includes("-")) {
      const [datePart, timePart, meridian] = cleanStr.split(" ");
      const [day, monthText, yearShort] = datePart.split("-");
      const year = "20" + yearShort;
      return new Date(`${monthText} ${day}, ${year} ${timePart} ${meridian || ""}`);
    }

    const [datePart, timePart, meridian] = cleanStr.split(" ");
    const [d1, d2, d3] = datePart.split("/");
    let day, month, year;
    if (parseInt(d1) > 12) {
      day = d1; month = d2; year = d3;
    } else {
      month = d1; day = d2; year = d3;
    }
    return new Date(`${month}/${day}/${year} ${timePart} ${meridian || ""}`);
  } catch {
    return new Date(dateStr.replace(" ", "T"));
  }
}

// ======== Lắng nghe dữ liệu từ Firebase ==========
onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  tableData = [];
  const now = new Date();

  if (data) {
    for (const key in data) {
      const entry = data[key];
      if (!entry.time) continue;

      const lastUpdate = parseFlexibleDate(entry.time);
      const diffSeconds = (now - lastUpdate) / 1000;

      // chỉ lấy máy hoạt động trong 30 giây gần nhất
      if (diffSeconds <= 60) {
        tableData.push({
          hostName: entry.hostName || "N/A",
          IPAddress: entry.IPAddress || "N/A",
          time: entry.time || "N/A",
          userProfile: entry.userProfile || "N/A",
        });
      }
    }
  }

  applyFilterAndDisplayTable();
});

// ======== Hiển thị bảng ==========
function displayTable(data) {
  const tbody = document.querySelector("#data-table tbody");
  if (!tbody) return;

  const prevScroll = tbody.scrollTop;
  tbody.innerHTML = "";

  if (data.length > 0) {
    data.forEach((entry, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.hostName}</td>
        <td>
          <span>${entry.IPAddress}</span>
          <button class="btn btn-info btn-sm copy-btn ms-2" onclick="copyToClipboard('${entry.IPAddress}')">Copy</button>
        </td>
        <td>${entry.time}</td>
        <td>${entry.userProfile.split("\\").pop()}</td>
      `;
      tbody.appendChild(row);
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-light">No active machines</td></tr>`;
  }

  setTimeout(() => (tbody.scrollTop = prevScroll), 0);
}

// ======== Copy IP ==========
window.copyToClipboard = function (value) {
  navigator.clipboard.writeText(value);
};

// ======== Debounce Helper ==========
function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ======== Hàm lọc và hiển thị ==========
function applyFilterAndDisplayTable() {
  const ipText = currentIPFilter.toLowerCase().trim();
  const profileText = currentProfileFilter.toLowerCase().trim();

  const filtered = tableData.filter((d) => {
    const ip = (d.IPAddress || "").toLowerCase();
    const profile = d.userProfile.split("\\").pop().toLowerCase();

    // Lọc text
    const matchIP = !ipText || ip.includes(ipText);
    const matchProfile = !profileText || profile.includes(profileText);

    // Lọc khu vực
    let matchRegion = true;
    switch (currentRegion) {
      case "cantho":
        matchRegion = ip.startsWith("172.16.10.");
        break;
      case "daklak":
        matchRegion = ip.startsWith("172.16.80.");
        break;
      case "quangngai":
        matchRegion = ip.startsWith("192.168.1.");
        break;
      case "binhthanh":
        matchRegion = ip.startsWith("10.10.12.");
        break;
      case "khac":
        matchRegion = !(
          ip.startsWith("172.16.10.") ||
          ip.startsWith("172.16.80.") ||
          ip.startsWith("192.168.1.") ||
          ip.startsWith("10.10.12.")
        );
        break;
      default:
        matchRegion = true;
    }

    return matchIP && matchProfile && matchRegion;
  });

  displayTable(filtered);
}

// ======== Dropdown lọc khu vực ==========
window.locTheoKhuVuc = function (khuVuc) {
  currentRegion = khuVuc || "tatca";

  // cập nhật label dropdown
  const btn = document.querySelector("#dropdownMenuButton");
  if (btn) {
    const labelMap = {
      tatca: "Tất cả",
      cantho: "Cần Thơ",
      daklak: "Đắk Lắk",
      quangngai: "Quảng Ngãi",
      binhthanh: "Bình Thạnh",
      khac: "Khác",
    };
    btn.textContent = labelMap[khuVuc] || "Chọn khu vực";
  }

  applyFilterAndDisplayTable();
};

// ======== Gắn sự kiện input filter ==========
const ipInput = document.getElementById("filter-ip");
const profileInput = document.getElementById("filter-profile");

if (ipInput) {
  ipInput.addEventListener(
    "input",
    debounce((e) => {
      currentIPFilter = e.target.value;
      applyFilterAndDisplayTable();
    }, 250)
  );
}

if (profileInput) {
  profileInput.addEventListener(
    "input",
    debounce((e) => {
      currentProfileFilter = e.target.value;
      applyFilterAndDisplayTable();
    }, 250)
  );
}
