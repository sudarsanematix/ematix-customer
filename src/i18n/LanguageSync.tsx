import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { changeAppLanguage, hasStoredLanguagePreference } from './index';
import { resolveAppLanguage } from './languages';

/**
 * Keeps the app language and the language stored on the account in step.
 *
 * The local copy is what a cold start boots from, so it is never overwritten
 * blindly. The account copy is only used to seed a device that has never
 * stored a preference of its own, which is what carries a language chosen on
 * another device to a new install. After that the choice made on this device
 * stands, even if writing it to the account failed.
 */
export default function LanguageSync() {
  const { token, user, refresh } = useAuth();
  const { i18n } = useTranslation();

  /** The user whose account language has already been taken into account. */
  const reconciledUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // A session restored from storage may predate the login payload carrying
    // preferences, so the authoritative profile is fetched once when they are
    // missing.
    if (!user?.preferences) {
      refresh();
    }
  }, [token, user?.preferences, refresh]);

  useEffect(() => {
    if (!user?.id) return;
    if (reconciledUserId.current === user.id) return;

    const accountLanguage = resolveAppLanguage(user.preferences?.language);
    if (!accountLanguage) return;

    reconciledUserId.current = user.id;

    // A device that already holds a preference keeps it. The account copy
    // only fills the gap on a device that has never been asked.
    if (hasStoredLanguagePreference()) return;

    changeAppLanguage(accountLanguage).catch((error) => {
      console.warn('[i18n] Could not apply the language stored on the account', error);
    });
  }, [user?.id, user?.preferences?.language, i18n.language]);

  return null;
}
