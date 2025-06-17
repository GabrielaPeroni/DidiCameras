const adminButton = document.getElementById('admin-button');
const userRole = document.getElementById('user-role');

document.addEventListener('keydown', function (e) {
    if (e.shiftKey && e.key.toLowerCase() === 'a') {
        adminButton.classList.add('visible');
        adminButton.classList.remove('hidden');

        if (userRole) userRole.textContent = 'Administrador';
    }
});

document.addEventListener('keyup', function (e) {
    if (e.key.toLowerCase() === 'a' || e.key === 'Shift') {
        adminButton.classList.remove('visible');
        adminButton.classList.add('hidden');

        if (userRole) userRole.textContent = 'Visitante';
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

function filterCameras() {
    const selected = document.getElementById('cameraFilter').value;
    const blocks = document.querySelectorAll('.camera-block');
    blocks.forEach(block => {
        if (selected === 'all' || block.dataset.camera === selected) {
            block.style.display = 'block';
        } else {
            block.style.display = 'none';
        }
    });
}