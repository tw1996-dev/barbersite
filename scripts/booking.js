function normalizeBookingData(bookings) {
    return bookings.map(booking => ({
        ...booking,
        date: booking.date.split('T')[0], // '2025-09-15T00:00:00.000Z' → '2025-09-15'
        time: booking.time.substring(0, 5)  // '09:00:00' → '09:00'
    }));
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Booking System JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Service data
    const services = {
        'premium-haircut': { name: 'Premium Haircut', duration: 45, price: 35 },
        'beard-trim': { name: 'Beard Trim & Style', duration: 30, price: 25 },
        'hot-towel-shave': { name: 'Hot Towel Shave', duration: 40, price: 40 },
        'head-shave': { name: 'Head Shave', duration: 35, price: 30 },
        'mustache-trim': { name: 'Mustache Trim', duration: 15, price: 15 },
        'haircut-beard-package': { name: 'Haircut + Beard Trim Package', duration: 80, price: 50 }
    };

    // Package combinations for suggestions
    const packages = {
        'haircut-beard': {
            services: ['premium-haircut', 'beard-trim'],
            name: 'Haircut + Beard Trim Package',
            duration: 80,
            price: 50,
            savings: 10
        }
    };

    // Booking state
    let selectedServices = new Set();
    let selectedDate = null;
    let selectedTime = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let currentPackage = null;
    let existingBookings = [];
    let businessHours = {};
    let bookingRefreshInterval;

    // DOM elements
    const serviceCheckboxes = document.querySelectorAll('input[name="services"]');
    const totalDuration = document.getElementById('total-duration');
    const totalPrice = document.getElementById('total-price');
    const packageSuggestion = document.getElementById('package-suggestion');
    const suggestionText = document.getElementById('suggestion-text');
    const applyPackageBtn = document.getElementById('apply-package');
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const timeSlots = document.getElementById('time-slots');
    const selectedDateSpan = document.getElementById('selected-date');
    const timeGrid = document.getElementById('time-grid');
    const bookingForm = document.getElementById('booking-form');
    const confirmBtn = document.getElementById('confirm-booking');

    // Initialize
    init();

    async function init() {
        await loadInitialData();
        setupServiceSelection();
        setupCalendar();
        setupForm();
        updateSummary();
        
        // Start auto-refresh every 5 seconds (faster than admin panel)
        bookingRefreshInterval = setInterval(async () => {
            const success = await refreshExistingBookings();
            // If refresh was successful and we have a selected date, update time slots
            if (success && selectedDate) {
                generateTimeSlots(selectedDate);
            }
        }, 5000);
    }

    // Load data from API
    async function loadInitialData() {
        try {
            // Load existing bookings
            const bookingsResponse = await fetch('/api/bookings');
if (bookingsResponse.ok) {
    const rawBookings = await bookingsResponse.json();
    existingBookings = normalizeBookingData(rawBookings);
}

            // Load business hours
            const hoursResponse = await fetch('/api/business-hours');
            if (hoursResponse.ok) {
                const hoursData = await hoursResponse.json();
                businessHours = {};
                hoursData.forEach(day => {
                    businessHours[day.day_name] = {
                        enabled: day.enabled,
                        open: day.open_time.substring(0, 5),
                        close: day.close_time.substring(0, 5)
                    };
                });
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Check if time slot is available
    function isTimeSlotAvailable(date, time, duration) {
        const endTime = getBookingEndTime(time, duration);
        const newStartMinutes = timeToMinutes(time);
        const newEndMinutes = timeToMinutes(endTime);
        
        const dayBookings = existingBookings.filter(booking => 
            booking.date === date && booking.status === 'confirmed'
        );
        
        for (const booking of dayBookings) {
            const existingStartMinutes = timeToMinutes(booking.time);
            const existingEndTime = getBookingEndTime(booking.time, booking.duration);
            const existingEndMinutes = timeToMinutes(existingEndTime);
            
            if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
                return false;
            }
        }
        
        return true;
    }

    // Helper functions for time calculations
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function getBookingEndTime(startTime, duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    }

    // Refresh bookings from API - with improved error handling
    async function refreshExistingBookings() {
        try {
            const response = await fetch('/api/bookings');
            if (response.ok) {
                const newBookings = await response.json();
                
                // Only update if data actually changed to avoid unnecessary re-renders
                if (JSON.stringify(newBookings) !== JSON.stringify(existingBookings)) {
                    const normalizedBookings = normalizeBookingData(newBookings);
                    existingBookings = normalizedBookings;
                    console.log('Bookings updated:', newBookings.length, 'total bookings');
                    return true;
                }
                return false; // No changes
            }
        } catch (error) {
            console.error('Error refreshing bookings:', error);
        }
        return false;
    }

    // Service Selection Logic
    function setupServiceSelection() {
        serviceCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', handleServiceSelection);
        });

        if (applyPackageBtn) {
            applyPackageBtn.addEventListener('click', applyPackage);
        }
    }

    function handleServiceSelection(event) {
        const triggerId = event.target.id;
        const isChecked = event.target.checked;
        
        if (isChecked) {
            handleConflicts(triggerId);
        }

        updateSelectedServices();
        checkPackageOpportunities();
        updateSummary();
        
        // Re-generate time slots when services change (affects duration)
        if (selectedDate) {
            generateTimeSlots(selectedDate);
        }
        
        validateBooking();
    }

    function handleConflicts(triggerId) {
        const conflicts = {
            'haircut-beard-package': ['premium-haircut', 'beard-trim', 'head-shave'],
            'premium-haircut': ['head-shave', 'haircut-beard-package'],
            'beard-trim': ['haircut-beard-package'],
            'head-shave': ['premium-haircut', 'haircut-beard-package']
        };

        const conflictingServices = conflicts[triggerId] || [];
        
        conflictingServices.forEach(conflictId => {
            const conflictCheckbox = document.getElementById(conflictId);
            if (conflictCheckbox && conflictCheckbox.checked) {
                conflictCheckbox.checked = false;
            }
        });
    }

    function updateSelectedServices() {
        selectedServices.clear();
        serviceCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedServices.add(checkbox.id);
            }
        });
    }

    function checkPackageOpportunities() {
        const hasHaircut = selectedServices.has('premium-haircut');
        const hasBeardTrim = selectedServices.has('beard-trim');
        const hasPackage = selectedServices.has('haircut-beard-package');

        if (hasHaircut && hasBeardTrim && !hasPackage) {
            showPackageSuggestion();
        } else {
            hidePackageSuggestion();
        }
    }

    function showPackageSuggestion() {
        const pkg = packages['haircut-beard'];
        const individualTotal = services['premium-haircut'].price + services['beard-trim'].price;
        suggestionText.textContent = `Save $${pkg.savings}! Get ${pkg.name} for $${pkg.price} instead of $${individualTotal}`;
        packageSuggestion.style.display = 'block';
        currentPackage = 'haircut-beard';
    }

    function hidePackageSuggestion() {
        packageSuggestion.style.display = 'none';
        currentPackage = null;
    }

    function applyPackage() {
        if (!currentPackage) return;

        document.getElementById('premium-haircut').checked = false;
        document.getElementById('beard-trim').checked = false;
        document.getElementById('haircut-beard-package').checked = true;

        updateSelectedServices();
        hidePackageSuggestion();
        updateSummary();
        
        // Re-generate time slots when package is applied (different duration)
        if (selectedDate) {
            generateTimeSlots(selectedDate);
        }
        
        validateBooking();
    }

    function calculateTotals() {
        let totalDur = 0;
        let totalPr = 0;

        selectedServices.forEach(serviceId => {
            const service = services[serviceId];
            if (service) {
                totalDur += service.duration;
                totalPr += service.price;
            }
        });

        return { duration: totalDur, price: totalPr };
    }

    function updateSummary() {
        const totals = calculateTotals();
        totalDuration.textContent = `${totals.duration} min`;
        totalPrice.textContent = `$${totals.price}`;
        
        document.getElementById('final-duration').textContent = `${totals.duration} min`;
        document.getElementById('final-price').textContent = `$${totals.price}`;

        updateSelectedServicesSummary();
    }

    function updateSelectedServicesSummary() {
        const summaryContainer = document.getElementById('selected-services-summary');
        summaryContainer.innerHTML = '';

        if (selectedServices.size === 0) {
            summaryContainer.innerHTML = '<p>No services selected</p>';
            return;
        }

        selectedServices.forEach(serviceId => {
            const service = services[serviceId];
            if (service) {
                const serviceItem = document.createElement('div');
                serviceItem.className = 'selected-service-item';
                serviceItem.innerHTML = `
                    <span>${service.name}</span>
                    <span>${service.duration} min • $${service.price}</span>
                `;
                summaryContainer.appendChild(serviceItem);
            }
        });
    }

    // Calendar Logic
    function setupCalendar() {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });

        renderCalendar();
    }

    function renderCalendar() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        
        calendarMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        calendarGrid.innerHTML = '';

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const dayDate = new Date(currentYear, currentMonth, day);
            dayDate.setHours(0, 0, 0, 0);
            
            if (dayDate < today) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', () => selectDate(dayDate, dayElement));
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    function selectDate(date, element) {
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        element.classList.add('selected');
        selectedDate = date;
        selectedTime = null; // Reset selected time when date changes

        // Clear any previously selected time slots
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });

        showTimeSlots(date);
        validateBooking();
    }

    function showTimeSlots(date) {
        const dateString = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        selectedDateSpan.textContent = dateString;
        timeSlots.style.display = 'block';

        generateTimeSlots(date);
        updateAppointmentDateTime();
    }

    function generateTimeSlots(date) {
        timeGrid.innerHTML = '';
        
        const dayOfWeek = date.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        const dayHours = businessHours[dayName];
        
        if (!dayHours || !dayHours.enabled) {
            timeGrid.innerHTML = '<p style="text-align: center; color: #666;">Closed on this day</p>';
            return;
        }

        const [openHour, openMin] = dayHours.open.split(':').map(Number);
        const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
        const totals = calculateTotals();
        
        if (totals.duration === 0) {
            timeGrid.innerHTML = '<p style="text-align: center; color: #666;">Please select services first</p>';
            return;
        }
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        for (let hour = openHour; hour < closeHour || (hour === closeHour && 0 < closeMin); hour++) {
            for (let minute = (hour === openHour ? openMin : 0); minute < 60; minute += 30) {
                if (hour === closeHour && minute >= closeMin) break;
                
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const displayTime = formatTime(hour, minute);
                
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = displayTime;
                timeSlot.dataset.time = timeString;

const isAvailable = isTimeSlotAvailable(dateStr, timeString, totals.duration, existingBookings);
const endTime = getBookingEndTime(timeString, totals.duration);
const endMinutes = timeToMinutes(endTime);
const closeMinutes = timeToMinutes(closeTime);
const fitsInBusinessHours = endMinutes <= closeMinutes;

// Check if slot is in the past (only for today)
const now = new Date();
const today = new Date().toISOString().split('T')[0];
const isToday = dateStr === today;
const isPastTime = isToday && timeToMinutes(timeString) <= timeToMinutes(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);

if (!isAvailable || !fitsInBusinessHours || isPastTime) {
    timeSlot.classList.add('unavailable');
    if (isPastTime) {
        timeSlot.title = 'This time has already passed';
    } else if (!fitsInBusinessHours) {
        timeSlot.title = 'Service would end after closing time';
    } else {
        timeSlot.title = 'Time slot unavailable due to existing booking';
    }
} else {
    timeSlot.addEventListener('click', () => selectTime(displayTime, timeSlot));
}
timeGrid.appendChild(timeSlot);
            }
        }
    }
    function formatTime(hour, minute) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const displayMinute = minute.toString().padStart(2, '0');
        return `${displayHour}:${displayMinute} ${period}`;
    }

    function selectTime(timeString, element) {
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });

        element.classList.add('selected');
        selectedTime = timeString;

        updateAppointmentDateTime();
        validateBooking();
    }

    function updateAppointmentDateTime() {
        const appointmentDatetime = document.getElementById('appointment-datetime');
        
        if (selectedDate && selectedTime) {
            const dateString = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            appointmentDatetime.textContent = `${dateString} at ${selectedTime}`;
        } else if (selectedDate) {
            const dateString = selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            appointmentDatetime.textContent = `${dateString} - Please select time`;
        } else {
            appointmentDatetime.textContent = 'Please select date and time';
        }
    }

    // Form Logic
    function setupForm() {
        const formInputs = bookingForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', updateCustomerSummary);
            input.addEventListener('blur', validateBooking);
        });

        confirmBtn.addEventListener('click', confirmBooking);
    }

    function updateCustomerSummary() {
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;

        const customerSummary = document.getElementById('customer-summary');
        
        if (firstName || lastName || email || phone) {
            const parts = [];
            if (firstName || lastName) {
                parts.push(`${firstName} ${lastName}`.trim());
            }
            if (email) {
                parts.push(email);
            }
            if (phone) {
                parts.push(phone);
            }
            customerSummary.textContent = parts.join(' • ');
        } else {
            customerSummary.textContent = 'Please fill in your information';
        }

        validateBooking();
    }

    function validateBooking() {
        const hasServices = selectedServices.size > 0;
        const hasDate = selectedDate !== null;
        const hasTime = selectedTime !== null;
        
        const hasRequiredInfo = window.areRequiredFieldsFilled ? window.areRequiredFieldsFilled() : areRequiredFieldsFilledFallback();
        const isFormValid = window.validateBookingForm ? window.validateBookingForm() : validateBookingFormFallback();
        
        const isValid = hasServices && hasDate && hasTime && hasRequiredInfo && isFormValid;
        
        confirmBtn.disabled = !isValid;
    }

    function areRequiredFieldsFilledFallback() {
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        return firstName !== '' && lastName !== '' && email !== '' && phone !== '';
    }

    function validateBookingFormFallback() {
        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return email === '' || emailRegex.test(email);
    }

    async function confirmBooking() {
        if (confirmBtn.disabled) return;

        // Show loading state
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Confirming...';
        confirmBtn.disabled = true;

        try {
            // Final refresh to ensure we have the latest data
            await refreshExistingBookings();
            
            // Final conflict check with fresh data
            const totals = calculateTotals();
            const timeSlotElement = document.querySelector('.time-slot.selected');
            if (!timeSlotElement) {
                alert('Please select a time slot.');
                return;
            }
            
            const selectedTimeSlot = timeSlotElement.dataset.time;
            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            
            if (!isTimeSlotAvailable(dateStr, selectedTimeSlot, totals.duration)) {
                alert('Sorry, this time slot is no longer available. Please select another time.');
                // Refresh time slots to show current availability
                generateTimeSlots(selectedDate);
                return;
            }

            const selectedServicesArray = Array.from(selectedServices);
            const serviceNames = selectedServicesArray.map(serviceId => services[serviceId].name);

            const bookingData = {
                date: dateStr,
                time: selectedTimeSlot,
                customer: `${document.getElementById('first-name').value} ${document.getElementById('last-name').value}`.trim(),
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                services: serviceNames,
                duration: totals.duration,
                price: totals.price,
                status: 'confirmed',
                notes: document.getElementById('notes').value
            };

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            if (response.ok) {
                const newBooking = await response.json();
                alert(`Booking confirmed! Your appointment ID is ${newBooking.id}\n\nServices: ${serviceNames.join(', ')}\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${selectedTime}\nTotal: $${totals.price}`);
                
                // Immediately refresh bookings to show new booking
                await refreshExistingBookings();
                
                // Update time slots to reflect the new booking
                if (selectedDate) {
                    generateTimeSlots(selectedDate);
                }
                
                // Optional: Reset form or redirect
                // resetBookingForm();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Sorry, there was an error creating your booking. Please try again.');
        } finally {
            // Restore button state
            confirmBtn.textContent = originalText;
            validateBooking(); // This will re-enable the button if still valid
        }
    }

    // Cleanup function when page unloads
    window.addEventListener('beforeunload', () => {
        if (bookingRefreshInterval) {
            clearInterval(bookingRefreshInterval);
        }
    });
});