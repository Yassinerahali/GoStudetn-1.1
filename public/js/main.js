const apiBase = '/api';

const getToken = () => localStorage.getItem('transportToken');
const getUser = () => JSON.parse(localStorage.getItem('transportUser')) || null;
const getPinkMode = () => localStorage.getItem('goStudentPinkMode') === 'on';
const getDarkMode = () => localStorage.getItem('goStudentDarkMode') === 'on';

let currentLang = localStorage.getItem('goStudentLang') || 'fr'; // Default to French

const setLanguage = (lang) => {
  currentLang = lang;
  localStorage.setItem('goStudentLang', lang);
  translatePage();
  // Update document lang attribute
  document.documentElement.lang = lang;
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
  // Update active button
  document.querySelectorAll('.lang-selector button, .auth-lang-row button').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`lang-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');
};

window.setLanguage = setLanguage;

const translatePage = () => {
  if (typeof translations === 'undefined') return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = translations[currentLang] && translations[currentLang][key];
    if (translation) {
      el.textContent = translation;
    }
  });
  // Also translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = translations[currentLang] && translations[currentLang][key];
    if (translation) {
      el.placeholder = translation;
    }
  });
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const showMessage = (elementId, message, isError = true) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? '#c53030' : '#247a1f';
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return { message: text || 'Unexpected server response.' };
};

const initials = (value) => {
  if (!value) return 'GS';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const formatDateLabel = (date, time) => {
  const parsedDate = date ? new Date(date) : null;
  const displayDate = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Date a confirmer';
  return `${displayDate}, ${time || '--:--'}`;
};

const initializePinkModeToggle = () => {
  const pinkToggle = document.getElementById('pinkModeToggle');
  const isPink = getPinkMode();

  document.body.classList.toggle('option-pink', isPink);

  if (!pinkToggle) return;

  pinkToggle.checked = isPink;
  pinkToggle.addEventListener('change', () => {
    const enabled = pinkToggle.checked;
    document.body.classList.toggle('option-pink', enabled);
    localStorage.setItem('goStudentPinkMode', enabled ? 'on' : 'off');
    fetchTrips();
  });
};

const updateDarkModeButtonText = (button, enabled) => {
  if (!button) return;
  button.textContent = enabled ? 'Mode Clair' : 'Mode Sombre';
};

const initializeDarkModeToggle = () => {
  const darkToggle = document.getElementById('darkModeToggle');
  const isDark = getDarkMode();

  document.body.classList.toggle('dark-mode', isDark);

  if (!darkToggle) return;

  updateDarkModeButtonText(darkToggle, isDark);
  darkToggle.addEventListener('click', () => {
    const enabled = !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', enabled);
    localStorage.setItem('goStudentDarkMode', enabled ? 'on' : 'off');
    updateDarkModeButtonText(darkToggle, enabled);
  });
};

const updateStoredUser = (user) => {
  if (!user) return;
  const stored = getUser();
  const merged = { ...stored, ...user };
  localStorage.setItem('transportUser', JSON.stringify(merged));
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const updateWalletDisplay = (balance) => {
  const walletBalanceElement = document.getElementById('walletBalance');
  if (walletBalanceElement) {
    walletBalanceElement.textContent = `Solde du portefeuille : ${balance.toFixed(2)} MAD`;
  }
};

const updateDriverWalletDisplay = (availableBalance, holdingBalance = 0) => {
  const formattedText = `Disponible: ${Number(availableBalance || 0).toFixed(2)} MAD | En attente: ${Number(holdingBalance || 0).toFixed(2)} MAD`;
  const walletBalanceElement = document.getElementById('driverWalletBalance');
  if (walletBalanceElement) {
    walletBalanceElement.textContent = formattedText;
  }
  const sharedWalletElement = document.getElementById('walletBalance');
  if (sharedWalletElement) {
    sharedWalletElement.textContent = formattedText;
  }
};

const normalizeWalletPayload = (payload) => ({
  walletBalance: Number(payload?.walletBalance || 0),
  driverAvailableBalance: Number(payload?.driverAvailableBalance ?? payload?.walletBalance ?? 0),
  driverHoldingBalance: Number(payload?.driverHoldingBalance || 0),
});

const getMoroccoMapCities = () => {
  if (window.MoroccoTripMap?.cities?.length) return window.MoroccoTripMap.cities;
  return [
    'Casablanca',
    'Rabat',
    'Marrakech',
    'Fes',
    'Tanger',
    'Agadir',
    'Meknes',
    'Oujda',
    'Kenitra',
    'El Jadida',
    'Safi',
    'Nador',
    'Ouarzazate',
    'Errachidia',
    'Tetouan',
    'Laayoune',
    'Beni Mellal',
    'Essaouira',
    'Dakhla',
  ];
};

const populateDriverCitySelects = () => {
  const departureSelect = document.getElementById('departureCity');
  const destinationSelect = document.getElementById('destinationCity');
  if (!departureSelect || !destinationSelect) return;

  const cities = getMoroccoMapCities();
  const fillSelect = (select, placeholder) => {
    const currentValue = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    cities.forEach((city) => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    });
    if (cities.includes(currentValue)) select.value = currentValue;
  };

  const syncDisabledCities = () => {
    Array.from(departureSelect.options).forEach((option) => {
      option.disabled = !!option.value && option.value === destinationSelect.value;
    });
    Array.from(destinationSelect.options).forEach((option) => {
      option.disabled = !!option.value && option.value === departureSelect.value;
    });
  };

  fillSelect(departureSelect, 'Departure city');
  fillSelect(destinationSelect, 'Destination city');
  departureSelect.addEventListener('change', syncDisabledCities);
  destinationSelect.addEventListener('change', syncDisabledCities);
  syncDisabledCities();
};

const fetchWalletBalance = async () => {
  if (!getToken()) return null;
  try {
    const response = await fetch(`${apiBase}/auth/wallet`, { headers: authHeaders() });
    const data = await parseResponseBody(response);
    if (!response.ok) return null;
    return normalizeWalletPayload(data);
  } catch (error) {
    return null;
  }
};

const fetchWalletTopUpHistory = async () => {
  if (!getToken()) return [];
  try {
    const response = await fetch(`${apiBase}/auth/wallet/history`, { headers: authHeaders() });
    const data = await parseResponseBody(response);
    if (!response.ok || !Array.isArray(data)) return [];
    return data;
  } catch (error) {
    return [];
  }
};

const fetchStudentBookingsHistory = async () => {
  if (!getToken()) return [];
  try {
    const response = await fetch(`${apiBase}/bookings/student`, { headers: authHeaders() });
    const data = await parseResponseBody(response);
    if (!response.ok || !Array.isArray(data)) return [];
    return data;
  } catch (error) {
    return [];
  }
};

const fetchLoyaltyPoints = async () => {
  const response = await fetch(`${apiBase}/auth/loyalty/points`, { headers: authHeaders() });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load loyalty points.');
  }
  return payload;
};

const fetchLoyaltyRewards = async () => {
  const response = await fetch(`${apiBase}/auth/loyalty/rewards`, { headers: authHeaders() });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load rewards.');
  }
  return payload;
};

const redeemLoyaltyReward = async (rewardId) => {
  const response = await fetch(`${apiBase}/auth/loyalty/redeem`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ rewardId }),
  });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to redeem reward.');
  }
  return payload;
};

const renderLoyaltySection = (pointsPayload, rewardsPayload) => {
  const pointsText = document.getElementById('loyaltyPointsText');
  const motivation = document.getElementById('loyaltyMotivation');
  const progressBar = document.getElementById('loyaltyProgressBar');
  const progressText = document.getElementById('loyaltyProgressText');
  const rewardsList = document.getElementById('loyaltyRewardsList');
  if (!pointsText || !progressBar || !progressText || !rewardsList) return;

  const currentPoints = Number(pointsPayload?.loyaltyPoints || 0);
  const loyaltyDhPerPoint = Number(pointsPayload?.loyaltyDhPerPoint || 50);
  const loyaltyDhProgress = Number(pointsPayload?.loyaltyDhProgress || 0);
  const progressPercent = Math.max(0, Math.min(100, Math.round((loyaltyDhProgress / loyaltyDhPerPoint) * 100)));

  pointsText.textContent = `Points: ${currentPoints}`;
  if (motivation) {
    motivation.textContent = pointsPayload?.motivationalText || 'Plus vous voyagez, plus vous gagnez !';
  }
  progressBar.style.width = `${progressPercent}%`;
  progressText.textContent = `${loyaltyDhProgress.toFixed(2)} DH / ${loyaltyDhPerPoint} DH for next point`;

  const rewards = Array.isArray(rewardsPayload?.rewards) ? rewardsPayload.rewards : [];
  if (!rewards.length) {
    rewardsList.innerHTML = '<p class="small-text">No rewards available for now.</p>';
    return;
  }

  rewardsList.innerHTML = rewards
    .map((reward) => `
      <article class="loyalty-reward-item">
        <div>
          <h4>${escapeHtml(reward.name)}</h4>
          <p>${escapeHtml(reward.description)}</p>
          <p class="small-text">${Number(reward.pointsCost || 0)} points</p>
        </div>
        <button
          type="button"
          class="btn ${reward.affordable ? 'btn-primary' : 'btn-secondary'} loyalty-redeem-btn"
          data-reward-id="${escapeHtml(reward.id)}"
          ${reward.affordable ? '' : 'disabled'}
        >
          ${reward.affordable ? 'Redeem' : `${Number(reward.pointsMissing || 0)} left`}
        </button>
      </article>
    `)
    .join('');
};

const refreshStudentLoyalty = async () => {
  const [pointsPayload, rewardsPayload] = await Promise.all([
    fetchLoyaltyPoints(),
    fetchLoyaltyRewards(),
  ]);

  renderLoyaltySection(pointsPayload, rewardsPayload);
  updateStoredUser({
    loyaltyPoints: Number(pointsPayload.loyaltyPoints || 0),
    loyaltyDhProgress: Number(pointsPayload.loyaltyDhProgress || 0),
  });
};

const renderPaymentHistory = async () => {
  const container = document.getElementById('paymentHistoryList');
  if (!container) return;

  const [topUps, bookings] = await Promise.all([
    fetchWalletTopUpHistory(),
    fetchStudentBookingsHistory(),
  ]);

  const topUpEvents = topUps.map((tx) => ({
    type: 'topup',
    createdAt: tx.createdAt || tx.updatedAt,
    title: `Rechargement via ${tx.method}`,
    amount: tx.amount || 0,
    amountSign: '+',
    details: `Solde apres operation: ${(tx.balanceAfter || 0).toFixed(2)} MAD`,
  }));

  const bookingEvents = bookings.map((booking) => ({
    type: 'booking',
    createdAt: booking.createdAt || booking.updatedAt,
    title: `Reservation ${booking.trip?.departureCity || ''} -> ${booking.trip?.destinationCity || ''}`.trim(),
    amount: booking.amountPaid || 0,
    amountSign: '-',
    details: `Paiement: ${booking.paymentMethod || 'wallet'}${booking.walletBalanceAfter !== undefined ? ` | Solde apres operation: ${Number(booking.walletBalanceAfter).toFixed(2)} MAD` : ''}`,
  }));

  const historyItems = [...topUpEvents, ...bookingEvents].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  if (historyItems.length === 0) {
    container.innerHTML = '<p class="small-text">Aucune transaction pour le moment.</p>';
    return;
  }

  container.innerHTML = historyItems
    .map((item) => {
      const dateLabel = item.createdAt
        ? new Date(item.createdAt).toLocaleString('fr-FR')
        : 'Date inconnue';
      const formattedAmount = `${item.amountSign}${Number(item.amount || 0).toFixed(2)} MAD`;
      const amountClass = item.amountSign === '+' ? 'history-amount-positive' : 'history-amount-negative';
      return `
        <article class="history-item">
          <div class="history-item-head">
            <span class="history-item-title">${item.title}</span>
            <span class="history-item-title ${amountClass}">${formattedAmount}</span>
          </div>
          <p class="history-item-date">${dateLabel}</p>
          <p class="history-item-meta">${item.details}</p>
        </article>
      `;
    })
    .join('');
};

const updateWalletMethodFields = () => {
  const methodSelect = document.getElementById('walletMethod');
  const cardFields = document.getElementById('walletCardFields');
  const paypalFields = document.getElementById('walletPaypalFields');

  if (!methodSelect || !cardFields || !paypalFields) return;

  const method = methodSelect.value;
  const isPaypal = method === 'paypal';
  cardFields.style.display = isPaypal ? 'none' : 'grid';
  paypalFields.style.display = isPaypal ? 'grid' : 'none';
};

const initializeWalletCardInputs = () => {
  const cardNumberInput = document.getElementById('walletCardNumber');
  const cvcInput = document.getElementById('walletCardSecurity');
  const validUntilInput = document.getElementById('walletCardValidUntil');

  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', () => {
      const rawDigits = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
      const groups = rawDigits.match(/.{1,4}/g) || [];
      cardNumberInput.value = groups.join(' ');
    });
  }

  if (cvcInput) {
    cvcInput.addEventListener('input', () => {
      cvcInput.value = cvcInput.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  if (validUntilInput) {
    validUntilInput.addEventListener('input', () => {
      const digits = validUntilInput.value.replace(/\D/g, '').slice(0, 4);
      if (digits.length <= 2) {
        validUntilInput.value = digits;
      } else {
        validUntilInput.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      }
    });
  }
};

const handleWalletTopUp = async (event) => {
  event.preventDefault();

  const amount = Number(document.getElementById('walletAmount')?.value || 0);
  const method = document.getElementById('walletMethod')?.value;
  const cardHolderName = document.getElementById('walletCardHolder')?.value?.trim() || '';
  const cardNumber = document.getElementById('walletCardNumber')?.value?.replace(/\s+/g, '') || '';
  const securityCode = document.getElementById('walletCardSecurity')?.value?.trim() || '';
  const cardValidUntil = document.getElementById('walletCardValidUntil')?.value?.trim() || '';
  const paypalEmail = document.getElementById('walletPaypalEmail')?.value?.trim() || '';
  const paypalPassword = document.getElementById('walletPaypalPassword')?.value?.trim() || '';

  if (!amount || amount <= 0) {
    showMessage('walletMessage', 'Veuillez entrer un montant valide.', true);
    return;
  }

  if (method === 'paypal') {
    if (!paypalEmail || !paypalPassword) {
      showMessage('walletMessage', 'Veuillez saisir vos identifiants PayPal virtuels.', true);
      return;
    }
  } else {
    if (!cardHolderName || !cardNumber || !securityCode || !cardValidUntil) {
      showMessage('walletMessage', 'Veuillez remplir toutes les informations de carte.', true);
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardValidUntil)) {
      showMessage('walletMessage', 'La date de validite doit etre au format MM/YY.', true);
      return;
    }
  }

  try {
    const response = await fetch(`${apiBase}/auth/wallet/topup`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        amount,
        method,
        cardHolderName,
        cardNumber,
        securityCode,
        cardValidUntil,
        paypalEmail,
        paypalPassword,
      }),
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
      showMessage('walletMessage', data.message || 'Echec du rechargement du porte-monnaie.');
      return;
    }

    updateWalletDisplay(data.walletBalance || 0);
    updateStoredUser({ walletBalance: data.walletBalance || 0 });
    showMessage('walletMessage', data.message || 'Portefeuille rechargé.', false);
    await renderPaymentHistory();
  } catch (error) {
    showMessage('walletMessage', 'Erreur réseau lors du rechargement.', true);
  }
};

const handleDriverWithdraw = async (event) => {
  event.preventDefault();

  const amount = Number(document.getElementById('withdrawAmount')?.value || 0);
  const method = document.getElementById('withdrawMethod')?.value;

  if (!amount || amount <= 0) {
    showMessage('withdrawMessage', 'Veuillez entrer un montant valide.', true);
    return;
  }

  try {
    const response = await fetch(`${apiBase}/auth/wallet/withdraw`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ amount, method }),
    });
    const data = await parseResponseBody(response);

    if (!response.ok) {
      showMessage('withdrawMessage', data.message || 'Retrait impossible.', true);
      return;
    }

    const walletData = normalizeWalletPayload(data);
    updateDriverWalletDisplay(walletData.driverAvailableBalance, walletData.driverHoldingBalance);
    updateStoredUser({
      walletBalance: walletData.driverAvailableBalance,
      driverAvailableBalance: walletData.driverAvailableBalance,
      driverHoldingBalance: walletData.driverHoldingBalance,
    });
    showMessage(
      'withdrawMessage',
      `${data.message} Net envoye: ${Number(data.amountSentToDriver || 0).toFixed(2)} MAD.`,
      false
    );
  } catch (error) {
    showMessage('withdrawMessage', 'Erreur reseau pendant le retrait.', true);
  }
};

const formatRatingValue = (average, count) => {
  const safeCount = Number(count || 0);
  if (!safeCount) return 'Nouveau';
  return `${Number(average || 0).toFixed(1)} (${safeCount})`;
};

const getTripDateTime = (trip) => {
  if (!trip?.departureDate || !trip?.departureTime) return null;
  const date = new Date(trip.departureDate);
  if (Number.isNaN(date.getTime())) return null;
  const [hours, minutes] = String(trip.departureTime).split(':').map((value) => Number(value));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const isTripAboutToStart = (trip) => {
  const dateTime = getTripDateTime(trip);
  if (!dateTime) return false;
  const diff = dateTime.getTime() - Date.now();
  return diff <= 30 * 60 * 1000 && diff >= -15 * 60 * 1000;
};

const ensureSharedModal = (modalId, className, bodyClass = 'trip-live-body') => {
  let modal = document.getElementById(modalId);
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = className;
  modal.innerHTML = `
    <div class="trip-live-backdrop" data-action="close-modal"></div>
    <section class="trip-live-dialog" role="dialog" aria-modal="true">
      <header class="trip-live-header">
        <h3 id="${modalId}Title">Trip Window</h3>
        <button type="button" class="trip-live-close" data-action="close-modal" aria-label="Close">&times;</button>
      </header>
      <div id="${modalId}Body" class="${bodyClass}"></div>
    </section>
  `;
  document.body.appendChild(modal);
  return modal;
};

const closeModalById = (modalId) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
};

const openModalById = (modalId) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
};

const showRideWindow = ({ trip, bookings = [], role = 'student', onArrived }) => {
  const modalId = 'tripLiveModal';
  const modal = ensureSharedModal(modalId, 'trip-live-modal');
  const title = modal.querySelector(`#${modalId}Title`);
  const body = modal.querySelector(`#${modalId}Body`);
  if (!title || !body) return;

  title.textContent = role === 'driver' ? 'Live Trip Control' : 'Your Current Trip';

  const commentsHtml = bookings.length
    ? bookings
      .map((booking) => `
        <article class="request-item">
          <strong>${booking.student?.name || 'Student'}</strong>
          <p>${booking.studentComment || 'No request provided.'}</p>
        </article>
      `)
      .join('')
    : '<p class="small-text">No student requests yet.</p>';

  body.innerHTML = `
    <div class="trip-flow-line">
      <span>${trip.departureCity || 'Departure'}</span>
      <span class="trip-flow-arrow">&rarr;</span>
      <span>${trip.destinationCity || 'Destination'}</span>
    </div>
    <div class="trip-live-requests">
      <h4>Students requests / comments</h4>
      ${commentsHtml}
    </div>
    <div class="trip-live-actions">
      <button type="button" class="btn btn-danger" data-action="trip-sos">SOS</button>
      ${role === 'driver'
        ? '<button type="button" class="btn btn-primary" data-action="trip-arrived">Arrived</button>'
        : '<button type="button" class="btn btn-secondary" disabled>Arrived (driver only)</button>'}
    </div>
  `;

  body.querySelector('[data-action="trip-sos"]')?.addEventListener('click', () => {
    alert('SOS sent. Emergency protocol has been triggered.');
  });

  if (role === 'driver') {
    body.querySelector('[data-action="trip-arrived"]')?.addEventListener('click', () => {
      if (typeof onArrived === 'function') onArrived();
    });
  }

  modal.querySelectorAll('[data-action="close-modal"]').forEach((node) => {
    node.onclick = () => closeModalById(modalId);
  });

  openModalById(modalId);
};

