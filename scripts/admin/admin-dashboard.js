/**
 * ADMIN DASHBOARD MODULE
 * Manages the main dashboard view including revenue cards, quick stats,
 * recent bookings, and dashboard filters with responsive mobile/desktop views
 */

import {
  currentBookings,
  currentDashboardFilter,
  currentDashboardMonth,
  currentDashboardYear,
  businessHours,
  setCurrentDashboardFilter,
  setCurrentDashboardMonth,
  setCurrentDashboardYear,
} from "./admin-state.js";
import {
  getWeekStart,
  getWeekEnd,
  getBookingEndTime,
  formatTimeRange,
  formatDate,
} from "./admin-utils.js";

export function setupDashboard() {
  const dashboardFilter = document.getElementById("dashboard-filter");

  if (dashboardFilter) {
    // Change event listener - only triggers when filter value actually changes
    dashboardFilter.addEventListener("change", (e) => {
      const selectedFilter = e.target.value;
      setCurrentDashboardFilter(selectedFilter);

      // Small timeout to ensure dropdown interaction is complete before switching months
      setTimeout(() => {
        // Switch to current month if user selects current time filters AND we're not in current month
        if (
          ["today", "week", "month"].includes(selectedFilter) &&
          !isCurrentMonthSelected()
        ) {
          const now = new Date();
          setCurrentDashboardMonth(now.getMonth());
          setCurrentDashboardYear(now.getFullYear());

          // Update month selector
          const monthSelect = document.getElementById("dashboard-month-filter");
          if (monthSelect) {
            monthSelect.value = `${now.getFullYear()}-${now.getMonth()}`;
          }
        }

        updateDashboard();
      }, 150); // 150ms delay to ensure proper dropdown interaction
    });
  }

  // Add month selector for dashboard
  const sectionHeader = document.querySelector(
    "#dashboard-section .section-header"
  );
  if (sectionHeader && !document.getElementById("dashboard-month-filter")) {
    const filtersContainer =
      sectionHeader.querySelector(".date-filter") ||
      document.createElement("div");
    filtersContainer.className = "dashboard-filters";

    // Month selector
    const monthSelect = document.createElement("select");
    monthSelect.id = "dashboard-month-filter";

    const months = [
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

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    months.forEach((month, index) => {
      const option = document.createElement("option");
      option.value = `${currentYear}-${index}`;
      option.textContent = `${month} ${currentYear}`;
      if (index === currentMonth) option.selected = true;
      monthSelect.appendChild(option);
    });

    monthSelect.addEventListener("change", (e) => {
      const [year, month] = e.target.value.split("-");
      setCurrentDashboardYear(parseInt(year));
      setCurrentDashboardMonth(parseInt(month));
      updateDashboard();
    });

    if (!sectionHeader.querySelector(".date-filter")) {
      filtersContainer.appendChild(dashboardFilter);
    }
    filtersContainer.appendChild(monthSelect);

    if (!sectionHeader.querySelector(".dashboard-filters")) {
      sectionHeader.appendChild(filtersContainer);
    }
  }
}

export function updateDashboard() {
  const isCurrentMonth = isCurrentMonthSelected();

  // Update revenue labels and visibility
  updateRevenueLabels(isCurrentMonth);
  updateRevenueCardsVisibility(isCurrentMonth);

  // Update revenue data - always show selected month data if not current month
  if (isCurrentMonth) {
    updateCurrentMonthRevenue();
  } else {
    updateSelectedMonthRevenue();
  }

  // Update quick stats
  updateQuickStats();

  // Update recent bookings table
  updateRecentBookingsTable();
}

function isCurrentMonthSelected() {
  const now = new Date();
  return (
    currentDashboardMonth === now.getMonth() &&
    currentDashboardYear === now.getFullYear()
  );
}

function updateRevenueLabels(isCurrentMonth) {
  const todayCard = document.querySelector(
    ".revenue-cards .revenue-card:nth-child(1)"
  );
  const weekCard = document.querySelector(
    ".revenue-cards .revenue-card:nth-child(2)"
  );
  const monthCard = document.querySelector(
    ".revenue-cards .revenue-card:nth-child(3)"
  );

  if (isCurrentMonth) {
    // Current month labels
    if (todayCard)
      todayCard.querySelector("h3").textContent = "Today's Revenue";
    if (weekCard) weekCard.querySelector("h3").textContent = "Weekly Revenue";
    if (monthCard)
      monthCard.querySelector("h3").textContent = "Monthly Revenue";
  } else {
    // Selected month labels (averages)
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
    const selectedMonthName = monthNames[currentDashboardMonth];

    if (todayCard)
      todayCard.querySelector(
        "h3"
      ).textContent = `Daily Average (${selectedMonthName})`;
    if (weekCard)
      weekCard.querySelector(
        "h3"
      ).textContent = `Weekly Average (${selectedMonthName})`;
    if (monthCard)
      monthCard.querySelector("h3").textContent = `${selectedMonthName} Total`;
  }
}

function updateRevenueCardsVisibility(isCurrentMonth) {
  const todayCard = document.querySelector(
    ".revenue-cards .revenue-card:nth-child(1)"
  );
  const weekCard = document.querySelector(
    ".revenue-cards .revenue-card:nth-child(2)"
  );
  const monthCard = document.querySelector(
    ".revenue-cards .revenue-card:nth-child(3)"
  );

  // Reset visibility
  if (todayCard) todayCard.classList.remove("hidden");
  if (weekCard) weekCard.classList.remove("hidden");
  if (monthCard) monthCard.classList.remove("hidden");

  // Apply filter-based visibility ONLY for current month
  if (isCurrentMonth) {
    if (currentDashboardFilter === "week") {
      if (todayCard) todayCard.classList.add("hidden");
      if (monthCard) monthCard.classList.add("hidden");
    } else if (currentDashboardFilter === "month") {
      if (todayCard) todayCard.classList.add("hidden");
      if (weekCard) weekCard.classList.add("hidden");
    }
  }
  // For non-current months, always show all three cards with averages/totals
}

function updateCurrentMonthRevenue() {
  if (currentDashboardFilter === "today") {
    updateRevenueCard("today", "today");
    updateRevenueCard("week", "current-week");
    updateRevenueCard("month", "current-month");
  } else if (currentDashboardFilter === "week") {
    updateRevenueCard("week", "current-week");
  } else if (currentDashboardFilter === "month") {
    updateRevenueCard("month", "current-month");
  }
}

function updateSelectedMonthRevenue() {
  // For selected months, always show all three cards with averages/totals
  updateRevenueCard("today", "selected-month-daily-avg");
  updateRevenueCard("week", "selected-month-weekly-avg");
  updateRevenueCard("month", "selected-month-total");
}

function updateRevenueCard(cardType, calculationType) {
  let revenue = 0;
  let bookingCount = 0;
  let filteredBookings = [];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  switch (calculationType) {
    case "today":
      filteredBookings = currentBookings.filter(
        (b) => b.date === todayStr && b.status === "confirmed"
      );
      break;

    case "current-week":
      const weekStart = getWeekStart(today);
      const weekEnd = getWeekEnd(today);
      filteredBookings = currentBookings.filter((b) => {
        const bookingDate = new Date(b.date);
        return (
          bookingDate >= weekStart &&
          bookingDate <= weekEnd &&
          b.status === "confirmed"
        );
      });
      break;

    case "current-month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filteredBookings = currentBookings.filter((b) => {
        const bookingDate = new Date(b.date);
        return (
          bookingDate >= monthStart &&
          bookingDate <= monthEnd &&
          b.status === "confirmed"
        );
      });
      break;

    case "selected-month-daily-avg":
      revenue = calculateDailyAverage();
      bookingCount = getSelectedMonthBookings().length;
      break;

    case "selected-month-weekly-avg":
      revenue = calculateWeeklyAverage();
      bookingCount = getSelectedMonthBookings().length;
      break;

    case "selected-month-total":
      filteredBookings = getSelectedMonthBookings();
      break;
  }

  // Calculate revenue and booking count for non-average calculations
  if (
    calculationType !== "selected-month-daily-avg" &&
    calculationType !== "selected-month-weekly-avg"
  ) {
    revenue = filteredBookings.reduce((sum, booking) => sum + booking.price, 0);
    bookingCount = filteredBookings.length;
  }

  // Update DOM elements
  const revenueElement = document.getElementById(`${cardType}-revenue`);
  const bookingsElement = document.getElementById(`${cardType}-bookings`);

  if (revenueElement) {
    revenueElement.textContent = `$${Math.round(revenue)}`;
  }

  if (bookingsElement) {
    if (calculationType === "selected-month-daily-avg") {
      const workingDays = getWorkingDaysInMonth();
      bookingsElement.textContent = `${workingDays} working days`;
    } else if (calculationType === "selected-month-weekly-avg") {
      bookingsElement.textContent = `4 weeks average`;
    } else {
      bookingsElement.textContent = `${bookingCount} bookings`;
    }
  }
}

