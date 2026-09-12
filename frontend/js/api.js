/**
 * CanYouHackIT - API Client
 * Frontend utility to communicate with backend API
 */

const API_BASE_URL = 'http://localhost:5000/api';

class CanYouHackITAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.currentStudent = null;
    this.currentBus = null;
  }

  /**
   * Make API request
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (GET, POST, DELETE)
   * @param {object} data - Request body data
   * @returns {Promise} - Response data
   */
  async request(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== HEALTH CHECK ====================

  async checkHealth() {
    return this.request('/health');
  }

  // ==================== BUS ENDPOINTS ====================

  async getAllBuses() {
    return this.request('/buses');
  }

  async getBus(busId) {
    return this.request(`/buses/${busId}`);
  }

  // ==================== BOOKING ENDPOINTS ====================

  async bookBus(busId, studentId) {
    return this.request('/book', 'POST', {
      bus_id: busId,
      student_id: studentId
    });
  }

  async getStudentBookings(studentId) {
    return this.request(`/bookings/${studentId}`);
  }

  async cancelBooking(ticketId) {
    return this.request(`/bookings/${ticketId}`, 'DELETE');
  }

  // ==================== STUDENT ENDPOINTS ====================

  async getStudent(studentId) {
    return this.request(`/students/${studentId}`);
  }

  async getBalance(studentId) {
    return this.request(`/students/${studentId}/balance`);
  }

  async rechargeBalance(studentId, amount) {
    return this.request(`/students/${studentId}/recharge`, 'POST', {
      amount: amount
    });
  }

  // ==================== CONDUCTOR ENDPOINTS ====================

  async verifyTicket(ticketId) {
    return this.request('/conductor/verify', 'POST', {
      ticket_id: ticketId
    });
  }

  // ==================== AUTHENTICATION ENDPOINTS ====================

  async login(rollNumber, password) {
    const response = await this.request('/auth/login', 'POST', {
      roll_number: rollNumber,
      password: password
    });
    
    if (response.status === 'success') {
      this.currentStudent = response.data;
      localStorage.setItem('currentStudent', JSON.stringify(response.data));
    }
    
    return response;
  }

  async register(rollNumber, name, email, phone) {
    return this.request('/auth/register', 'POST', {
      roll_number: rollNumber,
      name: name,
      email: email,
      phone: phone
    });
  }

  // ==================== UTILITY METHODS ====================

  getCurrentStudent() {
    return this.currentStudent || JSON.parse(localStorage.getItem('currentStudent'));
  }

  logout() {
    this.currentStudent = null;
    localStorage.removeItem('currentStudent');
  }

  isLoggedIn() {
    return this.getCurrentStudent() !== null;
  }
}

// Create global instance
const api = new CanYouHackITAPI();

// ==================== UI HELPER FUNCTIONS ====================

/**
 * Display loading state
 */
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="text-center py-4"><span class="material-symbols-outlined animate-spin">refresh</span> Loading...</div>';
  }
}

/**
 * Display error message
 */
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">${message}</div>`;
  }
}

/**
 * Display success message
 */
function showSuccess(message) {
  alert(`✓ ${message}`);
}

/**
 * Load and display all buses
 */
async function loadBuses(containerId = 'buses-container') {
  try {
    showLoading(containerId);
    const response = await api.getAllBuses();
    
    if (response.status === 'success') {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      
      response.data.forEach(bus => {
        const busCard = createBusCard(bus);
        container.appendChild(busCard);
      });
    }
  } catch (error) {
    showError(containerId, `Failed to load buses: ${error.message}`);
  }
}

/**
 * Create bus card HTML element
 */
