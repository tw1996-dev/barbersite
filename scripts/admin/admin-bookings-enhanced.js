/**
 * ADMIN BOOKINGS ENHANCED MODULE
 * Extends admin-bookings.js with search functionality and column sorting
 * Imports all original functions and adds search/sort capabilities
 */

// Import everything from original bookings module
import * as OriginalBookings from "./admin-bookings.js";
import { currentBookings } from "./admin-state.js";
import {
  getBookingEndTime,
  formatTimeRange,
  formatDate,
  getWeekStart,
  getWeekEnd,
} from "./admin-utils.js";

// Enhanced state
let searchFilters = { id: "", customer: "", phone: "" };
let sortState = { column: null, direction: "asc" };

// Setup enhanced bookings - extends original functionality
export function setupBookingsEnhancements() {
  // First setup original bookings functionality
  OriginalBookings.setupBookingsSection();

  // Then add our enhancements
  setupSearchPanel();
  setupColumnSorting();

  // Override only the update function with enhanced version
  window.updateBookingsSection = updateEnhancedBookingsSection;
}

// Setup search panel functionality
function setupSearchPanel() {
  const searchId = document.getElementById("search-id");
  const searchCustomer = document.getElementById("search-customer");
  const searchPhone = document.getElementById("search-phone");
  const clearSearchBtn = document.getElementById("clear-search");

  // Debounced search to avoid excessive filtering
  const debouncedSearch = debounce(() => {
    updateEnhancedBookingsSection();
  }, 300);

  if (searchId) {
    searchId.addEventListener("input", (e) => {
      searchFilters.id = e.target.value.trim();
      debouncedSearch();
    });
  }

  if (searchCustomer) {
    searchCustomer.addEventListener("input", (e) => {
      searchFilters.customer = e.target.value.trim();
      debouncedSearch();
    });
  }

  if (searchPhone) {
    searchPhone.addEventListener("input", (e) => {
      searchFilters.phone = e.target.value.trim();
      debouncedSearch();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      clearAllSearches();
      updateEnhancedBookingsSection();
    });
  }
}

// Setup sortable column headers
function setupColumnSorting() {
  const sortableColumns = ["id", "customer", "duration", "price", "status"];

  sortableColumns.forEach((column) => {
    const headerCell = document.querySelector(`[data-sort="${column}"]`);
    if (headerCell) {
      headerCell.style.cursor = "pointer";
      headerCell.addEventListener("click", () => {
        handleColumnSort(column);
      });
    }
  });
}

// Handle column sorting
function handleColumnSort(column) {
  if (sortState.column === column) {
    sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
  } else {
    sortState.column = column;
    sortState.direction = "asc";
  }

  updateSortIndicators();
  updateEnhancedBookingsSection();
}

// Update visual sort indicators
function updateSortIndicators() {
  document.querySelectorAll("[data-sort]").forEach((header) => {
    header.classList.remove("sort-asc", "sort-desc");
  });

  if (sortState.column) {
    const activeHeader = document.querySelector(
      `[data-sort="${sortState.column}"]`
    );
    if (activeHeader) {
      activeHeader.classList.add(`sort-${sortState.direction}`);
    }
  }
}

// Enhanced filtering that combines original filters with search and sorting
function getEnhancedFilteredBookings() {
  const statusFilter = document.getElementById("status-filter")?.value || "all";
  const dateFilter = document.getElementById("date-filter")?.value || "all";

  let filteredBookings = [...currentBookings];

  // Apply original status filter
  if (statusFilter !== "all") {
    filteredBookings = filteredBookings.filter(
      (b) => b.status === statusFilter
    );
  }

  // Apply original date filter
  if (dateFilter !== "all") {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    switch (dateFilter) {
      case "today":
        filteredBookings = filteredBookings.filter((b) => b.date === today);
        break;
      case "tomorrow":
        filteredBookings = filteredBookings.filter((b) => b.date === tomorrow);
        break;
      case "week":
        const weekStart = getWeekStart(new Date());
        const weekEnd = getWeekEnd(new Date());
        filteredBookings = filteredBookings.filter((b) => {
          const bookingDate = new Date(b.date);
          return bookingDate >= weekStart && bookingDate <= weekEnd;
        });
        break;
      case "month":
        const monthStart = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        const monthEnd = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0
        );
        filteredBookings = filteredBookings.filter((b) => {
          const bookingDate = new Date(b.date);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });
        break;
    }
  }

  // Apply search filters
  if (searchFilters.id) {
    filteredBookings = filteredBookings.filter((b) =>
      b.id.toString().includes(searchFilters.id)
    );
  }

  if (searchFilters.customer) {
    filteredBookings = filteredBookings.filter((b) =>
      b.customer.toLowerCase().includes(searchFilters.customer.toLowerCase())
    );
  }

  if (searchFilters.phone) {
    filteredBookings = filteredBookings.filter((b) =>
      b.phone.includes(searchFilters.phone)
    );
  }

  // Apply sorting
  if (sortState.column) {
    filteredBookings.sort((a, b) => {
      let valueA, valueB;

      switch (sortState.column) {
        case "id":
          valueA = a.id;
          valueB = b.id;
          break;
        case "customer":
          valueA = a.customer.toLowerCase();
          valueB = b.customer.toLowerCase();
          break;
        case "duration":
          valueA = a.duration;
          valueB = b.duration;
          break;
        case "price":
          valueA = a.price;
          valueB = b.price;
          break;
        case "status":
          valueA = a.status;
          valueB = b.status;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortState.direction === "asc" ? -1 : 1;
      if (valueA > valueB) return sortState.direction === "asc" ? 1 : -1;
      return 0;
    });
  } else {
    // Default sort by date and time
    filteredBookings.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
  }

  return filteredBookings;
}

