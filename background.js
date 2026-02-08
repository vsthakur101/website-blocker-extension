chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  chrome.storage.sync.get(['blockedSites'], (result) => {
    const blockedSites = (result.blockedSites || []).map(normalizeSite).filter(Boolean);
    const url = new URL(details.url);
    const hostname = url.hostname.toLowerCase();

    const isBlocked = blockedSites.some(site => {
      if (site.startsWith('*.')) {
        const domain = site.substring(2);
        return hostname === domain || hostname.endsWith('.' + domain);
      }
      return hostname === site || hostname.endsWith('.' + site);
    });

    if (isBlocked) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'getBlockedSites') {
    chrome.storage.sync.get(['blockedSites'], (result) => {
      console.log('Getting blocked sites:', result.blockedSites);
      sendResponse(result.blockedSites || []);
    });
    return true;
  }

  if (request.action === 'addBlockedSite') {
    console.log('Adding blocked site:', request.site);
    chrome.storage.sync.get(['blockedSites'], (result) => {
      const blockedSites = result.blockedSites || [];
      if (!blockedSites.includes(request.site)) {
        blockedSites.push(request.site);
        chrome.storage.sync.set({ blockedSites }, () => {
          console.log('Site added successfully');
          sendResponse({ success: true });
        });
      } else {
        console.log('Site already blocked');
        sendResponse({ success: false, error: 'Site already blocked' });
      }
    });
    return true;
  }

  if (request.action === 'removeBlockedSite') {
    console.log('Removing blocked site:', request.site);
    chrome.storage.sync.get(['blockedSites'], (result) => {
      let blockedSites = result.blockedSites || [];
      blockedSites = blockedSites.filter(site => site !== request.site);
      chrome.storage.sync.set({ blockedSites }, () => {
        console.log('Site removed successfully');
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

function normalizeSite(value) {
  if (!value) return '';
  const raw = String(value).trim().toLowerCase();
  if (!raw) return '';

  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0];
  return withoutPath.replace(/^\.+/, '').replace(/\.+$/, '');
}