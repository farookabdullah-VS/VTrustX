import React from 'react';
import {
  ClipboardList, BarChart3, Users, FileSearch, Inbox, PlusCircle,
  FolderOpen, Sparkles, Bell, MessageSquare, Settings, FileText,
  Calendar, Package, Star, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

/**
 * Reusable empty state component with icon, title, description, and CTA.
 *
 * Usage:
 *   <EmptyState
 *     icon={ClipboardList}
 *     titleKey="empty.surveys.title"
 *     descriptionKey="empty.surveys.description"
 *     ctaKey="empty.surveys.cta"
 *     onCta={() => navigate('create')}
 *   />
 */
export function EmptyState({
  icon: Icon = Inbox,
  titleKey,
  titleFallback = 'No data yet',
  descriptionKey,
  descriptionFallback = '',
  ctaKey,
  ctaFallback,
  onCta,
  secondaryCtaKey,
  secondaryCtaFallback,
  onSecondaryCta,
  style = {},
}) {
  const { t } = useTranslation();

  const title = titleKey ? t(titleKey) : titleFallback;
  const description = descriptionKey ? t(descriptionKey) : descriptionFallback;
  const ctaLabel = ctaKey ? t(ctaKey) : ctaFallback;
  const secondaryLabel = secondaryCtaKey ? t(secondaryCtaKey) : secondaryCtaFallback;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        ...style,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--gold-light, rgba(255, 179, 0, 0.12))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <Icon size={32} style={{ color: 'var(--primary-color)' }} />
      </div>

      {/* Title */}
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: '1.15rem',
          fontWeight: '700',
          color: 'var(--text-color)',
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            maxWidth: '360px',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}

      {/* CTAs */}
      {(ctaLabel || secondaryLabel) && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {ctaLabel && onCta && (
            <Button
              variant="primary"
              icon={<PlusCircle size={16} />}
              onClick={onCta}
            >
              {ctaLabel}
            </Button>
          )}
          {secondaryLabel && onSecondaryCta && (
            <Button
              variant="secondary"
              onClick={onSecondaryCta}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* Pre-configured empty states for common pages */

export function EmptySurveys({ onCreateSurvey, onBrowseTemplates }) {
  return (
    <EmptyState
      icon={ClipboardList}
      titleKey="empty.surveys.title"
      titleFallback="No surveys yet"
      descriptionKey="empty.surveys.description"
      descriptionFallback="Create your first survey to start collecting feedback from your customers."
      ctaKey="empty.surveys.cta"
      ctaFallback="Create Survey"
      onCta={onCreateSurvey}
      secondaryCtaKey="empty.surveys.secondary"
      secondaryCtaFallback="Browse Templates"
      onSecondaryCta={onBrowseTemplates}
    />
  );
}

export function EmptyResponses() {
  return (
    <EmptyState
      icon={Inbox}
      titleKey="empty.responses.title"
      titleFallback="No responses yet"
      descriptionKey="empty.responses.description"
      descriptionFallback="Responses will appear here once people start completing your surveys."
    />
  );
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon={BarChart3}
      titleKey="empty.analytics.title"
      titleFallback="No analytics data"
      descriptionKey="empty.analytics.description"
      descriptionFallback="Analytics will be available once you have enough survey responses."
    />
  );
}

export function EmptySearch() {
  return (
    <EmptyState
      icon={FileSearch}
      titleKey="empty.search.title"
      titleFallback="No results found"
      descriptionKey="empty.search.description"
      descriptionFallback="Try adjusting your search or filter criteria."
    />
  );
}

export function EmptyContacts({ onImportContacts }) {
  return (
    <EmptyState
      icon={Users}
      titleKey="empty.contacts.title"
      titleFallback="No contacts yet"
      descriptionKey="empty.contacts.description"
      descriptionFallback="Import contacts or wait for survey responses to build your contact list."
      ctaKey="empty.contacts.cta"
      ctaFallback="Import Contacts"
      onCta={onImportContacts}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Bell}
      titleKey="empty.notifications.title"
      titleFallback="No notifications"
      descriptionKey="empty.notifications.description"
      descriptionFallback="You're all caught up! Notifications will appear here when there's activity on your surveys."
    />
  );
}

export function EmptyForms({ onCreateForm, onBrowseTemplates }) {
  return (
    <EmptyState
      icon={FileText}
      titleKey="empty.forms.title"
      titleFallback="No forms created"
      descriptionKey="empty.forms.description"
      descriptionFallback="Start by creating a new form or choose from our template library."
      ctaKey="empty.forms.cta"
      ctaFallback="Create New Form"
      onCta={onCreateForm}
      secondaryCtaKey="empty.forms.secondary"
      secondaryCtaFallback="Browse Templates"
      onSecondaryCta={onBrowseTemplates}
    />
  );
}

export function EmptyDistributions({ onCreateCampaign }) {
  return (
    <EmptyState
      icon={MessageSquare}
      titleKey="empty.distributions.title"
      titleFallback="No campaigns yet"
      descriptionKey="empty.distributions.description"
      descriptionFallback="Create your first distribution campaign to start reaching your audience."
      ctaKey="empty.distributions.cta"
      ctaFallback="Create Campaign"
      onCta={onCreateCampaign}
    />
  );
}

export function EmptyReports({ onCreateReport }) {
  return (
    <EmptyState
      icon={TrendingUp}
      titleKey="empty.reports.title"
      titleFallback="No reports generated"
      descriptionKey="empty.reports.description"
      descriptionFallback="Generate custom reports to visualize your survey data and track trends over time."
      ctaKey="empty.reports.cta"
      ctaFallback="Create Report"
      onCta={onCreateReport}
    />
  );
}

export function EmptyTemplates({ onCreateTemplate }) {
  return (
    <EmptyState
      icon={Sparkles}
      titleKey="empty.templates.title"
      titleFallback="No saved templates"
      descriptionKey="empty.templates.description"
      descriptionFallback="Save frequently used surveys as templates for quick reuse."
      ctaKey="empty.templates.cta"
      ctaFallback="Create Template"
      onCta={onCreateTemplate}
    />
  );
}

export function EmptyFolders({ onCreateFolder }) {
  return (
    <EmptyState
      icon={FolderOpen}
      titleKey="empty.folders.title"
      titleFallback="No folders created"
      descriptionKey="empty.folders.description"
      descriptionFallback="Organize your surveys into folders to keep everything tidy."
      ctaKey="empty.folders.cta"
      ctaFallback="Create Folder"
      onCta={onCreateFolder}
    />
  );
}

export function EmptySettings() {
  return (
    <EmptyState
      icon={Settings}
      titleKey="empty.settings.title"
      titleFallback="No custom settings"
      descriptionKey="empty.settings.description"
      descriptionFallback="Configure settings to customize your VTrustX experience."
    />
  );
}

export function EmptySchedule({ onScheduleSurvey }) {
  return (
    <EmptyState
      icon={Calendar}
      titleKey="empty.schedule.title"
      titleFallback="No scheduled surveys"
      descriptionKey="empty.schedule.description"
      descriptionFallback="Schedule surveys to automatically send at specific times or intervals."
      ctaKey="empty.schedule.cta"
      ctaFallback="Schedule Survey"
      onCta={onScheduleSurvey}
    />
  );
}

export function EmptyIntegrations({ onBrowseIntegrations }) {
  return (
    <EmptyState
      icon={Package}
      titleKey="empty.integrations.title"
      titleFallback="No active integrations"
      descriptionKey="empty.integrations.description"
      descriptionFallback="Connect VTrustX with your favorite tools to automate workflows."
      ctaKey="empty.integrations.cta"
      ctaFallback="Browse Integrations"
      onCta={onBrowseIntegrations}
    />
  );
}

export function EmptyFavorites({ onBrowseSurveys }) {
  return (
    <EmptyState
      icon={Star}
      titleKey="empty.favorites.title"
      titleFallback="No favorites yet"
      descriptionKey="empty.favorites.description"
      descriptionFallback="Mark surveys as favorites for quick access to your most important work."
      ctaKey="empty.favorites.cta"
      ctaFallback="Browse Surveys"
      onCta={onBrowseSurveys}
    />
  );
}
