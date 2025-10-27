// ===========================
// Theme Management
// ===========================

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);

// Toggle theme on button click
themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Add a smooth transition effect
  html.style.transition = 'background-color 0.3s ease';
  setTimeout(() => {
    html.style.transition = '';
  }, 300);
});

// ===========================
// Tab Management
// ===========================

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Load saved tab or default to 'board'
const savedTab = localStorage.getItem('activeTab') || 'board';
switchTab(savedTab);

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    switchTab(tabName);
    localStorage.setItem('activeTab', tabName);
  });
});

function switchTab(tabName) {
  // Update tab buttons
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update tab contents
  tabContents.forEach(content => {
    if (content.id === `${tabName}Tab`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// ===========================
// Sub-Tab Management (Issues/PRs)
// ===========================

const subTabButtons = document.querySelectorAll('.sub-tab-button');
const subTabContents = document.querySelectorAll('.sub-tab-content');

subTabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const subtabName = button.getAttribute('data-subtab');

    // Update sub-tab buttons
    subTabButtons.forEach(btn => {
      if (btn.getAttribute('data-subtab') === subtabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update sub-tab contents
    subTabContents.forEach(content => {
      if (content.id === `${subtabName}Content`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  });
});

// ===========================
// Modal Management
// ===========================

const addRepoButton = document.getElementById('addRepoButton');
const emptyStateAddRepo = document.getElementById('emptyStateAddRepo');
const modal = document.getElementById('addRepoModal');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalOverlay = modal.querySelector('.modal-overlay');

// Open modal
function openModal() {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

addRepoButton.addEventListener('click', openModal);
if (emptyStateAddRepo) {
  emptyStateAddRepo.addEventListener('click', openModal);
}
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal();
  }
});

// ===========================
// Search Functionality
// ===========================

const searchInput = document.querySelector('.search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const repoCards = document.querySelectorAll('.repo-card');

    repoCards.forEach(card => {
      const repoName = card.querySelector('.repo-name').textContent.toLowerCase();
      const repoDescription = card.querySelector('.repo-description')?.textContent.toLowerCase() || '';
      const topics = Array.from(card.querySelectorAll('.topic-tag'))
        .map(tag => tag.textContent.toLowerCase())
        .join(' ');

      const matches = repoName.includes(searchTerm) ||
                     repoDescription.includes(searchTerm) ||
                     topics.includes(searchTerm);

      if (matches) {
        card.style.display = 'flex';
        card.style.animation = 'fadeIn 0.3s ease-out';
      } else {
        card.style.display = 'none';
      }
    });

    // Update column counts
    updateColumnCounts();
  });
}

// ===========================
// Column Count Updates
// ===========================

function updateColumnCounts() {
  const columns = document.querySelectorAll('.kanban-column');

  columns.forEach(column => {
    const visibleCards = column.querySelectorAll('.repo-card:not([style*="display: none"])');
    const count = visibleCards.length;
    const countElement = column.querySelector('.column-count');
    if (countElement) {
      countElement.textContent = count;
    }
  });
}

// ===========================
// Sort Functionality
// ===========================

const sortSelects = document.querySelectorAll('.control-select');
if (sortSelects.length > 1) {
  const sortSelect = sortSelects[1]; // Second select is the sort select
  sortSelect.addEventListener('change', (e) => {
    const sortOrder = e.target.value;
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(column => {
      const content = column.querySelector('.column-content');
      const cards = Array.from(content.querySelectorAll('.repo-card'));

      if (sortOrder.includes('名前')) {
        cards.sort((a, b) => {
          const nameA = a.querySelector('.repo-name').textContent;
          const nameB = b.querySelector('.repo-name').textContent;
          return nameA.localeCompare(nameB);
        });
      } else if (sortOrder.includes('スター数')) {
        cards.sort((a, b) => {
          const starsA = parseInt(a.querySelector('.repo-stars span')?.textContent || '0');
          const starsB = parseInt(b.querySelector('.repo-stars span')?.textContent || '0');
          return starsB - starsA;
        });
      } else {
        // Default: Last Updated (reverse current order as demo)
        cards.reverse();
      }

      // Re-append cards in new order
      cards.forEach(card => content.appendChild(card));
    });
  });
}

// ===========================
// Card Click Handling
// ===========================

const repoCards = document.querySelectorAll('.repo-card');
repoCards.forEach(card => {
  card.addEventListener('click', (e) => {
    // Prevent navigation if clicking on buttons or links directly
    if (e.target.tagName === 'A' || e.target.closest('button')) {
      return;
    }

    const link = card.querySelector('.repo-name');
    console.log('Would navigate to:', link.textContent);
    // In a real app, this would open the GitHub URL
    // window.open(link.href, '_blank');
  });
});

// Hide button functionality
const hideButtons = document.querySelectorAll('.hide-button');
hideButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = button.closest('.repo-card');
    if (card && confirm('このリポジトリを非表示にしますか？')) {
      card.style.display = 'none';
      updateColumnCounts();
    }
  });
});

// ===========================
// Update Item Click Handling
// ===========================

const updateItems = document.querySelectorAll('.update-item');
updateItems.forEach(item => {
  item.addEventListener('click', (e) => {
    // Prevent navigation if clicking on links directly
    if (e.target.tagName === 'A') {
      return;
    }

    const link = item.querySelector('.update-title');
    console.log('Would navigate to:', link.textContent);
    // In a real app, this would open the GitHub issue/PR URL
    // window.open(link.href, '_blank');
  });
});

// ===========================
// Keyboard Shortcuts
// ===========================

document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + K to focus search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Cmd/Ctrl + D to toggle theme
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault();
    themeToggle.click();
  }

  // Cmd/Ctrl + 1/2 to switch tabs
  if ((e.metaKey || e.ctrlKey) && e.key === '1') {
    e.preventDefault();
    switchTab('board');
    localStorage.setItem('activeTab', 'board');
  }

  if ((e.metaKey || e.ctrlKey) && e.key === '2') {
    e.preventDefault();
    switchTab('updates');
    localStorage.setItem('activeTab', 'updates');
  }
});

// ===========================
// Smooth Scroll
// ===========================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ===========================
// Initialize
// ===========================

console.log('GitHub Dashboard Demo initialized');
console.log('Keyboard shortcuts:');
console.log('- Cmd/Ctrl + K: Focus search');
console.log('- Cmd/Ctrl + D: Toggle theme');
console.log('- Cmd/Ctrl + 1: Switch to Board tab');
console.log('- Cmd/Ctrl + 2: Switch to Updates tab');
console.log('\nFeatures:');
console.log('- Tab navigation (Board / Updates)');
console.log('- Sub-tabs for Issues/PRs');
console.log('- Add repository modal');
console.log('- Search and sort functionality');
console.log('- Dark mode support');
console.log('- Tab state persistence');
