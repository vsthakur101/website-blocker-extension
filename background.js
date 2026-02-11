const TEMP_ALLOW_MINUTES = 10;

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url || isInternalUrl(details.url)) return;

  const hostname = getHostname(details.url);
  if (!hostname) return;

  chrome.storage.session.get(['temporaryAllowList'], (sessionResult) => {
    const allowList = sessionResult.temporaryAllowList || {};
    const now = Date.now();
    const allowUntil = allowList[hostname];

    if (allowUntil && allowUntil > now) {
      return;
    }

    if (allowUntil && allowUntil <= now) {
      delete allowList[hostname];
      chrome.storage.session.set({ temporaryAllowList: allowList });
    }

    chrome.storage.sync.get(['blockedSites'], (result) => {
      const blockedSites = (result.blockedSites || []).map(normalizeSite).filter(Boolean);

      const isBlocked = blockedSites.some(site => {
        if (site.startsWith('*.')) {
          const domain = site.substring(2);
          return hostname === domain || hostname.endsWith('.' + domain);
        }
        return hostname === site || hostname.endsWith('.' + site);
      });

      if (isBlocked) {
        const target = chrome.runtime.getURL(`blocked.html?original=${encodeURIComponent(details.url)}`);
        chrome.tabs.update(details.tabId, { url: target });
      }
    });
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

  if (request.action === 'allowTemporarySite') {
    const hostname = getHostname(request.url || request.hostname);
    if (!hostname) {
      sendResponse({ success: false, error: 'Invalid hostname' });
      return false;
    }

    chrome.storage.session.get(['temporaryAllowList'], (sessionResult) => {
      const allowList = sessionResult.temporaryAllowList || {};
      const expiresAt = Date.now() + TEMP_ALLOW_MINUTES * 60 * 1000;
      allowList[hostname] = expiresAt;
      chrome.storage.session.set({ temporaryAllowList: allowList }, () => {
        sendResponse({ success: true, hostname, expiresAt });
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

function getHostname(value) {
  if (!value) return '';

  try {
    if (value.includes('://')) {
      return new URL(value).hostname.toLowerCase();
    }
  } catch (error) {
    return normalizeSite(value);
  }

  return normalizeSite(value);
}

function isInternalUrl(url) {
  return url.startsWith('chrome-extension://') || url.startsWith('chrome://');
}