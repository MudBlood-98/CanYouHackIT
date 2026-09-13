/**
 * IIITDMJ Transit - Navigation & Routing Configuration
 * Centralized navigation links for consistent navigation across all pages
 */

const navigationConfig = {
  // Student pages
  student: {
    dashboard: "1st.html",
    sampleTicket: "2nd.html",
    payments: "3rd.html",
    helpCenter: "index.html",
    account: "account.html",
    notifications: "notifications.html"
  },
  
  // Conductor pages
  conductor: {
    scanner: "conductor.html",
    passes: "conductor_passes.html"
  },
  
  // Auth pages
  auth: {
    forgotPassword: "forgotpassword.html"
  }
};

/**
 * Get navigation link by category and page
 * @param {string} category - student, conductor, auth
 * @param {string} page - page name
 * @returns {string} - page URL
 */
function getNavLink(category, page) {
  return navigationConfig[category]?.[page] || "#";
}

/**
 * Check if current page is active (for highlighting nav links)
 * @param {string} href - link href to check
 * @returns {boolean}
 */
function isCurrentPage(href) {
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  const checkFile = href.split('/').pop();
  return currentFile === checkFile;
}

/**
 * Update active nav link styling
 */
function updateActiveNavLink() {
  document.querySelectorAll('a[data-nav-link]').forEach(link => {
    const href = link.getAttribute('href');
    if (isCurrentPage(href)) {
      link.classList.add('active', 'border-b-2', 'border-transit-blue-glow', 'text-transit-blue-glow', 'dark:text-secondary-fixed');
      link.classList.remove('text-on-primary-container', 'dark:text-outline-variant');
    } else {
      link.classList.remove('active', 'border-b-2', 'border-transit-blue-glow', 'text-transit-blue-glow', 'dark:text-secondary-fixed');
      link.classList.add('text-on-primary-container', 'dark:text-outline-variant');
    }
  });
}

// Auto-update active links on page load
document.addEventListener('DOMContentLoaded', () => {
  updateActiveNavLink();
});
