const form = document.querySelector("#petition-form");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(form);

    const petitionData = {
        title: formData.get("title"),
        category: formData.get("category"),
        description: formData.get("description")
    };

    console.log(petitionData);
    alert("Petition submitted successfully!");
    form.reset();
});