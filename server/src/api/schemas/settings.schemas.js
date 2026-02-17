const Joi = require('joi');

const createChannelSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().max(255).allow('', null),
  smtp_host: Joi.string().max(255).allow('', null),
  smtp_port: Joi.number().integer().allow(null),
  smtp_user: Joi.string().max(255).allow('', null),
  smtp_pass: Joi.string().max(500).allow('', null),
  imap_host: Joi.string().max(255).allow('', null),
  imap_port: Joi.number().integer().allow(null),
  imap_user: Joi.string().max(255).allow('', null),
  imap_pass: Joi.string().max(500).allow('', null),
});

const updateThemeSchema = Joi.object({
  // Colors
  primaryColor: Joi.string().max(50).allow('', null),
  secondaryColor: Joi.string().max(50).allow('', null),
  backgroundColor: Joi.string().max(50).allow('', null),
  textColor: Joi.string().max(50).allow('', null),
  successColor: Joi.string().max(50).allow('', null),
  warningColor: Joi.string().max(50).allow('', null),
  errorColor: Joi.string().max(50).allow('', null),
  // Advanced Colors
  primaryHoverColor: Joi.string().max(50).allow('', null),
  primaryGradientStart: Joi.string().max(50).allow('', null),
  primaryGradientEnd: Joi.string().max(50).allow('', null),
  shadowColor: Joi.string().max(100).allow('', null),
  borderColor: Joi.string().max(50).allow('', null),
  hoverColor: Joi.string().max(50).allow('', null),
  // Typography
  borderRadius: Joi.string().max(50).allow('', null),
  fontFamily: Joi.string().max(100).allow('', null),
  headingFont: Joi.string().max(100).allow('', null),
  bodyFont: Joi.string().max(100).allow('', null),
  englishFont: Joi.string().max(100).allow('', null),
  arabicFont: Joi.string().max(100).allow('', null),
  fontSize: Joi.string().max(20).allow('', null),
  headingWeight: Joi.string().max(10).allow('', null),
  bodyWeight: Joi.string().max(10).allow('', null),
  lineHeight: Joi.string().max(20).allow('', null),
  letterSpacing: Joi.string().max(20).allow('', null),
  textTransform: Joi.string().max(20).allow('', null),
  // Company Information
  companyName: Joi.string().max(255).allow('', null),
  tagline: Joi.string().max(500).allow('', null),
  websiteUrl: Joi.string().uri().max(500).allow('', null),
  supportEmail: Joi.string().email().max(255).allow('', null),
  // Logos
  logoUrl: Joi.string().uri().max(500).allow('', null),
  faviconUrl: Joi.string().uri().max(500).allow('', null),
  mobileLogoUrl: Joi.string().uri().max(500).allow('', null),
  darkModeLogoUrl: Joi.string().uri().max(500).allow('', null),
  // Email Branding
  emailFooterText: Joi.string().max(1000).allow('', null),
  emailHeaderTemplate: Joi.string().max(50).allow('', null),
  emailSignature: Joi.string().max(2000).allow('', null),
  // Social Media
  linkedinUrl: Joi.string().uri().max(500).allow('', null),
  twitterUrl: Joi.string().uri().max(500).allow('', null),
  facebookUrl: Joi.string().uri().max(500).allow('', null),
  instagramUrl: Joi.string().uri().max(500).allow('', null),
  youtubeUrl: Joi.string().uri().max(500).allow('', null),
  // Layout
  pageMaxWidth: Joi.string().max(20).allow('', null),
  sidebarPosition: Joi.string().valid('left', 'right').allow('', null),
  navigationStyle: Joi.string().max(20).allow('', null),
  contentPadding: Joi.string().max(20).allow('', null),
  gridGap: Joi.string().max(20).allow('', null),
  // Buttons
  buttonStyle: Joi.string().max(30).allow('', null),
  buttonShadow: Joi.string().max(20).allow('', null),
  buttonHoverEffect: Joi.string().max(20).allow('', null),
  buttonSize: Joi.string().max(20).allow('', null),
  // Forms
  inputStyle: Joi.string().max(30).allow('', null),
  inputBorderWidth: Joi.string().max(10).allow('', null),
  inputFocusColor: Joi.string().max(50).allow('', null),
  validationStyle: Joi.string().max(20).allow('', null),
  // Dark Mode
  darkModeEnabled: Joi.boolean().allow(null),
  autoDarkMode: Joi.boolean().allow(null),
  darkModePrimaryColor: Joi.string().max(50).allow('', null),
  darkModeBackgroundColor: Joi.string().max(50).allow('', null),
  darkModeTextColor: Joi.string().max(50).allow('', null),
  // Mobile
  mobileBreakpoint: Joi.string().max(20).allow('', null),
  mobileFontSize: Joi.string().max(20).allow('', null),
  mobileNavigationStyle: Joi.string().max(20).allow('', null),
  // Notifications
  toastPosition: Joi.string().max(30).allow('', null),
  toastDuration: Joi.string().max(10).allow('', null),
  alertStyle: Joi.string().max(20).allow('', null),
  // Animations
  transitionSpeed: Joi.string().max(20).allow('', null),
  enableAnimations: Joi.boolean().allow(null),
  loadingStyle: Joi.string().max(20).allow('', null),
  // Brand Assets
  backgroundImageUrl: Joi.string().uri().max(500).allow('', null),
  backgroundPattern: Joi.string().max(50).allow('', null),
  watermarkUrl: Joi.string().uri().max(500).allow('', null),
  watermarkOpacity: Joi.string().max(10).allow('', null),
  // Accessibility
  highContrast: Joi.boolean().allow(null),
  focusIndicatorColor: Joi.string().max(50).allow('', null),
  focusIndicatorWidth: Joi.string().max(10).allow('', null),
  reducedMotion: Joi.boolean().allow(null),
  // Localization
  rtlMode: Joi.boolean().allow(null),
  primaryLanguage: Joi.string().max(10).allow('', null),
  arabicFontOptimization: Joi.boolean().allow(null),
  // Advanced
  customCss: Joi.string().max(10000).allow('', null),
}).min(1);

const slaSchema = Joi.array().items(Joi.object({
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
  response_time_minutes: Joi.number().integer().min(1).required(),
  resolution_time_minutes: Joi.number().integer().min(1).required(),
})).min(1);

module.exports = { createChannelSchema, updateThemeSchema, slaSchema };
