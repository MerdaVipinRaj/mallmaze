// assets/js/account.js
// Simple handler for the `.account-btn` element.
// If a dropdown with id="accountDropdown" exists, it toggles visibility.
// Otherwise it redirects to a profile page.

function handleAccountClick(event) {
  event.preventDefault();
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
  } else {
    // Change this URL to the actual profile page you want.
    window.location.href = '/profile.html';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.account-btn');
  if (btn) btn.addEventListener('click', handleAccountClick);
});
