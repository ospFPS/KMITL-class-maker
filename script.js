const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const START_HOUR = 9;
const END_HOUR = 21;

const state = {
  classes: [],
  editingId: null,
};

const form = document.getElementById("class-form");
const classList = document.getElementById("class-list");
const emptyState = document.getElementById("empty-state");
const classCount = document.getElementById("class-count");
const saveBtn = document.getElementById("save-btn");
const loadInput = document.getElementById("load-input");
const clearBtn = document.getElementById("clear-btn");
const exportImageBtn = document.getElementById("export-image-btn");
const tabletWallpaperBtn = document.getElementById("tablet-wallpaper-btn");
const previewModal = document.getElementById("preview-modal");
const previewImage = document.getElementById("preview-image");
const closePreviewBtn = document.getElementById("close-preview-btn");
const downloadPreviewBtn = document.getElementById("download-preview-btn");
const tabletPreviewModal = document.getElementById("tablet-preview-modal");
const tabletPreviewImage = document.getElementById("tablet-preview-image");
const closeTabletPreviewBtn = document.getElementById("close-tablet-preview-btn");
const downloadTabletPreviewBtn = document.getElementById("download-tablet-preview-btn");
const template = document.getElementById("class-item-template");
const editStatus = document.getElementById("edit-status");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
let latestPreviewDataUrl = "";
let latestTabletPreviewDataUrl = "";

const courseNameInput = document.getElementById("courseName");
const dayInput = document.getElementById("day");
const roomInput = document.getElementById("room");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const instructorInput = document.getElementById("instructor");
const colorInput = document.getElementById("color");

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours * 60) + minutes;
}

function clampTimeRange(start, end) {
  const min = START_HOUR * 60;
  const max = END_HOUR * 60;
  return {
    start: Math.max(start, min),
    end: Math.min(end, max),
  };
}

function shadeColor(color, amount) {
  const value = color.replace("#", "");
  const num = parseInt(value, 16);
  const clamp = (channel) => Math.max(0, Math.min(255, channel + amount));
  const r = clamp((num >> 16) & 255);
  const g = clamp((num >> 8) & 255);
  const b = clamp(num & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatClassTitle(item) {
  return item.courseName;
}

function saveLocal() {
  localStorage.setItem("kmitl-schedule", JSON.stringify(state.classes));
}

function setFormMode() {
  const editing = Boolean(state.editingId);
  submitBtn.textContent = editing ? "Save changes" : "Add to schedule";
  resetBtn.textContent = editing ? "Cancel edit" : "Clear form";
  editStatus.hidden = !editing;
}

function populateForm(item) {
  courseNameInput.value = item.courseName || "";
  dayInput.value = item.day || DAYS[0];
  roomInput.value = item.room || "";
  startTimeInput.value = item.startTime || "";
  endTimeInput.value = item.endTime || "";
  instructorInput.value = item.instructor || "";
  colorInput.value = item.color || "#f97316";
}

function clearFormInputs() {
  form.reset();
  colorInput.value = "#f97316";
}

function resetFormState(shouldClearFields = false) {
  state.editingId = null;
  if (shouldClearFields) {
    clearFormInputs();
  }
  setFormMode();
}

function startEditing(item) {
  state.editingId = item.id;
  populateForm(item);
  setFormMode();
  courseNameInput.focus();
}

function loadLocal() {
  const raw = localStorage.getItem("kmitl-schedule");
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.classes = parsed;
    }
  } catch {
    localStorage.removeItem("kmitl-schedule");
  }
}

function buildDayColumns() {
  const wrap = document.querySelector(".schedule-wrap");
  wrap.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "schedule-grid";
  const hourCount = END_HOUR - START_HOUR;
  grid.style.gridTemplateColumns = `var(--day-col-width) repeat(${hourCount}, var(--time-col-width))`;
  grid.style.minWidth = `calc(var(--day-col-width) + (${hourCount} * var(--time-col-width)))`;

  const corner = document.createElement("div");
  corner.className = "cell corner-cell";
  corner.textContent = "Day";
  grid.appendChild(corner);

  for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
    const header = document.createElement("div");
    header.className = "cell time-header";
    header.textContent = `${String(hour).padStart(2, "0")}:00`;
    grid.appendChild(header);
  }

  DAYS.forEach((day) => {
    const dayLabel = document.createElement("div");
    dayLabel.className = "cell day-name-cell";
    dayLabel.textContent = day;
    grid.appendChild(dayLabel);

    for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
      const slot = document.createElement("div");
      slot.className = "cell slot-cell";
      slot.dataset.day = day;
      slot.dataset.hour = String(hour);
      grid.appendChild(slot);
    }
  });

  wrap.appendChild(grid);
}