function getSelectedMonthBookings() {
  const monthStart = new Date(currentDashboardYear, currentDashboardMonth, 1);
  const monthEnd = new Date(currentDashboardYear, currentDashboardMonth + 1, 0);

  return currentBookings.filter((b) => {
    const bookingDate = new Date(b.date);
    return (
      bookingDate >= monthStart &&
      bookingDate <= monthEnd &&
      b.status === "confirmed"
    );
  });
}

function calculateDailyAverage() {
  const selectedBookings = getSelectedMonthBookings();
  const totalRevenue = selectedBookings.reduce(
    (sum, booking) => sum + booking.price,
    0
  );
  const workingDays = getWorkingDaysInMonth();

  return workingDays > 0 ? totalRevenue / workingDays : 0;
}

function calculateWeeklyAverage() {
  const selectedBookings = getSelectedMonthBookings();
  const totalRevenue = selectedBookings.reduce(
    (sum, booking) => sum + booking.price,
    0
  );

  return totalRevenue / 4; // 1/4 of the month
}

function getWorkingDaysInMonth() {
  const daysInMonth = new Date(
    currentDashboardYear,
    currentDashboardMonth + 1,
    0
  ).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDashboardYear, currentDashboardMonth, day);
    const dayOfWeek = date.getDay();
    const dayName = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][dayOfWeek];

    if (businessHours[dayName] && businessHours[dayName].enabled) {
      workingDays++;
    }
  }

  return workingDays;
}

