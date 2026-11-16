import { Suspense, lazy, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { Calendar, CreditCard, Plus, Search, History, ChevronRight, Home, Plane } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Duration,
  Header,
  IconButton,
  Input,
  NavigationTab,
  OptionTile,
  Pill,
  SectionHeader,
  SegmentedTabs,
  Select,
  FieldBox,
} from '~/components/ui';
import { BottomNav } from '~/components/layout';
import { palette } from '~/styles/tokens';
import { PredictionPanel, RiskPill, Ticket } from '~/components/flight';

// Dev-only: `import.meta.env.DEV` is a build-time false in production, so the copilot gallery is dropped from the bundle.
const CopilotGallery = import.meta.env.DEV ? lazy(() => import('~/components/copilot/CopilotGallery')) : null;

export const Route = createFileRoute('/design-system')({
  // Dev-only gallery: send production visitors home.
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw redirect({ to: '/' });
  },
  component: DesignSystemGallery,
});

// Everything on this page is a clearly-labelled sample. None of it is real flight data.

const p = palette;

const colorGroups: { title: string; swatches: { name: string; cls: string; hex: string }[] }[] = [
  {
    title: 'Surface',
    swatches: [
      { name: 'surface', cls: 'bg-surface border border-surface-stroke', hex: p.surface.DEFAULT },
      { name: 'surface-card', cls: 'bg-surface-card', hex: p.surface.card },
      { name: 'surface-panel', cls: 'bg-surface-panel', hex: p.surface.panel },
      { name: 'surface-muted', cls: 'bg-surface-muted', hex: p.surface.muted },
      { name: 'surface-divider', cls: 'bg-surface-divider', hex: p.surface.divider },
      { name: 'surface-stroke', cls: 'bg-surface-stroke', hex: p.surface.stroke },
      { name: 'surface-accent', cls: 'bg-surface-accent', hex: p.surface.accent },
      { name: 'surface-icon', cls: 'bg-surface-icon', hex: p.surface.icon },
    ],
  },
  {
    title: 'Type',
    swatches: [
      { name: 'ink', cls: 'bg-ink', hex: p.ink.DEFAULT },
      { name: 'ink-sub', cls: 'bg-ink-sub', hex: p.ink.sub },
      { name: 'ink-caption', cls: 'bg-ink-caption', hex: p.ink.caption },
    ],
  },
  {
    title: 'Status (soft: background + text)',
    swatches: [
      { name: 'status-success-bg', cls: 'bg-status-success-bg', hex: p.status['success-bg'] },
      { name: 'status-success-text', cls: 'bg-status-success-text', hex: p.status['success-text'] },
      { name: 'status-warning-bg', cls: 'bg-status-warning-bg', hex: p.status['warning-bg'] },
      { name: 'status-warning-text', cls: 'bg-status-warning-text', hex: p.status['warning-text'] },
      { name: 'status-error-bg', cls: 'bg-status-error-bg', hex: p.status['error-bg'] },
      { name: 'status-error-text', cls: 'bg-status-error-text', hex: p.status['error-text'] },
      { name: 'status-info-bg', cls: 'bg-status-info-bg', hex: p.status['info-bg'] },
      { name: 'status-info-text', cls: 'bg-status-info-text', hex: p.surface.accent },
    ],
  },
  {
    title: 'Status (solid fills)',
    swatches: [
      { name: 'status-success-solid', cls: 'bg-status-success-solid', hex: p.status['success-solid'] },
      { name: 'status-warning-solid', cls: 'bg-status-warning-solid', hex: p.status['warning-solid'] },
      { name: 'status-error-solid', cls: 'bg-status-error-solid', hex: p.status['error-solid'] },
      { name: 'status-info-solid', cls: 'bg-status-info-solid', hex: p.surface['accent-fill'] },
    ],
  },
];

const typeScale: { cls: string; name: string; spec: string }[] = [
  { cls: 'text-display-lg', name: 'Display lg', spec: '64 / 96' },
  { cls: 'text-display-md', name: 'Display md', spec: '56 / 84' },
  { cls: 'text-display-sm', name: 'Display sm', spec: '48 / 72' },
  { cls: 'text-heading-lg', name: 'Heading lg', spec: '40 / 60' },
  { cls: 'text-heading-md', name: 'Heading md', spec: '32 / 48' },
  { cls: 'text-heading-sm', name: 'Heading sm', spec: '28 / 42' },
  { cls: 'text-title-lg', name: 'Title lg', spec: '24 / 36' },
  { cls: 'text-title-md', name: 'Title md', spec: '20 / 30, medium' },
  { cls: 'text-title-sm', name: 'Title sm', spec: '18 / 27' },
  { cls: 'text-body-lg', name: 'Body lg', spec: '16 / 24' },
  { cls: 'text-body-md', name: 'Body md', spec: '14 / 21' },
  { cls: 'text-body-sm', name: 'Body sm', spec: '12 / 18' },
];