function renderBlocks() {
  buildDayColumns();

  DAYS.forEach((day) => {
    const dayItems = state.classes.filter((item) => item.day === day);

    dayItems.forEach((item) => {
      const startMinutes = timeToMinutes(item.startTime);
      const endMinutes = timeToMinutes(item.endTime);
      const range = clampTimeRange(startMinutes, endMinutes);
      const startHour = Math.floor(range.start / 60);
      const endsOnExactHour = range.end % 60 === 0;
      const visualEndHour = endsOnExactHour ? (range.end / 60) : Math.floor(range.end / 60);
      const durationHours = Math.max((visualEndHour - startHour) + 1, 0.75);
      const startOffsetHours = (range.start - (startHour * 60)) / 60;
      const cell = document.querySelector(`.slot-cell[data-day="${day}"][data-hour="${startHour}"]`);
      if (!cell) return;
      const cellWidth = cell.getBoundingClientRect().width;

      const block = document.createElement("article");
      block.className = "class-block";
      block.style.background = item.color;
      block.style.left = `${startOffsetHours * cellWidth}px`;
      block.style.width = `${durationHours * cellWidth}px`;
      block.innerHTML = `
        <h4>${formatClassTitle(item)}</h4>
        <p>${item.startTime} - ${item.endTime}</p>
        <p>${item.room || "No room specified"}</p>
      `;
      cell.appendChild(block);
    });
  });
}

function renderList() {
  classList.innerHTML = "";
  emptyState.style.display = state.classes.length ? "none" : "block";
  classCount.textContent = `${state.classes.length} class${state.classes.length === 1 ? "" : "es"} added`;

  state.classes
    .slice()
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime))
    .forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector(".class-color").style.background = item.color;
      node.querySelector(".class-title").textContent = formatClassTitle(item);
      node.querySelector(".class-meta").textContent = `${item.day} | ${item.startTime} - ${item.endTime} | ${item.room || "No room"}`;
      node.querySelector(".class-submeta").textContent = item.instructor || "No instructor";
      node.querySelector(".edit-btn").addEventListener("click", () => {
        startEditing(item);
      });
      node.querySelector(".delete-btn").addEventListener("click", () => {
        state.classes = state.classes.filter((classItem) => classItem.id !== item.id);
        if (state.editingId === item.id) {
          resetFormState(true);
        }
        syncUi();
      });
      classList.appendChild(node);
    });
}

function syncUi() {
  saveLocal();
  setFormMode();
  renderList();
  renderBlocks();
}

