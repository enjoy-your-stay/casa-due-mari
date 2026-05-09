
const supported = ['en', 'it', 'fr', 'de', 'nl', 'es'];
const browserLang = navigator.language.slice(0,2);
if (supported.includes(browserLang)) {
  window.location.href = browserLang + '.html';
} else {
  // Mostra il contenuto solo se la lingua non è supportata
  document.getElementByClass('lang-select').style.display = 'block';
}