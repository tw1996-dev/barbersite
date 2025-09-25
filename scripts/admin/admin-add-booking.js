/**
 * ADMIN ADD BOOKING MODULE
 * Handles the add booking form with visual calendar, time slot selection,
 * service conflicts, availability checking, and booking creation
 */

import {
  businessHours,
  currentBookings,
  addBookingCalendarMonth,
  addBookingCalendarYear,
  selectedAddBookingDate,
  selectedAdminServices,
  setAddBookingCalendarMonth,
  setAddBookingCalendarYear,
  setSelectedAddBookingDate,
  setSelectedAdminServices,
  addBooking,
  refreshBookings,
} from "./admin-state.js";
import {
  handleServiceConflicts,
  checkDayAvailability,
  isTimeSlotAvailable,
  getBookingEndTime,
  timeToMinutes,
  formatTime,
  showNotification,
} from "./admin-utils.js";
import { updateDashboard } from "./admin-dashboard.js";
import { updateBookingsSection } from "./admin-bookings.js";
import { renderAdminCalendar } from "./admin-calendar.js";
import { isInEditMode } from "./admin-edit-booking.js";

export function setupAddBookingSection() {
  const serviceCheckboxes = document.querySelectorAll(
    'input[name="admin-services"]'
  );
  const saveBtn = document.getElementById("save-booking-btn");
  const resetBtn = document.getElementById("reset-form-btn");

  serviceCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", handleAdminServiceSelection);
  });

  if (saveBtn) {
    saveBtn.addEventListener("click", saveNewBooking);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetAddBookingForm);
  }

  // Skip original event handlers setup if in edit mode
  if (isInEditMode()) {
    return; // Edit mode handles its own event listeners
  }

  // Remove status selection (always confirmed)
  const statusGroup = document
    .getElementById("booking-status")
    ?.closest(".form-group");
  if (statusGroup) {
    statusGroup.style.display = "none";
  }

  setupAddBookingCalendar();
  setupFormValidation();
}

function handleAdminServiceSelection(event) {
  const triggerId = event.target.value;
  const isChecked = event.target.checked;

  // Apply conflicts immediately if checking
  if (isChecked) {
    handleServiceConflicts(triggerId, 'input[name="admin-services"]');
  }

  updateSelectedAdminServices();
  updateAdminBookingSummary();
  renderAddBookingCalendar(); // Re-render calendar when services change
  validateAddBookingForm();
}

function updateSelectedAdminServices() {
  const newServices = new Set();
  const serviceCheckboxes = document.querySelectorAll(
    'input[name="admin-services"]'
  );
  serviceCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      newServices.add(checkbox.value);
    }
  });
  setSelectedAdminServices(newServices);
}

function setupAddBookingCalendar() {
  // Replace date input with calendar
  const dateGroup = document
    .getElementById("booking-date")
    ?.closest(".form-group");
  if (dateGroup) {
    dateGroup.innerHTML = `
            <label>Select Date</label>
            <div class="admin-calendar-container">
                <div class="admin-calendar-header">
                    <button type="button" id="prev-month-add" class="admin-calendar-nav">&lt;</button>
                    <h4 id="add-calendar-month-year"></h4>
                    <button type="button" id="next-month-add" class="admin-calendar-nav">&gt;</button>
                </div>
                <div class="admin-calendar-grid" id="add-booking-calendar">
                    <!-- Calendar will be generated here -->
                </div>
                <div class="admin-time-slots" id="add-booking-time-slots" style="display: none;">
                    <h4>Available Time Slots</h4>
                    <div class="admin-time-grid" id="add-booking-time-grid">
                        <!-- Time slots will be generated here -->
                    </div>
                </div>
            </div>
        `;

    // Setup calendar navigation
    document.getElementById("prev-month-add").addEventListener("click", () => {
      let newMonth = addBookingCalendarMonth - 1;
      let newYear = addBookingCalendarYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      setAddBookingCalendarMonth(newMonth);
      setAddBookingCalendarYear(newYear);
      renderAddBookingCalendar();
    });

    document.getElementById("next-month-add").addEventListener("click", () => {
      let newMonth = addBookingCalendarMonth + 1;
      let newYear = addBookingCalendarYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      setAddBookingCalendarMonth(newMonth);
      setAddBookingCalendarYear(newYear);
      renderAddBookingCalendar();
    });
  }

  // Hide time select (replaced by time slots)
  const timeGroup = document
    .getElementById("booking-time")
    ?.closest(".form-group");
  if (timeGroup) {
    timeGroup.style.display = "none";
  }
}

