import {
  experiences as defaultExperiences,
  monthCells,
  dateKey,
  recommendation,
  planSummary as formatPlanSummary,
} from "./domain.js";
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let year = today.getFullYear(),
    month = today.getMonth(),
    selectedDate = null,
    currentCourse = activeKeys[0] || "beginner",
    lastPlan = null;
  $("#year").textContent = year;
  const todayKey = dateKey(year, month, today.getDate());
  $('input[name="date"]').min = todayKey;
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
      btn.disabled = key < todayKey;
      btn.setAttribute("aria-label", formatDate(key));
      btn.setAttribute("aria-pressed", String(key === selectedDate));
      if (key === todayKey) btn.classList.add("today");
      if (key === selectedDate) btn.classList.add("selected");
      btn.onclick = () => {
        selectedDate = key;
        $('input[name="date"]').value = key;
        $("#calendar-note").textContent = `Rencana: ${formatDate(key)}`;
        renderCalendar();
      };
      grid.append(btn);
    }
  }
  $("#prev-month").onclick = () => {
    if (--month < 0) {
      month = 11;
      year--;
    }
    renderCalendar();
  };
  $("#next-month").onclick = () => {
    if (++month > 11) {
      month = 0;
      year++;
    }
    renderCalendar();
  };
  renderCalendar();
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
    $("#booking-form").hidden = false;
    $("#booking-result").hidden = true;
    currentCourse = course;
    $('select[name="experience"]').value = course;
    if (selectedDate) $('input[name="date"]').value = selectedDate;
    $("#booking-dialog").showModal();
  }
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
  $("#booking-form").onsubmit = (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    lastPlan = { ...data, name: data.name.trim(), notes: data.notes.trim() };
    if (!lastPlan.name) {
      $('input[name="name"]').setCustomValidity("Tuliskan nama kamu.");
      $('input[name="name"]').reportValidity();
      return;
    }
    $("#booking-summary").textContent = planSummary({
      ...lastPlan,
      date: formatDate(lastPlan.date),
    });
    $("#send-whatsapp").href =
      "https://wa.me/" +
      WHATSAPP_NUMBER +
      "?text=" +
      encodeURIComponent(
        "Halo Zanclus! Saya ingin mendiskusikan rencana diving.\n\n" +
          planSummary({ ...lastPlan, date: formatDate(lastPlan.date) }),
      );
    $("#booking-form").hidden = true;
    $("#booking-result").hidden = false;
  };
  $('input[name="name"]').oninput = (event) =>
    event.target.setCustomValidity("");
  $("#edit-plan").onclick = () => {
    $("#booking-form").hidden = false;
    $("#booking-result").hidden = true;
  };
  $("#download-plan").onclick = () => {
    if (!lastPlan) return;
    const text = `ZANCLUS DIVE CENTER\nRENCANA PENYELAMAN\n\n${planSummary(lastPlan)}\n\nRingkasan ini bukan konfirmasi reservasi. Jadwal, biaya, dan program perlu dikonfirmasi dengan tim Zanclus.\n`;
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
