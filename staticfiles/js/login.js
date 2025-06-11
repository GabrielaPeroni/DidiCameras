document.addEventListener("DOMContentLoaded", function () {
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    let passwordVisible = false;

    togglePassword.addEventListener('click', () => {
        passwordVisible = !passwordVisible;
        passwordInput.type = passwordVisible ? 'text' : 'password';

        togglePassword.innerHTML = passwordVisible
            ? `<path d="M17.94 17.94A10.05 10.05 0 0 1 12 20c-7 0-11-8-11-8a21.32 21.32 0 0 1 5.17-5.95"/>
               <path d="M1 1l22 22"/>
               <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>`
            : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
               <circle cx="12" cy="12" r="3"></circle>`;
    });
});