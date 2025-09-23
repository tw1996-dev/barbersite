/**
 * CALENDAR UTILITIES MODULE
 * Handles calendar generation (Google Calendar, .ics files) for booking appointments
 * Used by booking confirmation system and email templates
 */

// Get user's timezone
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Format date for calendar (YYYYMMDDTHHMMSS format)
export function formatDateTimeForCalendar(dateStr, timeStr) {
  const [year, month, day] = dateStr.split("-");
  const [hours, minutes] = timeStr.split(":");
  return `${year}${month}${day}T${hours.padStart(2, "0")}${minutes.padStart(
    2,
    "0"
  )}00`;
}

// Calculate end time based on duration
export function calculateEndTime(timeStr, durationMinutes) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMins
    .toString()
    .padStart(2, "0")}`;
}

// Generate Google Calendar URL
export function generateGoogleCalendarUrl(booking) {
  const startDateTime = formatDateTimeForCalendar(booking.date, booking.time);
  const endTime = calculateEndTime(booking.time, booking.duration);
  const endDateTime = formatDateTimeForCalendar(booking.date, endTime);

  const title = encodeURIComponent(`Appointment at Elite Barber Studio`);
  const details = encodeURIComponent(
    `Services: ${booking.services.join(", ")}\n` +
      `Duration: ${booking.duration} minutes\n` +
      `Total: $${booking.totalPrice}\n\n` +
      `Please arrive 5 minutes early.\n\n` +
      `Elite Barber Studio\n` +
      `123 Main Street, Downtown, NY 10001\n` +
      `Phone: +1 (234) 567-890`
  );
  const location = encodeURIComponent(
    "Elite Barber Studio, 123 Main Street, Downtown, NY 10001"
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}&ctz=${getUserTimezone()}`;
}

// Generate .ics file content
export function generateIcsContent(booking) {
  const startDateTime = formatDateTimeForCalendar(booking.date, booking.time);
  const endTime = calculateEndTime(booking.time, booking.duration);
  const endDateTime = formatDateTimeForCalendar(booking.date, endTime);

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Elite Barber Studio//Booking System//EN
BEGIN:VEVENT
UID:${booking.id || Date.now()}@elitebarberstudio.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART;TZID=${getUserTimezone()}:${startDateTime}
DTEND;TZID=${getUserTimezone()}:${endDateTime}
SUMMARY:Appointment at Elite Barber Studio
DESCRIPTION:Services: ${booking.services.join(", ")}\\nDuration: ${
    booking.duration
  } minutes\\nTotal: $${
    booking.totalPrice
  }\\n\\nPlease arrive 5 minutes early.\\n\\nElite Barber Studio\\n123 Main Street, Downtown, NY 10001\\nPhone: +1 (234) 567-890
LOCATION:Elite Barber Studio, 123 Main Street, Downtown, NY 10001
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder: Appointment at Elite Barber Studio tomorrow
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

// Add to calendar with Google Calendar preference and .ics fallback
export function addToCalendar(booking) {
  try {
    // Try Google Calendar first
    const googleUrl = generateGoogleCalendarUrl(booking);
    window.open(googleUrl, "_blank");
  } catch (error) {
    console.error("Google Calendar failed, trying .ics fallback:", error);
    // Fallback to .ics download
    downloadIcsFile(booking);
  }
}

// Download .ics file
export function downloadIcsFile(booking) {
  const icsContent = generateIcsContent(booking);
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `elite-barber-appointment-${booking.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