function buildScheduleImageDataUrl() {
  const width = 2778;
  const height = 1284;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const sortedClasses = state.classes
    .slice()
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));

  ctx.fillStyle = "#f6f1e6";
  ctx.fillRect(0, 0, width, height);

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#faf5eb");
  bgGradient.addColorStop(1, "#eee2cb");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const frameX = 76;
  const frameY = 78;
  const frameW = width - 152;
  const frameH = height - 156;
  ctx.fillStyle = "#eadfc6";
  ctx.fillRect(frameX, frameY, frameW, frameH);

  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.beginPath();
  ctx.arc(frameX + 140, frameY + 120, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(frameX + frameW - 110, frameY + 120, 210, 0, Math.PI * 2);
  ctx.fill();

  const titleCardX = frameX + 64;
  const titleCardY = frameY + 42;
  const titleCardW = frameW - 128;
  const titleCardH = 170;
  ctx.fillStyle = "rgba(255, 252, 246, 0.88)";
  ctx.beginPath();
  ctx.roundRect(titleCardX, titleCardY, titleCardW, titleCardH, 34);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f97316";
  ctx.font = "700 72px 'IBM Plex Sans', sans-serif";
  ctx.fillText("KMITL PLANNER", width / 2, titleCardY + 78);
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 84px 'Space Grotesk', 'IBM Plex Sans', sans-serif";
  ctx.fillText("Class schedule", width / 2, titleCardY + 148);
  ctx.textAlign = "start";

  const panelX = frameX + 64;
  const panelY = titleCardY + titleCardH + 18;
  const panelW = frameW - 128;
  const panelH = frameH - (panelY - frameY) - 36;
  const radius = 32;
  const gridX = panelX + 12;
  const gridY = panelY + 12;
  const dayLabelW = 210;
  const timeColW = (panelW - 24 - dayLabelW) / hours.length;
  const rowH = (panelH - 24) / (DAYS.length + 1);

  ctx.fillStyle = "rgba(255, 253, 249, 0.94)";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, radius);
  ctx.fill();

  ctx.fillStyle = "#fdf7ec";
  ctx.beginPath();
  ctx.roundRect(gridX, gridY, panelW - 24, rowH, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(120, 113, 108, 0.12)";
  ctx.lineWidth = 2;

  ctx.fillStyle = "#44403c";
  ctx.font = "600 28px 'IBM Plex Sans', sans-serif";
  ctx.fillText("Day", gridX + 24, gridY + 56);

  hours.forEach((hour, index) => {
    const x = gridX + dayLabelW + index * timeColW;
    ctx.fillText(`${String(hour).padStart(2, "0")}:00`, x + 20, gridY + 56);
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + rowH + DAYS.length * rowH);
    ctx.stroke();
  });

  for (let row = 0; row <= DAYS.length; row += 1) {
    const y = gridY + rowH + row * rowH;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + panelW - 52, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(gridX + dayLabelW, gridY);
  ctx.lineTo(gridX + dayLabelW, gridY + rowH + DAYS.length * rowH);
  ctx.stroke();

  DAYS.forEach((day, rowIndex) => {
    const y = gridY + rowH + rowIndex * rowH;
    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(255,253,249,0.9)" : "rgba(251,246,236,0.86)";
    ctx.fillRect(gridX, y, dayLabelW, rowH);
    ctx.fillStyle = "#1c1917";
    ctx.font = "600 28px 'IBM Plex Sans', sans-serif";
    ctx.fillText(day, gridX + 18, y + 56);
  });

  DAYS.forEach((day, rowIndex) => {
    const dayItems = sortedClasses.filter((item) => item.day === day);
    dayItems.forEach((item) => {
      const range = clampTimeRange(timeToMinutes(item.startTime), timeToMinutes(item.endTime));
      const startOffset = (range.start - (START_HOUR * 60)) / 60;
      const startHour = Math.floor(range.start / 60);
      const endsOnExactHour = range.end % 60 === 0;
      const visualEndHour = endsOnExactHour ? (range.end / 60) : Math.floor(range.end / 60);
      const duration = Math.max((visualEndHour - startHour) + 1, 0.75);
      const x = gridX + dayLabelW + (startOffset * timeColW) + 10;
      const y = gridY + rowH + rowIndex * rowH + 10;
      const w = Math.max((duration * timeColW) - 20, timeColW - 20);
      const h = rowH - 20;

      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, shadeColor(item.color, -28));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 24);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.font = "700 20px 'IBM Plex Sans', sans-serif";
      const title = formatClassTitle(item).slice(0, 56);
      ctx.fillText(title, x + 18, y + 36, w - 28);
      ctx.font = "600 17px 'IBM Plex Sans', sans-serif";
      ctx.fillText(`${item.startTime} - ${item.endTime}`, x + 18, y + 64, w - 28);
      ctx.font = "500 17px 'IBM Plex Sans', sans-serif";
      ctx.fillText(item.room || "No room", x + 18, y + 86, w - 28);
    });
  });

  return canvas.toDataURL("image/png");
}

