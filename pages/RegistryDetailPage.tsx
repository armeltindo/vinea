import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Trash2,
  Edit,
  Heart,
  Baby,
  Waves,
  Calendar,
  User,
  Users,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { getRegistryEvents, updateRegistryEvent, deleteRegistryEvent, getMembers } from '../lib/db';
import { RegistryEvent, Member } from '../types';
import { cn, formatFirstName } from '../utils';
import { usePermissions } from '../context/PermissionsContext';
import Avatar from '../components/Avatar';
import RegistryEventModal, { EventFormData, typeConfig, formToEventPatch } from '../components/RegistryEventModal';

const formatDate = (d?: string): string => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isMember?: boolean;
}> = ({ label, value, icon, onClick, isMember }) => (
  <div
    className={cn(
      "flex items-start gap-3 p-4 rounded-xl bg-slate-50",
      onClick && "cursor-pointer hover:bg-indigo-50 transition-colors group"
    )}
    onClick={onClick}
  >
    {icon && <div className="text-slate-400 mt-0.5 shrink-0 group-hover:text-indigo-500 transition-colors">{icon}</div>}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={cn(
        "text-sm font-semibold mt-0.5",
        onClick ? "text-indigo-700" : "text-slate-800",
        !value && "text-slate-300 font-normal italic text-xs"
      )}>
        {value || 'Non renseigné'}
      </p>
    </div>
    {isMember && (
      <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full font-medium self-start mt-1 shrink-0">
        Membre
      </span>
    )}
    {onClick && value && (
      <ExternalLink size={13} className="text-indigo-400 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    )}
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
      <div className="text-indigo-500">{icon}</div>
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-5 space-y-3">{children}</div>
  </div>
);

interface PersonCardProps {
  label: string;
  name?: string;
  memberId?: string;
  getMember: (id?: string) => Member | undefined;
  onNavigate: (id?: string) => void;
}

const PersonCard: React.FC<PersonCardProps> = ({ label, name, memberId, getMember, onNavigate }) => {
  const m = getMember(memberId);
  const displayName = name || (m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : '');
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        memberId
          ? "bg-indigo-50/60 border-indigo-100 cursor-pointer hover:bg-indigo-100/60 group"
          : "bg-slate-50 border-slate-100"
      )}
      onClick={memberId ? () => onNavigate(memberId) : undefined}
    >
      {m ? (
        <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size="md" shape="card" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
          <User size={16} className="text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn(
          "text-sm font-bold mt-0.5 truncate",
          memberId ? "text-indigo-700 group-hover:underline" : "text-slate-800",
          !displayName && "text-slate-300 font-normal italic text-xs"
        )}>
          {displayName || 'Non renseigné'}
        </p>
        {m && <p className="text-[10px] text-slate-400">{m.type}</p>}
      </div>
      {memberId && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full font-medium">Membre</span>
          <ExternalLink size={12} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
};

// ─── Type-specific sections ───────────────────────────────────────────────────

interface DetailProps {
  event: RegistryEvent;
  getMember: (id?: string) => Member | undefined;
  resolvedName: (id?: string, fallback?: string) => string;
  onNavigate: (id?: string) => void;
}

const MariageDetail: React.FC<DetailProps> = ({ event, getMember, resolvedName, onNavigate }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <Section title="Les époux" icon={<Heart size={14} />}>
      <PersonCard
        label="Époux"
        name={resolvedName(event.groomId, event.groomName)}
        memberId={event.groomId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
      <PersonCard
        label="Épouse"
        name={resolvedName(event.brideId, event.brideName)}
        memberId={event.brideId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
    </Section>

    <Section title="Témoins" icon={<Users size={14} />}>
      <PersonCard
        label="Parrain du mariage"
        name={resolvedName(event.godfatherId, event.godfatherName)}
        memberId={event.godfatherId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
      <PersonCard
        label="Marraine du mariage"
        name={resolvedName(event.godmotherId, event.godmotherName)}
        memberId={event.godmotherId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
    </Section>

    <Section title="Célébration" icon={<Calendar size={14} />}>
      <InfoRow
        label="Pasteur célébrant"
        value={resolvedName(event.celebratingPastorId, event.celebratingPastorName) || undefined}
        icon={<User size={14} />}
        onClick={event.celebratingPastorId ? () => onNavigate(event.celebratingPastorId) : undefined}
        isMember={!!event.celebratingPastorId}
      />
      <InfoRow label="Date de célébration" value={formatDate(event.celebrationDate)} icon={<Calendar size={14} />} />
      <InfoRow label="Date du mariage civil" value={formatDate(event.civilMarriageDate)} icon={<Calendar size={14} />} />
      <InfoRow label="Date de la dot" value={formatDate(event.traditionalMarriageDate)} icon={<Calendar size={14} />} />
    </Section>

    {event.observations && (
      <Section title="Observations" icon={<MessageSquare size={14} />}>
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{event.observations}</p>
        </div>
      </Section>
    )}
  </div>
);

const SortieEnfantDetail: React.FC<DetailProps> = ({ event, getMember, resolvedName, onNavigate }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <Section title="L'enfant" icon={<Baby size={14} />}>
      <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl text-center">
        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2">Nom complet</p>
        <p className="text-xl font-bold text-slate-900">{event.childFullName || '—'}</p>
      </div>
    </Section>

    <Section title="Parents" icon={<Users size={14} />}>
      <PersonCard
        label="Père"
        name={resolvedName(event.fatherId, event.fatherName)}
        memberId={event.fatherId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
      <PersonCard
        label="Mère"
        name={resolvedName(event.motherId, event.motherName)}
        memberId={event.motherId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
    </Section>

    <Section title="Cérémonie" icon={<Calendar size={14} />}>
      <InfoRow label="Date de sortie" value={formatDate(event.dedicationDate)} icon={<Calendar size={14} />} />
      <InfoRow
        label="Pasteur célébrant"
        value={resolvedName(event.celebratingPastorId, event.celebratingPastorName) || undefined}
        icon={<User size={14} />}
        onClick={event.celebratingPastorId ? () => onNavigate(event.celebratingPastorId) : undefined}
        isMember={!!event.celebratingPastorId}
      />
    </Section>
  </div>
);

const BaptemeDetail: React.FC<DetailProps> = ({ event, getMember, resolvedName, onNavigate }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <Section title="Membre baptisé" icon={<Waves size={14} />}>
      <PersonCard
        label="Baptisé(e)"
        name={resolvedName(event.memberId, event.groomName)}
        memberId={event.memberId}
        getMember={getMember}
        onNavigate={onNavigate}
      />
    </Section>

    <Section title="Cérémonie" icon={<Calendar size={14} />}>
      <InfoRow label="Date de baptême" value={formatDate(event.baptismDate)} icon={<Calendar size={14} />} />
      <InfoRow
        label="Pasteur célébrant"
        value={resolvedName(event.celebratingPastorId, event.celebratingPastorName) || undefined}
        icon={<User size={14} />}
        onClick={event.celebratingPastorId ? () => onNavigate(event.celebratingPastorId) : undefined}
        isMember={!!event.celebratingPastorId}
      />
    </Section>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const RegistryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite, canDelete } = usePermissions();

  const [event, setEvent] = useState<RegistryEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [evts, mbs] = await Promise.all([getRegistryEvents(), getMembers()]);
      setMembers(mbs);
      const found = evts.find(e => e.id === id) ?? null;
      setEvent(found);
      setNotFound(!found);
      setLoading(false);
    };
    load();
  }, [id]);

  const getMember = (membId?: string): Member | undefined =>
    membId ? members.find(m => m.id === membId) : undefined;

  const resolvedName = (membId?: string, fallback?: string): string => {
    if (membId) {
      const m = getMember(membId);
      if (m) return `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`;
    }
    return fallback || '';
  };

  const handleEditSave = async (data: EventFormData) => {
    if (!event) return;
    setSaving(true);
    const patch = formToEventPatch(data);
    await updateRegistryEvent(event.id, patch);
    setEvent(prev => prev ? { ...prev, ...patch } : prev);
    setIsEditOpen(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    await deleteRegistryEvent(event.id);
    navigate('/registre');
  };

  const getTitle = (): string => {
    if (!event) return '';
    if (event.type === 'Mariage') {
      const groom = resolvedName(event.groomId, event.groomName) || '—';
      const bride = resolvedName(event.brideId, event.brideName) || '—';
      return `${groom} & ${bride}`;
    }
    if (event.type === "Sortie d'enfant") return event.childFullName || '—';
    if (event.type === 'Baptême') return resolvedName(event.memberId, event.groomName) || '—';
    return '—';
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-400 opacity-60" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
        <AlertTriangle size={40} />
        <p className="text-sm font-medium">Événement introuvable</p>
        <button onClick={() => navigate('/registre')} className="text-xs text-indigo-600 underline">
          Retour au registre
        </button>
      </div>
    );
  }

  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;
  const title = getTitle();

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/registre')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <p className="text-xs text-slate-400">Registre</p>
          <h1 className="text-base font-bold text-slate-900 leading-tight">{title}</h1>
        </div>
      </div>

      {/* Hero */}
      <div className={cn("bg-gradient-to-br rounded-2xl border p-6 flex items-center gap-5", cfg.gradient, cfg.border)}>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0", cfg.bg)}>
          <Icon size={26} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", cfg.badge)}>{event.type}</span>
          <h2 className="text-xl font-bold text-slate-900 mt-2 leading-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enregistré le {formatDate(event.createdAt?.split('T')[0])}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {canWrite('registre') && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm"
            >
              <Edit size={13} /> Modifier
            </button>
          )}
          {canDelete('registre') && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
            >
              <Trash2 size={13} /> Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Type-specific content */}
      {event.type === 'Mariage' && (
        <MariageDetail event={event} getMember={getMember} resolvedName={resolvedName} onNavigate={(id) => id && navigate(`/members/${id}`)} />
      )}
      {event.type === "Sortie d'enfant" && (
        <SortieEnfantDetail event={event} getMember={getMember} resolvedName={resolvedName} onNavigate={(id) => id && navigate(`/members/${id}`)} />
      )}
      {event.type === 'Baptême' && (
        <BaptemeDetail event={event} getMember={getMember} resolvedName={resolvedName} onNavigate={(id) => id && navigate(`/members/${id}`)} />
      )}

      {/* Edit Modal */}
      <RegistryEventModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleEditSave}
        initial={event}
        members={members}
        saving={saving}
      />

      {/* Delete confirm */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 size={26} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Supprimer cet événement ?</h3>
            <p className="text-xs text-slate-500 mt-2">Cette action est irréversible.</p>
            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200"
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

export default RegistryDetailPage;
