/**
 * ADMIN CALENDAR MODULE
 * Manages the calendar view with month navigation, day status indicators,
 * and detailed day overview modals showing booking schedules and gaps
 */

import {
  currentBookings,
  currentCalendarMonth,
  currentCalendarYear,
  businessHours,
  setCurrentCalendarMonth,
  setCurrentCalendarYear,
} from "./admin-state.js";
import {
  getBookingEndTime,
  formatTimeRange,
  formatFullDate,
  timeToMinutes,
  checkDayAvailability,
} from "./admin-utils.js";
import { showModal } from "./admin-modal.js";

export function setupCalendar() {
  const prevBtn = document.getElementById("prev-month-cal");
  const nextBtn = document.getElementById("next-month-cal");

  // Remove any existing listeners by cloning buttons
  if (prevBtn) {
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);

    // Add single event listener to new button
    const cleanPrevBtn = document.getElementById("prev-month-cal");
    cleanPrevBtn.addEventListener("click", () => {
      let newMonth = currentCalendarMonth - 1;
      let newYear = currentCalendarYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      setCurrentCalendarMonth(newMonth);
      setCurrentCalendarYear(newYear);
      renderAdminCalendar();
    });
  }

  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

    // Add single event listener to new button
    const cleanNextBtn = document.getElementById("next-month-cal");
    cleanNextBtn.addEventListener("click", () => {
      let newMonth = currentCalendarMonth + 1;
      let newYear = currentCalendarYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      setCurrentCalendarMonth(newMonth);
      setCurrentCalendarYear(newYear);
      renderAdminCalendar();
    });
  }
}

export function renderAdminCalendar() {
  const monthYearEl = document.getElementById("calendar-month-year");
  const calendarGrid = document.getElementById("admin-calendar");

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

  monthYearEl.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;

  calendarGrid.innerHTML = "";

  // Add day headers
  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  // Get calendar info
  const firstDay =
    (new Date(currentCalendarYear, currentCalendarMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(
    currentCalendarYear,
    currentCalendarMonth + 1,
    0
  ).getDate();

  // Add empty cells for previous month
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day";
    calendarGrid.appendChild(emptyDay);
  }

  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = day;

    const dayDate = `${currentCalendarYear}-${String(
      currentCalendarMonth + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayBookings = currentBookings.filter(
      (b) => b.date === dayDate && b.status === "confirmed"
    );

    // Check if day has available slots for standard service (45 min)
    const dayDateStr = `${currentCalendarYear}-${String(
      currentCalendarMonth + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasAvailableSlots = checkDayAvailability(
      dayDateStr,
      45,
      businessHours,
      currentBookings
    );

    if (dayBookings.length === 0) {
      dayElement.classList.add("available");
    } else if (hasAvailableSlots) {
      dayElement.classList.add("busy");
    } else {
      dayElement.classList.add("full");
    }

    dayElement.addEventListener("click", () => {
      showDayBookings(dayDate, dayBookings);
    });

    calendarGrid.appendChild(dayElement);
  }
}

function showDayBookings(date, bookings) {
  const formattedDate = formatFullDate(date);

  let content = `<h4>${formattedDate}</h4>`;

  if (bookings.length === 0) {
    content += "<p>No bookings for this day.</p>";
  } else {
    // Sort bookings by time
    const sortedBookings = bookings.sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    content += '<ul class="day-overview-bookings">';

    for (let i = 0; i < sortedBookings.length; i++) {
      const booking = sortedBookings[i];
      const endTime = getBookingEndTime(booking.time, booking.duration);
      const timeRange = formatTimeRange(booking.time, endTime);

      content += `
                <li class="day-overview-booking">
                    <div>
                        <div class="booking-time-range">${timeRange}</div>
                        <div class="booking-customer-name">${
                          booking.customer
                        }</div>
                        <div class="booking-services-list">${booking.services.join(
                          ", "
                        )}</div>
                    </div>
                    <div class="booking-price-info">$${booking.price}</div>
                </li>
            `;

      // Show gap to next booking
      if (i < sortedBookings.length - 1) {
        const nextBooking = sortedBookings[i + 1];
        const gapMinutes =
          timeToMinutes(nextBooking.time) - timeToMinutes(endTime);
        if (gapMinutes > 0) {
          content += `
                        <li class="day-overview-booking">
                            <div class="booking-gap-info">⏳ ${gapMinutes} minute break</div>
                        </li>
                    `;
        }
      }
    }
    content += "</ul>";
  }

  showModal("Day Overview", content);
}
