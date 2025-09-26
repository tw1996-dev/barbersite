/**
 * ADMIN BOOKINGS ENHANCED MODULE
 * Extends admin-bookings.js with search functionality and intelligent column sorting
 * Provides intelligent search ranking and 3-state column sorting (asc/desc/reset)
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
let sortState = { column: null, direction: null }; // null = no sorting (chronological)

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

// Setup search panel functionality with debounced input
function setupSearchPanel() {
  const searchId = document.getElementById("search-id");
  const searchCustomer = document.getElementById("search-customer");
  const searchPhone = document.getElementById("search-phone");
  const clearSearchBtn = document.getElementById("clear-search");

  // Debounced search to avoid excessive filtering during typing
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

// Setup sortable column headers with click handlers
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

// Handle 3-state column sorting: asc -> desc -> reset (chronological)
function handleColumnSort(column) {
  if (sortState.column === column) {
    // Same column clicked - cycle through states
    if (sortState.direction === "asc") {
      sortState.direction = "desc";
    } else if (sortState.direction === "desc") {
      // Reset to no sorting (chronological)
      sortState.column = null;
      sortState.direction = null;
    }
  } else {
    // New column clicked - start with ascending
    sortState.column = column;
    sortState.direction = "asc";
  }

  updateSortIndicators();
  updateEnhancedBookingsSection();
}

// Update visual sort indicators in column headers
function updateSortIndicators() {
  document.querySelectorAll("[data-sort]").forEach((header) => {
    header.classList.remove("sort-asc", "sort-desc");
  });

  if (sortState.column && sortState.direction) {
    const activeHeader = document.querySelector(
      `[data-sort="${sortState.column}"]`
    );
    if (activeHeader) {
      activeHeader.classList.add(`sort-${sortState.direction}`);
    }
  }
}

// Enhanced filtering with intelligent search ranking and sorting
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

  // Apply search filters with intelligent ranking
  const hasSearchFilters =
    searchFilters.id || searchFilters.customer || searchFilters.phone;

  if (hasSearchFilters) {
    filteredBookings = applyIntelligentSearch(filteredBookings);
  }

  // Apply column sorting or default chronological sorting
  if (sortState.column && sortState.direction) {
    filteredBookings = applySorting(filteredBookings);
  } else {
    // Default chronological sorting when no column sorting is active
    filteredBookings.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
  }

  return filteredBookings;
}

// Apply intelligent search with ranking - exact matches first
function applyIntelligentSearch(bookings) {
  const searchResults = [];

  bookings.forEach((booking) => {
    let matchScore = 0;
    let matches = false;

    // ID search with exact match priority
    if (searchFilters.id) {
      const bookingId = booking.id.toString();
      const searchId = searchFilters.id;

      if (bookingId === searchId) {
        matchScore += 100; // Exact match - highest priority
        matches = true;
      } else if (bookingId.includes(searchId)) {
        matchScore += 50; // Partial match
        matches = true;
      }
    }

    // Customer search with intelligent ranking
    if (searchFilters.customer) {
      const customerName = booking.customer.toLowerCase();
      const searchCustomer = searchFilters.customer.toLowerCase();

      if (customerName === searchCustomer) {
        matchScore += 90; // Exact match
        matches = true;
      } else if (customerName.startsWith(searchCustomer)) {
        matchScore += 70; // Starts with search term
        matches = true;
      } else if (customerName.includes(searchCustomer)) {
        matchScore += 40; // Contains search term
        matches = true;
      }
    }

    // Phone search with exact match priority
    if (searchFilters.phone) {
      const phone = booking.phone;
      const searchPhone = searchFilters.phone;

      if (phone === searchPhone) {
        matchScore += 95; // Exact match
        matches = true;
      } else if (phone.includes(searchPhone)) {
        matchScore += 45; // Partial match
        matches = true;
      }
    }

    // Only include bookings that match search criteria
    if (matches) {
      searchResults.push({ ...booking, _matchScore: matchScore });
    }
  });

  // Sort by match score (highest first) for intelligent search results
  return searchResults
    .sort((a, b) => b._matchScore - a._matchScore)
    .map(({ _matchScore, ...booking }) => booking); // Remove match score from final results
}

// Apply column sorting based on current sort state
function applySorting(bookings) {
  return bookings.sort((a, b) => {
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

    // Compare values and apply sort direction
    if (valueA < valueB) return sortState.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortState.direction === "asc" ? 1 : -1;
    return 0;
  });
}

// Main enhanced update function - handles both mobile and desktop views
function updateEnhancedBookingsSection() {
  const isMobile = window.innerWidth <= 890;
  const filteredBookings = getEnhancedFilteredBookings();

  if (isMobile) {
    updateMobileView(filteredBookings);
  } else {
    updateDesktopTable(filteredBookings);
  }

  updateSearchResultsCounter(filteredBookings);
}

// Update mobile view with filtered and sorted bookings
// function updateMobileView(filteredBookings) {
//   const container = document.querySelector(".bookings-table-container");

//   if (!container) {
//     return;
//   }

//   const isMobile = window.innerWidth <= 890;

//   if (isMobile) {
//     container.classList.remove("bookings-table-container");
//     container.classList.add("mobile-bookings-container");
//   } else {
//     container.classList.add("bookings-table-container");
//     container.classList.remove("mobile-bookings-container");
//   }

//   container.innerHTML = "";
//   filteredBookings.forEach((booking) => {
//     const card = createMobileBookingCard(booking);
//     container.appendChild(card);
//   });
// }

// Hide table on mobile
// const tableContainer = document.querySelector(".bookings-table-container");
// if (tableContainer) {
//   tableContainer.style.display = "none";
// }

// mobileContainer.innerHTML = "";

// if (filteredBookings.length === 0) {
//   mobileContainer.innerHTML =
//     '<p style="text-align: center; color: #64748b; padding: 20px;">No bookings found</p>';
//   return;
// }

// Create mobile cards using original structure from admin-bookings.js
//   filteredBookings.forEach((booking) => {
//     const card = createMobileBookingCard(booking);
//     mobileContainer.appendChild(card);
//   });
// }

// Create mobile booking card - uses same structure as original
// function createMobileBookingCard(booking) {
//   const card = document.createElement("div");
//   card.className = "booking-card";

//   const endTime = getBookingEndTime(booking.time, booking.duration);
//   const timeRange = formatTimeRange(booking.time, endTime);

//   card.innerHTML = `
//     <div class="booking-header">
//       <div class="booking-id">#${booking.id}</div>
//       <div class="booking-status status-${booking.status}">${
//     booking.status
//   }</div>
//     </div>
//     <div class="booking-customer">${booking.customer}</div>
//     <div class="booking-details">
//       <div class="booking-date">${formatDate(booking.date)}</div>
//       <div class="booking-time">${timeRange}</div>
//     </div>
//     <div class="booking-service">${booking.services}</div>
//     <div class="booking-footer">
//       <div class="booking-price">$${booking.price}</div>
//       <div class="booking-actions">
//         <button class="btn-edit" onclick="editBooking(${
//           booking.id
//         })">Edit</button>
//         <button class="btn-delete" onclick="deleteBooking(${
//           booking.id
//         })">Delete</button>
//       </div>
//     </div>
//   `;

//   return card;
// }

// Update desktop table with filtered and sorted bookings
function updateDesktopTable(filteredBookings) {
  const tableContainer = document.querySelector(".bookings-table-container");
  if (tableContainer) {
    tableContainer.style.display = "block";
  }

  const tableBody = document.querySelector("#all-bookings-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (filteredBookings.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="10" style="text-align: center; color: #64748b; padding: 20px;">
        No bookings found
      </td>
    `;
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
      <td>${booking.services}</td>
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

// Update search results counter display
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

// Check if any search filters or sorting is currently active
function hasActiveFilters() {
  return (
    searchFilters.id ||
    searchFilters.customer ||
    searchFilters.phone ||
    sortState.column
  );
}

// Clear all search inputs and reset sorting
function clearAllSearches() {
  searchFilters = { id: "", customer: "", phone: "" };
  sortState = { column: null, direction: null };

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

// Utility function for debouncing search input to improve performance
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
