document.querySelectorAll('input[type="number"]').forEach(function(input, index, inputs) {
    input.addEventListener('input', function() {
        if (this.value.length > 0 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });
    input.addEventListener('keydown', function(event) {
        if (event.key === 'Backspace' && this.value.length === 0 && index > 0) {
            inputs[index - 1].focus();
        }
    });
});