function updateQuickStats() {
  const today = new Date().toISOString().split("T")[0];

  // Next appointment
  const nextAppointment = findNextAppointment();
  const nextAppointmentEl = document.getElementById("next-appointment");
  if (nextAppointmentEl) {
    if (nextAppointment) {
      const endTime = getBookingEndTime(
        nextAppointment.time,
        nextAppointment.duration
      );
      nextAppointmentEl.textContent = `${formatTimeRange(
        nextAppointment.time,
        endTime
      )} - ${nextAppointment.customer}`;
    } else {
      nextAppointmentEl.textContent = "No upcoming appointments";
    }
  }

  // Today's schedule
  const todayBookings = currentBookings.filter(
    (b) => b.date === today && b.status === "confirmed"
  );
  const todayScheduleEl = document.getElementById("today-schedule");
  if (todayScheduleEl) {
    if (todayBookings.length > 0) {
      todayScheduleEl.textContent = `${todayBookings.length} appointments scheduled`;
    } else {
      todayScheduleEl.textContent = "No appointments today";
    }
  }
}

function findNextAppointment() {
  const now = new Date();
  const upcomingBookings = currentBookings
    .filter((b) => {
      const bookingDateTime = new Date(`${b.date}T${b.time}`);
      return bookingDateTime > now && b.status === "confirmed";
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });

  return upcomingBookings[0] || null;
}

