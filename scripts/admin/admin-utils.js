/**
 * ADMIN UTILITY FUNCTIONS MODULE
 * Contains all utility functions for date manipulation, time formatting,
 * conflict detection, and common helper functions used across the admin panel
 */

// Date utility functions
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

export function getWeekEnd(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + 6;
  return new Date(d.setDate(diff));
}

// Time formatting functions
export function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(":");
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
}

export function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Time calculation functions
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getBookingEndTime(startTime, duration) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return `${endHours.toString().padStart(2, "0")}:${endMins
    .toString()
    .padStart(2, "0")}`;
}

export function getNextAvailableSlot(endTime) {
  const [hours, minutes] = endTime.split(":").map(Number);
  const endMinutes = hours * 60 + minutes;

  // Find next :00 or :30 slot
  let nextSlotMinutes;
  if (minutes === 0) {
    nextSlotMinutes = endMinutes + 30; // Next :30
  } else if (minutes <= 30) {
    nextSlotMinutes = hours * 60 + 30; // Same hour :30
  } else {
    nextSlotMinutes = (hours + 1) * 60; // Next hour :00
  }

  const nextHours = Math.floor(nextSlotMinutes / 60);
  const nextMins = nextSlotMinutes % 60;

  return `${nextHours.toString().padStart(2, "0")}:${nextMins
    .toString()
    .padStart(2, "0")}`;
}

// Conflict detection function with overtime buffer support
export function isTimeSlotAvailable(
  selectedDate,
  timeSlot,
  newDuration,
  currentBookings,
  excludeBookingId = null
) {
  if (!selectedDate || !timeSlot || !newDuration) return false;

  const newEndTime = getBookingEndTime(timeSlot, newDuration);
  const newStartMinutes = timeToMinutes(timeSlot);
  const newEndMinutes = timeToMinutes(newEndTime);

  // Check conflicts with existing bookings
  const dayBookings = currentBookings.filter(
    (booking) =>
      booking.date === selectedDate &&
      booking.status === "confirmed" &&
      booking.id !== excludeBookingId
  );

  for (const booking of dayBookings) {
    const existingStartMinutes = timeToMinutes(booking.time);
    const existingEndTime = getBookingEndTime(booking.time, booking.duration);
    const existingNextAvailable = getNextAvailableSlot(existingEndTime);
    const existingNextAvailableMinutes = timeToMinutes(existingNextAvailable);

    // Check if new booking conflicts with existing booking + buffer
    if (
      newStartMinutes < existingNextAvailableMinutes &&
      newEndMinutes > existingStartMinutes
    ) {
      return false;
    }
  }

  // Check if booking fits within business hours + overtime buffer
  const dayOfWeek = new Date(selectedDate).getDay();
  const fullDayName = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][dayOfWeek];
  const dayHours = import("./admin-state.js").then(
    (module) => module.businessHours[fullDayName]
  );

  // For now, return true - this will be properly handled in checkDayAvailability
  return true;
}

// Service conflict detection
export function handleServiceConflicts(triggerId, checkboxSelector) {
  // Define all conflicts exactly like on the booking page
  const conflicts = {
    "haircut-beard-package": ["premium-haircut", "beard-trim", "head-shave"],
    "premium-haircut": ["head-shave", "haircut-beard-package"],
    "beard-trim": ["haircut-beard-package"],
    "head-shave": ["premium-haircut", "haircut-beard-package"],
  };

  // Get conflicting services for the selected service
  const conflictingServices = conflicts[triggerId] || [];

  // Uncheck all conflicting services
  conflictingServices.forEach((conflictId) => {
    const conflictCheckbox = document.querySelector(
      `${checkboxSelector}[value="${conflictId}"]`
    );
    if (conflictCheckbox && conflictCheckbox.checked) {
      conflictCheckbox.checked = false;
    }
  });
}

// Day availability check with overtime buffer support
export function checkDayAvailability(
  dateStr,
  duration,
  businessHours,
  currentBookings
) {
  const dayOfWeek = new Date(dateStr).getDay();
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
    return false;
  }

  // Generate time slots and check if any are available
  const openTime = dayHours.open;
  const closeTime = dayHours.close;
  const overtimeBuffer = dayHours.overtime_buffer_minutes || 0;
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

      if (isTimeSlotAvailable(dateStr, timeString, duration, currentBookings)) {
        const endTime = getBookingEndTime(timeString, duration);
        const endMinutes = timeToMinutes(endTime);
        const closeMinutes = timeToMinutes(closeTime);

        // Check if appointment fits within closing time + overtime buffer
        if (endMinutes <= closeMinutes + overtimeBuffer) {
          return true;
        }
      }
    }
  }

  return false;
}

// Notification system
export function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Style the notification
  Object.assign(notification.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "16px 24px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "500",
    fontSize: "0.9rem",
    zIndex: "9999",
    maxWidth: "400px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    transform: "translateX(100%)",
    transition: "transform 0.3s ease",
  });

  // Set background color based on type
  switch (type) {
    case "success":
      notification.style.background =
        "linear-gradient(135deg, #10b981, #059669)";
      break;
    case "error":
      notification.style.background =
        "linear-gradient(135deg, #ef4444, #dc2626)";
      break;
    case "info":
      notification.style.background =
        "linear-gradient(135deg, #4a9eff, #0066cc)";
      break;
    default:
      notification.style.background =
        "linear-gradient(135deg, #64748b, #475569)";
  }

  document.body.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = "translateX(0)";
  });

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}
