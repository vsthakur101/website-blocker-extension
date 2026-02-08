function loadBlockedSites() {
  chrome.runtime.sendMessage({ action: 'getBlockedSites' }, (response) => {
    const siteList = document.getElementById('siteList');
    
    if (response.length === 0) {
      siteList.innerHTML = '<div class="empty-message">No blocked sites yet</div>';
      return;
    }

    siteList.innerHTML = response.map(site => `
      <div class="site-item">
        <span>${site}</span>
        <button class="remove-btn" data-site="${site}">Remove</button>
      </div>
    `).join('');
  });
}

function addSite() {
  const input = document.getElementById('siteInput');
  const site = normalizeSite(input.value);
  
  if (!site) {
    alert('Please enter a website');
    return;
  }

  console.log('Adding site:', site);
  chrome.runtime.sendMessage({ action: 'addBlockedSite', site: site }, (response) => {
    console.log('Response:', response);
    if (response && response.success) {
      input.value = '';
      loadBlockedSites();
    } else {
      alert(response?.error || 'Failed to add site');
    }
  });
}

function removeSite(site) {
  chrome.runtime.sendMessage({ action: 'removeBlockedSite', site: site }, (response) => {
    if (response.success) {
      loadBlockedSites();
    } else {
      alert('Failed to remove site');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadBlockedSites();
  
  document.getElementById('addBtn').addEventListener('click', addSite);
  document.getElementById('siteInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addSite();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const site = e.target.getAttribute('data-site');
      if (site) {
        removeSite(site);
      }
    }
  });
});

function normalizeSite(value) {
  const raw = value.trim().toLowerCase();
  if (!raw) return '';

  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0];
  return withoutPath.replace(/^\.+/, '').replace(/\.+$/, '');
}