function updateRecentBookingsTable() {
  // Check if we should show mobile or desktop view
  const isMobile = window.innerWidth <= 640;

  if (isMobile) {
    updateMobileBookingsView();
  } else {
    updateDesktopBookingsTable();
  }
}

function getFilteredRecentBookings(showAll = false) {
  const today = new Date();
  const isCurrentMonth = isCurrentMonthSelected();

  let filteredBookings = [];

  if (isCurrentMonth) {
    // Current month logic
    const todayStr = today.toISOString().split("T")[0];

    if (currentDashboardFilter === "today") {
      filteredBookings = currentBookings.filter(
        (b) => b.date === todayStr && b.status === "confirmed"
      );
    } else if (currentDashboardFilter === "week") {
      const weekStart = getWeekStart(today);
      const weekEnd = getWeekEnd(today);
      filteredBookings = currentBookings.filter((b) => {
        const bookingDate = new Date(b.date);
        return (
          bookingDate >= weekStart &&
          bookingDate <= weekEnd &&
          b.status === "confirmed"
        );
      });
    } else if (currentDashboardFilter === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filteredBookings = currentBookings.filter((b) => {
        const bookingDate = new Date(b.date);
        return (
          bookingDate >= monthStart &&
          bookingDate <= monthEnd &&
          b.status === "confirmed"
        );
      });
    }
  } else {
    // Selected month logic
    filteredBookings = getSelectedMonthBookings();
  }

  // Sort by date and time
  filteredBookings = filteredBookings.sort(
    (a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
  );

  // Limit to 15 unless showAll is true
  return showAll ? filteredBookings : filteredBookings.slice(0, 15);
}

function updateMobileBookingsView() {
  let mobileContainer = document.querySelector(
    ".recent-bookings .mobile-bookings-container"
  );
  if (!mobileContainer) {
    // Create mobile container
    mobileContainer = document.createElement("div");
    mobileContainer.className = "mobile-bookings-container";

    const recentBookingsDiv = document.querySelector(".recent-bookings");
    const tableContainer = recentBookingsDiv.querySelector(
      ".bookings-table-container"
    );
    if (tableContainer) {
      tableContainer.style.display = "none";
    }
    recentBookingsDiv.appendChild(mobileContainer);
  }

  const recentBookings = getFilteredRecentBookings();
  const allBookings = getFilteredRecentBookings(true);

  mobileContainer.innerHTML = "";

  if (recentBookings.length === 0) {
    mobileContainer.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No bookings found</p>';
    return;
  }

  recentBookings.forEach((booking) => {
    const card = createMobileBookingCard(booking);
    mobileContainer.appendChild(card);
  });

  // Add "Show All" button if there are more bookings
  if (allBookings.length > 15) {
    const showAllBtn = document.createElement("button");
    showAllBtn.className = "action-btn view-btn";
    showAllBtn.textContent = `Show All (${allBookings.length} total)`;
    showAllBtn.style.width = "100%";
    showAllBtn.style.marginTop = "16px";
    showAllBtn.addEventListener("click", () => showAllBookings("mobile"));
    mobileContainer.appendChild(showAllBtn);
  }
}

function updateDesktopBookingsTable() {
  const tableBody = document.querySelector("#recent-bookings-table tbody");
  if (!tableBody) return;

  // Show table container
  const tableContainer = document.querySelector(
    ".recent-bookings .bookings-table-container"
  );
  if (tableContainer) {
    tableContainer.style.display = "block";
  }

  const recentBookings = getFilteredRecentBookings();
  const allBookings = getFilteredRecentBookings(true);

  tableBody.innerHTML = "";

  recentBookings.forEach((booking) => {
    const row = createBookingRow(booking, false);
    tableBody.appendChild(row);
  });

  if (recentBookings.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">No bookings found</td>';
    tableBody.appendChild(row);
  }

  // Add "Show All" button row if there are more bookings
  if (allBookings.length > 15) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align: center; padding: 16px;">
            <button class="action-btn view-btn" onclick="showAllBookings('desktop')" style="padding: 8px 16px;">
                Show All (${allBookings.length} total)
            </button>
        </td>`;
    tableBody.appendChild(row);
  }
}

function showAllBookings(viewType) {
  const allBookings = getFilteredRecentBookings(true);

  if (viewType === "mobile") {
    const mobileContainer = document.querySelector(
      ".recent-bookings .mobile-bookings-container"
    );
    mobileContainer.innerHTML = "";

    allBookings.forEach((booking) => {
      const card = createMobileBookingCard(booking);
      mobileContainer.appendChild(card);
    });

    // Add "Show Less" button
    const showLessBtn = document.createElement("button");
    showLessBtn.className = "action-btn cancel-btn";
    showLessBtn.textContent = "Show Less";
    showLessBtn.style.width = "100%";
    showLessBtn.style.marginTop = "16px";
    showLessBtn.addEventListener("click", () => updateMobileBookingsView());
    mobileContainer.appendChild(showLessBtn);
  } else {
    const tableBody = document.querySelector("#recent-bookings-table tbody");
    tableBody.innerHTML = "";

    allBookings.forEach((booking) => {
      const row = createBookingRow(booking, false);
      tableBody.appendChild(row);
    });

    // Add "Show Less" button row
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align: center; padding: 16px;">
            <button class="action-btn cancel-btn" onclick="updateDesktopBookingsTable()" style="padding: 8px 16px;">
                Show Less
            </button>
        </td>`;
    tableBody.appendChild(row);
  }
}

