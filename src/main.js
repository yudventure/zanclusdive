import {
  experiences as defaultExperiences,
  recommendation,
  planSummary as formatPlanSummary,
} from "./domain.js";
import { bookingDates } from "./booking-model.js";
import { dictionary, formatLongDate } from "./i18n.js";
export function initializeWebsite(content, locale = "en") {
  const t = dictionary(locale).booking;
  const experiences = content?.experiences || defaultExperiences;
  const WHATSAPP_NUMBER = content?.contact.whatsapp || "6285190849237";
  const activeKeys = Object.keys(experiences).filter(
    (key) => experiences[key].enabled !== false,
  );
  const planSummary = (plan) => formatPlanSummary(plan, experiences, t.summary);
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
  let currentCourse = activeKeys[0] || "beginner",
    lastPlan = null,
    receipt = null,
    requestAttempt = null,
    submitting = false;
  $("#year").textContent = dateBounds.today.slice(0, 4);
  const todayKey = dateBounds.today;
  $('input[name="date"]').min = todayKey;
  $('input[name="date"]').max = dateBounds.last;
  const formatDate = (key) => formatLongDate(key, locale);
  $(".menu-toggle").onclick = () => {
    const opened = $("#navigation").classList.toggle("open");
    $(".menu-toggle").setAttribute("aria-expanded", opened);
    $(".menu-toggle").setAttribute(
      "aria-label",
      opened
        ? dictionary(locale).common.closeMenu
        : dictionary(locale).common.openMenu,
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
    const showReceipt = receipt && lastPlan?.experience === course;
    $("#booking-form").hidden = Boolean(showReceipt);
    $("#booking-result").hidden = !showReceipt;
    $("#booking-error").hidden = true;
    currentCourse = course;
    $('select[name="experience"]').value = course;
    $("#booking-dialog").showModal();
  }
  $('select[name="experience"]').addEventListener(
    "change",
    (event) => (currentCourse = event.target.value),
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
  // Missing while the experiences section is locked in developer mode.
  const seeAll = $("#see-all");
  if (seeAll)
    seeAll.onclick = () => {
      const more = $("#more-courses");
      more.hidden = !more.hidden;
      seeAll.innerHTML = more.hidden ? t.seeAllHtml : t.closeHtml;
      seeAll.setAttribute("aria-expanded", !more.hidden);
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
      quizStep < 2 ? t.quizStep(quizStep + 1) : t.quizResult;
    content.append(progress, title);
    if (quizStep < 2) {
      title.textContent = quizStep === 0 ? t.quizQ1 : t.quizQ2;
      const options = document.createElement("div");
      options.className = "quiz-options";
      const list =
        quizStep === 0
          ? [
              [t.quizNew, "new"],
              [t.quizExperienced, "experienced"],
            ]
          : [
              [t.quizNature, "nature"],
              [t.quizCreative, "creative"],
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
      button.textContent = t.quizPlan;
      button.onclick = () => {
        $("#quiz-dialog").close();
        openBooking(choice);
      };
      content.append(button);
    }
    if (quizStep > 0) {
      const back = document.createElement("button");
      back.className = "quiz-back";
      back.textContent = t.back;
      back.onclick = () => {
        quizStep--;
        renderQuiz();
      };
      content.append(back);
    }
  }
  document.querySelectorAll("#open-quiz").forEach(
    (button) =>
      (button.onclick = () => {
        quizStep = 0;
        answers = {};
        renderQuiz();
        $("#quiz-dialog").showModal();
      }),
  );
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
      $('input[name="name"]').setCustomValidity(t.nameRequired);
      $('input[name="name"]').reportValidity();
      return;
    }
    const signature = JSON.stringify(plan);
    if (requestAttempt?.signature !== signature)
      requestAttempt = { signature, id: crypto.randomUUID() };
    const submit = $('#booking-form button[type="submit"]');
    submitting = true;
    submit.disabled = true;
    submit.textContent = t.saving;
    $("#booking-form").setAttribute("aria-busy", "true");
    $("#booking-error").hidden = true;
    try {
      // English visitors get English server errors; Indonesian is the default.
      const endpoint = "/api/bookings" + (locale === "en" ? "?locale=en" : "");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, requestId: requestAttempt.id }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t.saveFailed);
      lastPlan = plan;
      receipt = result;
    } catch (error) {
      if (controller.signal.aborted) return;
      $("#booking-error").textContent =
        error.message === "Failed to fetch" ? t.offline : error.message;
      $("#booking-error").hidden = false;
      $("#booking-error").focus();
      return;
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.textContent = t.submit;
      $("#booking-form").setAttribute("aria-busy", "false");
    }
    if (controller.signal.aborted) return;
    $("#booking-reference").textContent = t.reference(
      receipt.reference,
      receipt.demo,
    );
    $("#booking-summary").textContent = planSummary({
      ...lastPlan,
      date: formatDate(lastPlan.date),
    });
    $("#send-whatsapp").href =
      "https://wa.me/" +
      WHATSAPP_NUMBER +
      "?text=" +
      encodeURIComponent(
        t.whatsapp(
          receipt.reference,
          planSummary({ ...lastPlan, date: formatDate(lastPlan.date) }),
        ),
      );
    $("#booking-form").hidden = true;
    $("#booking-result").hidden = false;
    $("#booking-success-title").focus();
  };
  $('input[name="name"]').oninput = (event) =>
    event.target.setCustomValidity("");
  $("#edit-plan").onclick = () => {
    receipt = null;
    lastPlan = null;
    requestAttempt = null;
    $("#booking-form").reset();
    $('select[name="experience"]').value = currentCourse;
    $("#booking-form").hidden = false;
    $("#booking-result").hidden = true;
  };
  $("#download-plan").onclick = () => {
    if (!lastPlan) return;
    const text = t.download(
      receipt.reference,
      receipt.demo,
      planSummary(lastPlan),
    );
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = t.fileName(lastPlan.date);
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