function createBusCard(bus) {
  const card = document.createElement('div');
  card.className = 'bg-surface-card rounded-xl border border-outline-variant/50 p-space-md md:p-space-lg shadow-md hover:shadow-lg transition-all';
  
  const seatsAvailable = bus.capacity - bus.current_occupancy;
  const occupancyPercent = (bus.current_occupancy / bus.capacity) * 100;
  
  card.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center">
      <!-- Bus Info -->
      <div class="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-outline-variant/40 pb-space-sm lg:pb-0 lg:pr-space-md">
        <span class="text-label-mono-xs font-label-mono-xs text-on-surface-variant block uppercase">Bus Number</span>
        <span class="text-headline-lg font-headline-lg text-primary font-bold">${bus.number}</span>
        <span class="text-label-mono font-label-mono text-xs text-outline block">${bus.registration}</span>
      </div>
      
      <!-- Route Details -->
      <div class="lg:col-span-5 space-y-space-sm">
        <h3 class="text-headline-md font-headline-md text-on-surface font-semibold">${bus.route}</h3>
        <p class="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">schedule</span>
          ${bus.departure_time} → ${bus.arrival_time}
        </p>
        <p class="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">person</span>
          Conductor: ${bus.conductor}
        </p>
      </div>
      
      <!-- Seats & Action -->
      <div class="lg:col-span-4 flex flex-col items-start lg:items-end justify-between gap-space-sm pt-2 lg:pt-0 border-t lg:border-t-0 border-outline-variant/30">
        <div class="w-full lg:text-right">
          <div class="flex lg:justify-end items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-status-mint-glow"></span>
            <span class="text-title-sm font-title-sm text-primary font-bold">${seatsAvailable} / ${bus.capacity} Seats</span>
          </div>
          <!-- Occupancy Meter -->
          <div class="w-full lg:w-48 h-1.5 bg-surface-container-high rounded-full mt-1.5 overflow-hidden ml-auto">
            <div class="h-full bg-status-mint-glow rounded-full" style="width: ${occupancyPercent}%"></div>
          </div>
        </div>
        <button onclick="bookBusSeat('${bus.id}')" class="w-full h-12 bg-primary-container hover:bg-institute-navy-mid text-on-primary font-title-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow">
          <span class="material-symbols-outlined">confirmation_number</span>
          <span>Book Now • ₹${bus.fare}</span>
        </button>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Book a bus seat
 */
async function bookBusSeat(busId) {
  try {
    const student = api.getCurrentStudent();
    
    if (!student) {
      showError('', 'Please login first');
      // Redirect to login page
      window.location.href = 'login.html';
      return;
    }
    
    showSuccess('Processing booking...');
    const response = await api.bookBus(busId, student.roll_number);
    
    if (response.status === 'success') {
      showSuccess(`Booking confirmed! Ticket: ${response.data.ticket_id}`);
      loadBuses(); // Refresh bus list
    } else {
      showError('', response.message);
    }
  } catch (error) {
    showError('', `Booking failed: ${error.message}`);
  }
}

/**
 * Load student's bookings
 */
async function loadStudentBookings(containerId = 'bookings-container') {
  try {
    const student = api.getCurrentStudent();
    
    if (!student) {
      showError(containerId, 'Please login first');
      return;
    }
    
    showLoading(containerId);
    const response = await api.getStudentBookings(student.roll_number);
    
    if (response.status === 'success') {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      
      if (response.data.length === 0) {
        container.innerHTML = '<p class="text-center text-on-surface-variant">No bookings yet</p>';
        return;
      }
      
      response.data.forEach(booking => {
        const bookingCard = createBookingCard(booking);
        container.appendChild(bookingCard);
      });
    }
  } catch (error) {
    showError(containerId, `Failed to load bookings: ${error.message}`);
  }
}

/**
 * Create booking card HTML element
 */
function createBookingCard(booking) {
  const card = document.createElement('div');
  card.className = 'bg-surface-card rounded-xl border border-outline-variant/50 p-space-md md:p-space-lg shadow-md';
  
  const statusClass = booking.status === 'confirmed' 
    ? 'bg-status-mint-subtle text-tertiary-container' 
    : 'bg-status-gold-light text-on-tertiary-fixed';
  
  card.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-label-mono-xs font-label-mono-xs ${statusClass} px-2 py-1 rounded">${booking.status.toUpperCase()}</span>
          <span class="text-title-sm font-title-sm text-primary font-bold">${booking.ticket_id}</span>
        </div>
        <h3 class="text-headline-md font-headline-md text-on-surface font-semibold mb-2">${booking.route}</h3>
        <div class="text-body-sm font-body-sm text-on-surface-variant space-y-1">
          <p><span class="font-semibold">Bus:</span> ${booking.bus_number}</p>
          <p><span class="font-semibold">Time:</span> ${booking.departure_time}</p>
          <p><span class="font-semibold">Fare:</span> ₹${booking.fare}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="cancelBooking('${booking.ticket_id}')" class="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-opacity-90 font-semibold">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Cancel a booking
 */
async function cancelBooking(ticketId) {
  try {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    showSuccess('Cancelling booking...');
    const response = await api.cancelBooking(ticketId);
    
    if (response.status === 'success') {
      showSuccess(`Booking cancelled. Refunded: ₹${response.refunded_amount}`);
      loadStudentBookings(); // Refresh
      loadBuses(); // Refresh buses
    } else {
      showError('', response.message);
    }
  } catch (error) {
    showError('', `Cancellation failed: ${error.message}`);
  }
}

/**
 * Student login
 */
async function studentLogin(rollNumber, password) {
  try {
    showSuccess('Logging in...');
    const response = await api.login(rollNumber, password);
    
    if (response.status === 'success') {
      showSuccess(`Welcome, ${response.data.name}!`);
      window.location.href = '1st.html'; // Redirect to dashboard
    } else {
      showError('', response.message);
    }
  } catch (error) {
    showError('', `Login failed: ${error.message}`);
  }
}

/**
 * Display student profile
 */
async function displayProfile(containerId = 'profile-container') {
  try {
    const student = api.getCurrentStudent();
    
    if (!student) {
      showError(containerId, 'Please login first');
      return;
    }
    
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="bg-surface-card rounded-xl border border-outline-variant/50 p-space-lg">
        <div class="space-y-4">
          <div>
            <span class="text-label-mono-xs font-label-mono-xs text-on-surface-variant">NAME</span>
            <p class="text-headline-md font-headline-md text-on-surface font-bold">${student.name}</p>
          </div>
          <div>
            <span class="text-label-mono-xs font-label-mono-xs text-on-surface-variant">ROLL NUMBER</span>
            <p class="text-body-lg font-body-lg text-on-surface">${student.roll_number}</p>
          </div>
          <div>
            <span class="text-label-mono-xs font-label-mono-xs text-on-surface-variant">EMAIL</span>
            <p class="text-body-lg font-body-lg text-on-surface">${student.email}</p>
          </div>
          <div>
            <span class="text-label-mono-xs font-label-mono-xs text-on-surface-variant">WALLET BALANCE</span>
            <p class="text-headline-lg font-headline-lg text-secondary font-bold">₹${student.balance.toFixed(2)}</p>
          </div>
          <button onclick="logout()" class="w-full py-2 px-4 bg-error text-on-error rounded-lg hover:bg-opacity-90 font-semibold">
            Logout
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    showError(containerId, `Failed to load profile: ${error.message}`);
  }
}

/**
 * Logout
 */
function logout() {
  api.logout();
  window.location.href = 'forgotpassword.html'; // Redirect to login
}

// Auto-run on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check API health
  api.checkHealth().then(() => {
    console.log('✓ API is online');
  }).catch(() => {
    console.warn('⚠ Backend API is not running. Make sure to run: python backend/app.py');
  });
});
