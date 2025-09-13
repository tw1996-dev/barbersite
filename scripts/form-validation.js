// Form Validation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    // Initialize validation
    setupValidation();

    function setupValidation() {
        if (firstNameInput) setupNameValidation(firstNameInput, 'first');
        if (lastNameInput) setupNameValidation(lastNameInput, 'last');
        if (emailInput) setupEmailValidation();
        if (phoneInput) setupPhoneValidation();
    }

    // Name validation (First Name / Last Name)
    function setupNameValidation(input, type) {
        input.addEventListener('input', function(e) {
            let value = e.target.value;
            
            // Remove all non-letter characters (including numbers, special chars, spaces)
            let cleanedValue = value.replace(/[^a-zA-Z]/g, '');
            
            // Limit length to 16 characters
            if (cleanedValue.length > 16) {
                cleanedValue = cleanedValue.substring(0, 16);
            }
            
            // Update input value if it changed
            if (e.target.value !== cleanedValue) {
                e.target.value = cleanedValue;
            }
            
            validateNameField(input, cleanedValue, type);
        });

        // Also validate on blur
        input.addEventListener('blur', function(e) {
            validateNameField(input, e.target.value, type);
        });
    }

    function validateNameField(input, value, type) {
        const isValid = value.length >= 2 && value.length <= 16 && /^[a-zA-Z]+$/.test(value);
        
        updateFieldValidation(input, isValid);
        
        return isValid;
    }

    // Email validation
    function setupEmailValidation() {
        emailInput.addEventListener('input', function(e) {
            validateEmailField(e.target);
        });

        emailInput.addEventListener('blur', function(e) {
            validateEmailField(e.target);
        });
    }

    function validateEmailField(input) {
        const value = input.value.trim();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isValid = value === '' || emailRegex.test(value);
        
        updateFieldValidation(input, isValid);
        
        return isValid && value !== '';
    }

    // Phone validation
    function setupPhoneValidation() {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value;
            
            // Remove all non-digit characters
            let cleanedValue = value.replace(/\D/g, '');
            
            // Remove leading zeros
            cleanedValue = cleanedValue.replace(/^0+/, '');
            
            // Limit to 9 digits
            if (cleanedValue.length > 9) {
                cleanedValue = cleanedValue.substring(0, 9);
            }
            
            // Update input value if it changed
            if (e.target.value !== cleanedValue) {
                e.target.value = cleanedValue;
            }
            
            validatePhoneField(phoneInput, cleanedValue);
        });

        phoneInput.addEventListener('blur', function(e) {
            validatePhoneField(phoneInput, e.target.value);
        });
    }

    function validatePhoneField(input, value) {
        // Must be exactly 9 digits, cannot start with 0
        const isValid = value.length === 9 && /^[1-9]\d{8}$/.test(value);
        
        updateFieldValidation(input, isValid);
        
        return isValid;
    }

    // Visual feedback for validation
    function updateFieldValidation(input, isValid) {
        const formGroup = input.closest('.form-group');
        
        if (!formGroup) return;

        // Remove existing validation classes
        formGroup.classList.remove('valid', 'invalid');
        
        // Add appropriate class if field has content
        if (input.value.trim() !== '') {
            if (isValid) {
                formGroup.classList.add('valid');
            } else {
                formGroup.classList.add('invalid');
            }
        }
    }

    // Public validation function for external use
    window.validateBookingForm = function() {
        let isFormValid = true;

        // Validate first name
        if (firstNameInput) {
            const firstNameValid = validateNameField(firstNameInput, firstNameInput.value, 'first');
            isFormValid = isFormValid && firstNameValid;
        }

        // Validate last name
        if (lastNameInput) {
            const lastNameValid = validateNameField(lastNameInput, lastNameInput.value, 'last');
            isFormValid = isFormValid && lastNameValid;
        }

        // Validate email
        if (emailInput) {
            const emailValid = validateEmailField(emailInput);
            isFormValid = isFormValid && emailValid;
        }

        // Validate phone
        if (phoneInput) {
            const phoneValid = validatePhoneField(phoneInput, phoneInput.value);
            isFormValid = isFormValid && phoneValid;
        }

        return isFormValid;
    };

    // Check if all required fields are filled and valid
    window.areRequiredFieldsFilled = function() {
        const firstName = firstNameInput ? firstNameInput.value.trim() : '';
        const lastName = lastNameInput ? lastNameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';

        return firstName !== '' && lastName !== '' && email !== '' && phone !== '';
    };
});