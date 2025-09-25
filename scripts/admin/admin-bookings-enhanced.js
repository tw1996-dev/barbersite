/**
 * ADMIN BOOKINGS ENHANCED MODULE
 * Extends admin-bookings.js with search functionality and column sorting
 * Provides real-time search across ID, Customer, Phone fields and sortable columns
 */

import { currentBookings } from "./admin-state.js";
import {
  getBookingEndTime,
  formatTimeRange,
  formatDate,
} from "./admin-utils.js";

// Enhanced bookings state
let searchFilters = {
  id: "",
  customer: "",
  phone: "",
};

let sortState = {
  column: null,
  direction: "asc", // 'asc' or 'desc'
};

// Initialize enhanced bookings functionality
export function setupBookingsEnhancements() {
  setupSearchPanel();
  setupColumnSorting();

  // Override the original updateBookingsSection when enhanced features are active
  window.updateBookingsSection = updateEnhancedBookingsSection;
}

// Setup real-time search panel functionality
function setupSearchPanel() {
  const searchId = document.getElementById("search-id");
  const searchCustomer = document.getElementById("search-customer");
  const searchPhone = document.getElementById("search-phone");
  const clearSearchBtn = document.getElementById("clear-search");

  // Debounced search function to avoid excessive filtering
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

// Handle column sorting logic
function handleColumnSort(column) {
  if (sortState.column === column) {
    // Toggle direction if same column
    sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
  } else {
    // New column, default to ascending
    sortState.column = column;
    sortState.direction = "asc";
  }

  updateSortIndicators();
  updateEnhancedBookingsSection();
}

// Update visual sort indicators in table headers
function updateSortIndicators() {
  // Clear all existing indicators
  document.querySelectorAll("[data-sort]").forEach((header) => {
    header.classList.remove("sort-asc", "sort-desc");
  });

  // Add indicator to current sorted column
  if (sortState.column) {
    const activeHeader = document.querySelector(
      `[data-sort="${sortState.column}"]`
    );
    if (activeHeader) {
      activeHeader.classList.add(`sort-${sortState.direction}`);
    }
  }
}

// Enhanced filtering function that combines original filters with search and sorting
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
    // Default sort by date and time if no column sort is active
    filteredBookings.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
  }

  return filteredBookings;
}

// Enhanced update function that replaces the original
function updateEnhancedBookingsSection() {
  const isMobile = window.innerWidth <= 870;

  if (isMobile) {
    updateEnhancedMobileView();
  } else {
    updateEnhancedDesktopTable();
  }

  updateSearchResultsCounter();
}

// Enhanced mobile view update
function updateEnhancedMobileView() {
  let mobileContainer = document.querySelector(
    "#bookings-section .mobile-bookings-container"
  );
  if (!mobileContainer) {
    mobileContainer = document.createElement("div");
    mobileContainer.className = "mobile-bookings-container";

    const bookingsSection = document.getElementById("bookings-section");
    const searchPanel = bookingsSection.querySelector(".search-panel");
    searchPanel.parentNode.insertBefore(
      mobileContainer,
      searchPanel.nextSibling
    );
  }

  const tableContainer = document.querySelector(".bookings-table-container");
  if (tableContainer) {
    tableContainer.style.display = "none";
  }

  const filteredBookings = getEnhancedFilteredBookings();

  mobileContainer.innerHTML = "";

  if (filteredBookings.length === 0) {
    mobileContainer.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No bookings found</p>';
    return;
  }

  filteredBookings.forEach((booking) => {
    const card = createMobileBookingCard(booking);
    mobileContainer.appendChild(card);
  });
}

// Enhanced desktop table update
function updateEnhancedDesktopTable() {
  const mobileContainer = document.querySelector(".mobile-bookings-container");
  if (mobileContainer) {
    mobileContainer.style.display = "none";
  }

  const tableContainer = document.querySelector(".bookings-table-container");
  if (tableContainer) {
    tableContainer.style.display = "block";
  }

  const tableBody = document.querySelector("#all-bookings-table tbody");
  if (!tableBody) {
    console.error("Table body not found");
    return;
  }

  const filteredBookings = getEnhancedFilteredBookings();

  tableBody.innerHTML = "";

  filteredBookings.forEach((booking) => {
    const row = createBookingRow(booking);
    tableBody.appendChild(row);
  });

  if (filteredBookings.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="10" style="text-align: center; color: #64748b; padding: 20px;">No bookings found</td>';
    tableBody.appendChild(row);
  }
}

// Create mobile booking card (reused from original)
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

  return card;
}

// Create desktop booking row (reused from original)
function createBookingRow(booking) {
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

  return row;
}

// Update search results counter
function updateSearchResultsCounter() {
  const counter = document.getElementById("search-results-counter");
  if (counter) {
    const totalBookings = currentBookings.length;
    const filteredBookings = getEnhancedFilteredBookings();

    if (hasActiveSearchFilters() || sortState.column) {
      counter.textContent = `Showing ${filteredBookings.length} of ${totalBookings} bookings`;
      counter.style.display = "block";
    } else {
      counter.style.display = "none";
    }
  }
}

// Check if any search filters are active
function hasActiveSearchFilters() {
  return searchFilters.id || searchFilters.customer || searchFilters.phone;
}

// Clear all search inputs
function clearAllSearches() {
  searchFilters = { id: "", customer: "", phone: "" };

  const searchId = document.getElementById("search-id");
  const searchCustomer = document.getElementById("search-customer");
  const searchPhone = document.getElementById("search-phone");

  if (searchId) searchId.value = "";
  if (searchCustomer) searchCustomer.value = "";
  if (searchPhone) searchPhone.value = "";
}

// Utility functions
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

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getWeekEnd(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + 6;
  return new Date(d.setDate(diff));
}