const openBookingRequestPopup = ({ onSubmit }) => {
  const modalId = 'bookingRequestModal';
  const modal = ensureSharedModal(modalId, 'trip-live-modal', 'booking-request-body');
  const title = modal.querySelector(`#${modalId}Title`);
  const body = modal.querySelector(`#${modalId}Body`);
  if (!title || !body) return;

  title.textContent = 'Request to Driver';
  body.innerHTML = `
    <p class="small-text">Write your comments and requests for the driver before confirming.</p>
    <textarea id="studentRequestInput" rows="6" placeholder="Example: I have one backpack, please stop near gate B."></textarea>
    <div class="trip-live-actions">
      <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
      <button type="button" class="btn btn-primary" data-action="submit-request">Submit request</button>
    </div>
  `;

  body.querySelector('[data-action="submit-request"]')?.addEventListener('click', () => {
    const comment = String(document.getElementById('studentRequestInput')?.value || '').trim();
    if (typeof onSubmit === 'function') onSubmit(comment);
  });

  modal.querySelectorAll('[data-action="close-modal"]').forEach((node) => {
    node.onclick = () => closeModalById(modalId);
  });

  openModalById(modalId);
};

const openRatingPopup = ({ titleText, entries, role = 'student', onSubmitted }) => {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const modalId = 'ratingModal';
  const modal = ensureSharedModal(modalId, 'trip-live-modal', 'rating-body');
  const title = modal.querySelector(`#${modalId}Title`);
  const body = modal.querySelector(`#${modalId}Body`);
  if (!title || !body) return;

  title.textContent = titleText;
  body.innerHTML = `
    <p class="small-text">Please rate from 1 to 5.</p>
    <div class="rating-list">
      ${entries.map((entry) => `
        <label class="rating-item">
          <span>${entry.name}</span>
          <select data-booking-id="${entry.bookingId}">
            <option value="">Select</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>
      `).join('')}
    </div>
    <div class="trip-live-actions">
      <button type="button" class="btn btn-secondary" data-action="close-modal">Later</button>
      <button type="button" class="btn btn-primary" data-action="submit-ratings">Submit ratings</button>
    </div>
  `;

  body.querySelector('[data-action="submit-ratings"]')?.addEventListener('click', async () => {
    const selectNodes = body.querySelectorAll('select[data-booking-id]');
    const selectedRatings = Array.from(selectNodes)
      .map((node) => ({
        bookingId: node.getAttribute('data-booking-id'),
        score: Number(node.value),
      }))
      .filter((item) => item.bookingId && item.score >= 1 && item.score <= 5);

    if (!selectedRatings.length) {
      alert('Please select at least one rating.');
      return;
    }

    for (const item of selectedRatings) {
      const response = await fetch(`${apiBase}/bookings/${item.bookingId}/rating`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ score: item.score }),
      });
      const payload = await parseResponseBody(response);
      if (!response.ok) {
        alert(payload.message || 'Unable to submit rating.');
        return;
      }
    }

    closeModalById(modalId);
    if (typeof onSubmitted === 'function') onSubmitted();
  });

  modal.querySelectorAll('[data-action="close-modal"]').forEach((node) => {
    node.onclick = () => closeModalById(modalId);
  });

  openModalById(modalId);
};

const buildTripCard = (trip) => {
  const card = document.createElement('div');
  card.className = 'ride-card';

  const driverName = trip.driver?.name || 'Conducteur';
  const driverId = trip.driver?._id || '';
  const driverPic = trip.driver?.profilePic
    ? `/uploads/${String(trip.driver.profilePic).split(/[/\\]/).pop()}`
    : '';
  const driverGender = trip.driver?.gender === 'male' ? 'Homme' : trip.driver?.gender === 'female' ? 'Femme' : 'Conducteur';
  const dateLabel = formatDateLabel(trip.departureDate, trip.departureTime);
  const driverRating = formatRatingValue(trip.driver?.ratingAverage, trip.driver?.ratingCount);

  const avatarHtml = driverPic
    ? `<img src="${driverPic}" alt="${driverName}" style="width: 40px; height: 40px; border-radius: 50%;">`
    : initials(driverName);

  const avatarContent = driverId
    ? `<a href="profile.html?id=${driverId}" class="driver-avatar">${avatarHtml}</a>`
    : `<div class="driver-avatar">${avatarHtml}</div>`;

  card.innerHTML = `
    <div class="ride-main">
      ${avatarContent}
      <div>
        <h3>${driverName} - ${trip.destinationCity || 'Trajet'}</h3>
        <p class="ride-meta">${dateLabel} - ${driverGender} - Note: ${driverRating}</p>
        <p class="ride-extra">${trip.availableSeats} places disponibles - ${trip.departureCity || 'Depart'} &rarr; ${trip.destinationCity || 'Arrivee'}</p>
      </div>
    </div>
    <a class="ride-price" href="trip.html?id=${trip._id}">${trip.price} MAD</a>
  `;

  return card;
};

const buildBookingCard = (booking) => {
  const card = document.createElement('div');
  card.className = 'ride-card';

  const driverName = booking.trip?.driver?.name || 'Conducteur';
  const dateLabel = formatDateLabel(booking.trip?.departureDate, booking.trip?.departureTime);
  const statusLabel = booking.trip?.status === 'in_progress'
    ? 'En cours'
    : booking.trip?.status === 'completed'
      ? 'Termine'
      : 'Planifie';
  const driverRating = formatRatingValue(booking.trip?.driver?.ratingAverage, booking.trip?.driver?.ratingCount);

  card.innerHTML = `
    <div class="ride-main">
      <div class="driver-avatar">${initials(driverName)}</div>
      <div>
        <h3>${booking.trip?.destinationCity || 'Trajet reserve'}</h3>
        <p class="ride-meta">${dateLabel}</p>
        <p class="ride-extra">${booking.seatsBooked} place(s) reservee(s) - Statut: ${booking.confirmed ? 'Confirmee' : 'En attente'} - Trip: ${statusLabel}</p>
        <p class="ride-extra">Paiement: ${booking.paymentMethod || 'wallet'} - Montant: ${booking.amountPaid || booking.trip?.price || 0} MAD</p>
        <p class="ride-extra">Commentaire: ${booking.studentComment || 'Aucun commentaire.'}</p>
        <p class="ride-extra">Note conducteur: ${driverRating}</p>
        ${booking.receipt?._id ? `<div class="booking-receipt-link"><a class="btn btn-secondary" href="receipt.html?bookingId=${booking._id}">Voir reçu</a></div>` : ''}
      </div>
    </div>
    <span class="ride-price">${booking.trip?.price || 0} MAD</span>
  `;

  return card;
};

