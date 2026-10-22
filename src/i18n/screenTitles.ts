import type { TranslationKey } from './types';

/**
 * Screen slugs that appear in a header, mapped to the key that names them.
 *
 * A header used to build its own title from the slug, which turned
 * 'package-details' into 'Package details'. That reads fine in English and
 * badly in Tamil, so the slug is looked up here instead.
 *
 * A slug that is not listed falls back to the old behaviour, so a new screen
 * still gets a header title without having to be added here first.
 */
export const SCREEN_TITLE_KEYS: Record<string, TranslationKey> = {
  home: 'nav.home',
  orders: 'nav.orders',
  'ask-ematix': 'nav.askEmatix',
  profile: 'nav.profile',
  settings: 'nav.settings',
  wallet: 'nav.wallet',
  support: 'nav.support',
  notifications: 'nav.notifications',
  chat: 'nav.chat',
  receipt: 'nav.receipt',
  invoice: 'nav.invoice',
  login: 'nav.login',
  signup: 'nav.signup',
  history: 'nav.history',
  help: 'nav.help',
  'active-ride': 'nav.activeRideTracking',
  'ride-completed': 'nav.rideCompleted',
  'finding-driver': 'nav.findingDriver',
  'select-ride': 'nav.selectVehicle',
  'destination-search': 'nav.whereTo',
  'package-details': 'nav.packageDetails',
  'package-vehicle': 'nav.packageDeliveryDetails',
  'package-assigned': 'nav.deliveryPartnerAssigned',
  'package-transit': 'nav.packageTracking',
  'product-delivery-tracking': 'nav.productDeliveryLiveTracking',
  'delivery-receipt': 'nav.deliveredReceiptRating',
};

/** The key naming a screen, or null when the slug is not a known screen. */
export const screenTitleKey = (slug: string): TranslationKey | null =>
  SCREEN_TITLE_KEYS[slug] ?? null;