const radii = [
  { cls: 'rounded-btn-sm', name: 'btn-sm / alert', px: '12' },
  { cls: 'rounded-field', name: 'field', px: '14' },
  { cls: 'rounded-btn', name: 'btn / tile', px: '16' },
  { cls: 'rounded-ticket', name: 'ticket', px: '22' },
  { cls: 'rounded-panel', name: 'panel', px: '24' },
  { cls: 'rounded-pill', name: 'pill', px: '9999' },
];

const spacing = [
  { name: '1 (4px)', cls: 'w-1' },
  { name: '1.5 (6px)', cls: 'w-1.5' },
  { name: '2 (8px)', cls: 'w-2' },
  { name: '3 (12px)', cls: 'w-3' },
  { name: '4 / inset (16px)', cls: 'w-inset' },
  { name: '6 / gutter (24px)', cls: 'w-gutter' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 border-b border-surface-stroke pb-2 text-title-md text-ink">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-body-sm text-ink-caption">{children}</p>;
}

function DesignSystemGallery() {
  const [tab, setTab] = useState<'number' | 'route' | 'recent'>('number');
  return (
    <div className="app-container">
      <div className="px-4 pb-16 pt-6">
        <h1 className="text-title-lg text-ink">FlyRely design system</h1>
        <p className="mb-8 text-body-md text-ink-caption">
          Tokens and components from the Figma file. Every flight, time and risk value on this page is a labelled sample.
        </p>

        <Section title="Colors">
          {colorGroups.map((g) => (
            <div key={g.title}>
              <Label>{g.title}</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {g.swatches.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className={`h-9 w-9 shrink-0 rounded-btn-sm ${c.cls}`} />
                    <span className="min-w-0 text-body-sm text-ink">
                      <span className="block truncate">{c.name}</span>
                      <span className="block text-ink-caption">{c.hex}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Typography">
          {typeScale.map((t) => (
            <div key={t.name} className="overflow-hidden">
              <p className={`${t.cls} truncate text-ink`}>{t.name}</p>
              <Label>
                text-{t.name.toLowerCase().replace(' ', '-')} · {t.spec}
              </Label>
            </div>
          ))}
        </Section>

        <Section title="Radius">
          <div className="grid grid-cols-3 gap-3">
            {radii.map((r) => (
              <div key={r.cls}>
                <div className={`h-16 border border-surface-divider bg-surface-muted ${r.cls}`} />
                <Label>
                  {r.name} · {r.px}
                </Label>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Spacing">
          {spacing.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className={`h-3 rounded-sm bg-surface-accent ${s.cls}`} />
              <Label>{s.name}</Label>
            </div>
          ))}
        </Section>

        <Section title="Shadow">
          <div className="rounded-btn bg-surface-card p-4 text-body-md shadow-elevation-1">shadow-elevation-1 (0 -1 20 at 5% ink)</div>
        </Section>

        <Section title="Button">
          <Label>Kind: primary, secondary, text, danger (app-only). Size: default and sm.</Label>
          <div className="space-y-3">
            <Button fullWidth icon={<Plus className="h-4 w-4" />}>Primary default</Button>
            <Button fullWidth variant="secondary" icon={<Plus className="h-4 w-4" />}>Secondary default</Button>
            <Button fullWidth variant="text" icon={<Plus className="h-4 w-4" />}>Text default</Button>
            <Button fullWidth variant="danger">Danger default</Button>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" icon={<Plus className="h-4 w-4" />}>Primary sm</Button>
              <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />}>Secondary sm</Button>
              <Button size="sm" variant="text" icon={<Plus className="h-4 w-4" />}>Text sm</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
          </div>
        </Section>

        <Section title="Icon button">
          <div className="flex items-center gap-4">
            <IconButton kind="primary" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
            <IconButton kind="secondary" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
            <IconButton kind="text" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
            <IconButton kind="primary" size="sm" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
            <IconButton kind="secondary" size="sm" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
            <IconButton kind="text" size="sm" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
          </div>
        </Section>

        <Section title="Section header">
          <SectionHeader title="Default (16px space above)" />
          <SectionHeader kind="no-space" title="No space" />
          <SectionHeader
            kind="no-space"
            title="With action"
            action={<Button size="sm" variant="text" icon={<Plus className="h-4 w-4" />}>Add</Button>}
          />
        </Section>

        <Section title="Duration">
          <Label>Kind: text and icon</Label>
          <div className="rounded-ticket bg-surface-card p-4">
            <div className="flex"><Duration kind="text" label="Sample 2h 6m" /></div>
            <div className="mt-4 flex"><Duration kind="icon" /></div>
          </div>
        </Section>

        <Section title="Pill">
          <Label>Tones: default, success, warning, error, info (success and warning are for delay risk only; RiskPill uses them). Rows are default size then small.</Label>
          <>
              <div className="flex flex-wrap items-center gap-2">
                {(['default', 'success', 'warning', 'error', 'info'] as const).map((t) => (
                  <Pill key={t} tone={t}>{t}</Pill>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['default', 'success', 'warning', 'error', 'info'] as const).map((t) => (
                  <Pill key={t} tone={t} size="small">{t}</Pill>
                ))}
              </div>
          </>
          <Label>RiskPill (maps risk level to tone)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <RiskPill risk="low" />
            <RiskPill risk="medium" detail="Sample 20% chance of a 15+ min delay" />
            <RiskPill risk="high" />
          </div>
        </Section>

        <Section title="Alert">
          <Label>Status: success and info (neutral navy), error (red)</Label>
          <Alert status="success" lineOne="Line one of text goes here" lineTwo="A secondary supporting line of text goes here" />
          <Alert status="error" lineOne="Line one of text goes here" lineTwo="A secondary supporting line of text goes here" />
          <Alert status="info" lineOne="Line one of text goes here" lineTwo="A secondary supporting line of text goes here" />
          <Label>Without icon, with right icon</Label>
          <Alert status="info" showIcon={false} showRightIcon lineOne="Line one of text goes here" lineTwo="Supporting line" />
        </Section>

        <Section title="Input">
          <Input label="Form Label" placeholder="Input only" />
          <Input label="Form Label" placeholder="Leading icon" leftIcon={<CreditCard />} />
          <Input label="Form Label" placeholder="Trailing icon" rightIcon={<Calendar />} />
          <Input label="With error" defaultValue="123" error="Enter a valid flight number" />
          <Select label="Select" defaultValue="">
            <option value="">Select an option</option>
            <option>Option one</option>
          </Select>
          <FieldBox interactive={false} leading={<Search />}>
            <span className="flex-1 px-2 py-3.5 text-body-lg">Search field (link-like)</span>
          </FieldBox>
        </Section>

        <Section title="Segmented tabs">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'number', label: 'Flight number' },
              { value: 'route', label: 'Route' },
              { value: 'recent', label: 'Recent' },
            ]}
          />
        </Section>

        <Section title="Option tile">
          <div className="grid grid-cols-2 gap-3">
            <OptionTile title="Sample tile" description="Caption text" />
            <OptionTile icon={<History />} title="With icon" description="Caption text" />
          </div>
        </Section>

        <Section title="Navigation tab">
          <Label>State: default and active, icon and image variants</Label>
          <div className="flex rounded-btn border border-surface-stroke">
            <NavigationTab icon={<Home />} label="Default" />
            <NavigationTab icon={<Home />} label="Active" active />
            <NavigationTab icon={<Plane />} label="Default" />
            <NavigationTab icon={<Plane />} label="Active" active />
          </div>
        </Section>

        <Section title="Primary navigation (bottom nav)">
          {(['/', '/trips', '/explore', '/account'] as const).map((p) => (
            <div key={p} className="overflow-hidden rounded-btn border border-surface-stroke">
              <BottomNav activePath={p} fixed={false} />
            </div>
          ))}
        </Section>

        <Section title="Secondary navigation (header)">
          <div className="rounded-btn border border-surface-stroke">
            <Header title="Flight Details" showBack />
          </div>
          <div className="rounded-btn border border-surface-stroke">
            <Header
              title="With action"
              showBack
              rightAction={<IconButton kind="text" size="sm" aria-label="Sample action"><ChevronRight className="h-5 w-5" /></IconButton>}
            />
          </div>
        </Section>

        <Section title="Divider">
          <Divider />
          <div className="rounded-btn bg-surface-card p-4"><Divider dashed /></div>
        </Section>

        <Section title="Card">
          <Card>Default card</Card>
          <Card tone="muted">Muted card</Card>
          <Card tone="raised">Raised panel</Card>
        </Section>

        <Section title="Ticket">
          <Label>Sample data only. Original times (struck through) are a Figma option the app does not use.</Label>
          <Ticket
            flightNumber="XX0000"
            badge={<Pill tone="info">Sample</Pill>}
            departure={{ originalTime: '0:00 AM', primary: '1:00 PM', date: 'Sample date', place: 'AAA · Sample city' }}
            arrival={{ originalTime: '0:00 AM', primary: '3:00 PM', date: 'Sample date', place: 'BBB · Sample city' }}
            middle={<Duration kind="text" label="Sample" />}
            footer="Operated by Sample Airlines"
          >
            <Alert status="info" lineOne="Sample alert line" lineTwo="Sample supporting line" />
          </Ticket>
          <Ticket
            title="Sample title"
            flightNumber="XX0000"
            badge={<RiskPill risk="low" />}
            departure={{ label: 'Scheduled departure', primary: '1:00 PM', date: 'Sample date', place: 'AAA · Sample city' }}
            arrival={{ label: 'Arriving', primary: 'BBB', place: 'Sample city' }}
            footer="Sample Airlines"
          />
        </Section>

        <Section title="Prediction panel">
          <div className="rounded-ticket bg-surface-card p-2">
            <PredictionPanel risk="medium" chancePercent={20} reason="Sample explanation of the factors behind the prediction." />
          </div>
          <div className="rounded-ticket bg-surface-card p-2">
            <PredictionPanel risk="low" chancePercent={5} reason="Sample explanation." />
          </div>
          <div className="rounded-ticket bg-surface-card p-2">
            <PredictionPanel risk="high" chancePercent={60} reason="Sample explanation." />
          </div>
        </Section>

        {CopilotGallery && (
          <Suspense fallback={null}>
            <CopilotGallery />
          </Suspense>
        )}
      </div>
    </div>
  );
}