// Main enhanced update function
function updateEnhancedBookingsSection() {
  const isMobile = window.innerWidth <= 870;
  const filteredBookings = getEnhancedFilteredBookings();

  if (isMobile) {
    updateMobileView(filteredBookings);
  } else {
    updateDesktopTable(filteredBookings);
  }

  updateSearchResultsCounter(filteredBookings);
}

// Update mobile view with filtered bookings
function updateMobileView(filteredBookings) {
  let mobileContainer = document.querySelector(
    "#bookings-section .mobile-bookings-container"
  );
  if (!mobileContainer) {
    mobileContainer = document.createElement("div");
    mobileContainer.className = "mobile-bookings-container";

    const bookingsSection = document.getElementById("bookings-section");
    const searchPanel = bookingsSection.querySelector(".search-panel");
    if (searchPanel) {
      searchPanel.parentNode.insertBefore(
        mobileContainer,
        searchPanel.nextSibling
      );
    }
  }

  // Hide table on mobile
  const tableContainer = document.querySelector(".bookings-table-container");
  if (tableContainer) {
    tableContainer.style.display = "none";
  }

  mobileContainer.innerHTML = "";

  if (filteredBookings.length === 0) {
    mobileContainer.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No bookings found</p>';
    return;
  }

  // Create mobile cards using original structure
  filteredBookings.forEach((booking) => {
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
                <div class="booking-price">
                    <span class="status-badge status-${booking.status}">${
      booking.status
    }</span>
                    $${booking.price}
                </div>
                <div class="booking-actions">
                    <button class="action-btn view-btn" onclick="viewBooking(${
                      booking.id
                    })">View</button>
                    <button class="action-btn edit-btn" onclick="editBooking(${
                      booking.id
                    })">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteBooking(${
                      booking.id
                    })">Delete</button>
                </div>
            </div>
        `;

    mobileContainer.appendChild(card);
  });
}

// Update desktop table with filtered bookings
function updateDesktopTable(filteredBookings) {
  // Hide mobile container on desktop
  const mobileContainer = document.querySelector(".mobile-bookings-container");
  if (mobileContainer) {
    mobileContainer.style.display = "none";
  }

  // Show table container
  const tableContainer = document.querySelector(".bookings-table-container");
  if (tableContainer) {
    tableContainer.style.display = "block";
  }

  const tableBody = document.querySelector("#all-bookings-table tbody");
  if (!tableBody) {
    console.error("Enhanced bookings: Table body not found");
    return;
  }

  tableBody.innerHTML = "";

  if (filteredBookings.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="10" style="text-align: center; color: #64748b; padding: 20px;">No bookings found</td>';
    tableBody.appendChild(row);
    return;
  }

  // Create table rows
  filteredBookings.forEach((booking) => {
    const row = document.createElement("tr");
    const endTime = getBookingEndTime(booking.time, booking.duration);
    const timeRange = formatTimeRange(booking.time, endTime);

    row.innerHTML = `
            <td>${booking.id}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${timeRange}</td>
            <td>${booking.customer}</td>
            <td>${booking.phone}</td>
            <td>${booking.services.join(", ")}</td>
            <td>${booking.duration} min</td>
            <td>$${booking.price}</td>
            <td><span class="status-badge status-${booking.status}">${
      booking.status
    }</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewBooking(${
                  booking.id
                })">View</button>
                <button class="action-btn edit-btn" onclick="editBooking(${
                  booking.id
                })">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteBooking(${
                  booking.id
                })">Delete</button>
            </td>
        `;

    tableBody.appendChild(row);
  });
}

// Update search results counter
function updateSearchResultsCounter(filteredBookings) {
  const counter = document.getElementById("search-results-counter");
  if (counter) {
    const totalBookings = currentBookings.length;

    if (hasActiveFilters()) {
      counter.textContent = `Showing ${filteredBookings.length} of ${totalBookings} bookings`;
      counter.style.display = "block";
    } else {
      counter.style.display = "none";
    }
  }
}

// Check if any filters are active
function hasActiveFilters() {
  return (
    searchFilters.id ||
    searchFilters.customer ||
    searchFilters.phone ||
    sortState.column
  );
}

// Clear all search inputs
function clearAllSearches() {
  searchFilters = { id: "", customer: "", phone: "" };
  sortState = { column: null, direction: "asc" };

  const searchId = document.getElementById("search-id");
  const searchCustomer = document.getElementById("search-customer");
  const searchPhone = document.getElementById("search-phone");

  if (searchId) searchId.value = "";
  if (searchCustomer) searchCustomer.value = "";
  if (searchPhone) searchPhone.value = "";

  // Clear sort indicators
  document.querySelectorAll("[data-sort]").forEach((header) => {
    header.classList.remove("sort-asc", "sort-desc");
  });
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