const fillReceiptView = (receipt) => {
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = value ?? '-';
  };

  setText('receiptNumber', receipt.receiptNumber || '-');
  setText('receiptBookingDate', receipt.bookingDate ? new Date(receipt.bookingDate).toLocaleString('fr-FR') : '-');
  setText('receiptStudentName', receipt.studentName || '-');
  setText('receiptStudentPhone', receipt.studentPhoneNumber || '-');
  setText('receiptDriverName', receipt.driverName || '-');
  setText('receiptDriverPhone', receipt.driverPhoneNumber || '-');
  setText('receiptDeparture', receipt.departureCity || '-');
  setText('receiptDestination', receipt.destinationCity || '-');
  setText('receiptTripDate', receipt.tripDate ? new Date(receipt.tripDate).toLocaleDateString('fr-FR') : '-');
  setText('receiptTripTime', receipt.tripTime || '-');
  setText('receiptVehicleType', receipt.vehicleType || '-');
  setText('receiptSeats', String(receipt.reservedSeats || 0));
  setText('receiptPricePaid', `${Number(receipt.pricePaid || 0).toFixed(2)} DH`);
  setText('receiptPaymentMethod', receipt.paymentMethod || '-');
  setText('receiptLoyaltyPoints', `${Number(receipt.loyaltyPointsEarned || 0)} Go Fidélité`);
  setText('receiptStatus', receipt.bookingStatus || 'Confirmed');
  setText('receiptSupport', receipt.supportContact || 'support@gostudent.ma');
  setText('receiptQrPayload', receipt.qrPayload || receipt.booking || '-');
};

const downloadReceiptAsPdf = async () => {
  const card = document.getElementById('receiptCard');
  if (!card || !window.jspdf || !window.html2canvas) return;

  const canvas = await window.html2canvas(card, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });
  const imageData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 16;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight - 16) {
    pdf.addImage(imageData, 'PNG', 8, 8, imgWidth, imgHeight);
  } else {
    let remainingHeightPx = canvas.height;
    let sourceY = 0;
    const pageSliceHeightPx = Math.floor((canvas.width * (pageHeight - 16)) / imgWidth);

    while (remainingHeightPx > 0) {
      const sliceHeightPx = Math.min(pageSliceHeightPx, remainingHeightPx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      }
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceHeightPx * imgWidth) / canvas.width;
      pdf.addImage(sliceData, 'PNG', 8, 8, imgWidth, sliceHeightMm);

      remainingHeightPx -= sliceHeightPx;
      sourceY += sliceHeightPx;
      if (remainingHeightPx > 0) pdf.addPage();
    }
  }

  const fileName = document.getElementById('receiptNumber')?.textContent || 'receipt';
  pdf.save(`${fileName}.pdf`);
};

const loadReceiptPage = async () => {
  const user = getUser();
  if (!getToken() || !user || user.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }

  updateSidebarUser();

  const bookingId = new URL(window.location.href).searchParams.get('bookingId');
  if (!bookingId) {
    showMessage('receiptMessage', 'Booking ID is missing to display the receipt.');
    return;
  }

  document.getElementById('receiptPrintButton')?.addEventListener('click', () => window.print());
  document.getElementById('receiptDownloadPdfButton')?.addEventListener('click', async () => {
    try {
      await downloadReceiptAsPdf();
    } catch (error) {
      showMessage('receiptMessage', 'Unable to generate PDF.');
    }
  });

  try {
    const receipt = await fetchReceiptByBookingId(bookingId);
    fillReceiptView(receipt);
  } catch (error) {
    showMessage('receiptMessage', error.message || 'Unable to load receipt.');
  }
};

const logoutHandler = (e) => {
  e.preventDefault();
  localStorage.removeItem('transportToken');
  localStorage.removeItem('transportUser');
  window.location.href = 'index.html';
};

const updateSidebarUser = () => {
  const sidebarUser = document.querySelector('.sidebar-user');

  const user = getUser();
  const profileNav = document.querySelector('a[href="profile.html"]');
  const loginNav = document.querySelector('a[href="login.html"]');
  const registerNav = document.querySelector('a[href="register.html"]');
  const logoutNav = document.getElementById('logoutNav');
  const walletNav = document.querySelector('a[href="wallet.html"]');
  const adminNav = document.getElementById('adminNav');
  const homeNav = document.querySelector('.side-nav a[href="index.html"]');

  if (!user) {
    if (sidebarUser) {
      sidebarUser.innerHTML = `
        <div class="avatar-chip">OB</div>
        <div>
          <strong>Etudiant</strong>
          <p>Bienvenue</p>
        </div>
      `;
    }
    if (profileNav) profileNav.href = 'login.html';
    if (loginNav) loginNav.style.display = 'block';
    if (registerNav) registerNav.style.display = 'block';
    if (logoutNav) {
      logoutNav.style.display = 'none';
      logoutNav.removeEventListener('click', logoutHandler);
    }
    if (walletNav) walletNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'none';
    if (homeNav) homeNav.href = 'index.html';
    return;
  }

  const profilePic = user.profilePic
    ? `/uploads/${String(user.profilePic).split(/[/\\]/).pop()}`
    : '';

  if (sidebarUser) {
    sidebarUser.innerHTML = `
      <a href="profile.html?id=${user.id}" class="avatar-chip">
        ${profilePic ? `<img src="${profilePic}" alt="${user.name}" style="width: 42px; height: 42px; border-radius: 50%;">` : initials(user.name)}
      </a>
      <div>
        <strong>${user.name}</strong>
        <p>${user.role === 'driver' ? 'Conducteur' : 'Etudiant'}</p>
      </div>
    `;
  }
  if (profileNav) profileNav.href = `profile.html?id=${user.id}`;
  if (loginNav) loginNav.style.display = 'none';
  if (registerNav) registerNav.style.display = 'none';
  if (logoutNav) {
    logoutNav.style.display = 'block';
    logoutNav.addEventListener('click', logoutHandler);
  }
  if (walletNav) walletNav.style.display = ['student', 'driver'].includes(user.role) ? 'block' : 'none';
  if (adminNav) adminNav.style.display = user.role === 'admin' ? 'block' : 'none';
  if (homeNav) {
    homeNav.href = user.role === 'driver'
      ? 'driver-dashboard.html'
      : user.role === 'student'
        ? 'student-dashboard.html'
        : 'index.html';
  }
};

const fetchTrips = async () => {
  const destination = document.getElementById('destinationFilter')?.value || '';
  const date = document.getElementById('dateFilter')?.value || '';
  const maxPrice = document.getElementById('priceFilter')?.value || '';
  const tripList = document.getElementById('tripsList');

  if (!tripList) return;

  const query = new URLSearchParams();
  if (destination) query.append('destination', destination);
  if (date) query.append('date', date);
  if (maxPrice) query.append('maxPrice', maxPrice);

  try {
    const response = await fetch(`${apiBase}/trips?${query.toString()}`);
    const data = await parseResponseBody(response);

    if (!response.ok) {
      tripList.innerHTML = `<p class="profile-pill">${data.message || 'Impossible de charger les trajets.'}</p>`;
      return;
    }

    let trips = Array.isArray(data) ? data : [];

    if (getPinkMode()) {
      trips = trips.filter((trip) => trip.driver?.gender === 'female');
    }

    tripList.innerHTML = '';
    if (trips.length === 0) {
      tripList.innerHTML = '<p class="profile-pill">Aucun trajet trouve. Essayez de modifier les filtres.</p>';
      return;
    }

    trips.forEach((trip) => tripList.appendChild(buildTripCard(trip)));
  } catch (error) {
    tripList.innerHTML = '<p class="profile-pill">Erreur reseau. Verifiez le serveur.</p>';
  }
};

const handleLogin = async (event) => {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
      showMessage('loginMessage', data.message || 'Login failed.');
      return;
    }

    localStorage.setItem('transportToken', data.token);
    localStorage.setItem('transportUser', JSON.stringify(data.user));
    if (data.user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
      return;
    }
    window.location.href = data.user.role === 'driver' ? 'driver-dashboard.html' : 'student-dashboard.html';
  } catch (error) {
    showMessage('loginMessage', 'Network error. Please try again.');
  }
};

const handleForgotPassword = async (event) => {
  event.preventDefault();

  const email = document.getElementById('forgotEmail')?.value?.trim() || '';
  if (!email) {
    showMessage('forgotPasswordMessage', 'Please enter your email address.');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await parseResponseBody(response);
    if (!response.ok) {
      showMessage('forgotPasswordMessage', data.message || 'Unable to prepare reset link.');
      return;
    }

    const resetLink = data.resetUrl
      ? ` Dev reset link: ${data.resetUrl}`
      : '';
    showMessage('forgotPasswordMessage', `${data.message || 'Reset link prepared.'}${resetLink}`, false);
  } catch (error) {
    showMessage('forgotPasswordMessage', 'Network error. Please try again.');
  }
};

