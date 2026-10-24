const signinTab = document.querySelector("#signin-tab");
const signupTab = document.querySelector("#signup-tab");

const formHeading = document.querySelector("#form-heading");
const formDescription = document.querySelector("#form-description");

const signupFields = document.querySelector("#signup-fields");
const nameInput = document.querySelector("#name");

const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#submit-button");

let isSignup = false;

signinTab.addEventListener("click", function() {
    isSignup = false;

    signinTab.classList.add("active");
    signupTab.classList.remove("active");

    formHeading.textContent = "Welcome to your sanctum.";
    formDescription.textContent =
        "Sign in to manage petitions and follow their progress.";

    signupFields.hidden = true;
    nameInput.required = false;

    passwordInput.autocomplete = "current-password";
    passwordInput.minLength = 10;

    submitButton.textContent = "Enter your dashboard →";
});

signupTab.addEventListener("click", function() {
    isSignup = true;

    signupTab.classList.add("active");
    signinTab.classList.remove("active");

    formHeading.textContent = "Create your account.";
    formDescription.textContent =
        "Join your campus community and make your voice heard.";

    signupFields.hidden = false;
    nameInput.required = true;

    passwordInput.autocomplete = "new-password";
    passwordInput.minLength = 10;

    submitButton.textContent = "Create account →";
});

const authForm = document.querySelector("#auth-form");
const formMessage = document.querySelector("#form-message");

authForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    formMessage.textContent = "";

    const email = document.querySelector("#email").value.trim();
    const password = passwordInput.value;

    if (isSignup) {
        const name = nameInput.value.trim();

        if (!name) {
            formMessage.textContent = "Please enter your full name.";
            return;
        }

        console.log("Registration form submitted:", { name, email });
        formMessage.textContent =
            "Registration form is ready for backend integration.";

    } else {
        console.log("Login form submitted:", { email });
        formMessage.textContent =
            "Login form is ready for backend integration.";
    }
});

function redirectByRole(role) {
    if (role === "student") {
        window.location.href = "dashboard.html";
    } else if (role === "admin") {
        window.location.href = "admin.html";
    } else {
        formMessage.textContent = "Unknown user role.";
    }
}