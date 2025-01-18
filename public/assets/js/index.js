document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(event) {
            const fileInput = form.querySelector('input[type="file"]');
            if (fileInput && !fileInput.files.length) {
                event.preventDefault();
                alert('Please select a file before submitting the form.');
            }
        });
    }
});