const handleResetPassword = async (event) => {
  event.preventDefault();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const password = document.getElementById('resetPassword')?.value || '';
  const confirmPassword = document.getElementById('resetConfirmPassword')?.value || '';

  if (!token) {
    showMessage('resetPasswordMessage', 'Reset token is missing.');
    return;
  }
  if (password.length < 6) {
    showMessage('resetPasswordMessage', 'Password must contain at least 6 characters.');
    return;
  }
  if (password !== confirmPassword) {
    showMessage('resetPasswordMessage', 'Passwords do not match.');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await parseResponseBody(response);
    if (!response.ok) {
      showMessage('resetPasswordMessage', data.message || 'Unable to reset password.');
      return;
    }

    showMessage('resetPasswordMessage', data.message || 'Password reset successfully.', false);
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (error) {
    showMessage('resetPasswordMessage', 'Network error. Please try again.');
  }
};

const handleRegister = async (event) => {
  event.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phoneNumber = document.getElementById('registerPhoneNumber')?.value?.trim() || '';
  const password = document.getElementById('registerPassword').value.trim();
  const role = document.getElementById('registerRole').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
  const description = document.getElementById('registerDescription')?.value?.trim() || '';
  const speciality = document.getElementById('registerSpeciality')?.value?.trim() || '';
  const idCardNumber = document.getElementById('registerIdCardNumber')?.value?.trim() || '';
  const bankAccountNumber = document.getElementById('registerBankAccountNumber')?.value?.trim() || '';

  const profilePic = document.getElementById('registerProfilePic')?.files?.[0] || null;
  const scholarshipCard = document.getElementById('registerScholarshipCard')?.files?.[0] || null;
  const idCardPdf = document.getElementById('registerIdCardPdf')?.files?.[0] || null;
  const drivingLicence = document.getElementById('registerDrivingLicence')?.files?.[0] || null;
  const requiredCarDocuments = Array.from(document.querySelectorAll('.driver-car-document'))
    .map((input) => input.files?.[0])
    .filter(Boolean);
  const optionalCarDocuments = Array.from(document.getElementById('registerCarDocuments')?.files || []);
  const carDocuments = [...requiredCarDocuments, ...optionalCarDocuments];

  if (!name || !email || !phoneNumber || !password || !role || !gender || !description || !speciality || !idCardNumber || !profilePic || !scholarshipCard || !idCardPdf) {
    showMessage('registerMessage', 'Please fill all required fields before registration.');
    return;
  }

  if (!/^\+?[0-9]{7,15}$/.test(phoneNumber.replace(/[\s().-]+/g, ''))) {
    showMessage('registerMessage', 'Phone number format is invalid.');
    return;
  }

  if (role === 'driver' && (!bankAccountNumber || !drivingLicence || requiredCarDocuments.length < 3)) {
    showMessage('registerMessage', 'Drivers must fill all required fields and upload all required documents.');
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('phoneNumber', phoneNumber);
  formData.append('password', password);
  formData.append('role', role);
  formData.append('gender', gender);
  formData.append('description', description);
  formData.append('speciality', speciality);
  formData.append('idCardNumber', idCardNumber);
  formData.append('bankAccountNumber', bankAccountNumber);
  if (profilePic) formData.append('profilePic', profilePic);
  if (scholarshipCard) formData.append('scholarshipCard', scholarshipCard);
  if (idCardPdf) formData.append('idCardPdf', idCardPdf);

  if (role === 'driver') {
    if (drivingLicence) formData.append('drivingLicence', drivingLicence);
    carDocuments.forEach((file) => formData.append('carDocuments', file));
  }

  try {
    const response = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      body: formData,
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
      showMessage('registerMessage', data.message || 'Registration failed.');
      return;
    }

    localStorage.setItem('transportToken', data.token);
    localStorage.setItem('transportUser', JSON.stringify(data.user));
    window.location.href = data.user.role === 'driver' ? 'driver-dashboard.html' : 'student-dashboard.html';
  } catch (error) {
    showMessage('registerMessage', 'Unable to connect to server.');
  }
};

const loadProfilePage = async () => {
  const params = new URLSearchParams(window.location.search);
  const storedUser = getUser();
  const userId = params.get('id') || storedUser?.id;

  if (!userId) {
    showMessage('profileMessage', 'User ID missing.');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/auth/profile/${userId}`);
    const profilePayload = await parseResponseBody(response);
    const profile = profilePayload?.user || profilePayload;

    if (!response.ok) {
      showMessage('profileMessage', profilePayload.message || 'Unable to load profile.');
      return;
    }

    const details = document.getElementById('profileDetails');
    if (!details) return;

    const profileName = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Utilisateur';
    const isYassineProfile = profileName.toLowerCase().includes('yassine');
    const profilePic = profile.profilePic
      ? `/uploads/${String(profile.profilePic).split(/[/\\]/).pop()}`
      : (isYassineProfile ? 'assets/yassine-profile.png' : '');
    const gender = profile.gender === 'male' ? 'Homme' : profile.gender === 'female' ? 'Femme' : 'Utilisateur';
    const user = storedUser;
    const isOwnProfile = !!(user && user.id === userId);
    const [firstName, ...lastNameParts] = profileName.split(' ').filter(Boolean);
    const lastName = lastNameParts.join(' ');
    const status = normalizeStatus(profile.documentsValidationStatus, profile.accountApproved);
    const profileRows = [
      ['Prenom', firstName || profileName],
      ['Nom', lastName || profile.lastName || '-'],
      ['Num du telephone', profile.phoneNumber || '-'],
      ['Num CIN', profile.idCardNumber || '-'],
      ['Profile', profile.role === 'driver' ? 'Conducteur' : 'Student'],
      ['Note', formatRatingValue(profile.ratingAverage, profile.ratingCount)],
      ['Trajets passes', profile.pastRides || 0],
    ];
    if (profile.role === 'driver') profileRows.splice(5, 0, ['Compte bancaire', profile.bankAccountNumber || '-']);

    details.innerHTML = `
      <section class="profile-grid" aria-label="Profil de ${escapeHtml(profileName)}">
        <article class="profile-card-left">
          <div class="avatar-wrap">
            ${profilePic ? `<img src="${escapeHtml(profilePic)}" alt="${escapeHtml(profileName)}">` : `<div class="profile-avatar-fallback">${initials(profileName)}</div>`}
            ${isOwnProfile ? `
              <button type="button" class="avatar-badge" data-action="profile-edit-photo" aria-label="Modifier la photo">
                <span>✎</span>
              </button>
            ` : ''}
          </div>

          <div class="profile-name">
            <h2>${escapeHtml(profileName)}</h2>
            <span class="role-badge">${profile.role === 'driver' ? 'Conducteur' : 'Etudiant'}</span>
          </div>

          <div class="profile-stats">
            <div class="stat-box">
              <div class="stat-val">${escapeHtml(profile.pastRides || 0)}</div>
              <div class="stat-lbl">Trajets</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">${escapeHtml(formatRatingValue(profile.ratingAverage, profile.ratingCount))}</div>
              <div class="stat-lbl">Note</div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="desc-section">
            <div class="desc-label">
              A propos
              ${isOwnProfile ? '<button type="button" data-action="profile-edit-description">Modifier</button>' : ''}
            </div>
            <div class="desc-box">${escapeHtml(profile.description || 'Aucune description.')}</div>
          </div>
        </article>

        <article class="profile-card-right">
          <div class="card-header">
            <h3>Informations personnelles</h3>
            ${isOwnProfile ? '<button type="button" class="edit-btn" data-action="profile-edit-description">Modifier</button>' : ''}
          </div>
          <div class="fields-list">
            ${profileRows
              .map(([label, value], index) => `
                <div class="field-row">
                  <div class="field-label">${escapeHtml(label)}</div>
                  <div class="field-value">
                    <span class="value-pill ${index === 4 ? 'outline' : ''}">${escapeHtml(value)}</span>
                    ${['Num du telephone', 'Num CIN'].includes(label) && value !== '-' ? '<span class="verified">Verifie</span>' : ''}
                  </div>
                </div>
              `)
              .join('')}
            <div class="field-row">
              <div class="field-label">Statut</div>
              <div class="field-value">
                <span class="verified">${statusLabel(status)}</span>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">Genre</div>
              <div class="field-value">
                <span class="value-pill outline">${escapeHtml(gender)}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="bottom-row">
        <article class="mini-card">
          <h4>Securite du compte</h4>
          <div class="security-items">
            <div class="sec-item"><span class="sec-label">Mot de passe</span><span class="sec-status sec-on">Actif</span></div>
            <div class="sec-item"><span class="sec-label">Telephone verifie</span><span class="sec-status sec-on">Actif</span></div>
            <div class="sec-item"><span class="sec-label">Documents</span><span class="sec-status ${status === 'approved' ? 'sec-on' : 'sec-off'}">${statusLabel(status)}</span></div>
          </div>
        </article>
        <article class="mini-card">
          <h4>Activite recente</h4>
          <div class="activity-list">
            <div class="act-item"><span class="act-dot blue"></span><span class="act-label">Profil consulte</span><span class="act-time">Aujourd'hui</span></div>
            <div class="act-item"><span class="act-dot green"></span><span class="act-label">Compte ${statusLabel(status).toLowerCase()}</span><span class="act-time">Maintenant</span></div>
          </div>
        </article>
      </section>

      ${
        profile.documentsValidationStatus === 'rejected' && profile.documentsRejectionReason
          ? `<p class="profile-rejection"><strong>Rejection Reason:</strong> ${escapeHtml(profile.documentsRejectionReason)}</p>`
          : ''
      }
    `;

    // Check if it's the user's own profile
    if (isOwnProfile) {
      document.getElementById('editProfile').style.display = 'block';
      document.getElementById('newPhoneNumber').value = profile.phoneNumber || '';
      document.getElementById('newDescription').value = profile.description || '';
      const bankAccountField = document.getElementById('bankAccountField');
      const bankAccountInput = document.getElementById('newBankAccountNumber');
      const isDriver = profile.role === 'driver';
      if (bankAccountField) bankAccountField.style.display = isDriver ? 'block' : 'none';
      if (bankAccountInput) {
        bankAccountInput.required = isDriver;
        bankAccountInput.value = profile.bankAccountNumber || '';
      }
      details.querySelector('[data-action="profile-edit-photo"]')?.addEventListener('click', () => {
        document.getElementById('newProfilePic')?.click();
      });
      details.querySelector('[data-action="profile-edit-description"]')?.addEventListener('click', () => {
        document.getElementById('newDescription')?.focus();
      });
      document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = document.getElementById('newDescription').value.trim();
        const phoneNumberValue = document.getElementById('newPhoneNumber')?.value?.trim() || '';
        const profilePicFile = document.getElementById('newProfilePic').files[0];
        const bankAccountNumberValue = document.getElementById('newBankAccountNumber')?.value?.trim() || '';

        const formData = new FormData();
        formData.append('description', description);
        formData.append('phoneNumber', phoneNumberValue);
        if (isDriver) formData.append('bankAccountNumber', bankAccountNumberValue);
        if (profilePicFile) formData.append('profilePic', profilePicFile);

        try {
          const updateRes = await fetch(`${apiBase}/auth/profile`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
            body: formData,
          });
          const data = await updateRes.json();
          if (!updateRes.ok) {
            showMessage('profileMessage', data.message || 'Update failed.');
            return;
          }
          showMessage('profileMessage', 'Profile updated successfully!', false);
          // Update local storage
          localStorage.setItem('transportUser', JSON.stringify(data.user));
          // Reload the page to show updated info
          location.reload();
        } catch (error) {
          showMessage('profileMessage', 'Update error.');
        }
      });

      const resubmitSection = document.getElementById('resubmitDocumentsSection');
      const status = profile.documentsValidationStatus || 'pending';
      if (resubmitSection) {
        resubmitSection.style.display = status === 'rejected' ? 'block' : 'none';
      }

      const resubmitForm = document.getElementById('resubmitDocumentsForm');
      if (resubmitForm && status === 'rejected') {
        const reasonContainer = document.getElementById('resubmitReason');
        if (reasonContainer) {
          reasonContainer.textContent = profile.documentsRejectionReason
            ? `Admin reason: ${profile.documentsRejectionReason}`
            : 'Admin rejected your documents. Please upload clear/valid documents.';
        }

        const drivingInput = document.getElementById('resubmitDrivingLicence');
        const carDocsInput = document.getElementById('resubmitCarDocuments');
        const drivingLabel = drivingInput?.previousElementSibling;
        const carDocsLabel = carDocsInput?.previousElementSibling;
        const isDriver = profile.role === 'driver';

        if (drivingInput) drivingInput.required = isDriver;
        if (carDocsInput) carDocsInput.required = isDriver;
        if (drivingInput) drivingInput.style.display = isDriver ? 'block' : 'none';
        if (carDocsInput) carDocsInput.style.display = isDriver ? 'block' : 'none';
        if (drivingLabel) drivingLabel.style.display = isDriver ? 'block' : 'none';
        if (carDocsLabel) carDocsLabel.style.display = isDriver ? 'block' : 'none';

        resubmitForm.addEventListener('submit', async (event) => {
          event.preventDefault();

          const profilePicFile = document.getElementById('resubmitProfilePic')?.files?.[0];
          const scholarshipCardFile = document.getElementById('resubmitScholarshipCard')?.files?.[0];
          const idCardPdfFile = document.getElementById('resubmitIdCardPdf')?.files?.[0];
          const drivingLicenceFile = document.getElementById('resubmitDrivingLicence')?.files?.[0];
          const carDocsFiles = Array.from(document.getElementById('resubmitCarDocuments')?.files || []);

          const formData = new FormData();
          if (profilePicFile) formData.append('profilePic', profilePicFile);
          if (scholarshipCardFile) formData.append('scholarshipCard', scholarshipCardFile);
          if (idCardPdfFile) formData.append('idCardPdf', idCardPdfFile);
          if (profile.role === 'driver') {
            if (drivingLicenceFile) formData.append('drivingLicence', drivingLicenceFile);
            carDocsFiles.forEach((file) => formData.append('carDocuments', file));
          }

          try {
            const resubmitResponse = await fetch(`${apiBase}/auth/documents/resubmit`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${getToken()}`,
              },
              body: formData,
            });

            const data = await parseResponseBody(resubmitResponse);
            if (!resubmitResponse.ok) {
              showMessage('profileMessage', data.message || 'Unable to re-upload documents.');
              return;
            }

            updateStoredUser(data.user);
            showMessage('profileMessage', data.message || 'Documents uploaded. Waiting for approval.', false);
            location.reload();
          } catch (error) {
            showMessage('profileMessage', 'Unable to re-upload documents.');
          }
        });
      }
    }
  } catch (error) {
    showMessage('profileMessage', 'Error fetching profile.');
  }
};

