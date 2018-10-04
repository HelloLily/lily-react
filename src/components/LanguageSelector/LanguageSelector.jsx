import React from 'react';
import i18next, { changeLanguage, t } from 'i18next';
import { withNamespaces } from 'react-i18next';
import locales from 'src/config/locales.json';

function _changeLanguage({ target: { value } }) {
  changeLanguage(value, function(err) {
    if (err) {
      console.error(err);
    }
  });
}

const LanguageSelector = () => (
  <select className="language-selector" onChange={_changeLanguage} value={i18next.language}>
    {locales.map(locale => (
      <option key={locale} value={locale}>
        {t(locale)}
      </option>
    ))}
  </select>
);

export default withNamespaces()(LanguageSelector);
