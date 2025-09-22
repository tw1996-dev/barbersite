/**
 * ADMIN SCHEDULE MODULE
 * Manages business hours configuration with day-by-day settings,
 * preset configurations, and responsive layout for very small screens
 */

import { businessHours, saveBusinessHoursToAPI } from "./admin-state.js";
import { showNotification } from "./admin-utils.js";

export function setupScheduleSection() {
  const saveBtn = document.getElementById("save-schedule-btn");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const dayCheckboxes = document.querySelectorAll(".day-enabled");
  const overtimeBufferInput = document.getElementById("overtime-buffer");

  if (saveBtn) {
    saveBtn.addEventListener("click", saveSchedule);
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.getAttribute("data-preset");
      applyPreset(preset);
    });
  });

  dayCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const daySchedule = this.closest(".day-schedule");
      const timeInputs = daySchedule.querySelectorAll('input[type="time"]');

      timeInputs.forEach((input) => {
        input.disabled = !this.checked;
      });
    });
  });

  // Load current overtime buffer value from business hours
  loadOvertimeBuffer();

  // Fix for very small screens - restructure day schedule
  if (window.innerWidth <= 400) {
    restructureScheduleForSmallScreens();
  }
}

function restructureScheduleForSmallScreens() {
  const daySchedules = document.querySelectorAll(".day-schedule");
  daySchedules.forEach((schedule) => {
    const checkbox = schedule.querySelector(".day-enabled");
    const openTime = schedule.querySelector(".open-time");
    const closeTime = schedule.querySelector(".close-time");
    const span = schedule.querySelector("span");

    if (checkbox && openTime && closeTime && span) {
      // Create time inputs container
      const timeContainer = document.createElement("div");
      timeContainer.className = "time-inputs";
      timeContainer.appendChild(openTime);
      timeContainer.appendChild(span);
      timeContainer.appendChild(closeTime);

      schedule.appendChild(timeContainer);
    }
  });
}

function applyPreset(preset) {
  const schedules = document.querySelectorAll(".day-schedule");

  schedules.forEach((schedule) => {
    const day = schedule.getAttribute("data-day");
    const checkbox = schedule.querySelector(".day-enabled");
    const openTime = schedule.querySelector(".open-time");
    const closeTime = schedule.querySelector(".close-time");

    switch (preset) {
      case "standard":
        if (
          ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day)
        ) {
          checkbox.checked = true;
          openTime.value = "09:00";
          closeTime.value = "18:00";
          openTime.disabled = false;
          closeTime.disabled = false;
        } else if (day === "saturday") {
          checkbox.checked = true;
          openTime.value = "10:00";
          closeTime.value = "16:00";
          openTime.disabled = false;
          closeTime.disabled = false;
        } else {
          checkbox.checked = false;
          openTime.disabled = true;
          closeTime.disabled = true;
        }
        break;

      case "extended":
        if (
          [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ].includes(day)
        ) {
          checkbox.checked = true;
          openTime.value = "09:00";
          closeTime.value = "19:00";
          openTime.disabled = false;
          closeTime.disabled = false;
        } else {
          checkbox.checked = true;
          openTime.value = "11:00";
          closeTime.value = "15:00";
          openTime.disabled = false;
          closeTime.disabled = false;
        }
        break;

      case "weekend":
        if (["saturday", "sunday"].includes(day)) {
          checkbox.checked = true;
          openTime.value = "10:00";
          closeTime.value = "18:00";
          openTime.disabled = false;
          closeTime.disabled = false;
        } else {
          checkbox.checked = false;
          openTime.disabled = true;
          closeTime.disabled = true;
        }
        break;
    }
  });
}

// Updated save function to include overtime buffer
async function saveSchedule() {
  const schedules = document.querySelectorAll(".day-schedule");
  const overtimeBufferInput = document.getElementById("overtime-buffer");
  const overtimeBuffer = parseInt(overtimeBufferInput?.value || 0);

  schedules.forEach((schedule) => {
    const day = schedule.getAttribute("data-day");
    const enabled = schedule.querySelector(".day-enabled").checked;
    const openTime = schedule.querySelector(".open-time").value;
    const closeTime = schedule.querySelector(".close-time").value;

    businessHours[day] = {
      enabled: enabled,
      open: openTime,
      close: closeTime,
      overtime_buffer_minutes: overtimeBuffer, // Add buffer to each day
    };
  });

  // Save to API
  const success = await saveBusinessHoursToAPI();
  if (success) {
    showNotification(
      "Business hours and overtime buffer saved successfully!",
      "success"
    );
  } else {
    showNotification("Failed to save business hours.", "error");
  }
}

// Load current overtime buffer value from database
async function loadOvertimeBuffer() {
  const overtimeBufferInput = document.getElementById("overtime-buffer");
  if (overtimeBufferInput && businessHours.monday) {
    // Use the buffer value from any day (they're all the same)
    overtimeBufferInput.value =
      businessHours.monday.overtime_buffer_minutes || 0;
  }
}
