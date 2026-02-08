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
    showStatus('Please enter a website', 'error');
    return;
  }

  chrome.runtime.sendMessage({ action: 'addBlockedSite', site: site }, (response) => {
    if (response.success) {
      input.value = '';
      loadBlockedSites();
      showStatus('Site blocked successfully', 'success');
    } else {
      showStatus(response.error || 'Failed to add site', 'error');
    }
  });
}

function removeSite(site) {
  chrome.runtime.sendMessage({ action: 'removeBlockedSite', site: site }, (response) => {
    if (response.success) {
      loadBlockedSites();
      showStatus('Site unblocked successfully', 'success');
    } else {
      showStatus('Failed to remove site', 'error');
    }
  });
}

function exportSites() {
  chrome.runtime.sendMessage({ action: 'getBlockedSites' }, (response) => {
    const sitesText = response.join('\n');
    const blob = new Blob([sitesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocked-sites.txt';
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Sites exported successfully', 'success');
  });
}

function importSites() {
  const importText = document.getElementById('importText').value.trim();
  
  if (!importText) {
    showStatus('Please enter sites to import', 'error');
    return;
  }

  const sites = importText
    .split('\n')
    .map(site => normalizeSite(site))
    .filter(site => site);
  
  chrome.storage.sync.get(['blockedSites'], (result) => {
    let blockedSites = result.blockedSites || [];
    const newSites = sites.filter(site => !blockedSites.includes(site));
    
    if (newSites.length === 0) {
      showStatus('No new sites to import', 'error');
      return;
    }

    blockedSites = blockedSites.concat(newSites);
    chrome.storage.sync.set({ blockedSites }, () => {
      document.getElementById('importArea').style.display = 'none';
      document.getElementById('importText').value = '';
      loadBlockedSites();
      showStatus(`Imported ${newSites.length} new sites`, 'success');
    });
  });
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadBlockedSites();
  
  document.getElementById('addSiteBtn').addEventListener('click', addSite);
  document.getElementById('siteInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addSite();
    }
  });
  
  document.getElementById('exportBtn').addEventListener('click', exportSites);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importArea').style.display = 'block';
  });
  document.getElementById('importConfirmBtn').addEventListener('click', importSites);
  document.getElementById('importCancelBtn').addEventListener('click', () => {
    document.getElementById('importArea').style.display = 'none';
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const site = e.target.getAttribute('data-site');
      removeSite(site);
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