const loadTripPage = async () => {
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get('id');

  if (!tripId) {
    showMessage('tripMessage', 'Trip ID missing.');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/trips/${tripId}`);
    const trip = await parseResponseBody(response);

    if (!response.ok) {
      showMessage('tripMessage', trip.message || 'Unable to load trip details.');
      return;
    }

    const details = document.getElementById('tripDetails');
    if (!details) return;

    details.innerHTML = `
      <div class="card">
        <h2>${trip.departureCity} &rarr; ${trip.destinationCity}</h2>
        <p><strong>Date:</strong> ${new Date(trip.departureDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${trip.departureTime}</p>
        <p><strong>Prix:</strong> ${trip.price} MAD</p>
        <p><strong>Places disponibles:</strong> ${trip.availableSeats}</p>
        <p><strong>Conducteur:</strong> ${trip.driver?.name || 'Unknown'}</p>
        <p>${trip.description || 'Pas de notes supplementaires.'}</p>
      </div>
    `;

    window.dispatchEvent(new CustomEvent('trip:loaded', { detail: trip }));

    const walletStatus = document.getElementById('walletStatus');
    if (walletStatus) {
      const walletData = await fetchWalletBalance();
      if (walletData !== null) {
        walletStatus.textContent = `Solde du portefeuille : ${walletData.walletBalance.toFixed(2)} MAD`;
      } else {
        walletStatus.textContent = 'Solde du portefeuille indisponible.';
      }
    }

    document.getElementById('bookingForm')?.addEventListener('submit', async (evt) => {
      evt.preventDefault();

      const seatsBooked = Number(document.getElementById('bookingSeats').value);
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'wallet';
      if (!getToken()) {
        showMessage('tripMessage', 'Login first to reserve a seat.');
        return;
      }

      openBookingRequestPopup({
        onSubmit: async (studentComment) => {
          const bookingRes = await fetch(`${apiBase}/bookings`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ tripId, seatsBooked, paymentMethod, studentComment }),
          });

          const data = await parseResponseBody(bookingRes);
          if (!bookingRes.ok) {
            showMessage('tripMessage', data.message || 'Booking failed.');
            return;
          }

          closeModalById('bookingRequestModal');

          if (paymentMethod === 'wallet' && data.walletBalance !== undefined) {
            updateStoredUser({ walletBalance: data.walletBalance });
            if (walletStatus) {
              walletStatus.textContent = `Solde du portefeuille : ${data.walletBalance.toFixed(2)} MAD`;
            }
          }

          if (data.loyaltyPoints !== undefined || data.loyaltyDhProgress !== undefined) {
            updateStoredUser({
              loyaltyPoints: Number(data.loyaltyPoints || 0),
              loyaltyDhProgress: Number(data.loyaltyDhProgress || 0),
            });
          }

          const earned = Number(data.loyaltyEarnedPoints || 0);
          const loyaltyMsg = earned > 0
            ? ` You earned ${earned} Go Fidélité point${earned > 1 ? 's' : ''}.`
            : '';
          showMessage('tripMessage', `Booking confirmed and request sent to driver.${loyaltyMsg}`, false);

          if (data.booking?._id && data.receiptGenerated) {
            window.location.href = `receipt.html?bookingId=${data.booking._id}`;
          } else if (data.booking?._id && data.receiptGenerated === false) {
            showMessage('tripMessage', 'Booking confirmed. Receipt is being prepared, please check My Bookings later.', false);
          }
        },
      });
    });
  } catch (error) {
    showMessage('tripMessage', 'Error fetching trip details.');
  }
};

const loadWalletPage = async () => {
  const user = getUser();
  if (!getToken() || !user || !['student', 'driver'].includes(user.role)) {
    window.location.href = 'login.html';
    return;
  }

  const isStudent = user.role === 'student';
  const isDriver = user.role === 'driver';
  const topUpForm = document.getElementById('walletTopUpForm');
  const walletMessage = document.getElementById('walletMessage');
  const driverWithdrawSection = document.getElementById('driverWithdrawSection');

  if (!isStudent && topUpForm) {
    topUpForm.style.display = 'none';
    if (walletMessage) {
      walletMessage.textContent = 'Top-up is reserved for students. Drivers can withdraw from Driver Dashboard.';
      walletMessage.style.color = '#7c879f';
    }
  }

  if (driverWithdrawSection) {
    driverWithdrawSection.style.display = isDriver ? 'block' : 'none';
  }

  const walletMethod = document.getElementById('walletMethod');
  if (walletMethod && isStudent) {
    updateWalletMethodFields();
    walletMethod.addEventListener('change', updateWalletMethodFields);
  }
  if (isStudent) initializeWalletCardInputs();

  const walletData = await fetchWalletBalance();
  if (walletData !== null) {
    if (isDriver) {
      updateDriverWalletDisplay(walletData.driverAvailableBalance, walletData.driverHoldingBalance);
      updateStoredUser({
        walletBalance: walletData.driverAvailableBalance,
        driverAvailableBalance: walletData.driverAvailableBalance,
        driverHoldingBalance: walletData.driverHoldingBalance,
      });
    } else {
      updateWalletDisplay(walletData.walletBalance);
      updateStoredUser({ walletBalance: walletData.walletBalance });
    }
  } else if (user.walletBalance !== undefined) {
    if (isDriver) {
      updateDriverWalletDisplay(user.driverAvailableBalance ?? user.walletBalance, user.driverHoldingBalance || 0);
    } else {
      updateWalletDisplay(user.walletBalance);
    }
  }

  await renderPaymentHistory();
  if (isStudent) {
    document.getElementById('walletTopUpForm')?.addEventListener('submit', handleWalletTopUp);
  }
  if (isDriver) {
    document.getElementById('withdrawForm')?.addEventListener('submit', handleDriverWithdraw);
  }
};

const fetchDriverBookingsPayload = async () => {
  const response = await fetch(`${apiBase}/bookings/driver`, { headers: authHeaders() });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load driver bookings.');
  }
  return payload;
};

const fetchReceiptByBookingId = async (bookingId) => {
  const response = await fetch(`${apiBase}/bookings/${bookingId}/receipt`, { headers: authHeaders() });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load receipt.');
  }
  return payload;
};

const fetchStudentReceipts = async () => {
  const response = await fetch(`${apiBase}/bookings/student/receipts`, { headers: authHeaders() });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to load receipts.');
  }
  return Array.isArray(payload) ? payload : [];
};

const renderDriverNotifications = (payload) => {
  const badge = document.getElementById('driverNotificationsBadge');
  const panel = document.getElementById('driverNotificationsPanel');
  if (badge) badge.textContent = String(payload?.unseenCount || 0);
  if (!panel) return;

  const notifications = payload?.notifications || [];
  if (!notifications.length) {
    panel.innerHTML = '<p class="small-text">No new reservations.</p>';
    return;
  }

  panel.innerHTML = notifications
    .map((item) => `
      <article class="notification-item">
        <strong>${escapeHtml(item.studentName)}</strong>
        <p>${escapeHtml(item.route)}</p>
        <p>Seats: ${item.seatsBooked}</p>
        <p>Request: ${escapeHtml(item.studentComment || 'No request.')}</p>
        <div class="notification-actions">
          <button type="button" class="btn btn-secondary notification-delete" data-booking-id="${item.bookingId}">Delete</button>
        </div>
      </article>
    `)
    .join('');
};

const deleteDriverNotification = async (bookingId) => {
  const response = await fetch(`${apiBase}/bookings/driver/notifications/${bookingId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to delete notification.');
  }
  return payload;
};

const openDriverTripPopup = async (tripId, mode = 'start') => {
  try {
    let tripPayload = null;
    let bookings = [];

    if (mode === 'start') {
      const response = await fetch(`${apiBase}/trips/${tripId}/start`, {
        method: 'POST',
        headers: authHeaders(),
      });
      tripPayload = await parseResponseBody(response);
      if (!response.ok) {
        showMessage('driverMessage', tripPayload.message || 'Unable to start trip.');
        return;
      }
      showMessage('driverMessage', 'Trip started.', false);
      bookings = Array.isArray(tripPayload.bookings) ? tripPayload.bookings : [];
    } else {
      const [tripResponse, bookingsPayload] = await Promise.all([
        fetch(`${apiBase}/trips/${tripId}`),
        fetchDriverBookingsPayload(),
      ]);
      tripPayload = await parseResponseBody(tripResponse);
      if (!tripResponse.ok) {
        showMessage('driverMessage', tripPayload.message || 'Unable to load trip.');
        return;
      }
      const allBookings = Array.isArray(bookingsPayload?.bookings) ? bookingsPayload.bookings : [];
      bookings = allBookings.filter((booking) => String(booking.trip?._id) === String(tripId));
    }

    showRideWindow({
      trip: tripPayload.trip || tripPayload,
      bookings,
      role: 'driver',
      onArrived: async () => {
        const arriveResponse = await fetch(`${apiBase}/trips/${tripId}/arrive`, {
          method: 'POST',
          headers: authHeaders(),
        });
        const arrivePayload = await parseResponseBody(arriveResponse);
        if (!arriveResponse.ok) {
          showMessage('driverMessage', arrivePayload.message || 'Unable to mark arrival.');
          return;
        }
        closeModalById('tripLiveModal');
        showMessage('driverMessage', 'Trip marked as arrived.', false);
        if (arrivePayload?.driverAvailableBalance !== undefined) {
          updateDriverWalletDisplay(arrivePayload.driverAvailableBalance, arrivePayload.driverHoldingBalance || 0);
          updateStoredUser({
            walletBalance: Number(arrivePayload.driverAvailableBalance || 0),
            driverAvailableBalance: Number(arrivePayload.driverAvailableBalance || 0),
            driverHoldingBalance: Number(arrivePayload.driverHoldingBalance || 0),
          });
        }
        await loadDriverTrips();
        await loadDriverBookings();

        const pendingEntries = (arrivePayload.bookings || [])
          .filter((booking) => !booking.driverRatedStudent?.score)
          .map((booking) => ({
            bookingId: booking._id,
            name: booking.student?.name || 'Student',
          }));

        if (pendingEntries.length) {
          openRatingPopup({
            titleText: 'Rate your students',
            entries: pendingEntries,
            role: 'driver',
            onSubmitted: async () => {
              await loadDriverBookings();
              await loadDriverTrips();
            },
          });
        }
      },
    });
  } catch (error) {
    showMessage('driverMessage', 'Unable to open trip popup.');
  }
};

const loadStudentDashboard = async () => {
  const user = getUser();
  if (!getToken() || !user || user.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }

  const studentInfo = document.getElementById('studentInfo');
  if (studentInfo) {
    studentInfo.textContent = `Connecte en tant que ${user.name} (${user.email})`;
  }

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('transportToken');
    localStorage.removeItem('transportUser');
    window.location.href = 'index.html';
  });

  const rewardsList = document.getElementById('loyaltyRewardsList');
  if (rewardsList && !rewardsList.dataset.bound) {
    rewardsList.dataset.bound = 'true';
    rewardsList.addEventListener('click', async (event) => {
      const button = event.target.closest('.loyalty-redeem-btn');
      if (!button) return;
      const rewardId = button.getAttribute('data-reward-id');
      if (!rewardId) return;

      button.disabled = true;
      try {
        const payload = await redeemLoyaltyReward(rewardId);
        showMessage('loyaltyMessage', payload.message || 'Reward redeemed.', false);
        await refreshStudentLoyalty();
      } catch (error) {
        showMessage('loyaltyMessage', error.message || 'Unable to redeem reward.');
      } finally {
        button.disabled = false;
      }
    });
  }

  try {
    try {
      await refreshStudentLoyalty();
    } catch (loyaltyError) {
      showMessage('loyaltyMessage', loyaltyError.message || 'Unable to load Go Fidélité.');
    }

    const response = await fetch(`${apiBase}/bookings/student`, {
      headers: authHeaders(),
    });

    const bookings = await parseResponseBody(response);
    const list = document.getElementById('studentBookings');
    if (!list) return;

    list.innerHTML = '';
    if (!response.ok) {
      list.innerHTML = `<p class="profile-pill">${bookings.message || 'Impossible de charger les reservations.'}</p>`;
      return;
    }

    if (!Array.isArray(bookings) || bookings.length === 0) {
      list.innerHTML = '<p class="profile-pill">Aucune reservation pour le moment. Recherchez un trajet pour commencer.</p>';
      return;
    }

    bookings.forEach((booking) => list.appendChild(buildBookingCard(booking)));

    const activeBooking = bookings.find((booking) => booking.trip?.status === 'in_progress');
    if (activeBooking) {
      showRideWindow({
        trip: activeBooking.trip,
        bookings: [activeBooking],
        role: 'student',
      });
    }

    const ratingEntries = bookings
      .filter((booking) => booking.trip?.status === 'completed' && !booking.studentRatedDriver?.score)
      .map((booking) => ({
        bookingId: booking._id,
        name: booking.trip?.driver?.name || 'Driver',
      }));

    if (ratingEntries.length) {
      openRatingPopup({
        titleText: 'Rate your driver',
        entries: ratingEntries,
        role: 'student',
        onSubmitted: loadStudentDashboard,
      });
    }
  } catch (error) {
    showMessage('studentInfo', 'Unable to load bookings.');
  }
};

const loadDriverDashboard = async () => {
  const user = getUser();
  if (!getToken() || !user || user.role !== 'driver') {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('driverInfo').textContent = `Logged in as ${user.name} (${user.email})`;
  populateDriverCitySelects();

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('transportToken');
    localStorage.removeItem('transportUser');
    window.location.href = 'index.html';
  });

  const notificationsToggle = document.getElementById('driverNotificationsToggle');
  const notificationsPanel = document.getElementById('driverNotificationsPanel');
  if (notificationsToggle && notificationsPanel && !notificationsToggle.dataset.bound) {
    notificationsToggle.dataset.bound = 'true';
    notificationsToggle.addEventListener('click', async () => {
      notificationsPanel.classList.toggle('is-open');
      if (notificationsPanel.classList.contains('is-open')) {
        await fetch(`${apiBase}/bookings/driver/notifications/seen`, {
          method: 'PATCH',
          headers: authHeaders(),
        });
        await loadDriverBookings();
      }
    });

    notificationsPanel.addEventListener('click', async (event) => {
      const target = event.target.closest('.notification-delete');
      if (!target) return;
      const bookingId = target.getAttribute('data-booking-id');
      if (!bookingId) return;

      target.disabled = true;
      try {
        await deleteDriverNotification(bookingId);
        await loadDriverBookings();
      } catch (error) {
        showMessage('driverMessage', error.message || 'Unable to delete notification.');
      } finally {
        target.disabled = false;
      }
    });
  }

  const walletData = await fetchWalletBalance();
  if (walletData !== null) {
    updateDriverWalletDisplay(walletData.driverAvailableBalance, walletData.driverHoldingBalance);
    updateStoredUser({
      walletBalance: walletData.driverAvailableBalance,
      driverAvailableBalance: walletData.driverAvailableBalance,
      driverHoldingBalance: walletData.driverHoldingBalance,
    });
  } else if (user.walletBalance !== undefined) {
    updateDriverWalletDisplay(user.driverAvailableBalance ?? user.walletBalance, user.driverHoldingBalance || 0);
  }

  document.getElementById('withdrawForm')?.addEventListener('submit', handleDriverWithdraw);

  const enableReturnTripInput = document.getElementById('enableReturnTrip');
  const returnTripFields = document.getElementById('returnTripFields');
  const returnDateInput = document.getElementById('returnDate');
  const returnTimeInput = document.getElementById('returnTime');
  const returnPriceInput = document.getElementById('returnPrice');
  const returnSeatsInput = document.getElementById('returnSeats');

  const syncReturnTripVisibility = () => {
    const enabled = !!enableReturnTripInput?.checked;
    if (returnTripFields) {
      returnTripFields.style.display = enabled ? 'grid' : 'none';
    }
    if (returnDateInput) returnDateInput.required = enabled;
    if (returnTimeInput) returnTimeInput.required = enabled;
    if (returnPriceInput) returnPriceInput.required = enabled;
    if (returnSeatsInput) returnSeatsInput.required = enabled;
  };

  if (enableReturnTripInput && !enableReturnTripInput.dataset.bound) {
    enableReturnTripInput.dataset.bound = 'true';
    enableReturnTripInput.addEventListener('change', syncReturnTripVisibility);
  }
  syncReturnTripVisibility();

  document.getElementById('tripForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const departureCity = document.getElementById('departureCity').value.trim();
    const destinationCity = document.getElementById('destinationCity').value.trim();
    const departureDate = document.getElementById('departureDate').value;
    const departureTime = document.getElementById('departureTime').value;
    const price = Number(document.getElementById('tripPrice').value);
    const totalSeats = Number(document.getElementById('tripSeats').value);
    const description = document.getElementById('tripDescription').value.trim();
    const withReturnTrip = !!enableReturnTripInput?.checked;
    const returnDate = document.getElementById('returnDate')?.value || '';
    const returnTime = document.getElementById('returnTime')?.value || '';
    const returnPrice = Number(document.getElementById('returnPrice')?.value || 0);
    const returnSeats = Number(document.getElementById('returnSeats')?.value || 0);
    const returnDescription = document.getElementById('returnDescription')?.value?.trim() || '';

    if (!departureCity || !destinationCity) {
      showMessage('driverMessage', 'Please select departure and destination cities.');
      return;
    }
    if (departureCity === destinationCity) {
      showMessage('driverMessage', 'Departure and destination must be different cities.');
      return;
    }

    if (withReturnTrip) {
      if (!returnDate || !returnTime || !returnPrice || !returnSeats) {
        showMessage('driverMessage', 'Please fill all return trip fields.');
        return;
      }
      if (returnPrice < 0 || returnSeats <= 0) {
        showMessage('driverMessage', 'Return trip price/seats are invalid.');
        return;
      }
    }

    try {
      const outboundResponse = await fetch(`${apiBase}/trips`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ departureCity, destinationCity, departureDate, departureTime, price, totalSeats, description }),
      });

      const outboundData = await parseResponseBody(outboundResponse);
      if (!outboundResponse.ok) {
        showMessage('driverMessage', outboundData.message || 'Unable to publish trip.');
        return;
      }

      if (withReturnTrip) {
        const returnResponse = await fetch(`${apiBase}/trips`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            departureCity: destinationCity,
            destinationCity: departureCity,
            departureDate: returnDate,
            departureTime: returnTime,
            price: returnPrice,
            totalSeats: returnSeats,
            description: returnDescription,
          }),
        });

        const returnData = await parseResponseBody(returnResponse);
        if (!returnResponse.ok) {
          showMessage('driverMessage', `Go trip published, but back trip failed: ${returnData.message || 'Unable to publish return trip.'}`);
          await loadDriverTrips();
          await loadDriverBookings();
          return;
        }
      }

      showMessage('driverMessage', withReturnTrip ? 'Go and back trips published successfully!' : 'Trip published successfully!', false);
      document.getElementById('tripForm')?.reset();
      syncReturnTripVisibility();
      await loadDriverTrips();
      await loadDriverBookings();
    } catch (error) {
      showMessage('driverMessage', 'Network error while creating trip.');
    }
  });

  const trips = await loadDriverTrips();
  await loadDriverBookings();

  if (window.__driverBookingsPoller) {
    clearInterval(window.__driverBookingsPoller);
  }
  window.__driverBookingsPoller = setInterval(() => {
    loadDriverBookings();
  }, 15000);

  const inProgressTrip = (Array.isArray(trips) ? trips : []).find((trip) => trip.status === 'in_progress');
  if (inProgressTrip) {
    const sessionKey = `driverTripPopup:${inProgressTrip._id}`;
    if (sessionStorage.getItem(sessionKey) !== 'shown') {
      sessionStorage.setItem(sessionKey, 'shown');
      await openDriverTripPopup(inProgressTrip._id, 'open');
    }
  }
};

