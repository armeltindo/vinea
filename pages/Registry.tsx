import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Heart,
  Baby,
  Waves,
  X,
  User,
  Users,
  Loader2,
  Calendar,
  BookMarked,
  ChevronRight,
  FileSearch,
} from 'lucide-react';
import { getRegistryEvents, createRegistryEvent, updateRegistryEvent, deleteRegistryEvent, getMembers } from '../lib/db';
import { RegistryEvent, RegistryEventType, Member } from '../types';
import { cn, formatFirstName } from '../utils';
import { usePermissions } from '../context/PermissionsContext';
import RegistryEventModal, { EventFormData, typeConfig, formToEventPatch } from '../components/RegistryEventModal';

const formatDate = (d?: string): string => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
};

type FilterTab = 'Tous' | RegistryEventType;

const Registry: React.FC = () => {
  const navigate = useNavigate();
  const { canWrite, canDelete } = usePermissions();

  const [events, setEvents] = useState<RegistryEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('Tous');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RegistryEvent | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegistryEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [evts, mbs] = await Promise.all([getRegistryEvents(), getMembers()]);
      setEvents(evts);
      setMembers(mbs);
      setLoading(false);
    };
    load();
  }, []);

  const getMemberName = (id?: string): string | undefined => {
    if (!id) return undefined;
    const m = members.find(x => x.id === id);
    return m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : undefined;
  };

  const getEventDisplayTitle = (event: RegistryEvent): string => {
    if (event.type === 'Mariage') {
      const groom = event.groomName || getMemberName(event.groomId) || '—';
      const bride = event.brideName || getMemberName(event.brideId) || '—';
      return `${groom} & ${bride}`;
    }
    if (event.type === "Sortie d'enfant") return event.childFullName || '—';
    if (event.type === 'Baptême') return event.groomName || getMemberName(event.memberId) || '—';
    return '—';
  };

  const filtered = useMemo(() => {
    let list = events;
    if (activeTab !== 'Tous') list = list.filter(e => e.type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => getEventDisplayTitle(e).toLowerCase().includes(q));
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, activeTab, search, members]);

  const handleSave = async (data: EventFormData) => {
    setSaving(true);
    try {
      const patch = formToEventPatch(data);
      if (editingEvent) {
        await updateRegistryEvent(editingEvent.id, patch);
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...patch } : e));
      } else {
        const created = await createRegistryEvent(patch as Omit<RegistryEvent, 'id' | 'createdAt' | 'updatedAt'>);
        if (created) setEvents(prev => [created, ...prev]);
      }
      setModalOpen(false);
      setEditingEvent(undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteRegistryEvent(deleteTarget.id);
    setEvents(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const tabs: { label: string; value: FilterTab; count: number }[] = [
    { label: 'Tous', value: 'Tous', count: events.length },
    { label: 'Mariages', value: 'Mariage', count: events.filter(e => e.type === 'Mariage').length },
    { label: "Sorties d'enfants", value: "Sortie d'enfant", count: events.filter(e => e.type === "Sortie d'enfant").length },
    { label: 'Baptêmes', value: 'Baptême', count: events.filter(e => e.type === 'Baptême').length },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <ScrollText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Registre</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {events.length} événement{events.length !== 1 ? 's' : ''} enregistré{events.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {canWrite('registre') && (
          <button
            onClick={() => { setEditingEvent(undefined); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={15} />
            Nouvel événement
          </button>
        )}
      </div>

      {/* Stats — cliquables pour filtrer */}
      <div className="grid grid-cols-3 gap-3">
        {(['Mariage', "Sortie d'enfant", 'Baptême'] as RegistryEventType[]).map(t => {
          const cfg = typeConfig[t];
          const Icon = cfg.icon;
          const count = events.filter(e => e.type === t).length;
          const isActive = activeTab === t;
          const singularLabel: Record<string, string> = {
            'Mariage': 'Mariage',
            "Sortie d'enfant": "Sortie d'enfant",
            'Baptême': 'Baptême',
          };
          const pluralLabel: Record<string, string> = {
            'Mariage': 'Mariages',
            "Sortie d'enfant": "Sorties d'enfants",
            'Baptême': 'Baptêmes',
          };
          const label = count !== 1 ? pluralLabel[t] : singularLabel[t];
          return (
            <button
              key={t}
              onClick={() => setActiveTab(isActive ? 'Tous' : t)}
              className={cn(
                "bg-white rounded-2xl border p-4 flex items-center gap-3 shadow-sm transition-all text-left group hover:shadow-md active:scale-[0.98]",
                isActive ? cn(cfg.border, cfg.bg + '/30') : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", cfg.bg)}>
                <Icon size={19} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-slate-900 leading-none">{count}</p>
                <p className={cn("text-[11px] font-semibold leading-tight mt-0.5 truncate", isActive ? cfg.color : "text-slate-400")}>
                  {label}
                </p>
              </div>
              <ChevronRight size={14} className={cn("shrink-0 transition-all", isActive ? cfg.color : "text-slate-200 group-hover:text-slate-400")} />
            </button>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                activeTab === tab.value ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"
              )}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un événement…"
            className="w-full pl-8 pr-8 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 opacity-40">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        events.length === 0 ? (
          /* État vide initial — aucun événement dans la base */
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
              <BookMarked size={34} className="text-indigo-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">Aucun événement enregistré</h3>
            <p className="text-xs text-slate-400 text-center max-w-xs mb-6 leading-relaxed">
              Mariages, sorties d'enfants, baptêmes — consignez ici tous les moments importants de votre paroisse.
            </p>
            {canWrite('registre') && (
              <button
                onClick={() => { setEditingEvent(undefined); setModalOpen(true); }}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Plus size={15} />
                Enregistrer le premier événement
              </button>
            )}
          </div>
        ) : (
          /* Aucun résultat pour la recherche/filtre */
          <div className="flex flex-col items-center justify-center py-16 px-6 opacity-60">
            <FileSearch size={36} className="text-slate-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-slate-400">Aucun résultat</p>
            <button
              onClick={() => { setSearch(''); setActiveTab('Tous'); }}
              className="mt-3 text-xs text-indigo-600 font-medium hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(event => {
            const cfg = typeConfig[event.type];
            const Icon = cfg.icon;
            const title = getEventDisplayTitle(event);
            return (
              <div
                key={event.id}
                onClick={() => navigate(`/registre/${event.id}`)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 hover:-translate-y-0.5 transition-all overflow-hidden cursor-pointer group"
              >
                {/* Card header */}
                <div className={cn("px-5 py-4 border-b flex items-center gap-3", cfg.border, cfg.bg + '/50')}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", cfg.bg)}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.badge)}>{event.type}</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5 truncate group-hover:text-indigo-700 transition-colors">{title}</p>
                  </div>
                  <ChevronRight size={15} className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* Card body */}
                <div className="px-5 py-3 space-y-1.5 min-h-[52px]">
                  {event.type === 'Mariage' && (
                    <>
                      {event.celebrationDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={11} className="shrink-0 text-slate-400" />
                          <span>Célébration : {formatDate(event.celebrationDate)}</span>
                        </div>
                      )}
                      {(event.celebratingPastorName || getMemberName(event.celebratingPastorId)) && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            Pasteur : {event.celebratingPastorName || getMemberName(event.celebratingPastorId)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {event.type === "Sortie d'enfant" && (
                    <>
                      {event.dedicationDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={11} className="shrink-0 text-slate-400" />
                          <span>Sortie : {formatDate(event.dedicationDate)}</span>
                        </div>
                      )}
                      {(event.fatherName || getMemberName(event.fatherId) || event.motherName || getMemberName(event.motherId)) && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Users size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            {[
                              event.fatherName || getMemberName(event.fatherId),
                              event.motherName || getMemberName(event.motherId),
                            ].filter(Boolean).join(' & ')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {event.type === 'Baptême' && (
                    <>
                      {event.baptismDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={11} className="shrink-0 text-slate-400" />
                          <span>Baptême : {formatDate(event.baptismDate)}</span>
                        </div>
                      )}
                      {(event.celebratingPastorName || getMemberName(event.celebratingPastorId)) && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            Pasteur : {event.celebratingPastorName || getMemberName(event.celebratingPastorId)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-5 py-2.5 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-300">
                    {event.createdAt ? formatDate(event.createdAt.split('T')[0]) : '—'}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {canWrite('registre') && (
                      <button
                        onClick={() => { setEditingEvent(event); setModalOpen(true); }}
                        className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit size={13} />
                      </button>
                    )}
                    {canDelete('registre') && (
                      <button
                        onClick={() => setDeleteTarget(event)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <RegistryEventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(undefined); }}
        onSave={handleSave}
        initial={editingEvent}
        members={members}
        saving={saving}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Supprimer ?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              <strong className="text-slate-700">{deleteTarget.type}</strong> — {getEventDisplayTitle(deleteTarget)}
              <br />Cette action est irréversible.
            </p>
            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all border border-slate-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registry;
