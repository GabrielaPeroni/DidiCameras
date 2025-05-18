const adminButton = document.getElementById('admin-button');

document.addEventListener('keydown', function (e) {
    if (e.shiftKey && e.key === 'A') {
        adminButton.style.display = 'block';
    }
});

document.addEventListener('keyup', function (e) {
    if (e.key === 'A' || e.key === 'Shift') {
        adminButton.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('filter-form');


    flatpickr('#date', {
        dateFormat: "Y-m-d",
        onChange: function (selectedDates, dateStr, instance) {
            if (dateStr) {
                const url = new URL(window.location.href);
                url.searchParams.set('date', dateStr);
                window.location.href = url.toString();
            }
        },
    });
    document.getElementById('search').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            form.submit();
        }
    });
});

