
const supported = ['en', 'it', 'fr', 'de'];
const browserLang = navigator.language.slice(0,2);
if (supported.includes(browserLang)) {
  window.location.href = browserLang + '.html';
} else {
  // Mostra il contenuto solo se la lingua non è supportata
  document.getElementById('lang-select').style.display = 'block';
}
function goLang() {
  const lang = document.getElementById('lang-select').value;
  window.location.href = lang + '.html';
}
