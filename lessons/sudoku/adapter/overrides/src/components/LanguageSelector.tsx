import React from 'react';
import {useTranslation} from 'react-i18next';
import {LANGUAGE_TRANSLATIONS,LANGUAGES} from 'src/i18n';
import {sudokuStorage} from 'src/adapter/storage';
export default function LanguageSelector(){const {i18n,t}=useTranslation();return <select data-testid="sudoku-language" className="sudoku-language" aria-label={t('language')} value={i18n.language} onChange={event=>{const language=event.target.value;i18n.changeLanguage(language);sudokuStorage.setItem('mathphysics.sudoku.language',language);document.documentElement.lang=language;}}>{LANGUAGES.map(language=><option value={language} key={language}>{LANGUAGE_TRANSLATIONS[language]}</option>)}</select>;}
