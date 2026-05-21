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
  Clock,
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

const formatDateShort = (d?: string): string => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  colorClass?: string;
  fullWidth?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, colorClass = 'text-indigo-500' }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
      <div className={colorClass}>{icon}</div>
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4 space-y-2.5">{children}</div>
  </div>
);

// Affichage d'une date sous forme de badge calendrier
const DateCard: React.FC<{ label: string; date?: string; colorClass?: string; bgClass?: string }> = ({
  label, date, colorClass = 'text-slate-600', bgClass = 'bg-slate-50',
}) => (
  <div className={cn("rounded-xl p-3.5 flex items-center gap-3", bgClass, !date && "opacity-50")}>
    <Calendar size={16} className={cn("shrink-0", colorClass)} />
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className={cn("text-sm font-bold", date ? colorClass : "text-slate-400 italic font-normal text-xs")}>
        {date ? formatDateShort(date) : 'Non renseigné'}
      </p>
    </div>
  </div>
);

// Carte d'une personne (membre ou texte libre)
interface PersonCardProps {
  label: string;
  name?: string;
  memberId?: string;
  getMember: (id?: string) => Member | undefined;
  onNavigate: (id?: string) => void;
  accentBg?: string;
  accentBorder?: string;
  accentText?: string;
}

const PersonCard: React.FC<PersonCardProps> = ({
  label, name, memberId, getMember, onNavigate,
  accentBg = 'bg-indigo-50/60', accentBorder = 'border-indigo-100', accentText = 'text-indigo-700',
}) => {
  const m = getMember(memberId);
  const displayName = name || (m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : '');
  const isClickable = !!memberId;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
        isClickable
          ? `${accentBg} ${accentBorder} cursor-pointer hover:brightness-95 group`
          : "bg-slate-50 border-slate-100"
      )}
      onClick={isClickable ? () => onNavigate(memberId) : undefined}
    >
      {m ? (
        <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size="md" shape="card" />
      ) : displayName ? (
        // Initiales pour les noms libres
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-500">
            {displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
          </span>
        </div>
      ) : (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <User size={16} className="text-slate-300" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className={cn(
          "text-sm font-bold truncate",
          isClickable ? `${accentText} group-hover:underline` : "text-slate-800",
          !displayName && "text-slate-300 font-normal italic text-xs"
        )}>
          {displayName || 'Non renseigné'}
        </p>
        {m && <p className="text-[10px] text-slate-400 mt-0.5">{m.type}</p>}
      </div>

      {isClickable && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", accentBg.replace('/60', ''), accentText)}>
            Membre
          </span>
          <ExternalLink size={12} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", accentText)} />
        </div>
      )}
    </div>
  );
};

