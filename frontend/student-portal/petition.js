
const form = document.querySelector("#petition-form");
const message = document.querySelector("#petition-message");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const title = form.elements["title"].value.trim();

    if (title === "") {
        alert("Please enter a petition title.");
        submitButton.disabled = false;
        return;
    }

    const category = form.elements["category"].value;

    if (category === "") {
        alert("Please select a category.");
        submitButton.disabled = false;
        return;
    }

    const evidence = form.elements["evidence"].files[0];

    if (evidence) {
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(evidence.type)) {
            alert("Please upload a PDF, JPEG or PNG image.");
            submitButton.disabled = false;
            return;
        }

        if (evidence.size > maxSize) {
            alert("Evidence must be 5 MB or smaller.");
            submitButton.disabled = false;
            return;
        }
    }

    const description = form.elements["description"].value.trim();

    if (description === "") {
        alert("Please enter a meaningful description.");
        submitButton.disabled = false;
        return;
    }

    const formData = new FormData(form);

    formData.set("title", title);
    formData.set("description", description);
    formData.set(
        "anonymous",
        String(form.elements["anonymous"].checked)
    );

    try {
        const response = await fetch("/api/complaints", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Submission failed");
        }

        alert(`Petition submitted successfully! ID: ${data._id}`);

        form.reset();

    } catch (error) {
        console.error(error);

    } finally {
        submitButton.disabled = false;
    }
});