const loadDriverTrips = async () => {
  const response = await fetch(`${apiBase}/trips/driver/list`, { headers: authHeaders() });
  const trips = await parseResponseBody(response);

  const list = document.getElementById('driverTrips');
  if (!list) return [];

  list.innerHTML = '';
  if (!response.ok || !Array.isArray(trips) || trips.length === 0) {
    list.innerHTML = '<p>No trips published yet.</p>';
    return [];
  }

  trips.forEach((trip) => {
    const statusLabel = trip.status === 'in_progress' ? 'In progress' : trip.status === 'completed' ? 'Completed' : 'Scheduled';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${trip.departureCity} &rarr; ${trip.destinationCity}</h3>
      <p><strong>Date:</strong> ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}</p>
      <p><strong>Seats:</strong> ${trip.availableSeats} / ${trip.totalSeats}</p>
      <p><strong>Price:</strong> ${trip.price} MAD</p>
      <p><strong>Status:</strong> ${statusLabel}</p>
      ${trip.status === 'scheduled'
        ? `<button type="button" class="btn btn-primary trip-start-btn" data-trip-id="${trip._id}" data-mode="start">${isTripAboutToStart(trip) ? 'Start Trip' : 'Start Trip Early'}</button>`
        : trip.status === 'in_progress'
          ? `<button type="button" class="btn btn-secondary trip-start-btn" data-trip-id="${trip._id}" data-mode="open">Open Trip Window</button>`
          : ''}
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.trip-start-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tripId = btn.getAttribute('data-trip-id');
      const mode = btn.getAttribute('data-mode') || 'start';
      if (tripId) openDriverTripPopup(tripId, mode);
    });
  });

  return trips;
};