// Make functions available globally for onclick handlers
window.showAllBookings = showAllBookings;
window.updateDesktopBookingsTable = updateDesktopBookingsTable;

function createMobileBookingCard(booking) {
  const card = document.createElement("div");
  card.className = "booking-card";

  const endTime = getBookingEndTime(booking.time, booking.duration);
  const timeRange = formatTimeRange(booking.time, endTime);

  card.innerHTML = `
        <div class="booking-card-header">
            <div class="booking-customer">${booking.customer}</div>
            <div class="booking-datetime">
                ${formatDate(booking.date)}<br>
                ${timeRange}
            </div>
        </div>
        <div class="booking-services">${booking.services.join(", ")}</div>
        <div class="booking-card-footer">
            <div class="booking-price">$${booking.price}</div>
            <div class="booking-actions">
                <button class="action-btn view-btn" onclick="viewBooking(${
                  booking.id
                })">View</button>
            </div>
        </div>
    `;

  return card;
}

function createBookingRow(booking, includeActions = false) {
  const row = document.createElement("tr");

  const endTime = getBookingEndTime(booking.time, booking.duration);
  const timeRange = formatTimeRange(booking.time, endTime);

  row.innerHTML = `
        ${includeActions ? `<td>${booking.id}</td>` : ""}
        <td>${formatDate(booking.date)}</td>
        <td>${timeRange}</td>
        <td>${booking.customer}</td>
        ${includeActions ? `<td>${booking.phone}</td>` : ""}
        <td>${booking.services.join(", ")}</td>
        ${includeActions ? `<td>${booking.duration} min</td>` : ""}
        <td>$${booking.price}</td>
        <td><span class="status-badge status-${booking.status}">${
    booking.status
  }</span></td>
        ${
          includeActions
            ? `
            <td>
                <button class="action-btn view-btn" onclick="viewBooking(${booking.id})">View</button>
                <button class="action-btn edit-btn" onclick="editBooking(${booking.id})">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteBooking(${booking.id})">Delete</button>
            </td>
        `
            : ""
        }
    `;

  return row;
}
