const apiBase = '/api';

const getToken = () => localStorage.getItem('transportToken');
const getUser = () => JSON.parse(localStorage.getItem('transportUser')) || null;
const getPinkMode = () => localStorage.getItem('goStudentPinkMode') === 'on';
const getDarkMode = () => localStorage.getItem('goStudentDarkMode') === 'on';

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

const updateWalletDisplay = (balance) => {
  const walletBalanceElement = document.getElementById('walletBalance');
  if (walletBalanceElement) {
    walletBalanceElement.textContent = `Solde du portefeuille : ${balance.toFixed(2)} MAD`;
  }
};

const updateDriverWalletDisplay = (balance) => {
  const walletBalanceElement = document.getElementById('driverWalletBalance');
  if (walletBalanceElement) {
    walletBalanceElement.textContent = `Solde du portefeuille : ${Number(balance || 0).toFixed(2)} MAD`;
  }
};

const fetchWalletBalance = async () => {
  if (!getToken()) return null;
  try {
    const response = await fetch(`${apiBase}/auth/wallet`, { headers: authHeaders() });
    const data = await parseResponseBody(response);
    if (!response.ok) return null;
    return data.walletBalance;
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
};

const handleWalletTopUp = async (event) => {
  event.preventDefault();

  const amount = Number(document.getElementById('walletAmount')?.value || 0);
  const method = document.getElementById('walletMethod')?.value;
  const cardHolderName = document.getElementById('walletCardHolder')?.value?.trim() || '';
  const cardNumber = document.getElementById('walletCardNumber')?.value?.replace(/\s+/g, '') || '';
  const securityCode = document.getElementById('walletCardSecurity')?.value?.trim() || '';
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
    if (!cardHolderName || !cardNumber || !securityCode) {
      showMessage('walletMessage', 'Veuillez remplir toutes les informations de carte.', true);
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

    updateDriverWalletDisplay(data.driverWalletBalance || 0);
    updateWalletDisplay(data.driverWalletBalance || 0);
    updateStoredUser({ walletBalance: data.driverWalletBalance || 0 });
    showMessage(
      'withdrawMessage',
      `${data.message} Net envoye: ${Number(data.amountSentToDriver || 0).toFixed(2)} MAD.`,
      false
    );
  } catch (error) {
    showMessage('withdrawMessage', 'Erreur reseau pendant le retrait.', true);
  }
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
        <p class="ride-meta">${dateLabel} - ${driverGender}</p>
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

  card.innerHTML = `
    <div class="ride-main">
      <div class="driver-avatar">${initials(driverName)}</div>
      <div>
        <h3>${booking.trip?.destinationCity || 'Trajet reserve'}</h3>
        <p class="ride-meta">${dateLabel}</p>
        <p class="ride-extra">${booking.seatsBooked} place(s) reservee(s) - Statut: ${booking.confirmed ? 'Confirmee' : 'En attente'}</p>
        <p class="ride-extra">Paiement: ${booking.paymentMethod || 'wallet'} - Montant: ${booking.amountPaid || booking.trip?.price || 0} MAD</p>
      </div>
    </div>
    <span class="ride-price">${booking.trip?.price || 0} MAD</span>
  `;

  return card;
};

const logoutHandler = (e) => {
  e.preventDefault();
  localStorage.removeItem('transportToken');
  localStorage.removeItem('transportUser');
  window.location.href = 'index.html';
};

const updateSidebarUser = () => {
  const sidebarUser = document.querySelector('.sidebar-user');
  if (!sidebarUser) return;

  const user = getUser();
  const profileNav = document.querySelector('a[href="profile.html"]');
  const loginNav = document.querySelector('a[href="login.html"]');
  const registerNav = document.querySelector('a[href="register.html"]');
  const logoutNav = document.getElementById('logoutNav');
  const walletNav = document.querySelector('a[href="wallet.html"]');

  if (!user) {
    sidebarUser.innerHTML = `
      <div class="avatar-chip">OB</div>
      <div>
        <strong>Etudiant</strong>
        <p>Bienvenue</p>
      </div>
    `;
    if (profileNav) profileNav.href = 'login.html';
    if (loginNav) loginNav.style.display = 'block';
    if (registerNav) registerNav.style.display = 'block';
    if (logoutNav) {
      logoutNav.style.display = 'none';
      logoutNav.removeEventListener('click', logoutHandler);
    }
    if (walletNav) walletNav.style.display = 'none';
    return;
  }

  const profilePic = user.profilePic
    ? `/uploads/${String(user.profilePic).split(/[/\\]/).pop()}`
    : '';

  sidebarUser.innerHTML = `
    <a href="profile.html?id=${user.id}" class="avatar-chip">
      ${profilePic ? `<img src="${profilePic}" alt="${user.name}" style="width: 42px; height: 42px; border-radius: 50%;">` : initials(user.name)}
    </a>
    <div>
      <strong>${user.name}</strong>
      <p>${user.role === 'driver' ? 'Conducteur' : 'Etudiant'}</p>
    </div>
  `;
  if (profileNav) profileNav.href = `profile.html?id=${user.id}`;
  if (loginNav) loginNav.style.display = 'none';
  if (registerNav) registerNav.style.display = 'none';
  if (logoutNav) {
    logoutNav.style.display = 'block';
    logoutNav.addEventListener('click', logoutHandler);
  }
  if (walletNav) walletNav.style.display = ['student', 'driver'].includes(user.role) ? 'block' : 'none';
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

const handleRegister = async (event) => {
  event.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const role = document.getElementById('registerRole').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
  const description = document.getElementById('registerDescription')?.value?.trim() || '';

  const profilePic = document.getElementById('registerProfilePic')?.files?.[0] || null;
  const scholarshipCard = document.getElementById('registerScholarshipCard')?.files?.[0] || null;
  const drivingLicence = document.getElementById('registerDrivingLicence')?.files?.[0] || null;
  const carDocuments = Array.from(document.getElementById('registerCarDocuments')?.files || []);

  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('role', role);
  formData.append('gender', gender);
  formData.append('description', description);
  if (profilePic) formData.append('profilePic', profilePic);
  if (scholarshipCard) formData.append('scholarshipCard', scholarshipCard);

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
  const userId = params.get('id');

  if (!userId) {
    showMessage('profileMessage', 'User ID missing.');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/auth/profile/${userId}`);
    const profile = await parseResponseBody(response);

    if (!response.ok) {
      showMessage('profileMessage', profile.message || 'Unable to load profile.');
      return;
    }

    const details = document.getElementById('profileDetails');
    if (!details) return;

    const profilePic = profile.profilePic
      ? `/uploads/${String(profile.profilePic).split(/[/\\]/).pop()}`
      : '';
    const gender = profile.gender === 'male' ? 'Homme' : profile.gender === 'female' ? 'Femme' : 'Utilisateur';

    details.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">
          ${profilePic ? `<img src="${profilePic}" alt="${profile.name}" style="width: 100px; height: 100px; border-radius: 50%;">` : initials(profile.name)}
        </div>
        <div>
          <h3>${profile.name}</h3>
          <p>${gender}</p>
          <p>Note: ${profile.rating || 0}/5</p>
          <p>Trajets passes: ${profile.pastRides || 0}</p>
        </div>
      </div>
      <p><strong>Description:</strong> ${profile.description || 'Aucune description.'}</p>
    `;

    // Check if it's the user's own profile
    const user = getUser();
    if (user && user.id === userId) {
      document.getElementById('editProfile').style.display = 'block';
      document.getElementById('newDescription').value = profile.description || '';
      document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = document.getElementById('newDescription').value.trim();
        const profilePicFile = document.getElementById('newProfilePic').files[0];

        const formData = new FormData();
        formData.append('description', description);
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

    const walletStatus = document.getElementById('walletStatus');
    if (walletStatus) {
      const balance = await fetchWalletBalance();
      if (balance !== null) {
        walletStatus.textContent = `Solde du portefeuille : ${balance.toFixed(2)} MAD`;
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

      const bookingRes = await fetch(`${apiBase}/bookings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tripId, seatsBooked, paymentMethod }),
      });

      const data = await parseResponseBody(bookingRes);
      if (!bookingRes.ok) {
        showMessage('tripMessage', data.message || 'Booking failed.');
        return;
      }

      if (paymentMethod === 'wallet' && data.walletBalance !== undefined) {
        updateStoredUser({ walletBalance: data.walletBalance });
        if (walletStatus) {
          walletStatus.textContent = `Solde du portefeuille : ${data.walletBalance.toFixed(2)} MAD`;
        }
      }

      showMessage('tripMessage', 'Booking confirmed! Check your dashboard.', false);
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

  const walletBalance = await fetchWalletBalance();
  if (walletBalance !== null) {
    updateWalletDisplay(walletBalance);
    updateStoredUser({ walletBalance });
  } else if (user.walletBalance !== undefined) {
    updateWalletDisplay(user.walletBalance);
  }

  await renderPaymentHistory();
  if (isStudent) {
    document.getElementById('walletTopUpForm')?.addEventListener('submit', handleWalletTopUp);
  }
  if (isDriver) {
    document.getElementById('withdrawForm')?.addEventListener('submit', handleDriverWithdraw);
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

  try {
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

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('transportToken');
    localStorage.removeItem('transportUser');
    window.location.href = 'index.html';
  });

  const walletBalance = await fetchWalletBalance();
  if (walletBalance !== null) {
    updateDriverWalletDisplay(walletBalance);
    updateStoredUser({ walletBalance });
  } else if (user.walletBalance !== undefined) {
    updateDriverWalletDisplay(user.walletBalance);
  }

  document.getElementById('withdrawForm')?.addEventListener('submit', handleDriverWithdraw);

  document.getElementById('tripForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const departureCity = document.getElementById('departureCity').value.trim();
    const destinationCity = document.getElementById('destinationCity').value.trim();
    const departureDate = document.getElementById('departureDate').value;
    const departureTime = document.getElementById('departureTime').value;
    const price = Number(document.getElementById('tripPrice').value);
    const totalSeats = Number(document.getElementById('tripSeats').value);
    const description = document.getElementById('tripDescription').value.trim();

    try {
      const response = await fetch(`${apiBase}/trips`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ departureCity, destinationCity, departureDate, departureTime, price, totalSeats, description }),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        showMessage('driverMessage', data.message || 'Unable to publish trip.');
        return;
      }

      showMessage('driverMessage', 'Trip published successfully!', false);
      loadDriverTrips();
    } catch (error) {
      showMessage('driverMessage', 'Network error while creating trip.');
    }
  });

  await loadDriverTrips();
  await loadDriverBookings();
};

const loadDriverTrips = async () => {
  const response = await fetch(`${apiBase}/trips/driver/list`, { headers: authHeaders() });
  const trips = await parseResponseBody(response);

  const list = document.getElementById('driverTrips');
  if (!list) return;

  list.innerHTML = '';
  if (!response.ok || !Array.isArray(trips) || trips.length === 0) {
    list.innerHTML = '<p>No trips published yet.</p>';
    return;
  }

  trips.forEach((trip) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${trip.departureCity} &rarr; ${trip.destinationCity}</h3>
      <p><strong>Date:</strong> ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}</p>
      <p><strong>Seats:</strong> ${trip.availableSeats} / ${trip.totalSeats}</p>
      <p><strong>Price:</strong> ${trip.price} MAD</p>
    `;
    list.appendChild(card);
  });
};

const loadDriverBookings = async () => {
  try {
    const response = await fetch(`${apiBase}/bookings/driver`, { headers: authHeaders() });
    const bookings = await parseResponseBody(response);

    const list = document.getElementById('driverBookings');
    if (!list) return;

    list.innerHTML = '';
    if (!response.ok || !Array.isArray(bookings) || bookings.length === 0) {
      list.innerHTML = '<p>No bookings yet for your trips.</p>';
      return;
    }

    bookings.forEach((booking) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${booking.trip.departureCity} &rarr; ${booking.trip.destinationCity}</h3>
        <p><strong>Student:</strong> ${booking.student?.name || 'Unknown'}</p>
        <p><strong>Email:</strong> ${booking.student?.email || 'Unknown'}</p>
        <p><strong>Seats booked:</strong> ${booking.seatsBooked}</p>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    showMessage('driverMessage', 'Unable to load driver bookings.');
  }
};

const toPublicUploadUrl = (filePath) => {
  if (!filePath) return null;
  const fileName = String(filePath).split(/[/\\]/).pop();
  return fileName ? `/uploads/${fileName}` : null;
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
        { label: 'Driving Licence', url: toPublicUploadUrl(user.drivingLicence) },
        ...((user.carDocuments || []).map((doc, idx) => ({ label: `Car Doc ${idx + 1}`, url: toPublicUploadUrl(doc) }))),
      ].filter((doc) => !!doc.url);

      return `
        <article class="history-item">
          <div class="history-item-head">
            <span class="history-item-title">${user.firstName || ''} ${user.lastName || ''} (${user.role})</span>
            <span class="history-item-date">${user.documentsValidationStatus || 'pending'}</span>
          </div>
          <p class="history-item-meta">${user.email}</p>
          <div class="doc-links">
            ${docs.map((doc) => `<a href="${doc.url}" target="_blank" rel="noopener noreferrer">${doc.label}</a>`).join('')}
          </div>
          <div class="header-actions" style="margin-top:0.5rem;">
            <button class="btn btn-primary" data-action="validate-doc" data-user-id="${user._id}" data-approved="true">Approve</button>
            <button class="btn btn-secondary" data-action="validate-doc" data-user-id="${user._id}" data-approved="false">Reject</button>
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
    .map((row) => `
      <tr>
        <td><input type="text" data-field="firstName" data-user-id="${row.id}" value="${row.firstName || ''}" /></td>
        <td><input type="text" data-field="lastName" data-user-id="${row.id}" value="${row.lastName || ''}" /></td>
        <td><input type="email" data-field="email" data-user-id="${row.id}" value="${row.email || ''}" /></td>
        <td><input type="text" data-field="password" data-user-id="${row.id}" placeholder="New password" /></td>
        <td>${row.sexe || '-'}</td>
        <td>${row.role || '-'}</td>
        <td>${Number(row.balance || 0).toFixed(2)} MAD</td>
        <td>${Number(row.amountSpent || 0).toFixed(2)} MAD</td>
        <td>${Number(row.amountWithdrawn || 0).toFixed(2)} MAD</td>
        <td>${row.accountApproved ? 'Approved' : row.documentsValidationStatus || 'pending'}</td>
        <td><button class="btn btn-secondary" data-action="save-user" data-user-id="${row.id}">Save</button></td>
      </tr>
    `)
    .join('');
};

const bindAdminActions = () => {
  if (window.__adminActionsBound) return;
  window.__adminActionsBound = true;

  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.action === 'validate-doc') {
      const userId = target.dataset.userId;
      const approved = target.dataset.approved === 'true';
      try {
        const response = await fetch(`${apiBase}/auth/admin/users/${userId}/validate-documents`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ approved }),
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

const loadAdminDashboard = async () => {
  const user = getUser();
  if (!getToken() || !user || user.role !== 'admin') {
    window.location.href = 'login.html';
    return;
  }

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

  try {
    bindAdminActions();
    const [summary, pendingDocs, usersTable] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminPendingDocuments(),
      fetchAdminUsersTable(),
    ]);

    document.getElementById('adminInfo').textContent = `${summary.admin.name} (${summary.admin.email})`;
    document.getElementById('adminWallet').textContent = `${Number(summary.admin.walletBalance || 0).toFixed(2)} MAD`;
    document.getElementById('adminStudentsCount').textContent = summary.stats.studentsCount || 0;
    document.getElementById('adminDriversCount').textContent = summary.stats.driversCount || 0;
    document.getElementById('adminTripsCount').textContent = summary.stats.totalTrips || 0;
    document.getElementById('adminBookingsCount').textContent = summary.stats.totalBookings || 0;
    document.getElementById('adminFeesTotal').textContent = `${Number(summary.stats.totalWithdrawalFees || 0).toFixed(2)} MAD`;

    renderAdminPendingDocs(pendingDocs);
    renderAdminUsersTable(usersTable);
  } catch (error) {
    showMessage('adminInfo', error.message || 'Unable to load admin summary.');
  }
};

const attachPageHandlers = () => {
  const path = window.location.pathname.split('/').pop();

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
      loadStudentDashboard();
      break;
    case 'wallet.html':
      updateSidebarUser();
      loadWalletPage();
      break;
    case 'driver-dashboard.html':
      loadDriverDashboard();
      break;
    case 'admin-dashboard.html':
      loadAdminDashboard();
      break;
    default:
      if (!path) fetchTrips();
      break;
  }
};

attachPageHandlers();
