
(() => {
    "use strict";

    const byId = id => document.getElementById(id);

    const signinTab = byId("signin-tab");
    const signupTab = byId("signup-tab");
    const formHeading = byId("form-heading");
    const formDescription = byId("form-description");
    const signupFields = byId("signup-fields");

    const nameInput = byId("name");
    const emailInput = byId("email");
    const passwordInput = byId("password");

    const submitButton = byId("submit-button");
    const authForm = byId("auth-form");
    const formMessage = byId("form-message");

    let mode = "signin";
    let busy = false;

    function setMode(nextMode) {
        if (busy) return;

        mode = nextMode;

        const isSignup = mode === "signup";

        signinTab.classList.toggle("active", !isSignup);
        signupTab.classList.toggle("active", isSignup);

        signinTab.setAttribute(
            "aria-pressed",
            String(!isSignup)
        );

        signupTab.setAttribute(
            "aria-pressed",
            String(isSignup)
        );

        formHeading.textContent = isSignup
            ? "Create your account."
            : "Welcome to your sanctum.";

        formDescription.textContent = isSignup
            ? "Join your campus community and make your voice heard."
            : "Sign in to manage petitions and follow their progress.";

        signupFields.hidden = !isSignup;
        nameInput.required = isSignup;

        passwordInput.autocomplete = isSignup
            ? "new-password"
            : "current-password";

        if (isSignup) {
            passwordInput.minLength = 8;
        } else {
            passwordInput.removeAttribute("minlength");
        }

        submitButton.textContent = isSignup
            ? "Create account →"
            : "Enter your dashboard →";

        formMessage.textContent = "";
    }

    function redirectByRole(role) {
        if (role === "STUDENT") {
            location.replace("/dashboard.html");

        } else if (role === "ADMIN") {
            location.replace(
                "/admin-portal/admin_overview.html"
            );

        } else {
            throw new Error("Unknown account role");
        }
    }

    signinTab.addEventListener(
        "click",
        () => setMode("signin")
    );

    signupTab.addEventListener(
        "click",
        () => setMode("signup")
    );

    authForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (busy) return;

        formMessage.textContent = "";

        const isSignup = mode === "signup";
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const name = nameInput.value.trim();

        if (isSignup && name.length < 2) {
            formMessage.textContent =
                "Name must contain at least 2 characters.";
            return;
        }

        if (isSignup && (
            password.length < 8 ||
            new TextEncoder().encode(password).length > 72
        )) {
            formMessage.textContent =
                "Password must be at least 8 characters and at most 72 UTF-8 bytes.";
            return;
        }

        busy = true;

        submitButton.disabled = true;
        signinTab.disabled = true;
        signupTab.disabled = true;

        submitButton.textContent = isSignup
            ? "Creating account..."
            : "Signing in...";

        try {
            const response = await fetch(
                isSignup
                    ? "/api/auth/register"
                    : "/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(
                        isSignup
                            ? { name, email, password }
                            : { email, password }
                    )
                }
            );

            const data = await response.json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    `Request failed (${response.status})`
                );
            }

            if (isSignup) {
                authForm.reset();
                mode = "signin";

                formMessage.textContent =
                    "Registration successful! Please sign in.";

            } else {
                if (
                    !data.token ||
                    !["STUDENT", "ADMIN"].includes(data.user?.role)
                ) {
                    throw new Error("Invalid login response");
                }

                sessionStorage.setItem(
                    "authToken",
                    data.token
                );

                redirectByRole(data.user.role);
            }

        } catch (error) {
            console.error("Authentication error:", error);

            formMessage.textContent =
                error.message || "Authentication failed.";

        } finally {
            busy = false;

            submitButton.disabled = false;
            signinTab.disabled = false;
            signupTab.disabled = false;

            if (isSignup && mode === "signin") {
                setMode("signin");

                formMessage.textContent =
                    "Registration successful! Please sign in.";

            } else {
                submitButton.textContent =
                    mode === "signup"
                        ? "Create account →"
                        : "Enter your dashboard →";
            }
        }
    });

    setMode("signin");
})();
