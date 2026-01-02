/**
 * CEMEDIS Internationalization (i18n) Module
 * Supports: FR, EN, ES, PT, AR, ZH, SR, PL, DE
 */

const I18n = {
  currentLang: 'fr',
  translations: {},
  supportedLangs: ['fr', 'en', 'es', 'pt', 'ar', 'zh', 'sr', 'pl', 'de'],

  /**
   * Initialize the i18n system
   */
  async init() {
    // Get language from URL, localStorage, or browser
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    const storedLang = localStorage.getItem('cemedis-lang');
    const browserLang = navigator.language.split('-')[0];

    // Priority: URL > localStorage > browser > default (fr)
    let lang = urlLang || storedLang || browserLang;

    // Validate language
    if (!this.supportedLangs.includes(lang)) {
      lang = 'fr';
    }

    await this.setLanguage(lang);
    this.initLanguageSelector();
  },

  /**
   * Load translations for a specific language
   */
  async loadTranslations(lang) {
    if (this.translations[lang]) {
      return this.translations[lang];
    }

    try {
      const response = await fetch(`js/i18n/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
      this.translations[lang] = await response.json();
      return this.translations[lang];
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error);
      // Fallback to French
      if (lang !== 'fr') {
        return this.loadTranslations('fr');
      }
      return null;
    }
  },

  /**
   * Set the current language and update the page
   */
  async setLanguage(lang) {
    if (!this.supportedLangs.includes(lang)) {
      console.warn(`Language ${lang} not supported, falling back to French`);
      lang = 'fr';
    }

    const translations = await this.loadTranslations(lang);
    if (!translations) return;

    this.currentLang = lang;
    localStorage.setItem('cemedis-lang', lang);

    // Update HTML attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = translations.dir || 'ltr';

    // Add/remove RTL class
    if (translations.dir === 'rtl') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }

    // Update all translatable elements
    this.updatePageTranslations(translations);

    // Update language selector
    this.updateLanguageSelector(lang);

    // Dispatch event for other scripts
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, translations } }));
  },

  /**
   * Update all elements with data-i18n attributes
   */
  updatePageTranslations(translations) {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const value = this.getNestedValue(translations, key);
      if (value) {
        element.textContent = value;
      }
    });

    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const value = this.getNestedValue(translations, key);
      if (value) {
        element.placeholder = value;
      }
    });

    // Update elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const value = this.getNestedValue(translations, key);
      if (value) {
        element.title = value;
      }
    });

    // Update elements with data-i18n-aria-label attribute
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria-label');
      const value = this.getNestedValue(translations, key);
      if (value) {
        element.setAttribute('aria-label', value);
      }
    });

    // Update elements with data-i18n-alt attribute (for images)
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
      const key = element.getAttribute('data-i18n-alt');
      const value = this.getNestedValue(translations, key);
      if (value) {
        element.alt = value;
      }
    });

    // Update elements with data-i18n-avatar attribute (creates initials from name)
    document.querySelectorAll('[data-i18n-avatar]').forEach(element => {
      const key = element.getAttribute('data-i18n-avatar');
      const name = this.getNestedValue(translations, key);
      if (name) {
        // Extract initials from name (first letter of each word, max 2)
        const initials = name.split(/[\s.]+/)
          .filter(word => word.length > 0)
          .slice(0, 2)
          .map(word => word.charAt(0).toUpperCase())
          .join('');
        element.textContent = initials;
      }
    });

    // Update page title if meta.title exists
    if (translations.meta && translations.meta.title) {
      document.title = translations.meta.title;
    }

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && translations.meta && translations.meta.description) {
      metaDesc.content = translations.meta.description;
    }
  },

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  },

  /**
   * Get a translation by key
   */
  t(key) {
    const translations = this.translations[this.currentLang];
    if (!translations) return key;
    return this.getNestedValue(translations, key) || key;
  },

  /**
   * Initialize the language selector
   */
  initLanguageSelector() {
    // Desktop selector
    const selector = document.getElementById('language-selector');
    if (selector) {
      const select = selector.querySelector('select');
      if (select) {
        select.value = this.currentLang;
        select.addEventListener('change', (e) => {
          this.setLanguage(e.target.value);
        });
      }
    }

    // Mobile selector
    const mobileSelector = document.getElementById('mobile-language-selector');
    if (mobileSelector) {
      mobileSelector.value = this.currentLang;
      mobileSelector.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }
  },

  /**
   * Update the language selector to show current language
   */
  updateLanguageSelector(lang) {
    // Update desktop selector
    const select = document.querySelector('#language-selector select');
    if (select) {
      select.value = lang;
    }

    // Update mobile selector
    const mobileSelect = document.getElementById('mobile-language-selector');
    if (mobileSelect) {
      mobileSelect.value = lang;
    }
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
});

// Export for use in other scripts
window.I18n = I18n;
