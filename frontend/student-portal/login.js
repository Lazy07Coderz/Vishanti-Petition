
const signinTab = document.querySelector("#signin-tab");
const signupTab = document.querySelector("#signup-tab");

const formHeading = document.querySelector("#form-heading");
const formDescription = document.querySelector("#form-description");

const signupFields = document.querySelector("#signup-fields");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

const submitButton = document.querySelector("#submit-button");
const authForm = document.querySelector("#auth-form");
const formMessage = document.querySelector("#form-message");

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
    passwordInput.removeAttribute("minlength");

    submitButton.textContent = "Enter your dashboard →";
    formMessage.textContent = "";
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
    passwordInput.minLength = 8;

    submitButton.textContent = "Create account →";
    formMessage.textContent = "";
});

signinTab.click();

authForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    formMessage.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const submittingSignup = isSignup;

    let url;
    let userData;

    if (submittingSignup) {
        const name = nameInput.value.trim();

        if (name.length < 2) {
            formMessage.textContent =
                "Name must contain at least 2 characters.";
            return;
        }

        if (password.length < 8) {
            formMessage.textContent =
                "Password must contain at least 8 characters.";
            return;
        }

        url = "/api/auth/register";

        userData = {
            name,
            email,
            password
        };

    } else {
        url = "/api/auth/login";

        userData = {
            email,
            password
        };
    }

    submitButton.disabled = true;
    signinTab.disabled = true;
    signupTab.disabled = true;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Authentication failed"
            );
        }

        if (submittingSignup) {
            authForm.reset();
            signinTab.click();

            formMessage.textContent =
                "Registration successful! Please sign in.";

        } else {
            if (!data.token || !data.user?.role) {
                throw new Error("Invalid login response.");
            }

            if (!["STUDENT", "ADMIN"].includes(data.user.role)) {
                throw new Error("Unknown user role.");
            }

            sessionStorage.setItem("authToken", data.token);

            redirectByRole(data.user.role);
        }

    } catch (error) {
        formMessage.textContent = error.message;
        console.error(error);

    } finally {
        submitButton.disabled = false;
        signinTab.disabled = false;
        signupTab.disabled = false;
    }
});

function redirectByRole(role) {
    if (role === "STUDENT") {
        window.location.href = "dashboard.html";

    } else if (role === "ADMIN") {
        window.location.href = "admin.html";
    }
}
