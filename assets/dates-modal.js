
    const openBtn = document.getElementById('openModal');
    const modalContainer = document.getElementById('modalContainer');
    const modalBox = document.getElementById('modalBox');
    const closeBtn = document.getElementById('modalClose');

    openBtn.addEventListener('click', () => {
      modalContainer.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
      modalContainer.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        modalContainer.style.display = 'none';
      }
    });

