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

    function init() {
        setupServiceSelection();
        setupCalendar();
        setupForm();
        updateSummary();
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
        
        // Apply conflicts immediately if checking
        if (isChecked) {
            handleConflicts(triggerId);
        }

        updateSelectedServices();
        checkPackageOpportunities();
        updateSummary();
        validateBooking();
    }

    function handleConflicts(triggerId) {
        // Define all conflicts clearly
        const conflicts = {
            'haircut-beard-package': ['premium-haircut', 'beard-trim', 'head-shave'],
            'premium-haircut': ['head-shave', 'haircut-beard-package'],
            'beard-trim': ['haircut-beard-package'],
            'head-shave': ['premium-haircut', 'haircut-beard-package']
        };

        // Get conflicting services for the selected service
        const conflictingServices = conflicts[triggerId] || [];
        
        // Uncheck all conflicting services
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

        // Only suggest package if individual services are selected (not package itself)
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

        // Uncheck individual services
        document.getElementById('premium-haircut').checked = false;
        document.getElementById('beard-trim').checked = false;

        // Check package service
        document.getElementById('haircut-beard-package').checked = true;

        // Update state
        updateSelectedServices();
        hidePackageSuggestion();
        updateSummary();
        validateBooking();
    }

    function calculateTotals() {
        let totalDur = 0;
        let totalPr = 0;

        // Calculate totals based on selected services
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
        
        // Update final summary
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
        
        // Clear calendar
        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const dayDate = new Date(currentYear, currentMonth, day);
            dayDate.setHours(0, 0, 0, 0);
            
            // Disable past dates
            if (dayDate < today) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', () => selectDate(dayDate, dayElement));
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    function selectDate(date, element) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked element
        element.classList.add('selected');
        selectedDate = date;

        // Show time slots
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

        // Generate time slots (9 AM to 6 PM, every 30 minutes)
        generateTimeSlots();
        
        // Update appointment summary
        updateAppointmentDateTime();
    }

    function generateTimeSlots() {
        timeGrid.innerHTML = '';
        
        // Generate time slots from 9:00 AM to 6:00 PM
        for (let hour = 9; hour < 18; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                
                const timeString = formatTime(hour, minute);
                timeSlot.textContent = timeString;
                timeSlot.dataset.time = `${hour}:${minute.toString().padStart(2, '0')}`;

                // For now, all slots are available (will be updated with backend)
                timeSlot.addEventListener('click', () => selectTime(timeString, timeSlot));
                
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
        // Remove previous selection
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked element
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
        
        // Use the validation functions from form-validation.js if available
        const hasRequiredInfo = window.areRequiredFieldsFilled ? window.areRequiredFieldsFilled() : areRequiredFieldsFilledFallback();
        const isFormValid = window.validateBookingForm ? window.validateBookingForm() : validateBookingFormFallback();
        
        const isValid = hasServices && hasDate && hasTime && hasRequiredInfo && isFormValid;
        
        confirmBtn.disabled = !isValid;
    }

    // Fallback validation functions in case form-validation.js isn't loaded yet
    function areRequiredFieldsFilledFallback() {
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        return firstName !== '' && lastName !== '' && email !== '' && phone !== '';
    }

    function validateBookingFormFallback() {
        // Basic validation fallback
        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return email === '' || emailRegex.test(email);
    }

    function confirmBooking() {
        if (confirmBtn.disabled) return;

        // Collect all booking data
        const bookingData = {
            services: Array.from(selectedServices).map(serviceId => ({
                id: serviceId,
                name: services[serviceId].name,
                duration: services[serviceId].duration,
                price: services[serviceId].price
            })),
            date: selectedDate.toISOString().split('T')[0],
            time: selectedTime,
            customer: {
                firstName: document.getElementById('first-name').value,
                lastName: document.getElementById('last-name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                notes: document.getElementById('notes').value
            },
            totals: calculateTotals()
        };

        // For now, just show confirmation (will be replaced with actual booking API)
        showConfirmationMessage(bookingData);
    }

    function showConfirmationMessage(bookingData) {
        const serviceNames = bookingData.services.map(s => s.name).join(', ');
        const message = `Booking confirmed!\n\nServices: ${serviceNames}\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${selectedTime}\nTotal: $${bookingData.totals.price} (${bookingData.totals.duration} min)\n\nCustomer: ${bookingData.customer.firstName} ${bookingData.customer.lastName}\nEmail: ${bookingData.customer.email}\nPhone: ${bookingData.customer.phone}`;
        
        alert(message);
        
        // Reset form (optional)
        // resetBookingForm();
    }

    function resetBookingForm() {
        selectedServices.clear();
        selectedDate = null;
        selectedTime = null;
        currentPackage = null;

        serviceCheckboxes.forEach(cb => cb.checked = false);
        bookingForm.reset();
        
        document.querySelectorAll('.calendar-day.selected, .time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });

        timeSlots.style.display = 'none';
        hidePackageSuggestion();
        updateSummary();
        updateCustomerSummary();
        validateBooking();
    }
});