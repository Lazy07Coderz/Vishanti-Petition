const form = document.querySelector("#petition-form");

form.addEventListener("submit", function(event) {
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
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(evidence.type)) {
        alert("Please upload a PDF, JPEG, PNG, or WebP image.");
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

    const petitionData = {
        title: formData.get("title"),
        category: formData.get("category"),
        anonymous: formData.get("anonymous") === "on",
        evidence: formData.get("evidence"),
        description: formData.get("description")
    };

    alert("Petition submitted successfully!");
    form.reset();
    submitButton.disabled = false;
});

    