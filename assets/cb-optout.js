
  document.addEventListener('DOMContentLoaded', function () {
    const pauseDateField = document.getElementById('pause-date-field');
    const pauseDateInput = document.getElementById('pause-date');
    const optOutRadios = document.querySelectorAll('input[name="contact[optout_type]"]');

    function updatePauseDateVisibility() {
      const selected = document.querySelector('input[name="contact[optout_type]"]:checked');
      if (selected && selected.value === 'Pause Until') {
        pauseDateField.classList.remove('hidden');
        pauseDateInput.setAttribute('required', 'required');
      } else {
        pauseDateField.classList.add('hidden');
        pauseDateInput.removeAttribute('required');
      }
    }

    // Add change listeners to the toggle radios
    optOutRadios.forEach(function (radio) {
      radio.addEventListener('change', updatePauseDateVisibility);
    });

    // Run on page load
    updatePauseDateVisibility();
  });

