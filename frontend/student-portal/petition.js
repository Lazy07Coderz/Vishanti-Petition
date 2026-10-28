
(() => {
    "use strict";

    const form = document.getElementById("petition-form");
    const message = document.getElementById("petition-message");
    const submitButton = document.getElementById("submit-petition");

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    const categories = [
        "Academics",
        "Hostel & Facilities",
        "Library",
        "Other"
    ];

    const allowedTypes = {
        "application/pdf": [".pdf"],
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"]
    };

    if (!form || !message || !submitButton) {
        console.error("Petition form elements are missing.");
        return;
    }

    function showMessage(text, isError = false) {
        message.replaceChildren();
        message.textContent = text;

        message.style.color = isError
            ? "#b42318"
            : "#176b42";
    }

    function redirectToLogin() {
        sessionStorage.removeItem("authToken");
        window.location.replace("login.html");
    }

    function validateEvidence(file) {
        if (!file) {
            return null;
        }

        const extensions = allowedTypes[file.type];
        const filename = file.name.toLowerCase();

        if (
            !extensions ||
            !extensions.some(ext => filename.endsWith(ext))
        ) {
            return "Only JPG, PNG and PDF files are allowed.";
        }

        if (file.size > MAX_FILE_SIZE) {
            return "Evidence must be 5 MB or smaller.";
        }

        return null;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (submitButton.disabled) {
            return;
        }

        message.replaceChildren();

        const token = sessionStorage.getItem("authToken");

        if (!token) {
            redirectToLogin();
            return;
        }

        const title = form.elements["title"].value.trim();

        const category = form.elements["category"].value;

        const description =
            form.elements["description"].value.trim();

        const anonymous =
            form.elements["anonymous"].checked;

        const evidence =
            form.elements["evidence"].files[0];

        if (!title || title.length > 100) {
            showMessage(
                "Please enter a valid petition title (maximum 100 characters).",
                true
            );
            return;
        }

        if (!categories.includes(category)) {
            showMessage(
                "Please select a valid category.",
                true
            );
            return;
        }

        if (!description || description.length > 2000) {
            showMessage(
                "Please enter a description (maximum 2000 characters).",
                true
            );
            return;
        }

        const fileError = validateEvidence(evidence);

        if (fileError) {
            showMessage(fileError, true);
            return;
        }

        const formData = new FormData(form);

        formData.set("title", title);
        formData.set("category", category);
        formData.set("description", description);
        formData.set("anonymous", String(anonymous));

        formData.delete("priority");

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        showMessage("Submitting your petition...");

        try {
            const response = await fetch("/api/complaints", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json()
                .catch(() => ({}));

            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            if (response.status === 403) {
                throw new Error(
                    "Only student accounts can file petitions."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    `Submission failed (${response.status})`
                );
            }

            if (!data._id) {
                throw new Error(
                    "The server did not return a petition reference. Check your dashboard before submitting again."
                );
            }

            form.reset();

            showMessage(
                `Petition submitted successfully! Reference: ${data._id}.`
            );

            const link = document.createElement("a");

            link.href =
                `petition-details.html?id=${encodeURIComponent(data._id)}`;

            link.textContent = "View your petition";

            message.append(
                document.createTextNode(" "),
                link
            );

        } catch (error) {
            console.error("Petition submission error:", error);

            showMessage(
                error.message ||
                "Something went wrong. Please try again.",
                true
            );

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Petition";
        }
    });
})();