export function renderAddBookingCalendar() {
  const monthYearEl = document.getElementById("add-calendar-month-year");
  const calendarGrid = document.getElementById("add-booking-calendar");

  if (!monthYearEl || !calendarGrid) return;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  monthYearEl.textContent = `${monthNames[addBookingCalendarMonth]} ${addBookingCalendarYear}`;

  calendarGrid.innerHTML = "";

  // Add day headers
  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  // Get selected services total duration
  const selectedServices = document.querySelectorAll(
    'input[name="admin-services"]:checked'
  );
  let totalDuration = 0;
  selectedServices.forEach((checkbox) => {
    totalDuration += parseInt(checkbox.getAttribute("data-duration"));
  });

  // Get calendar info
  const firstDay =
    (new Date(addBookingCalendarYear, addBookingCalendarMonth, 1).getDay() +
      6) %
    7;
  const daysInMonth = new Date(
    addBookingCalendarYear,
    addBookingCalendarMonth + 1,
    0
  ).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Add empty cells for previous month
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "admin-calendar-day";
    calendarGrid.appendChild(emptyDay);
  }

  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "admin-calendar-day";
    dayElement.textContent = day;

    const dayDate = new Date(
      addBookingCalendarYear,
      addBookingCalendarMonth,
      day
    );
    dayDate.setHours(0, 0, 0, 0);

    const dayDateStr = `${addBookingCalendarYear}-${String(
      addBookingCalendarMonth + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Check if day is in the past
    if (dayDate < today) {
      dayElement.classList.add("disabled");
    } else {
      // Check if day has available slots for the selected services
      const hasAvailableSlots =
        totalDuration > 0
          ? checkDayAvailability(
              dayDateStr,
              totalDuration,
              businessHours,
              currentBookings
            )
          : false;

      if (totalDuration > 0 && !hasAvailableSlots) {
        dayElement.classList.add("unavailable");
      } else if (totalDuration > 0) {
        dayElement.addEventListener("click", () =>
          selectAddBookingDate(dayDateStr, dayElement)
        );
      }
    }

    // Mark selected date
    if (selectedAddBookingDate === dayDateStr) {
      dayElement.classList.add("selected");
    }

    calendarGrid.appendChild(dayElement);
  }

  // Update time slots if date is selected
  if (selectedAddBookingDate) {
    updateAddBookingTimeSlots();
  }
}

function selectAddBookingDate(dateStr, element) {
  // Remove previous selection
  document.querySelectorAll(".admin-calendar-day.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  // Add selection to clicked element
  element.classList.add("selected");
  setSelectedAddBookingDate(dateStr);

  // Show time slots
  updateAddBookingTimeSlots();
  validateAddBookingForm();
}

function updateAddBookingTimeSlots() {
  const timeSlotsContainer = document.getElementById("add-booking-time-slots");
  const timeGrid = document.getElementById("add-booking-time-grid");

  if (!timeSlotsContainer || !timeGrid || !selectedAddBookingDate) return;

  // Get selected services total duration
  const selectedServices = document.querySelectorAll(
    'input[name="admin-services"]:checked'
  );
  let totalDuration = 0;
  selectedServices.forEach((checkbox) => {
    totalDuration += parseInt(checkbox.getAttribute("data-duration"));
  });

  if (totalDuration === 0) {
    timeSlotsContainer.style.display = "none";
    return;
  }

  timeSlotsContainer.style.display = "block";
  timeGrid.innerHTML = "";

  // Get business hours for selected date
  const dayOfWeek = new Date(selectedAddBookingDate).getDay();
  const fullDayName = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][dayOfWeek];
  const dayHours = businessHours[fullDayName];

  if (!dayHours || !dayHours.enabled) {
    timeGrid.innerHTML =
      '<p style="text-align: center; color: #666;">Closed on this day</p>';
    return;
  }

  // Generate time slots
  const openTime = dayHours.open;
  const closeTime = dayHours.close;
  const [openHour, openMin] = openTime.split(":").map(Number);
  const [closeHour, closeMin] = closeTime.split(":").map(Number);

  for (
    let hour = openHour;
    hour < closeHour || (hour === closeHour && 0 < closeMin);
    hour++
  ) {
    for (
      let minute = hour === openHour ? openMin : 0;
      minute < 60;
      minute += 30
    ) {
      if (hour === closeHour && minute >= closeMin) break;

      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      const displayTime = formatTime(timeString);

      // Check if slot is in the past (only for today)
      const now = new Date();
      const today = new Date().toISOString().split("T")[0];
      const isToday = selectedAddBookingDate === today;
      const isPastTime =
        isToday &&
        timeToMinutes(timeString) <=
          timeToMinutes(
            `${now.getHours().toString().padStart(2, "0")}:${now
              .getMinutes()
              .toString()
              .padStart(2, "0")}`
          );

      const isAvailable = isTimeSlotAvailable(
        selectedAddBookingDate,
        timeString,
        totalDuration,
        currentBookings
      );
      const endTime = getBookingEndTime(timeString, totalDuration);
      const endMinutes = timeToMinutes(endTime);
      const closeMinutes = timeToMinutes(closeTime);
      const fitsInBusinessHours = endMinutes <= closeMinutes;

      const timeSlot = document.createElement("div");
      timeSlot.className = "admin-time-slot";
      timeSlot.textContent = displayTime;

      if (!isAvailable || !fitsInBusinessHours || isPastTime) {
        timeSlot.classList.add("unavailable");
        if (!fitsInBusinessHours) {
          timeSlot.title = "Service would end after closing time";
        } else {
          timeSlot.title = "Conflicts with existing booking";
        }
      } else {
        timeSlot.addEventListener("click", () =>
          selectTimeSlot(timeString, timeSlot)
        );
      }

      timeGrid.appendChild(timeSlot);
    }
  }
}

function selectTimeSlot(timeString, element) {
  // Remove previous selection
  document.querySelectorAll(".admin-time-slot.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  // Add selection to clicked element
  element.classList.add("selected");

  // Update SELECT element with selected time
  const timeSelect = document.getElementById("booking-time");
  if (timeSelect) {
    // Clear existing options
    timeSelect.innerHTML = "";

    // Add selected time option
    const option = document.createElement("option");
    option.value = timeString;
    option.textContent = element.textContent; // Use display text from button
    option.selected = true;
    timeSelect.appendChild(option);
  }

  // Update validation
  validateAddBookingForm();
}

function updateAdminBookingSummary() {
  const checkboxes = document.querySelectorAll(
    'input[name="admin-services"]:checked'
  );
  let totalDuration = 0;
  let totalPrice = 0;

  checkboxes.forEach((checkbox) => {
    totalDuration += parseInt(checkbox.getAttribute("data-duration"));
    totalPrice += parseInt(checkbox.getAttribute("data-price"));
  });

  const durationEl = document.getElementById("admin-total-duration");
  const priceEl = document.getElementById("admin-total-price");

  if (durationEl) durationEl.textContent = `${totalDuration} min`;
  if (priceEl) priceEl.textContent = `${totalPrice}`;
}

function validateAddBookingForm() {
  const customerName = document.getElementById("customer-name")?.value.trim();
  const customerPhone = document.getElementById("customer-phone")?.value.trim();
  const selectedServices = document.querySelectorAll(
    'input[name="admin-services"]:checked'
  );
  const selectedTime = document.getElementById("booking-time")?.value;

  const isValid =
    customerName &&
    customerPhone &&
    selectedServices.length > 0 &&
    selectedAddBookingDate &&
    selectedTime;

  const saveBtn = document.getElementById("save-booking-btn");
  if (saveBtn) {
    saveBtn.disabled = !isValid;
  }
}

function setupFormValidation() {
  const inputs = ["customer-name", "customer-phone", "customer-email"];
  inputs.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener("input", validateAddBookingForm);
    }
  });
}
async function saveNewBooking() {
  // Refresh bookings to get latest data before conflict check
  await refreshBookings();

  const form = {
    customer: document.getElementById("customer-name")?.value.trim(),
    phone: document.getElementById("customer-phone")?.value.trim(),
    email: document.getElementById("customer-email")?.value.trim(),
    date: selectedAddBookingDate,
    time: document.getElementById("booking-time")?.value,
    notes: document.getElementById("admin-notes")?.value.trim(),
  };

  const selectedServices = Array.from(
    document.querySelectorAll('input[name="admin-services"]:checked')
  );

  // Validation
  if (
    !form.customer ||
    !form.phone ||
    !form.date ||
    !form.time ||
    selectedServices.length === 0
  ) {
    showNotification(
      "Please fill in all required fields and select at least one service.",
      "error"
    );
    return;
  }

  // Get total duration for final conflict check
  const totalDuration = selectedServices.reduce(
    (sum, checkbox) => sum + parseInt(checkbox.getAttribute("data-duration")),
    0
  );

  // Final conflict check with fresh data from API
  if (
    !isTimeSlotAvailable(form.date, form.time, totalDuration, currentBookings)
  ) {
    showNotification(
      "This time slot conflicts with existing bookings. Please select another time.",
      "error"
    );
    return;
  }

  // Create new booking
  const services = selectedServices.map((checkbox) => {
    const serviceValue = checkbox.value;
    const serviceNames = {
      "premium-haircut": "Premium Haircut",
      "beard-trim": "Beard Trim & Style",
      "hot-towel-shave": "Hot Towel Shave",
      "head-shave": "Head Shave",
      "mustache-trim": "Mustache Trim",
      "haircut-beard-package": "Haircut + Beard Package",
    };
    return serviceNames[serviceValue] || serviceValue;
  });

  const totalPrice = selectedServices.reduce(
    (sum, checkbox) => sum + parseInt(checkbox.getAttribute("data-price")),
    0
  );

  const newBooking = {
    id: Math.max(...currentBookings.map((b) => b.id)) + 1,
    date: form.date,
    time: form.time,
    customer: form.customer,
    phone: form.phone,
    email: form.email || "",
    services: services,
    duration: totalDuration,
    price: totalPrice,
    status: "confirmed", // Always confirmed, no pending
    notes: form.notes || "",
  };

  await addBooking(newBooking);

  showNotification("Booking created successfully!", "success");
  resetAddBookingForm();

  // Update other sections if they're visible
  updateDashboard();
  updateBookingsSection();
  renderAdminCalendar();
}

export function resetAddBookingForm() {
  const form = document.querySelector(".add-booking-form");
  if (form) {
    const inputs = form.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      if (input.type === "checkbox") {
        input.checked = false;
      } else if (input.tagName === "SELECT") {
        input.selectedIndex = 0;
      } else {
        input.value = "";
      }
    });

    // Reset state
    setSelectedAdminServices(new Set());
    setSelectedAddBookingDate(null);
    setAddBookingCalendarMonth(new Date().getMonth());
    setAddBookingCalendarYear(new Date().getFullYear());

    // Hide time slots
    const timeSlotsContainer = document.getElementById(
      "add-booking-time-slots"
    );
    if (timeSlotsContainer) {
      timeSlotsContainer.style.display = "none";
    }

    updateAdminBookingSummary();
    renderAddBookingCalendar();
    validateAddBookingForm();
  }
}