const loadDriverBookings = async () => {
  try {
    const payload = await fetchDriverBookingsPayload();
    const bookings = Array.isArray(payload?.bookings) ? payload.bookings : [];

    const list = document.getElementById('driverBookings');
    if (!list) return;

    list.innerHTML = '';
    renderDriverNotifications(payload);

    if (!bookings.length) {
      list.innerHTML = '<p>No bookings yet for your trips.</p>';
      return;
    }

    bookings.forEach((booking) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${booking.trip?.departureCity || 'Depart'} &rarr; ${booking.trip?.destinationCity || 'Arrivee'}</h3>
        <p><strong>Student:</strong> ${booking.student?.name || 'Unknown'}</p>
        <p><strong>Email:</strong> ${booking.student?.email || 'Unknown'}</p>
        <p><strong>Seats booked:</strong> ${booking.seatsBooked}</p>
        <p><strong>Request:</strong> ${booking.studentComment || 'No request.'}</p>
      `;
      list.appendChild(card);
    });

    const pendingEntries = bookings
      .filter((booking) => booking.trip?.status === 'completed' && !booking.driverRatedStudent?.score)
      .map((booking) => ({
        bookingId: booking._id,
        name: booking.student?.name || 'Student',
      }));

    if (pendingEntries.length) {
      openRatingPopup({
        titleText: 'Rate your students',
        entries: pendingEntries,
        role: 'driver',
        onSubmitted: loadDriverBookings,
      });
    }
  } catch (error) {
    showMessage('driverMessage', 'Unable to load driver bookings.');
  }
};

const toPublicUploadUrl = (filePath) => {
  if (!filePath) return null;
  const fileName = String(filePath).split(/[/\\]/).pop();
  return fileName ? `/uploads/${fileName}` : null;
};

const normalizeStatus = (status, accountApproved) => {
  if (accountApproved || status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
};

const statusLabel = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
};

const statusClassName = (status) => {
  if (status === 'approved') return 'status-pill status-approved';
  if (status === 'rejected') return 'status-pill status-rejected';
  return 'status-pill status-pending';
};

const getFileExtension = (fileUrl) => {
  if (!fileUrl) return '';
  const cleanUrl = String(fileUrl).split('?')[0].split('#')[0];
  const extension = cleanUrl.split('.').pop();
  return extension ? extension.toLowerCase() : '';
};

const isImageFile = (fileUrl) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'jfif'].includes(getFileExtension(fileUrl));
const isPdfFile = (fileUrl) => getFileExtension(fileUrl) === 'pdf';

const ensureAdminPreviewModal = () => {
  let modal = document.getElementById('adminDocPreviewModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'adminDocPreviewModal';
  modal.className = 'admin-doc-preview-modal';
  modal.innerHTML = `
    <div class="admin-doc-preview-backdrop" data-action="close-doc-preview"></div>
    <section class="admin-doc-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="adminDocPreviewTitle">
      <header class="admin-doc-preview-header">
        <h4 id="adminDocPreviewTitle">Document Preview</h4>
        <button type="button" class="admin-doc-preview-close" data-action="close-doc-preview" aria-label="Close preview">&times;</button>
      </header>
      <div id="adminDocPreviewBody" class="admin-doc-preview-body"></div>
    </section>
  `;
  document.body.appendChild(modal);
  return modal;
};

const closeAdminDocumentPreview = () => {
  const modal = document.getElementById('adminDocPreviewModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
};

const ensureAdminRejectModal = () => {
  let modal = document.getElementById('adminRejectModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'adminRejectModal';
  modal.className = 'admin-reject-modal';
  modal.innerHTML = `
    <div class="admin-reject-backdrop" data-action="close-reject-modal"></div>
    <section class="admin-reject-dialog" role="dialog" aria-modal="true" aria-labelledby="adminRejectTitle">
      <header class="admin-reject-header">
        <h4 id="adminRejectTitle">Reject Documents</h4>
        <button type="button" class="admin-reject-close" data-action="close-reject-modal" aria-label="Close">&times;</button>
      </header>
      <form id="adminRejectForm" class="admin-reject-form">
        <label for="adminRejectReason">Rejection reason</label>
        <textarea id="adminRejectReason" rows="5" placeholder="Write why this document set is rejected..." required></textarea>
        <div class="header-actions">
          <button type="button" class="btn btn-secondary" data-action="close-reject-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Reject User</button>
        </div>
      </form>
    </section>
  `;

  document.body.appendChild(modal);

  const form = modal.querySelector('#adminRejectForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const userId = modal.getAttribute('data-user-id');
      const reasonInput = modal.querySelector('#adminRejectReason');
      const rejectionReason = String(reasonInput?.value || '').trim();

      if (!userId) return;
      if (!rejectionReason) {
        showMessage('adminUsersMessage', 'Please provide a rejection reason.');
        return;
      }

      try {
        const response = await fetch(`${apiBase}/auth/admin/users/${userId}/validate-documents`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ approved: false, rejectionReason }),
        });
        const data = await parseResponseBody(response);
        if (!response.ok) {
          showMessage('adminUsersMessage', data.message || 'Unable to reject documents.');
          return;
        }
        closeAdminRejectModal();
        showMessage('adminUsersMessage', data.message || 'Documents rejected.', false);
        await loadAdminDashboard();
      } catch (error) {
        showMessage('adminUsersMessage', 'Unable to reject documents.');
      }
    });
  }

  return modal;
};

const openAdminRejectModal = (userId) => {
  if (!userId) return;
  const modal = ensureAdminRejectModal();
  const reasonInput = modal.querySelector('#adminRejectReason');
  if (reasonInput) reasonInput.value = '';
  modal.setAttribute('data-user-id', userId);
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
};

const closeAdminRejectModal = () => {
  const modal = document.getElementById('adminRejectModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.removeAttribute('data-user-id');
  document.body.classList.remove('modal-open');
};

const openAdminDocumentPreview = (fileUrl, label, ownerLabel) => {
  if (!fileUrl) return;

  const modal = ensureAdminPreviewModal();
  const title = modal.querySelector('#adminDocPreviewTitle');
  const body = modal.querySelector('#adminDocPreviewBody');
  if (!title || !body) return;

  title.textContent = `${label || 'Document'}${ownerLabel ? ` - ${ownerLabel}` : ''}`;

  if (isImageFile(fileUrl)) {
    body.innerHTML = `<img src="${fileUrl}" alt="${label || 'Document'}" class="admin-doc-preview-image" />`;
  } else if (isPdfFile(fileUrl)) {
    body.innerHTML = `<iframe src="${fileUrl}" title="${label || 'Document'}" class="admin-doc-preview-frame"></iframe>`;
  } else {
    body.innerHTML = `
      <div class="admin-doc-preview-fallback">
        <p>Inline preview is not available for this file type.</p>
        <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Open in new tab</a>
      </div>
    `;
  }

  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
};

const fetchAdminSummary = async () => {
  const response = await fetch(`${apiBase}/auth/admin/summary`, { headers: authHeaders() });
  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(data.message || 'Unable to load admin summary.');
  return data;
};

const fetchAdminPendingDocuments = async () => {
  const response = await fetch(`${apiBase}/auth/admin/documents/pending`, { headers: authHeaders() });
  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(data.message || 'Unable to load pending documents.');
  return Array.isArray(data) ? data : [];
};

const fetchAdminUsersTable = async () => {
  const response = await fetch(`${apiBase}/auth/admin/users/table`, { headers: authHeaders() });
  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(data.message || 'Unable to load users table.');
  return Array.isArray(data) ? data : [];
};

const fetchAdminWalletHistory = async () => {
  const response = await fetch(`${apiBase}/auth/admin/wallet/history`, { headers: authHeaders() });
  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(data.message || 'Unable to load admin wallet history.');
  return Array.isArray(data) ? data : [];
};

const formatAdminIncomeAmount = (amount) => `${Number(amount || 0).toFixed(2)} MAD`;

const getAdminWalletIncomeEntries = (entries) => entries
  .map((entry) => {
    const date = entry.createdAt ? new Date(entry.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return {
      date,
      amount: Number(entry.amountCreditedToAdmin || 0),
    };
  })
  .filter((entry) => entry && entry.amount > 0);

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildIncomeSeries = (incomeEntries) => {
  const now = new Date();
  const daily = [];
  const dailyTotals = new Map();
  const monthlyTotals = new Map();
  const yearlyTotals = new Map();

  incomeEntries.forEach(({ date, amount }) => {
    dailyTotals.set(getDateKey(date), (dailyTotals.get(getDateKey(date)) || 0) + amount);
    monthlyTotals.set(getMonthKey(date), (monthlyTotals.get(getMonthKey(date)) || 0) + amount);
    yearlyTotals.set(String(date.getFullYear()), (yearlyTotals.get(String(date.getFullYear())) || 0) + amount);
  });

  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = getDateKey(date);
    daily.push({
      label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      value: dailyTotals.get(key) || 0,
    });
  }

  const monthly = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(now.getFullYear(), monthIndex, 1);
    const key = getMonthKey(date);
    return {
      label: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      value: monthlyTotals.get(key) || 0,
    };
  });

  const years = Array.from(yearlyTotals.keys()).map(Number);
  const minYear = years.length ? Math.min(...years, now.getFullYear()) : now.getFullYear();
  const maxYear = years.length ? Math.max(...years, now.getFullYear()) : now.getFullYear();
  const yearly = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    yearly.push({
      label: String(year),
      value: yearlyTotals.get(String(year)) || 0,
    });
  }

  return { daily, monthly, yearly };
};

const renderAdminIncomeChart = (containerId, totalId, series) => {
  const container = document.getElementById(containerId);
  const totalNode = document.getElementById(totalId);
  if (!container) return;

  const total = series.reduce((sum, point) => sum + point.value, 0);
  if (totalNode) totalNode.textContent = formatAdminIncomeAmount(total);

  if (!series.length || total <= 0) {
    container.innerHTML = '<div class="admin-chart-empty">No income data yet.</div>';
    return;
  }

  const width = 420;
  const height = 230;
  const padTop = 22;
  const padRight = 12;
  const padBottom = 40;
  const padLeft = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const gap = Math.max(4, Math.min(10, plotW / series.length * 0.22));
  const barW = Math.max(8, (plotW - gap * (series.length - 1)) / series.length);
  const chartId = `${containerId}Gradient`;

  const bars = series.map((point, index) => {
    const barH = Math.max(point.value > 0 ? 4 : 0, (point.value / maxValue) * plotH);
    const x = padLeft + index * (barW + gap);
    const y = padTop + plotH - barH;
    const showValue = point.value > 0 && (series.length <= 12 || point.value === maxValue);
    return `
      <rect class="admin-chart-bar" fill="url(#${chartId})" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}"></rect>
      ${showValue ? `<text class="admin-chart-value-label" x="${(x + barW / 2).toFixed(1)}" y="${Math.max(12, y - 6).toFixed(1)}" text-anchor="middle">${Number(point.value).toFixed(0)}</text>` : ''}
      <text class="admin-chart-axis-label" x="${(x + barW / 2).toFixed(1)}" y="${height - 16}" text-anchor="middle">${point.label}</text>
    `;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Income bar chart">
      <defs>
        <linearGradient id="${chartId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4ade80"></stop>
          <stop offset="100%" stop-color="var(--primary)"></stop>
        </linearGradient>
      </defs>
      <line class="admin-chart-grid-line" x1="${padLeft}" y1="${padTop}" x2="${width - padRight}" y2="${padTop}"></line>
      <line class="admin-chart-grid-line" x1="${padLeft}" y1="${padTop + plotH / 2}" x2="${width - padRight}" y2="${padTop + plotH / 2}"></line>
      <line class="admin-chart-grid-line" x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}"></line>
      <text class="admin-chart-axis-label" x="${padLeft - 8}" y="${padTop + 4}" text-anchor="end">${maxValue.toFixed(0)}</text>
      <text class="admin-chart-axis-label" x="${padLeft - 8}" y="${padTop + plotH / 2 + 4}" text-anchor="end">${(maxValue / 2).toFixed(0)}</text>
      <text class="admin-chart-axis-label" x="${padLeft - 8}" y="${padTop + plotH + 4}" text-anchor="end">0</text>
      ${bars}
    </svg>
  `;
};

const renderAdminWalletIncomeCharts = (entries) => {
  const incomeEntries = getAdminWalletIncomeEntries(entries);
  const series = buildIncomeSeries(incomeEntries);
  renderAdminIncomeChart('adminIncomeDailyChart', 'adminIncomeDailyTotal', series.daily);
  renderAdminIncomeChart('adminIncomeMonthlyChart', 'adminIncomeMonthlyTotal', series.monthly);
  renderAdminIncomeChart('adminIncomeYearlyChart', 'adminIncomeYearlyTotal', series.yearly);
};

const setAdminText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};

const getLastThirtyDaySeries = (items, valueKey = 'count') => {
  const totals = new Map((items || []).map((item) => [item.date, Number(item[valueKey] || 0)]));
  const today = new Date();
  return Array.from({ length: 30 }, (_, index) => {
    const offset = 29 - index;
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = getDateKey(date);
    return {
      label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      value: totals.get(key) || 0,
    };
  });
};

const renderAdminDonutChart = (containerId, segments) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  if (total <= 0) {
    container.innerHTML = '<div class="admin-chart-empty">No data yet.</div>';
    return;
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = segments.map((segment) => {
    const value = Number(segment.value || 0);
    const length = (value / total) * circumference;
    const circle = `
      <circle
        class="admin-donut-segment"
        cx="90"
        cy="90"
        r="${radius}"
        stroke="${segment.color}"
        stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 90 90)"
      ></circle>
    `;
    offset += length;
    return circle;
  }).join('');

  const legend = segments.map((segment) => `
    <div class="admin-chart-legend-item">
      <span class="admin-chart-legend-name">
        <span class="admin-chart-swatch" style="--swatch:${segment.color}"></span>
        ${escapeHtml(segment.label)}
      </span>
      <span class="admin-chart-legend-value">${Number(segment.value || 0)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="admin-donut-wrap">
      <svg viewBox="0 0 180 180" role="img" aria-label="Donut chart">
        <circle class="admin-donut-track" cx="90" cy="90" r="${radius}"></circle>
        ${circles}
        <text class="admin-donut-center" x="90" y="86" text-anchor="middle">${total}</text>
        <text class="admin-donut-sub" x="90" y="104" text-anchor="middle">TOTAL</text>
      </svg>
      <div class="admin-chart-legend">${legend}</div>
    </div>
  `;
};

const renderAdminHorizontalChart = (containerId, rows, options = {}) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const normalizedRows = (rows || []).filter((row) => Number(row.value || 0) > 0);
  if (!normalizedRows.length) {
    container.innerHTML = '<div class="admin-chart-empty">No data yet.</div>';
    return;
  }

  const maxValue = Math.max(...normalizedRows.map((row) => Number(row.value || 0)), 1);
  container.innerHTML = `
    <div class="admin-horizontal-list">
      ${normalizedRows.map((row) => {
        const value = Number(row.value || 0);
        const width = Math.max(4, (value / maxValue) * 100);
        const detail = options.formatValue ? options.formatValue(row) : value;
        return `
          <div class="admin-horizontal-row">
            <span class="admin-horizontal-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</span>
            <span class="admin-horizontal-track">
              <span class="admin-horizontal-fill" style="width:${width.toFixed(1)}%"></span>
            </span>
            <span class="admin-horizontal-value">${detail}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

const renderAdminDashboardGraphics = (summary) => {
  const stats = summary?.stats || {};
  const totalBookings = Number(stats.totalBookings || 0);
  const totalRevenue = Number(stats.totalRevenue || 0);
  const totalFees = Number(stats.totalWithdrawalFees || 0);
  const totalWithdrawn = Number(stats.totalWithdrawnByDrivers || 0);
  const averageBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  setAdminText('adminTotalRevenue', formatAdminIncomeAmount(totalRevenue));
  setAdminText('adminAverageBookingValue', `Average booking: ${formatAdminIncomeAmount(averageBooking)}`);
  setAdminText('adminSeatsBooked', Number(stats.totalSeatsBooked || 0));
  setAdminText('adminConfirmedBookings', `Confirmed bookings: ${Number(stats.confirmedBookings || 0)}`);
  setAdminText('adminPendingDocuments', Number(stats.pendingDocumentsCount || 0));
  setAdminText('adminRejectedDocuments', `Rejected documents: ${Number(stats.rejectedDocumentsCount || 0)}`);
  setAdminText('adminWithdrawnByDrivers', formatAdminIncomeAmount(totalWithdrawn));
  setAdminText('adminFeeRate', `Admin fees collected: ${formatAdminIncomeAmount(totalFees)}`);

  const userStatus = stats.userStatusBreakdown || {};
  renderAdminDonutChart('adminUserStatusChart', [
    { label: 'Approved', value: Number(stats.approvedAccountsCount || userStatus.approved || 0), color: '#22c55e' },
    { label: 'Pending', value: Number(userStatus.pending || 0), color: '#f59e0b' },
    { label: 'Rejected', value: Number(userStatus.rejected || 0), color: '#ef4444' },
  ]);

  const tripStatus = stats.tripStatusBreakdown || {};
  renderAdminDonutChart('adminTripStatusChart', [
    { label: 'Scheduled', value: Number(tripStatus.scheduled || 0), color: 'var(--primary)' },
    { label: 'In Progress', value: Number(tripStatus.in_progress || 0), color: '#f59e0b' },
    { label: 'Completed', value: Number(tripStatus.completed || 0), color: '#22c55e' },
  ]);

  renderAdminIncomeChart('adminBookingsTrendChart', '', getLastThirtyDaySeries(stats.recentBookings, 'count'));
  renderAdminIncomeChart('adminRevenueTrendChart', '', getLastThirtyDaySeries(stats.recentBookings, 'revenue'));
  renderAdminIncomeChart('adminTripsTrendChart', '', getLastThirtyDaySeries(stats.recentTrips, 'count'));

  renderAdminHorizontalChart(
    'adminPaymentMethodsChart',
    (stats.paymentBreakdown || []).map((item) => ({
      label: item.method || 'unknown',
      value: Number(item.count || 0),
      total: Number(item.total || 0),
    })),
    {
      formatValue: (row) => `${row.value} / ${formatAdminIncomeAmount(row.total)}`,
    }
  );

  renderAdminHorizontalChart(
    'adminTopRoutesChart',
    (stats.topRoutes || []).map((route) => ({
      label: `${route.departureCity || '-'} -> ${route.destinationCity || '-'}`,
      value: Number(route.count || 0),
    })),
    {
      formatValue: (row) => `${row.value} trip${row.value > 1 ? 's' : ''}`,
    }
  );
};

const renderAdminWalletHistory = (entries) => {
  const container = document.getElementById('adminWalletHistoryList');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<p class="small-text">No admin wallet transactions yet.</p>';
    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const dateLabel = entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : 'Date inconnue';
      return `
        <article class="history-item">
          <div class="history-item-head">
            <span class="history-item-title">${entry.title || 'Wallet Transaction'}</span>
            <span class="history-item-title history-amount-positive">+${Number(entry.amountCreditedToAdmin || 0).toFixed(2)} MAD</span>
          </div>
          <p class="history-item-date">${dateLabel}</p>
          <p class="history-item-meta">Driver: ${entry.driverName || '-'}</p>
          <p class="history-item-meta">Requested: ${Number(entry.amountRequestedByDriver || 0).toFixed(2)} MAD | Sent: ${Number(entry.amountSentToDriver || 0).toFixed(2)} MAD</p>
        </article>
      `;
    })
    .join('');
};

