function triggerForgotPassword() {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/employee/register';

    const empInput = document.querySelector('input[name="employee_number"]');
    const empValue = empInput ? empInput.value : '';

    const hiddenEmp = document.createElement('input');
    hiddenEmp.type = 'hidden';
    hiddenEmp.name = 'employee_number';
    hiddenEmp.value = empValue;

    const hiddenForgot = document.createElement('input');
    hiddenForgot.type = 'hidden';
    hiddenForgot.name = 'forgot';
    hiddenForgot.value = '1';

    form.appendChild(hiddenEmp);
    form.appendChild(hiddenForgot);
    document.body.appendChild(form);
    form.submit();
}

function togglePassword(icon) {
    const input = icon.previousElementSibling;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    }
}


document.addEventListener("DOMContentLoaded", function() {
    const passwordFields = document.querySelectorAll('input[type="password"]');

    passwordFields.forEach(field => {
        field.addEventListener("input", function() {
            const value = field.value;
            let message = "";

            if (value.length < 8) {
                message = "Password must be at least 8 characters.";
            } else if (!/[A-Z]/.test(value)) {
                message = "Password must include at least one uppercase letter.";
            } else if (!/[a-z]/.test(value)) {
                message = "Password must include at least one lowercase letter.";
            } else if (!/[0-9]/.test(value)) {
                message = "Password must include at least one number.";
            }

            const helpText = field.nextElementSibling;
            if (helpText && helpText.classList.contains("agb-help-text")) {
                helpText.textContent = message || "Strong password ✔";
                helpText.style.color = message ? "red" : "green";
            }
        });
    });
});