function buildTabletScheduleImageDataUrl() {
  const width = 2732;
  const height = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const sortedClasses = state.classes
    .slice()
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));

  ctx.fillStyle = "#f6f1e6";
  ctx.fillRect(0, 0, width, height);

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#fbf6eb");
  bgGradient.addColorStop(1, "#ede0c6");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const frameX = 84;
  const frameY = 84;
  const frameW = width - 168;
  const frameH = height - 168;
  ctx.fillStyle = "#eadfc6";
  ctx.fillRect(frameX, frameY, frameW, frameH);

  ctx.fillStyle = "rgba(255,255,255,0.44)";
  ctx.beginPath();
  ctx.arc(frameX + 180, frameY + 160, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(frameX + frameW - 140, frameY + 140, 240, 0, Math.PI * 2);
  ctx.fill();

  const titleCardX = frameX + 80;
  const titleCardY = frameY + 54;
  const titleCardW = frameW - 160;
  const titleCardH = 200;
  ctx.fillStyle = "rgba(255, 252, 246, 0.9)";
  ctx.beginPath();
  ctx.roundRect(titleCardX, titleCardY, titleCardW, titleCardH, 36);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f97316";
  ctx.font = "700 80px 'IBM Plex Sans', sans-serif";
  ctx.fillText("KMITL PLANNER", width / 2, titleCardY + 88);
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 92px 'Space Grotesk', 'IBM Plex Sans', sans-serif";
  ctx.fillText("Class schedule", width / 2, titleCardY + 162);
  ctx.textAlign = "start";

  const panelX = frameX + 70;
  const panelY = titleCardY + titleCardH + 28;
  const panelW = frameW - 140;
  const panelH = frameH - (panelY - frameY) - 52;
  const gridX = panelX + 16;
  const gridY = panelY + 16;
  const dayLabelW = 240;
  const timeColW = (panelW - 32 - dayLabelW) / hours.length;
  const rowH = (panelH - 32) / (DAYS.length + 1);

  ctx.fillStyle = "rgba(255, 253, 249, 0.95)";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 34);
  ctx.fill();

  ctx.fillStyle = "#fdf7ec";
  ctx.beginPath();
  ctx.roundRect(gridX, gridY, panelW - 32, rowH, 20);
  ctx.fill();

  ctx.strokeStyle = "rgba(120, 113, 108, 0.12)";
  ctx.lineWidth = 2;

  ctx.fillStyle = "#44403c";
  ctx.font = "700 32px 'IBM Plex Sans', sans-serif";
  ctx.fillText("Day", gridX + 28, gridY + 64);

  hours.forEach((hour, index) => {
    const x = gridX + dayLabelW + index * timeColW;
    ctx.fillText(`${String(hour).padStart(2, "0")}:00`, x + 20, gridY + 64);
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + rowH + DAYS.length * rowH);
    ctx.stroke();
  });

  for (let row = 0; row <= DAYS.length; row += 1) {
    const y = gridY + rowH + row * rowH;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + panelW - 32, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(gridX + dayLabelW, gridY);
  ctx.lineTo(gridX + dayLabelW, gridY + rowH + DAYS.length * rowH);
  ctx.stroke();

  DAYS.forEach((day, rowIndex) => {
    const y = gridY + rowH + rowIndex * rowH;
    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(255,253,249,0.92)" : "rgba(251,246,236,0.86)";
    ctx.fillRect(gridX, y, dayLabelW, rowH);
    ctx.fillStyle = "#1c1917";
    ctx.font = "700 32px 'IBM Plex Sans', sans-serif";
    ctx.fillText(day, gridX + 24, y + 68);
  });

  DAYS.forEach((day, rowIndex) => {
    const dayItems = sortedClasses.filter((item) => item.day === day);
    dayItems.forEach((item) => {
      const range = clampTimeRange(timeToMinutes(item.startTime), timeToMinutes(item.endTime));
      const startOffset = (range.start - (START_HOUR * 60)) / 60;
      const startHour = Math.floor(range.start / 60);
      const endsOnExactHour = range.end % 60 === 0;
      const visualEndHour = endsOnExactHour ? (range.end / 60) : Math.floor(range.end / 60);
      const duration = Math.max((visualEndHour - startHour) + 1, 0.75);
      const x = gridX + dayLabelW + (startOffset * timeColW) + 12;
      const y = gridY + rowH + rowIndex * rowH + 12;
      const w = Math.max((duration * timeColW) - 24, timeColW - 24);
      const h = rowH - 24;

      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, shadeColor(item.color, -28));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 28);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.font = "700 24px 'IBM Plex Sans', sans-serif";
      ctx.fillText(formatClassTitle(item).slice(0, 64), x + 20, y + 42, w - 32);
      ctx.font = "700 20px 'IBM Plex Sans', sans-serif";
      ctx.fillText(`${item.startTime} - ${item.endTime}`, x + 20, y + 76, w - 32);
      ctx.fillText(item.room || "No room", x + 20, y + 108, w - 32);
    });
  });

  return canvas.toDataURL("image/png");
}