// Ligne d'info simple (pasteur, observations…)
const InfoRow: React.FC<{
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isMember?: boolean;
}> = ({ label, value, icon, onClick, isMember }) => (
  <div
    className={cn(
      "flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100",
      onClick && "cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-colors group"
    )}
    onClick={onClick}
  >
    {icon && <div className="text-slate-400 shrink-0 group-hover:text-indigo-500 transition-colors">{icon}</div>}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className={cn(
        "text-sm font-semibold",
        onClick ? "text-indigo-700" : "text-slate-800",
        !value && "text-slate-300 font-normal italic text-xs"
      )}>
        {value || 'Non renseigné'}
      </p>
    </div>
    {isMember && (
      <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full font-medium shrink-0">Membre</span>
    )}
    {onClick && value && (
      <ExternalLink size={13} className="text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    )}
  </div>
);

// ─── Type-specific sections ───────────────────────────────────────────────────

interface DetailProps {
  event: RegistryEvent;
  getMember: (id?: string) => Member | undefined;
  resolvedName: (id?: string, fallback?: string) => string;
  onNavigate: (id?: string) => void;
}

const MariageDetail: React.FC<DetailProps> = ({ event, getMember, resolvedName, onNavigate }) => (
  <div className="space-y-4">
    {/* Les époux — pleine largeur */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Section title="Époux" icon={<Heart size={13} />} colorClass="text-rose-500">
        <PersonCard
          label="Époux"
          name={resolvedName(event.groomId, event.groomName)}
          memberId={event.groomId}
          getMember={getMember}
          onNavigate={onNavigate}
          accentBg="bg-rose-50/60"
          accentBorder="border-rose-100"
          accentText="text-rose-700"
        />
        <PersonCard
          label="Épouse"
          name={resolvedName(event.brideId, event.brideName)}
          memberId={event.brideId}
          getMember={getMember}
          onNavigate={onNavigate}
          accentBg="bg-rose-50/60"
          accentBorder="border-rose-100"
          accentText="text-rose-700"
        />
      </Section>

      <Section title="Témoins" icon={<Users size={13} />} colorClass="text-rose-400">
        <PersonCard
          label="Parrain du mariage"
          name={resolvedName(event.godfatherId, event.godfatherName)}
          memberId={event.godfatherId}
          getMember={getMember}
          onNavigate={onNavigate}
          accentBg="bg-rose-50/60"
          accentBorder="border-rose-100"
          accentText="text-rose-700"
        />
        <PersonCard
          label="Marraine du mariage"
          name={resolvedName(event.godmotherId, event.godmotherName)}
          memberId={event.godmotherId}
          getMember={getMember}
          onNavigate={onNavigate}
          accentBg="bg-rose-50/60"
          accentBorder="border-rose-100"
          accentText="text-rose-700"
        />
      </Section>
    </div>

    {/* Célébration + Dates */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Section title="Célébrant" icon={<User size={13} />} colorClass="text-rose-400">
        <InfoRow
          label="Pasteur célébrant"
          value={resolvedName(event.celebratingPastorId, event.celebratingPastorName) || undefined}
          icon={<User size={14} />}
          onClick={event.celebratingPastorId ? () => onNavigate(event.celebratingPastorId) : undefined}
          isMember={!!event.celebratingPastorId}
        />
      </Section>

      <Section title="Dates" icon={<Calendar size={13} />} colorClass="text-rose-400">
        <div className="grid grid-cols-1 gap-2">
          <DateCard label="Célébration" date={event.celebrationDate} colorClass="text-rose-600" bgClass="bg-rose-50/60" />
          <DateCard label="Mariage civil" date={event.civilMarriageDate} colorClass="text-slate-600" bgClass="bg-slate-50" />
          <DateCard label="Dot" date={event.traditionalMarriageDate} colorClass="text-slate-600" bgClass="bg-slate-50" />
        </div>
      </Section>
    </div>

    {/* Observations — pleine largeur si présentes */}
    {event.observations && (
      <Section title="Observations" icon={<MessageSquare size={13} />} colorClass="text-slate-400">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{event.observations}</p>
        </div>
      </Section>
    )}
  </div>
);

const SortieEnfantDetail: React.FC<DetailProps> = ({ event, getMember, resolvedName, onNavigate }) => (
  <div className="space-y-4">
    {/* L'enfant — full width */}
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 flex items-center gap-5">
      <div className="w-16 h-16 bg-white rounded-2xl border border-amber-200 flex items-center justify-center shadow-sm shrink-0">
        <Baby size={28} className="text-amber-500" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Nom de l'enfant</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{event.childFullName || '—'}</p>
      </div>
    </div>

    {/* Parents + Cérémonie */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Section title="Parents" icon={<Users size={13} />} colorClass="text-amber-500">
        <PersonCard
          label="Père"
          name={resolvedName(event.fatherId, event.fatherName)}
          memberId={event.fatherId}
          getMember={getMember}
          onNavigate={onNavigate}
          accentBg="bg-amber-50/60"
          accentBorder="border-amber-100"
          accentText="text-amber-700"
        />
        <PersonCard
          label="Mère"
          name={resolvedName(event.motherId, event.motherName)}
          memberId={event.motherId}
          getMember={getMember}
          onNavigate={onNavigate}
          accentBg="bg-amber-50/60"
          accentBorder="border-amber-100"
          accentText="text-amber-700"
        />
      </Section>

      <Section title="Cérémonie" icon={<Calendar size={13} />} colorClass="text-amber-500">
        <DateCard label="Date de sortie" date={event.dedicationDate} colorClass="text-amber-600" bgClass="bg-amber-50/60" />
        <InfoRow
          label="Pasteur célébrant"
          value={resolvedName(event.celebratingPastorId, event.celebratingPastorName) || undefined}
          icon={<User size={14} />}
          onClick={event.celebratingPastorId ? () => onNavigate(event.celebratingPastorId) : undefined}
          isMember={!!event.celebratingPastorId}
        />
      </Section>
    </div>
  </div>
);

const BaptemeDetail: React.FC<DetailProps> = ({ event, getMember, resolvedName, onNavigate }) => (
  <div className="space-y-4">
    {/* Membre baptisé — full width */}
    <Section title="Membre baptisé" icon={<Waves size={13} />} colorClass="text-blue-500">
      <PersonCard
        label="Baptisé(e)"
        name={resolvedName(event.memberId, event.groomName)}
        memberId={event.memberId}
        getMember={getMember}
        onNavigate={onNavigate}
        accentBg="bg-blue-50/60"
        accentBorder="border-blue-100"
        accentText="text-blue-700"
      />
    </Section>

    {/* Cérémonie */}
    <Section title="Cérémonie" icon={<Calendar size={13} />} colorClass="text-blue-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <DateCard label="Date de baptême" date={event.baptismDate} colorClass="text-blue-600" bgClass="bg-blue-50/60" />
        <InfoRow
          label="Pasteur célébrant"
          value={resolvedName(event.celebratingPastorId, event.celebratingPastorName) || undefined}
          icon={<User size={14} />}
          onClick={event.celebratingPastorId ? () => onNavigate(event.celebratingPastorId) : undefined}
          isMember={!!event.celebratingPastorId}
        />
      </div>
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

      {/* Hero banner */}
      <div className={cn("rounded-2xl border overflow-hidden", cfg.border)}>
        {/* Bande colorée du haut */}
        <div className={cn("h-2 w-full", cfg.bg)} />

        <div className={cn("p-6 bg-gradient-to-br", cfg.gradient)}>
          <div className="flex items-start gap-4">
            {/* Icône */}
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-md shrink-0 border", cfg.bg, cfg.border)}>
              <Icon size={28} className={cfg.color} />
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <span className={cn("inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full", cfg.badge)}>
                {event.type}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2 leading-tight">{title}</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock size={11} className="text-slate-400" />
                <p className="text-xs text-slate-400">
                  Enregistré le {formatDate(event.createdAt?.split('T')[0])}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {canWrite('registre') && (
                <button
                  onClick={() => setIsEditOpen(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm border",
                    "bg-white hover:brightness-95",
                    cfg.border, cfg.color
                  )}
                >
                  <Edit size={13} /> Modifier
                </button>
              )}
              {canDelete('registre') && (
                <button
                  onClick={() => setIsDeleteOpen(true)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu spécifique au type */}
      {event.type === 'Mariage' && (
        <MariageDetail event={event} getMember={getMember} resolvedName={resolvedName} onNavigate={(membId) => membId && navigate(`/members/${membId}`)} />
      )}
      {event.type === "Sortie d'enfant" && (
        <SortieEnfantDetail event={event} getMember={getMember} resolvedName={resolvedName} onNavigate={(membId) => membId && navigate(`/members/${membId}`)} />
      )}
      {event.type === 'Baptême' && (
        <BaptemeDetail event={event} getMember={getMember} resolvedName={resolvedName} onNavigate={(membId) => membId && navigate(`/members/${membId}`)} />
      )}

      {/* Modal modification */}
      <RegistryEventModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleEditSave}
        initial={event}
        members={members}
        saving={saving}
      />

      {/* Confirmation suppression */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 size={26} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Supprimer cet événement ?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              <strong className="text-slate-700">{event.type}</strong> — {title}
              <br />Cette action est irréversible.
            </p>
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
                className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors"
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
