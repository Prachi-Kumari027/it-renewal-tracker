const openBtn   = document.getElementById('openFormBtn');
const cancelBtn = document.getElementById('cancelFormBtn');
const overlay   = document.getElementById('addVendorModal');

openBtn.addEventListener('click', function () {
  overlay.classList.add('open');
});

cancelBtn.addEventListener('click', function () {
  overlay.classList.remove('open');
});

overlay.addEventListener('click', function (event) {
  if (event.target === overlay) {
    overlay.classList.remove('open');
  }
});