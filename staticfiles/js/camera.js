const adminButton = document.getElementById('admin-button');
const userRole = document.getElementById('user-role');

document.addEventListener('keydown', function (e) {
    if (e.shiftKey && e.key.toLowerCase() === 'f') {
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

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.querySelector('.video-modal');
    const iframe = document.getElementById('webrtcFrame');

    document.querySelectorAll('.play-button').forEach(function (button) {
        if (!button.classList.contains('disabled')) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                const liveUrl = button.getAttribute('data-live-url');
                if (liveUrl) {
                    iframe.src = liveUrl;
                    modal.classList.add('active');
                }
            });
        }
    });

    modal.addEventListener('click', function (e) {
        if (!e.target.closest('.video-modal-content')) {
            modal.classList.remove('active');
            iframe.src = ''; // Limpa o iframe ao fechar
        }
    });
});


function filterByCamera() {
    const selected = document.getElementById("cameraDropdown").value;
    const cards = document.querySelectorAll(".recording-card");

    cards.forEach(card => {
        if (selected === "all" || card.classList.contains(selected)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}