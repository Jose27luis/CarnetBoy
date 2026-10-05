'use client';

import { ALTITUDE_MAX_METERS, type Facility } from '@carnet/contracts';
import { Baby, Building2, Mountain, Network, Pencil, Plus, Search, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useId, useMemo, useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/badge';
import { SidePanel } from '@/components/side-panel';
import { buttonClass, INPUT_CLASS, PANEL_CLASS } from '@/lib/ui';
import { toggleFacilityAction } from './actions';
import { FacilityForm } from './facility-form';

export interface FacilityView {
  facility: Facility;
  digitizers: { id: string; fullName: string }[];
  childrenRegistered: number;
  linksCreated: number;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'name' | 'altitude' | 'children';
type PanelState = { mode: 'create' } | { mode: 'edit'; facilityId: string } | null;

const NUMBER_FORMAT = new Intl.NumberFormat('es-PE');
const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Desactivados' },
];
const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'altitude', label: 'Mayor altitud' },
  { value: 'children', label: 'Más niños registrados' },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function Stat({ icon: Icon, value, label, detail }: { icon: typeof Building2; value: string; label: string; detail?: string }): React.JSX.Element {
  return (
    <div className={`${PANEL_CLASS} flex items-start gap-3 p-4`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-celeste-50 text-celeste-700">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-tight text-ink tabular-nums">
          {value}
          {detail === undefined ? null : <span className="ml-1 text-sm font-normal text-muted">{detail}</span>}
        </p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

function AltitudeBar({ meters }: { meters: number }): React.JSX.Element {
  const share = Math.min(1, Math.max(0, meters / ALTITUDE_MAX_METERS));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <Mountain aria-hidden="true" className="size-4" />
          Altitud
        </span>
        <span className="font-semibold tabular-nums">{NUMBER_FORMAT.format(meters)} m s. n. m.</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-celeste-50" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-celeste-200 to-celeste-700" style={{ width: `${Math.max(share * 100, 2)}%` }} />
      </div>
    </div>
  );
}

function FacilityCard({ view, onEdit }: { view: FacilityView; onEdit: () => void }): React.JSX.Element {
  const { facility, digitizers } = view;

  return (
    <article className={`${PANEL_CLASS} flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-[0_18px_40px_-30px_rgba(11,79,111,0.55)] ${facility.active ? '' : 'bg-canvas'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={facility.name}>
            {facility.name}
          </h3>
          <p className="text-sm text-muted">
            IPRESS <span className="tabular-nums">{facility.ipressCode}</span>
          </p>
        </div>
        <Badge tone={facility.active ? 'ok' : 'neutral'}>{facility.active ? 'Activo' : 'Desactivado'}</Badge>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-ink">
        <Network aria-hidden="true" className="size-4 shrink-0 text-celeste-700" />
        <span className="truncate">{facility.healthNetwork}</span>
      </p>

      <AltitudeBar meters={facility.altitudeMeters} />

      <dl className="grid grid-cols-2 gap-3 rounded-[10px] bg-celeste-50/70 p-3 text-sm">
        <div>
          <dt className="text-muted">Niños registrados</dt>
          <dd className="font-display text-lg font-semibold tabular-nums">{NUMBER_FORMAT.format(view.childrenRegistered)}</dd>
        </div>
        <div>
          <dt className="text-muted">Vínculos creados</dt>
          <dd className="font-display text-lg font-semibold tabular-nums">{NUMBER_FORMAT.format(view.linksCreated)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        {digitizers.length === 0 ? (
          <span className="text-sm text-warn">Sin digitadores</span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {digitizers.slice(0, 3).map((digitizer) => (
                <span
                  key={digitizer.id}
                  title={digitizer.fullName}
                  className="grid size-8 place-items-center rounded-full bg-celeste-700 text-xs font-semibold text-white ring-2 ring-white"
                >
                  {initials(digitizer.fullName)}
                </span>
              ))}
            </span>
            <span className="text-sm text-muted">
              {digitizers.length} {digitizers.length === 1 ? 'digitador' : 'digitadores'}
            </span>
          </span>
        )}
        <button type="button" onClick={onEdit} className={buttonClass('ghost', 'min-h-9 px-3 text-sm')}>
          <Pencil aria-hidden="true" className="size-4" />
          Gestionar
        </button>
      </div>
    </article>
  );
}

function FacilityDetails({ view, networks, onSaved }: { view: FacilityView; networks: readonly string[]; onSaved: () => void }): React.JSX.Element {
  const { facility } = view;

  return (
    <div className="flex flex-col gap-8">
      <FacilityForm key={facility.version} facility={facility} networks={networks} onSaved={onSaved} />

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Digitadores asignados</h3>
          <Link href="/admin/cuentas" className="text-sm font-semibold text-celeste-700 hover:underline">
            Asignar en Cuentas
          </Link>
        </div>
        {view.digitizers.length === 0 ? (
          <p className="text-sm text-muted">Nadie puede registrar atenciones aquí todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {view.digitizers.map((digitizer) => (
              <li key={digitizer.id} className="flex items-center gap-2.5 text-sm">
                <UserRound aria-hidden="true" className="size-4 text-celeste-700" />
                {digitizer.fullName}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="font-semibold">{facility.active ? 'Desactivar' : 'Activar'}</h3>
        <p className="text-sm text-muted">
          {facility.active
            ? 'Un establecimiento desactivado no recibe asignaciones nuevas y sus digitadores dejan de poder registrar en él. Su historial se conserva.'
            : 'Al activarlo se podrá asignar digitadores y registrar atenciones otra vez.'}
        </p>
        <ActionForm
          action={toggleFacilityAction}
          label={facility.active ? 'Desactivar establecimiento' : 'Activar establecimiento'}
          pendingLabel="Guardando"
          variant={facility.active ? 'danger' : 'primary'}
          compact={false}
          {...(facility.active ? { confirm: `¿Desactivar ${facility.name}?` } : {})}
          fields={{ facilityId: facility.id, expectedVersion: facility.version, active: String(!facility.active) }}
        />
      </section>
    </div>
  );
}

export function FacilitiesBoard({ views }: { views: FacilityView[] }): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [network, setNetwork] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [panel, setPanel] = useState<PanelState>(null);
  const reduceMotion = useReducedMotion() === true;
  const searchId = useId();
  const networkId = useId();
  const sortId = useId();

  const networks = useMemo(
    () => [...new Set(views.map((view) => view.facility.healthNetwork))].sort((left, right) => left.localeCompare(right, 'es')),
    [views],
  );

  const totals = useMemo(() => {
    const digitizers = new Set(views.flatMap((view) => view.digitizers.map((digitizer) => digitizer.id)));

    return {
      active: views.filter((view) => view.facility.active).length,
      networks: networks.length,
      digitizers: digitizers.size,
      children: views.reduce((sum, view) => sum + view.childrenRegistered, 0),
    };
  }, [views, networks]);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());

    return views
      .filter((view) => status === 'all' || (status === 'active') === view.facility.active)
      .filter((view) => network === '' || view.facility.healthNetwork === network)
      .filter(
        (view) =>
          needle.length === 0 ||
          normalize(view.facility.name).includes(needle) ||
          view.facility.ipressCode.includes(needle) ||
          normalize(view.facility.healthNetwork).includes(needle),
      )
      .sort((left, right) => {
        if (sort === 'altitude') {
          return right.facility.altitudeMeters - left.facility.altitudeMeters;
        }

        if (sort === 'children') {
          return right.childrenRegistered - left.childrenRegistered;
        }

        return left.facility.name.localeCompare(right.facility.name, 'es');
      });
  }, [views, query, status, network, sort]);

  const closePanel = useCallback(() => setPanel(null), []);
  const editing = panel?.mode === 'edit' ? views.find((view) => view.facility.id === panel.facilityId) : undefined;
  const filtered = query !== '' || status !== 'all' || network !== '';

  function clearFilters(): void {
    setQuery('');
    setStatus('all');
    setNetwork('');
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold sm:text-3xl">Establecimientos</h1>
          <p className="mt-1.5 text-muted">Centros asistenciales donde trabajan los digitadores. La altitud ajusta la hemoglobina de cada dosaje.</p>
        </div>
        <button type="button" onClick={() => setPanel({ mode: 'create' })} className={buttonClass('primary')}>
          <Plus aria-hidden="true" className="size-4" />
          Nuevo establecimiento
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} value={NUMBER_FORMAT.format(totals.active)} detail={`de ${NUMBER_FORMAT.format(views.length)}`} label="Establecimientos activos" />
        <Stat icon={Network} value={NUMBER_FORMAT.format(totals.networks)} label="Redes asistenciales" />
        <Stat icon={UserRound} value={NUMBER_FORMAT.format(totals.digitizers)} label="Digitadores asignados" />
        <Stat icon={Baby} value={NUMBER_FORMAT.format(totals.children)} label="Niños registrados" />
      </div>

      <div className={`${PANEL_CLASS} mb-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-end`}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={searchId} className="text-sm font-semibold">
            Buscar
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              className={`${INPUT_CLASS} pl-9`}
            />
          </div>
          <p className="text-xs text-muted">Nombre, código IPRESS o red asistencial.</p>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Estado</legend>
          <div className="flex rounded-[10px] bg-celeste-50 p-1">
            {STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  className="peer sr-only"
                />
                {status === option.value ? (
                  <motion.span layoutId="facility-status" className="absolute inset-0 rounded-[8px] bg-white shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                ) : null}
                <span className="relative block rounded-[8px] px-3 py-2 text-sm font-semibold text-muted peer-checked:text-celeste-900 peer-focus-visible:outline-2 peer-focus-visible:outline-celeste-700">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5 lg:w-56">
          <label htmlFor={networkId} className="text-sm font-semibold">
            Red asistencial
          </label>
          <select id={networkId} value={network} onChange={(event) => setNetwork(event.target.value)} className={INPUT_CLASS}>
            <option value="">Todas las redes</option>
            {networks.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 lg:w-52">
          <label htmlFor={sortId} className="text-sm font-semibold">
            Ordenar por
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => {
              if (isSortKey(event.target.value)) {
                setSort(event.target.value);
              }
            }}
            className={INPUT_CLASS}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {visible.length === views.length
          ? `${views.length} ${views.length === 1 ? 'establecimiento' : 'establecimientos'}`
          : `${visible.length} de ${views.length} establecimientos`}
      </p>

      {views.length === 0 ? (
        <div className="rounded-(--radius-panel) border border-dashed border-celeste-200 bg-white px-6 py-14 text-center">
          <Building2 aria-hidden="true" className="mx-auto size-10 text-celeste-500" />
          <p className="mt-3 font-display text-lg font-semibold">Todavía no hay establecimientos</p>
          <p className="mx-auto mt-1 max-w-md text-muted">Registra el primero para poder asignarle digitadores.</p>
          <button type="button" onClick={() => setPanel({ mode: 'create' })} className={buttonClass('primary', 'mt-5')}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo establecimiento
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-(--radius-panel) border border-dashed border-celeste-200 bg-white px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Ningún establecimiento coincide</p>
          <p className="mt-1 text-muted">Prueba con otra búsqueda o quita los filtros.</p>
          {filtered ? (
            <button type="button" onClick={clearFilters} className={buttonClass('secondary', 'mt-5')}>
              <X aria-hidden="true" className="size-4" />
              Quitar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <motion.ul layout={!reduceMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((view) => (
              <motion.li
                key={view.facility.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <FacilityCard view={view} onEdit={() => setPanel({ mode: 'edit', facilityId: view.facility.id })} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <SidePanel
        open={panel !== null}
        onClose={closePanel}
        title={panel?.mode === 'create' ? 'Nuevo establecimiento' : (editing?.facility.name ?? 'Establecimiento')}
        {...(panel?.mode === 'create'
          ? { description: 'Después podrás asignarle digitadores desde Cuentas.' }
          : editing === undefined
            ? {}
            : { description: `IPRESS ${editing.facility.ipressCode}` })}
      >
        {panel?.mode === 'create' ? <FacilityForm networks={networks} onSaved={closePanel} /> : null}
        {editing === undefined ? null : <FacilityDetails view={editing} networks={networks} onSaved={closePanel} />}
      </SidePanel>
    </>
  );
}
