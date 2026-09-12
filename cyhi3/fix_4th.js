const fs = require('fs');
const file = 'c:/Users/amash/Desktop/cyhi3/frontend/4th.html';
let data = fs.readFileSync(file, 'utf8');
const idx = data.indexOf('<!-- Micro-interaction: Countdown timer script for OTP -->');
if (idx !== -1) {
  data = data.substring(0, idx + 58) + `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const loginForm = document.getElementById('loginForm');
      const loginError = document.getElementById('loginError');

      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value.trim();
          const password = document.getElementById('password').value;

          try {
            const res = await fetch('http://localhost:3000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
              localStorage.setItem('transit_token', data.token);
              localStorage.setItem('transit_user', JSON.stringify(data.user));
              
              if (data.user.role === 'CONDUCTOR') {
                window.location.href = 'conductor.html';
              } else {
                window.location.href = '1st.html';
              }
            } else {
              loginError.textContent = data.error || 'Login failed';
              loginError.classList.remove('hidden');
            }
          } catch (err) {
            loginError.textContent = 'Network error during login. Make sure the server is running.';
            loginError.classList.remove('hidden');
          }
        });
      }
    });
  </script>
  <script src="state.js"></script>
</body>
</html>
`;
  fs.writeFileSync(file, data);
  console.log('Fixed');
} else {
  console.log('Not found');
}
