document.addEventListener('DOMContentLoaded', () => {
  let timeLeft = 30;
  const timerElement = document.getElementById('timer');
  const originalUrl = getOriginalUrl();
  const quoteElement = document.getElementById('quote');

  const countdown = setInterval(() => {
    timeLeft--;
    timerElement.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(countdown);
      timerElement.textContent = 'Ready to focus?';
    }
  }, 1000);

  document.getElementById('continueBtn').addEventListener('click', () => {
    if (originalUrl) {
      chrome.runtime.sendMessage(
        { action: 'allowTemporarySite', url: originalUrl },
        () => navigateToUrl(originalUrl)
      );
    } else {
      goBack();
    }
  });

  document.getElementById('backBtn').addEventListener('click', goBack);

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  loadQuote(quoteElement);
});

function loadQuote(target) {
  if (!target) return;

  fetchQuote()
    .then((quote) => {
      if (quote) {
        target.textContent = quote;
      }
    })
    .catch(() => {
      target.textContent = getFallbackQuote();
    });
}

async function fetchQuote() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch('https://zenquotes.io/api/random', {
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.q) {
      return `“${data[0].q}” — ${data[0].a || 'Unknown'}`;
    }

    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getFallbackQuote() {
  const quotes = [
    '“Small steps every day add up to big results.” — Unknown',
    '“Focus is saying no to a hundred other good ideas.” — Steve Jobs',
    '“You don\'t have to be extreme, just consistent.” — Unknown',
    '“Discipline is choosing between what you want now and what you want most.” — Unknown',
    '“The future depends on what you do today.” — Mahatma Gandhi'
  ];

  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getOriginalUrl() {
  const params = new URLSearchParams(window.location.search);
  const paramUrl = params.get('original') || params.get('url');
  if (paramUrl) {
    return paramUrl;
  }

  if (document.referrer && !document.referrer.startsWith('chrome-extension://')) {
    return document.referrer;
  }

  return null;
}

function navigateToUrl(url) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      return;
    }
    chrome.tabs.update(tabs[0].id, { url });
  });
}

function goBack() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      return;
    }

    chrome.tabs.goBack(tabs[0].id, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.update(tabs[0].id, { url: 'chrome://newtab/' });
      }
    });
  });
}
