import {
  experiences as defaultExperiences,
  monthCells,
  dateKey,
  recommendation,
  planSummary as formatPlanSummary,
} from "./domain.js";
import { bookingDates } from "./booking-model.js";
export function initializeWebsite(content) {
  const experiences = content?.experiences || defaultExperiences;
  const WHATSAPP_NUMBER = content?.contact.whatsapp || "6285190849237";
  const activeKeys = Object.keys(experiences).filter(
    (key) => experiences[key].enabled !== false,
  );
  const planSummary = (plan) => formatPlanSummary(plan, experiences);
  const controller = new AbortController();
  const timeouts = [];
  const objectURLs = [];
  const $ = (selector) => document.querySelector(selector);
  const header = $(".site-header");
  const syncHeader = () =>
    header.classList.toggle("is-scrolled", window.scrollY > 0);
  syncHeader();
  window.addEventListener("scroll", syncHeader, {
    passive: true,
    signal: controller.signal,
  });
  const dateBounds = bookingDates();
  const today = new Date(dateBounds.today + "T12:00:00");
  let year = today.getFullYear(),
    month = today.getMonth(),
    selectedDate = null,
    currentCourse = activeKeys[0] || "beginner",
    lastPlan = null,
    receipt = null,
    requestAttempt = null,
    submitting = false,
    calendarLoading = true,
    calendarError = false,
    calendarEnabled = true,
    calendarSequence = 0,
    closedDates = [];
  $("#year").textContent = year;
  const todayKey = dateBounds.today;
  $('input[name="date"]').min = todayKey;
  $('input[name="date"]').max = dateBounds.last;
  const formatDate = (key) =>
    new Date(`${key}T12:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  function renderCalendar() {
    $("#month-label").textContent = new Date(year, month, 1).toLocaleDateString(
      "id-ID",
      { month: "long", year: "numeric" },
    );
    const grid = $("#calendar-grid");
    const focusedDate = grid.contains(document.activeElement)
      ? document.activeElement.dataset.date
      : null;
    grid.replaceChildren();
    for (const day of monthCells(year, month)) {
      if (!day) {
        grid.append(document.createElement("span"));
        continue;
      }
      const key = dateKey(year, month, day),
        btn = document.createElement("button");
      btn.textContent = day;
      btn.type = "button";
      btn.dataset.date = key;
      const closed = closedDates.some(
        (range) => range.startDate <= key && key <= range.endDate,
      );
      btn.disabled =
        calendarLoading ||
        calendarError ||
        !calendarEnabled ||
        key < todayKey ||
        key > dateBounds.last ||
        closed;
      btn.setAttribute(
        "aria-label",
        formatDate(key) + (closed ? " — ditutup" : ""),
      );
      if (closed) btn.classList.add("closed");
      btn.setAttribute("aria-pressed", String(key === selectedDate));
      if (key === todayKey) btn.classList.add("today");
      if (key === selectedDate) btn.classList.add("selected");
      btn.onclick = () => {
        selectedDate = key;
        $('input[name="date"]').value = key;
        receipt = null;
        renderCalendar();
      };
      grid.append(btn);
    }
    if (focusedDate) {
      const focusedButton = grid.querySelector(`[data-date="${focusedDate}"]`);
      if (focusedButton && !focusedButton.disabled)
        focusedButton.focus({ preventScroll: true });
    }
    $("#calendar-grid").setAttribute("aria-busy", String(calendarLoading));
    const monthKey = dateKey(year, month, 1).slice(0, 7);
    $("#prev-month").disabled = monthKey <= todayKey.slice(0, 7);
    $("#next-month").disabled = monthKey >= dateBounds.last.slice(0, 7);
    $("#calendar-book").disabled =
      !selectedDate || calendarLoading || calendarError || !calendarEnabled;
    $("#calendar-retry").hidden = !calendarError;
    $("#calendar-note").textContent = calendarLoading
      ? "Memuat jadwal…"
      : calendarError
        ? "Jadwal belum dapat dimuat."
        : !calendarEnabled
          ? "Program ini belum menerima booking."
          : selectedDate
            ? `Tanggal booking: ${formatDate(selectedDate)}`
            : "Pilih tanggal untuk booking.";
  }
  async function refreshCalendar() {
    const sequence = ++calendarSequence;
    calendarLoading = true;
    calendarError = false;
    renderCalendar();
    try {
      const query = new URLSearchParams({
        month: dateKey(year, month, 1).slice(0, 7),
        experience: currentCourse,
      });
      const response = await fetch("/api/bookings?" + query, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("CALENDAR_UNAVAILABLE");
      const availability = await response.json();
      if (sequence !== calendarSequence || controller.signal.aborted) return;
      closedDates = availability.closed;
      calendarEnabled = availability.enabled;
      if (
        selectedDate &&
        closedDates.some(
          (range) =>
            range.startDate <= selectedDate && selectedDate <= range.endDate,
        )
      )
        selectedDate = null;
    } catch (error) {
      if (sequence !== calendarSequence || controller.signal.aborted) return;
      calendarError = true;
    }
    calendarLoading = false;
    renderCalendar();
  }
  $("#prev-month").onclick = () => {
    if (--month < 0) {
      month = 11;
      year--;
    }
    selectedDate = null;
    refreshCalendar();
  };
  $("#next-month").onclick = () => {
    if (++month > 11) {
      month = 0;
      year++;
    }
    selectedDate = null;
    refreshCalendar();
  };
  $("#calendar-experience").addEventListener(
    "change",
    (event) => {
      currentCourse = event.target.value;
      $('select[name="experience"]').value = currentCourse;
      receipt = null;
      refreshCalendar();
    },
    { signal: controller.signal },
  );
  $("#calendar-retry").onclick = refreshCalendar;
  refreshCalendar();
  $(".menu-toggle").onclick = () => {
    const opened = $("#navigation").classList.toggle("open");
    $(".menu-toggle").setAttribute("aria-expanded", opened);
    $(".menu-toggle").setAttribute(
      "aria-label",
      opened ? "Tutup menu" : "Buka menu",
    );
  };
  document.querySelectorAll("nav a").forEach(
    (a) =>
      (a.onclick = () => {
        $("#navigation").classList.remove("open");
        $(".menu-toggle").setAttribute("aria-expanded", "false");
        document
          .querySelectorAll("nav a")
          .forEach((el) => el.classList.toggle("active", el === a));
      }),
  );
  function openBooking(course = currentCourse) {
    const showReceipt =
      receipt &&
      lastPlan?.date === selectedDate &&
      lastPlan?.experience === course;
    $("#booking-form").hidden = Boolean(showReceipt);
    $("#booking-result").hidden = !showReceipt;
    $("#booking-error").hidden = true;
    if (course !== currentCourse) {
      $("#calendar-experience").value = course;
      currentCourse = course;
      refreshCalendar();
    }
    currentCourse = course;
    $('select[name="experience"]').value = course;
    if (selectedDate) $('input[name="date"]').value = selectedDate;
    $("#booking-dialog").showModal();
  }
  $("#calendar-book").onclick = () => openBooking(currentCourse);
  $('select[name="experience"]').addEventListener(
    "change",
    (event) => {
      currentCourse = event.target.value;
      $("#calendar-experience").value = currentCourse;
      refreshCalendar();
    },
    { signal: controller.signal },
  );
  document
    .querySelectorAll("[data-book]")
    .forEach((button) => (button.onclick = () => openBooking()));
  document
    .querySelectorAll(".close-modal")
    .forEach(
      (button) => (button.onclick = () => button.closest("dialog").close()),
    );
  document.querySelectorAll("dialog").forEach((dialog) =>
    dialog.addEventListener(
      "click",
      (event) => {
        if (event.target === dialog) {
          const r = dialog.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            dialog.close();
        }
      },
      { signal: controller.signal },
    ),
  );
  $("#see-all").onclick = () => {
    const more = $("#more-courses");
    more.hidden = !more.hidden;
    $("#see-all").innerHTML = more.hidden
      ? "Lihat semua <span>↗</span>"
      : "Tutup <span>−</span>";
    $("#see-all").setAttribute("aria-expanded", !more.hidden);
  };
  let quizStep = 0,
    answers = {};
  function quizButton(label, value, callback) {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = label;
    button.onclick = () => callback(value);
    return button;
  }
  function renderQuiz() {
    const content = $("#quiz-content");
    content.replaceChildren();
    const title = document.createElement("h2"),
      progress = document.createElement("p");
    progress.className = "quiz-progress";
    progress.textContent =
      quizStep < 2 ? `LANGKAH ${quizStep + 1} DARI 2` : "PILIHAN UNTUKMU";
    content.append(progress, title);
    if (quizStep < 2) {
      title.textContent =
        quizStep === 0
          ? "Sudah pernah menyelam?"
          : "Apa yang ingin kamu temukan?";
      const options = document.createElement("div");
      options.className = "quiz-options";
      const list =
        quizStep === 0
          ? [
              ["Belum, ini pengalaman pertamaku", "new"],
              ["Sudah, aku ingin menjelajah lagi", "experienced"],
            ]
          : [
              ["Terumbu dan kehidupan laut", "nature"],
              ["Fotografi dan pengalaman yang berbeda", "creative"],
            ];
      list.forEach(([label, value]) =>
        options.append(
          quizButton(label, value, (value) => {
            answers[quizStep === 0 ? "level" : "interest"] = value;
            quizStep++;
            renderQuiz();
          }),
        ),
      );
      content.append(options);
    } else {
      const recommended = recommendation(answers.level, answers.interest);
      const choice = activeKeys.includes(recommended)
        ? recommended
        : activeKeys[0];
      title.textContent = experiences[choice].title;
      const desc = document.createElement("p");
      desc.className = "muted";
      desc.textContent = experiences[choice].description;
      content.append(desc);
      const button = document.createElement("button");
      button.className = "button dark";
      button.textContent = "Rencanakan pengalaman ini ↗";
      button.onclick = () => {
        $("#quiz-dialog").close();
        openBooking(choice);
      };
      content.append(button);
    }
    if (quizStep > 0) {
      const back = document.createElement("button");
      back.className = "quiz-back";
      back.textContent = "← Kembali";
      back.onclick = () => {
        quizStep--;
        renderQuiz();
      };
      content.append(back);
    }
  }
  $("#open-quiz").onclick = () => {
    quizStep = 0;
    answers = {};
    renderQuiz();
    $("#quiz-dialog").showModal();
  };
  $("#booking-form").onsubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!event.currentTarget.reportValidity()) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const plan = {
      ...data,
      name: data.name.trim(),
      phone: data.phone.trim(),
      notes: data.notes.trim(),
    };
    if (!plan.name) {
      $('input[name="name"]').setCustomValidity("Tuliskan nama kamu.");
      $('input[name="name"]').reportValidity();
      return;
    }
    const signature = JSON.stringify(plan);
    if (requestAttempt?.signature !== signature)
      requestAttempt = { signature, id: crypto.randomUUID() };
    const submit = $('#booking-form button[type="submit"]');
    submitting = true;
    submit.disabled = true;
    submit.textContent = "Menyimpan booking…";
    $("#booking-form").setAttribute("aria-busy", "true");
    $("#booking-error").hidden = true;
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, requestId: requestAttempt.id }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Booking belum dapat disimpan.");
      lastPlan = plan;
      receipt = result;
    } catch (error) {
      if (controller.signal.aborted) return;
      $("#booking-error").textContent =
        error.message === "Failed to fetch"
          ? "Koneksi terputus. Periksa internet lalu kirim ulang; booking yang sama tidak akan dibuat dua kali."
          : error.message;
      $("#booking-error").hidden = false;
      $("#booking-error").focus();
      refreshCalendar();
      return;
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.textContent = "Kirim permintaan booking ↗";
      $("#booking-form").setAttribute("aria-busy", "false");
    }
    if (controller.signal.aborted) return;
    selectedDate = lastPlan.date;
    [year, month] = [
      Number(selectedDate.slice(0, 4)),
      Number(selectedDate.slice(5, 7)) - 1,
    ];
    $("#booking-reference").textContent =
      `Referensi: ${receipt.reference}${receipt.demo ? " · DEMO" : ""}`;
    $("#booking-summary").textContent = planSummary({
      ...lastPlan,
      date: formatDate(lastPlan.date),
    });
    $("#send-whatsapp").href =
      "https://wa.me/" +
      WHATSAPP_NUMBER +
      "?text=" +
      encodeURIComponent(
        `Halo Zanclus! Saya ingin konfirmasi booking ${receipt.reference}.\nStatus: menunggu konfirmasi tim.\n\n` +
          planSummary({ ...lastPlan, date: formatDate(lastPlan.date) }),
      );
    $("#booking-form").hidden = true;
    $("#booking-result").hidden = false;
    $("#booking-success-title").focus();
    refreshCalendar();
  };
  $('input[name="name"]').oninput = (event) =>
    event.target.setCustomValidity("");
  $("#edit-plan").onclick = () => {
    receipt = null;
    lastPlan = null;
    requestAttempt = null;
    $("#booking-form").reset();
    $('select[name="experience"]').value = currentCourse;
    if (selectedDate) $('input[name="date"]').value = selectedDate;
    $("#booking-form").hidden = false;
    $("#booking-result").hidden = true;
  };
  $("#download-plan").onclick = () => {
    if (!lastPlan) return;
    const text = `ZANCLUS DIVE CENTER\nPERMINTAAN BOOKING${receipt.demo ? " DEMO" : ""}\nReferensi: ${receipt.reference}\nStatus: menunggu konfirmasi tim\n\n${planSummary(lastPlan)}\n\nJadwal, biaya, dan program perlu dikonfirmasi dengan tim Zanclus. Belum ada pembayaran.\n`;
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `zanclus-rencana-${lastPlan.date}.txt`;
    link.click();
    const timeout = setTimeout(() => URL.revokeObjectURL(url), 1000);
    timeouts.push(timeout);
    objectURLs.push(url);
  };

  return () => {
    controller.abort();
    timeouts.forEach(clearTimeout);
    objectURLs.forEach((url) => URL.revokeObjectURL(url));
    document.querySelectorAll("button, input, form, nav a").forEach((el) => {
      el.onclick = null;
      el.oninput = null;
      el.onsubmit = null;
    });
    document.querySelectorAll("dialog[open]").forEach((el) => el.close());
  };
}