const renderAdminPendingDocs = (users) => {
  const container = document.getElementById('adminPendingDocs');
  if (!container) return;

  if (!users.length) {
    container.innerHTML = '<p class="small-text">No pending or rejected documents.</p>';
    return;
  }

  container.innerHTML = users
    .map((user) => {
      const docs = [
        { label: 'Profile Pic', url: toPublicUploadUrl(user.profilePic) },
        { label: 'Scholarship', url: toPublicUploadUrl(user.scholarshipCard) },
        { label: 'ID Card PDF', url: toPublicUploadUrl(user.idCardPdf) },
        { label: 'Driving Licence', url: toPublicUploadUrl(user.drivingLicence) },
        ...((user.carDocuments || []).map((doc, idx) => ({ label: `Car Doc ${idx + 1}`, url: toPublicUploadUrl(doc) }))),
      ].filter((doc) => !!doc.url);
      const ownerLabel = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
      const status = normalizeStatus(user.documentsValidationStatus, user.accountApproved);
      const statusBadgeClass = statusClassName(status);
      const statusText = statusLabel(status);

      return `
        <article class="history-item">
          <div class="history-item-head">
            <span class="history-item-title">${user.firstName || ''} ${user.lastName || ''} (${user.role})</span>
            <span class="${statusBadgeClass}">${statusText}</span>
          </div>
          <p class="history-item-meta">${user.email}</p>
          ${
            status === 'rejected' && user.documentsRejectionReason
              ? `<p class="history-item-meta status-reason">Reason: ${user.documentsRejectionReason}</p>`
              : ''
          }
          <div class="doc-links">
            ${docs
              .map(
                (doc) => `
                  <button
                    type="button"
                    class="doc-preview-btn"
                    data-action="preview-doc"
                    data-doc-url="${encodeURIComponent(doc.url)}"
                    data-doc-label="${encodeURIComponent(doc.label)}"
                    data-doc-owner="${encodeURIComponent(ownerLabel)}"
                  >
                    ${doc.label}
                  </button>
                `
              )
              .join('')}
          </div>
          <div class="header-actions" style="margin-top:0.5rem;">
            <button class="btn btn-primary" data-action="validate-doc" data-user-id="${user._id}" data-approved="true">Approve</button>
            <button class="btn btn-secondary" data-action="open-reject-modal" data-user-id="${user._id}">Reject</button>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderAdminUsersTable = (rows) => {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const status = normalizeStatus(row.documentsValidationStatus, row.accountApproved);
      const statusBadgeClass = statusClassName(status);
      const statusText = statusLabel(status);
      return `
      <tr class="status-row-${status}">
        <td><input type="text" data-field="firstName" data-user-id="${row.id}" value="${row.firstName || ''}" /></td>
        <td><input type="text" data-field="lastName" data-user-id="${row.id}" value="${row.lastName || ''}" /></td>
        <td><input type="email" data-field="email" data-user-id="${row.id}" value="${row.email || ''}" /></td>
        <td><input type="text" data-field="password" data-user-id="${row.id}" placeholder="New password" /></td>
        <td>${row.sexe || '-'}</td>
        <td>${row.role || '-'}</td>
        <td>${Number(row.balance || 0).toFixed(2)} MAD</td>
        <td>${Number(row.amountSpent || 0).toFixed(2)} MAD</td>
        <td>${Number(row.amountWithdrawn || 0).toFixed(2)} MAD</td>
        <td><span class="${statusBadgeClass}">${statusText}</span>${status === 'rejected' && row.documentsRejectionReason ? `<p class="status-reason">${row.documentsRejectionReason}</p>` : ''}</td>
        <td><button class="btn btn-secondary" data-action="save-user" data-user-id="${row.id}">Save</button></td>
      </tr>
    `;
    })
    .join('');
};

const bindAdminActions = () => {
  if (window.__adminActionsBound) return;
  window.__adminActionsBound = true;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAdminDocumentPreview();
      closeAdminRejectModal();
    }
  });

  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.action === 'preview-doc') {
      const fileUrl = decodeURIComponent(target.dataset.docUrl || '');
      const label = decodeURIComponent(target.dataset.docLabel || 'Document');
      const owner = decodeURIComponent(target.dataset.docOwner || '');
      openAdminDocumentPreview(fileUrl, label, owner);
      return;
    }

    if (target.dataset.action === 'close-doc-preview') {
      closeAdminDocumentPreview();
      return;
    }

    if (target.dataset.action === 'open-reject-modal') {
      openAdminRejectModal(target.dataset.userId);
      return;
    }

    if (target.dataset.action === 'close-reject-modal') {
      closeAdminRejectModal();
      return;
    }

    if (target.dataset.action === 'validate-doc') {
      const userId = target.dataset.userId;
      const approved = target.dataset.approved === 'true';
      try {
        const response = await fetch(`${apiBase}/auth/admin/users/${userId}/validate-documents`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ approved, rejectionReason: '' }),
        });
        const data = await parseResponseBody(response);
        if (!response.ok) {
          showMessage('adminUsersMessage', data.message || 'Unable to validate documents.');
          return;
        }
        showMessage('adminUsersMessage', data.message || 'Documents status updated.', false);
        await loadAdminDashboard();
      } catch (error) {
        showMessage('adminUsersMessage', 'Unable to validate documents.');
      }
    }

    if (target.dataset.action === 'save-user') {
      const userId = target.dataset.userId;
      const firstNameInput = document.querySelector(`input[data-field="firstName"][data-user-id="${userId}"]`);
      const lastNameInput = document.querySelector(`input[data-field="lastName"][data-user-id="${userId}"]`);
      const emailInput = document.querySelector(`input[data-field="email"][data-user-id="${userId}"]`);
      const passwordInput = document.querySelector(`input[data-field="password"][data-user-id="${userId}"]`);

      const payload = {
        firstName: firstNameInput?.value?.trim() || '',
        lastName: lastNameInput?.value?.trim() || '',
        email: emailInput?.value?.trim() || '',
      };

      const newPassword = passwordInput?.value?.trim() || '';
      if (newPassword) payload.password = newPassword;

      try {
        const response = await fetch(`${apiBase}/auth/admin/users/${userId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await parseResponseBody(response);
        if (!response.ok) {
          showMessage('adminUsersMessage', data.message || 'Unable to update user.');
          return;
        }
        showMessage('adminUsersMessage', data.message || 'User updated.', false);
        await loadAdminDashboard();
      } catch (error) {
        showMessage('adminUsersMessage', 'Unable to update user.');
      }
    }
  });
};

const ensureAdminPageAccess = () => {
  const user = getUser();
  if (!getToken() || !user || user.role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const bindAdminLogoutActions = () => {
  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('transportToken');
    localStorage.removeItem('transportUser');
    window.location.href = 'index.html';
  });
  document.getElementById('logoutNav')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('transportToken');
    localStorage.removeItem('transportUser');
    window.location.href = 'index.html';
  });
};

const bindApproveExistingUsersAction = (reloadFn) => {
  document.getElementById('approveExistingUsersButton')?.addEventListener('click', async () => {
    try {
      const response = await fetch(`${apiBase}/auth/admin/users/approve-existing`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await parseResponseBody(response);
      if (!response.ok) {
        showMessage('adminUsersMessage', data.message || 'Unable to approve existing users.');
        return;
      }
      showMessage('adminUsersMessage', data.message || 'Existing users approved.', false);
      if (typeof reloadFn === 'function') await reloadFn();
    } catch (error) {
      showMessage('adminUsersMessage', 'Unable to approve existing users.');
    }
  }, { once: true });
};

const applyAdminSummaryToPage = (summary) => {
  const adminInfo = document.getElementById('adminInfo');
  const adminWallet = document.getElementById('adminWallet');
  const adminStudentsCount = document.getElementById('adminStudentsCount');
  const adminDriversCount = document.getElementById('adminDriversCount');
  const adminTripsCount = document.getElementById('adminTripsCount');
  const adminBookingsCount = document.getElementById('adminBookingsCount');
  const adminFeesTotal = document.getElementById('adminFeesTotal');

  if (adminInfo) adminInfo.textContent = `${summary.admin.name} (${summary.admin.email})`;
  if (adminWallet) adminWallet.textContent = `${Number(summary.admin.walletBalance || 0).toFixed(2)} MAD`;
  if (adminStudentsCount) adminStudentsCount.textContent = summary.stats.studentsCount || 0;
  if (adminDriversCount) adminDriversCount.textContent = summary.stats.driversCount || 0;
  if (adminTripsCount) adminTripsCount.textContent = summary.stats.totalTrips || 0;
  if (adminBookingsCount) adminBookingsCount.textContent = summary.stats.totalBookings || 0;
  if (adminFeesTotal) adminFeesTotal.textContent = `${Number(summary.stats.totalWithdrawalFees || 0).toFixed(2)} MAD`;
  renderAdminDashboardGraphics(summary);
};

const loadAdminDashboard = async () => {
  if (!ensureAdminPageAccess()) return;

  bindAdminLogoutActions();
  try {
    const summary = await fetchAdminSummary();
    applyAdminSummaryToPage(summary);
  } catch (error) {
    showMessage('adminInfo', error.message || 'Unable to load admin summary.');
  }
};

const loadAdminWalletPage = async () => {
  if (!ensureAdminPageAccess()) return;

  bindAdminLogoutActions();
  try {
    const [summary, history] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminWalletHistory(),
    ]);
    applyAdminSummaryToPage(summary);
    renderAdminWalletIncomeCharts(history);
    renderAdminWalletHistory(history);
  } catch (error) {
    showMessage('adminInfo', error.message || 'Unable to load admin wallet summary.');
  }
};

const loadAdminDocumentsPage = async () => {
  if (!ensureAdminPageAccess()) return;

  bindAdminLogoutActions();
  bindAdminActions();

  try {
    const [summary, pendingDocs] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminPendingDocuments(),
    ]);
    applyAdminSummaryToPage(summary);
    renderAdminPendingDocs(pendingDocs);
  } catch (error) {
    showMessage('adminInfo', error.message || 'Unable to load documents validation page.');
  }
};

const loadAdminUsersPage = async () => {
  if (!ensureAdminPageAccess()) return;

  bindAdminLogoutActions();
  bindAdminActions();
  bindApproveExistingUsersAction(loadAdminUsersPage);

  try {
    const [summary, usersTable] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminUsersTable(),
    ]);
    applyAdminSummaryToPage(summary);
    renderAdminUsersTable(usersTable);
  } catch (error) {
    showMessage('adminInfo', error.message || 'Unable to load users table.');
  }
};

const attachPageHandlers = () => {
  const path = window.location.pathname.split('/').pop();

  if (window.__driverBookingsPoller) {
    clearInterval(window.__driverBookingsPoller);
    window.__driverBookingsPoller = null;
  }

  initializePinkModeToggle();
  initializeDarkModeToggle();

  switch (path) {
    case 'index.html':
    case '':
      document.getElementById('filterButton')?.addEventListener('click', fetchTrips);
      document.getElementById('destinationFilter')?.addEventListener('input', fetchTrips);
      updateSidebarUser();
      fetchTrips();
      break;
    case 'login.html':
      document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
      break;
    case 'forgot-password.html':
      document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
      break;
    case 'reset-password.html':
      document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);
      break;
    case 'register.html':
      document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
      break;
    case 'trip.html':
      loadTripPage();
      break;
    case 'profile.html':
      updateSidebarUser();
      loadProfilePage();
      break;
    case 'student-dashboard.html':
      updateSidebarUser();
      document.getElementById('filterButton')?.addEventListener('click', fetchTrips);
      document.getElementById('destinationFilter')?.addEventListener('input', fetchTrips);
      document.getElementById('dateFilter')?.addEventListener('change', fetchTrips);
      document.getElementById('priceFilter')?.addEventListener('input', fetchTrips);
      fetchTrips();
      loadStudentDashboard();
      break;
    case 'receipt.html':
      loadReceiptPage();
      break;
    case 'wallet.html':
      updateSidebarUser();
      loadWalletPage();
      break;
    case 'driver-dashboard.html':
      updateSidebarUser();
      loadDriverDashboard();
      break;
    case 'admin-dashboard.html':
      loadAdminDashboard();
      break;
    case 'admin-wallet.html':
      loadAdminWalletPage();
      break;
    case 'admin-documents.html':
      loadAdminDocumentsPage();
      break;
    case 'admin-users.html':
      loadAdminUsersPage();
      break;
    default:
      if (!path) fetchTrips();
      break;
  }
};

attachPageHandlers();
translatePage();
setLanguage(currentLang);
