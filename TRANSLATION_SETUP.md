# Multi-Language Translation Setup

## What Has Been Implemented

### 1. **Translation System Files**
- `public/js/translations.js` - Contains translations for EN, FR, AR
  - English (en)
  - French (fr)
  - Arabic (ar / Morocco 🇲🇦)

### 2. **Language Switcher**
- Flag-based buttons added to pages
- 🇬🇧 English | 🇫🇷 French | 🇲🇦 Arabic (Morocco)
- Buttons call `setLanguage()` function
- Saves language preference to localStorage

### 3. **Core Functions Added to main.js**
```javascript
setLanguage(lang) - Switch language and update UI
translatePage() - Apply translations to all elements
currentLang - Current language variable (default: 'fr')
```

### 4. **Translation Markup**
- Use `data-i18n="key"` on elements to translate textContent
- Use `data-i18n-placeholder="key"` on input fields for placeholders

### 5. **Pages Updated with Translations**
✅ index.html
✅ login.html
✅ register.html
✅ student-dashboard.html
- All have language switcher buttons added
- Navigation and headers have translation keys

### 6. **RTL Support**
- Arabic sets `document.dir="rtl"` automatically
- LTR (left-to-right) for English and French

---

## Remaining Pages to Update

Quick pattern for each page:

### Profile, Wallet, Receipt Pages
1. Add script includes:
   ```html
   <script src="js/translations.js"></script>
   <script src="js/main.js"></script>
   ```

2. Add language selector after sidebar nav:
   ```html
   <div class="lang-selector">
     <button id="lang-en" onclick="setLanguage('en')">🇬🇧</button>
     <button id="lang-fr" onclick="setLanguage('fr')">🇫🇷</button>
     <button id="lang-ar" onclick="setLanguage('ar')">🇲🇦</button>
   </div>
   ```

3. Add `data-i18n` attributes:
   ```html
   <h1 data-i18n="profile.title">Profil</h1>
   ```

### Driver Dashboard
- Same process as student dashboard
- Add translations for driver-specific terms

### Admin Pages
- Similar pattern

---

## Translation Keys Structure

```
brand.*          - Header/brand elements
nav.*            - Navigation items
sidebar.*        - Sidebar user info
header.*         - Page headers
button.*         - Buttons
form.*           - Form labels and placeholders
trip.*           - Trip-related terms
booking.*        - Booking terms
admin.*          - Admin page terms
```

---

## Testing

1. Click language buttons → page text should change
2. Refresh page → language persists (localStorage)
3. Arabic → page should go RTL
4. Check browser console for errors

---

## CSS Styling

Language selector styling already added to `styles.css`:
```css
.lang-selector {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.lang-selector button {
  background: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 1.2rem;
  cursor: pointer;
}

.lang-selector button.active {
  background: var(--primary);
  color: white;
}
```

