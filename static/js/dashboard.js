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

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.querySelector('.video-modal');
    const videoElement = document.getElementById('webrtcVideo');
    let currentPeerConnection = null;
  
    // Start a WebRTC connection through the webrtcVideo link
    async function startWebRTCStream(cameraName) {
      // If there's one already activated, close and then continue
      if (currentPeerConnection) {
        currentPeerConnection.close();
        currentPeerConnection = null;
      }
  
      try {
        currentPeerConnection = new RTCPeerConnection();
  
        currentPeerConnection.ontrack = function (event) {
          videoElement.srcObject = event.streams[0];
        };
  
        // Create a SDP offer from server
        const offerResponse = await fetch(`/webrtc/start/${cameraName}`);
        if (!offerResponse.ok) throw new Error(`Error while looking through ${cameraName}'s offer`);
        const offer = await offerResponse.json();
  
        await currentPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  
        const answer = await currentPeerConnection.createAnswer();
        await currentPeerConnection.setLocalDescription(answer);
  
        // Send message back to server
        const answerResponse = await fetch(`/webrtc/answer/${cameraName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPeerConnection.localDescription)
        });
  
        if (!answerResponse.ok) throw new Error(`Couldn't send back ${cameraName}'s response`);
  
        // If everything's okay, then show our modal
        modal.classList.add('active');
  
      } catch (error) {
        console.error('Error while starting WebRTC:', error);
      }
    }
  
    // Close WebRTC connection and Modal
    function closeWebRTCModal() {
      modal.classList.remove('active');
      videoElement.srcObject = null;
      if (currentPeerConnection) {
        currentPeerConnection.close();
        currentPeerConnection = null;
      }
    }
  
    // Apply for every active play button
    document.querySelectorAll('.play-button').forEach(function (button) {
      if (!button.classList.contains('disabled')) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          const cameraCard = button.closest('.recording-card');
          if (cameraCard) {
            const cameraName = cameraCard.querySelector('.camera-id')?.innerText?.trim();
            if (cameraName) {
              startWebRTCStream(cameraName);
            } else {
              console.warn('Did you forgot to specify a Cam name? Couldnt find one.');
            }
          }
        });
      }
    });
  
    modal.addEventListener('click', function (e) {
      if (!e.target.closest('.video-modal-content')) {
        closeWebRTCModal();
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