function openPreviewModal() {
  latestPreviewDataUrl = buildScheduleImageDataUrl();
  previewImage.src = latestPreviewDataUrl;
  previewModal.hidden = false;
}

function closePreviewModal() {
  previewModal.hidden = true;
}

function downloadPreviewImage() {
  if (!latestPreviewDataUrl) {
    latestPreviewDataUrl = buildScheduleImageDataUrl();
  }
  const link = document.createElement("a");
  link.href = latestPreviewDataUrl;
  link.download = "kmitl-schedule-iphone-13-pro-max-2778x1284.png";
  link.click();
}

function openTabletPreviewModal() {
  latestTabletPreviewDataUrl = buildTabletScheduleImageDataUrl();
  tabletPreviewImage.src = latestTabletPreviewDataUrl;
  tabletPreviewModal.hidden = false;
}

function closeTabletPreviewModal() {
  tabletPreviewModal.hidden = true;
}

function downloadTabletPreviewImage() {
  if (!latestTabletPreviewDataUrl) {
    latestTabletPreviewDataUrl = buildTabletScheduleImageDataUrl();
  }
  const link = document.createElement("a");
  link.href = latestTabletPreviewDataUrl;
  link.download = "kmitl-schedule-tablet-wallpaper-2732x2048.png";
  link.click();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const courseName = courseNameInput.value.trim();
  const day = dayInput.value;
  const room = roomInput.value.trim();
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;
  const instructor = instructorInput.value.trim();
  const color = colorInput.value;

  if (!courseName || !startTime || !endTime) return;

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    alert("End time must be later than start time.");
    return;
  }

  const nextItem = {
    id: state.editingId || crypto.randomUUID(),
    courseName,
    day,
    room,
    startTime,
    endTime,
    instructor,
    color,
  };

  if (state.editingId) {
    state.classes = state.classes.map((item) => item.id === state.editingId ? nextItem : item);
  } else {
    state.classes.push(nextItem);
  }

  resetFormState(true);
  syncUi();
});

saveBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.classes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kmitl-schedule.json";
  link.click();
  URL.revokeObjectURL(url);
});

loadInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid schedule file");
    }
    state.classes = parsed;
    syncUi();
  } catch {
    alert("Could not import that JSON file.");
  } finally {
    loadInput.value = "";
  }
});

clearBtn.addEventListener("click", () => {
  if (!state.classes.length) return;
  if (!confirm("Clear every class from the schedule?")) return;
  state.classes = [];
  syncUi();
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    state.editingId = null;
    colorInput.value = "#f97316";
    setFormMode();
  }, 0);
});

exportImageBtn.addEventListener("click", () => {
  openPreviewModal();
});

tabletWallpaperBtn.addEventListener("click", () => {
  openTabletPreviewModal();
});

closePreviewBtn.addEventListener("click", () => {
  closePreviewModal();
});

downloadPreviewBtn.addEventListener("click", () => {
  downloadPreviewImage();
});

closeTabletPreviewBtn.addEventListener("click", () => {
  closeTabletPreviewModal();
});

downloadTabletPreviewBtn.addEventListener("click", () => {
  downloadTabletPreviewImage();
});

previewModal.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closePreview === "true") {
    closePreviewModal();
  }
});

tabletPreviewModal.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closeTabletPreview === "true") {
    closeTabletPreviewModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !previewModal.hidden) {
    closePreviewModal();
  }
  if (event.key === "Escape" && !tabletPreviewModal.hidden) {
    closeTabletPreviewModal();
  }
});

loadLocal();
syncUi();
