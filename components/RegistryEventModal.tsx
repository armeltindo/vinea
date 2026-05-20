import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Baby,
  Waves,
  X,
  Search,
  User,
  Loader2,
} from 'lucide-react';
import { RegistryEvent, RegistryEventType, Member } from '../types';
import { cn, formatFirstName } from '../utils';
import Avatar from './Avatar';

// ─── Shared types & helpers ──────────────────────────────────────────────────

export const EVENT_TYPES: RegistryEventType[] = ['Mariage', "Sortie d'enfant", 'Baptême'];

export const typeConfig = {
  'Mariage': {
    icon: Heart,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    gradient: 'from-rose-50 to-white',
  },
  "Sortie d'enfant": {
    icon: Baby,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    gradient: 'from-amber-50 to-white',
  },
  'Baptême': {
    icon: Waves,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-50 to-white',
  },
};

export interface EventFormData {
  type: RegistryEventType;
  groomName: string; groomId?: string;
  brideName: string; brideId?: string;
  godfatherName: string; godfatherId?: string;
  godmotherName: string; godmotherId?: string;
  celebratingPastorName: string; celebratingPastorId?: string;
  celebrationDate: string;
  civilMarriageDate: string;
  traditionalMarriageDate: string;
  observations: string;
  childFullName: string; childId?: string;
  fatherName: string; fatherId?: string;
  motherName: string; motherId?: string;
  dedicationDate: string;
  memberName: string; memberId?: string;
  baptismDate: string;
}

export const emptyForm = (): EventFormData => ({
  type: 'Mariage',
  groomName: '', groomId: undefined,
  brideName: '', brideId: undefined,
  godfatherName: '', godfatherId: undefined,
  godmotherName: '', godmotherId: undefined,
  celebratingPastorName: '', celebratingPastorId: undefined,
  celebrationDate: '',
  civilMarriageDate: '',
  traditionalMarriageDate: '',
  observations: '',
  childFullName: '', childId: undefined,
  fatherName: '', fatherId: undefined,
  motherName: '', motherId: undefined,
  dedicationDate: '',
  memberName: '', memberId: undefined,
  baptismDate: '',
});

export const eventToForm = (e: RegistryEvent, members: Member[]): EventFormData => {
  const getMemberName = (id?: string) => {
    if (!id) return '';
    const m = members.find(x => x.id === id);
    return m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : '';
  };
  return {
    type: e.type,
    groomName: e.groomName || getMemberName(e.groomId),
    groomId: e.groomId,
    brideName: e.brideName || getMemberName(e.brideId),
    brideId: e.brideId,
    godfatherName: e.godfatherName || getMemberName(e.godfatherId),
    godfatherId: e.godfatherId,
    godmotherName: e.godmotherName || getMemberName(e.godmotherId),
    godmotherId: e.godmotherId,
    celebratingPastorName: e.celebratingPastorName || getMemberName(e.celebratingPastorId),
    celebratingPastorId: e.celebratingPastorId,
    celebrationDate: e.celebrationDate || '',
    civilMarriageDate: e.civilMarriageDate || '',
    traditionalMarriageDate: e.traditionalMarriageDate || '',
    observations: e.observations || '',
    childFullName: e.childFullName || '',
    childId: undefined,
    fatherName: e.fatherName || getMemberName(e.fatherId),
    fatherId: e.fatherId,
    motherName: e.motherName || getMemberName(e.motherId),
    motherId: e.motherId,
    dedicationDate: e.dedicationDate || '',
    memberName: getMemberName(e.memberId) || e.groomName || '',
    memberId: e.memberId,
    baptismDate: e.baptismDate || '',
  };
};

export const formToEventPatch = (data: EventFormData): Partial<RegistryEvent> => {
  const base: Partial<RegistryEvent> = { type: data.type };
  if (data.type === 'Mariage') {
    Object.assign(base, {
      groomId: data.groomId || undefined,
      groomName: data.groomName || undefined,
      brideId: data.brideId || undefined,
      brideName: data.brideName || undefined,
      godfatherId: data.godfatherId || undefined,
      godfatherName: data.godfatherName || undefined,
      godmotherId: data.godmotherId || undefined,
      godmotherName: data.godmotherName || undefined,
      celebratingPastorId: data.celebratingPastorId || undefined,
      celebratingPastorName: data.celebratingPastorName || undefined,
      celebrationDate: data.celebrationDate || undefined,
      civilMarriageDate: data.civilMarriageDate || undefined,
      traditionalMarriageDate: data.traditionalMarriageDate || undefined,
      observations: data.observations || undefined,
    });
  } else if (data.type === "Sortie d'enfant") {
    Object.assign(base, {
      childFullName: data.childFullName || undefined,
      fatherId: data.fatherId || undefined,
      fatherName: data.fatherName || undefined,
      motherId: data.motherId || undefined,
      motherName: data.motherName || undefined,
      dedicationDate: data.dedicationDate || undefined,
      celebratingPastorId: data.celebratingPastorId || undefined,
      celebratingPastorName: data.celebratingPastorName || undefined,
    });
  } else if (data.type === 'Baptême') {
    Object.assign(base, {
      memberId: data.memberId || undefined,
      groomName: data.memberName || undefined,
      baptismDate: data.baptismDate || undefined,
      celebratingPastorId: data.celebratingPastorId || undefined,
      celebratingPastorName: data.celebratingPastorName || undefined,
    });
  }
  return base;
};

// ─── MemberPicker ─────────────────────────────────────────────────────────────

interface MemberPickerProps {
  members: Member[];
  value: { id?: string; name: string };
  onChange: (val: { id?: string; name: string }) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

export const MemberPicker: React.FC<MemberPickerProps> = ({
  members, value, onChange,
  placeholder = 'Nom ou rechercher un membre…', required, label
}) => {
  const [inputVal, setInputVal] = useState(value.name || '');
  const [open, setOpen] = useState(false);

  // Sync quand value change depuis l'extérieur (ex: reset du form)
  useEffect(() => {
    setInputVal(value.name || '');
  }, [value.name]);

  const filtered = useMemo(() => {
    if (!inputVal.trim()) return [];
    const q = inputVal.toLowerCase();
    return members.filter(m =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      (m.nickname || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [members, inputVal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    // Commit immédiatement — texte libre, pas de membre lié
    onChange({ id: undefined, name: val });
    setOpen(true);
  };

  const handleSelect = (m: Member) => {
    const name = `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`;
    setInputVal(name);
    onChange({ id: m.id, name });
    setOpen(false);
  };

  const handleClear = () => {
    setInputVal('');
    onChange({ id: undefined, name: '' });
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={inputVal}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-8 pr-8 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all",
            value.id
              ? "bg-indigo-50/60 border-indigo-200 focus:border-indigo-400"
              : "bg-white border-slate-200 focus:border-indigo-400"
          )}
        />
        {inputVal && (
          <button type="button" onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={13} />
          </button>
        )}
        {open && filtered.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onMouseDown={() => handleSelect(m)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left"
              >
                <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size="xs" shape="circle" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{formatFirstName(m.firstName)} {m.lastName.toUpperCase()}</p>
                  <p className="text-[10px] text-slate-400">{m.type}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {value.id && (
        <p className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1">
          <User size={10} /> Membre enregistré
        </p>
      )}
    </div>
  );
};

// ─── RegistryEventModal ───────────────────────────────────────────────────────

interface RegistryEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => Promise<void>;
  initial?: RegistryEvent;
  members: Member[];
  saving: boolean;
}

const RegistryEventModal: React.FC<RegistryEventModalProps> = ({
  isOpen, onClose, onSave, initial, members, saving
}) => {
  const [form, setForm] = useState<EventFormData>(initial ? eventToForm(initial, members) : emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(initial ? eventToForm(initial, members) : emptyForm());
      setErrors({});
    }
  }, [isOpen, initial]);

  const set = (key: keyof EventFormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof EventFormData, string>> = {};
    if (form.type === 'Mariage') {
      if (!form.groomName.trim()) e.groomName = 'Requis';
      if (!form.brideName.trim()) e.brideName = 'Requis';
    }
    if (form.type === "Sortie d'enfant") {
      if (!form.childFullName.trim()) e.childFullName = 'Requis';
    }
    if (form.type === 'Baptême') {
      if (!form.memberName.trim()) e.memberName = 'Requis';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  if (!isOpen) return null;

  const inputCls = (err?: string) => cn(
    "w-full px-3 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all",
    err ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-indigo-400"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">{initial ? 'Modifier l\'événement' : 'Nouvel événement'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registre paroissial</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Type selector (only for new events) */}
            {!initial && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Type d'événement</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(t => {
                    const cfg = typeConfig[t];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setForm({ ...emptyForm(), type: t }); setErrors({}); }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition-all",
                          form.type === t
                            ? `${cfg.bg} ${cfg.border} ${cfg.color} border-current`
                            : "border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <Icon size={20} />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── MARIAGE ── */}
            {form.type === 'Mariage' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <MemberPicker
                      members={members}
                      label="Époux"
                      required
                      value={{ id: form.groomId, name: form.groomName }}
                      onChange={v => setForm(f => ({ ...f, groomId: v.id, groomName: v.name }))}
                      placeholder="Rechercher l'époux…"
                    />
                    {errors.groomName && <p className="text-[10px] text-rose-500 mt-1">{errors.groomName}</p>}
                  </div>
                  <div>
                    <MemberPicker
                      members={members}
                      label="Épouse"
                      required
                      value={{ id: form.brideId, name: form.brideName }}
                      onChange={v => setForm(f => ({ ...f, brideId: v.id, brideName: v.name }))}
                      placeholder="Rechercher l'épouse…"
                    />
                    {errors.brideName && <p className="text-[10px] text-rose-500 mt-1">{errors.brideName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MemberPicker
                    members={members}
                    label="Parrain du mariage"
                    value={{ id: form.godfatherId, name: form.godfatherName }}
                    onChange={v => setForm(f => ({ ...f, godfatherId: v.id, godfatherName: v.name }))}
                    placeholder="Rechercher le parrain…"
                  />
                  <MemberPicker
                    members={members}
                    label="Marraine du mariage"
                    value={{ id: form.godmotherId, name: form.godmotherName }}
                    onChange={v => setForm(f => ({ ...f, godmotherId: v.id, godmotherName: v.name }))}
                    placeholder="Rechercher la marraine…"
                  />
                </div>

                <MemberPicker
                  members={members}
                  label="Pasteur célébrant"
                  value={{ id: form.celebratingPastorId, name: form.celebratingPastorName }}
                  onChange={v => setForm(f => ({ ...f, celebratingPastorId: v.id, celebratingPastorName: v.name }))}
                  placeholder="Rechercher le pasteur…"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Date de célébration</label>
                    <input type="date" value={form.celebrationDate} onChange={e => set('celebrationDate', e.target.value)} className={inputCls()} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Date mariage civil</label>
                    <input type="date" value={form.civilMarriageDate} onChange={e => set('civilMarriageDate', e.target.value)} className={inputCls()} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Date de la dot</label>
                    <input type="date" value={form.traditionalMarriageDate} onChange={e => set('traditionalMarriageDate', e.target.value)} className={inputCls()} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Autres observations</label>
                  <textarea
                    rows={3}
                    value={form.observations}
                    onChange={e => set('observations', e.target.value)}
                    placeholder="Remarques complémentaires…"
                    className={cn(inputCls(), "resize-none")}
                  />
                </div>
              </div>
            )}

            {/* ── SORTIE D'ENFANT ── */}
            {form.type === "Sortie d'enfant" && (
              <div className="space-y-5">
                <div>
                  <MemberPicker
                    members={members}
                    label="Nom et prénom de l'enfant"
                    required
                    value={{ id: form.childId, name: form.childFullName }}
                    onChange={v => setForm(f => ({ ...f, childId: v.id, childFullName: v.name }))}
                    placeholder="Ex : Jean-Pierre KOUDOU"
                  />
                  {errors.childFullName && <p className="text-[10px] text-rose-500 mt-1">{errors.childFullName}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MemberPicker
                    members={members}
                    label="Père"
                    value={{ id: form.fatherId, name: form.fatherName }}
                    onChange={v => setForm(f => ({ ...f, fatherId: v.id, fatherName: v.name }))}
                    placeholder="Rechercher le père…"
                  />
                  <MemberPicker
                    members={members}
                    label="Mère"
                    value={{ id: form.motherId, name: form.motherName }}
                    onChange={v => setForm(f => ({ ...f, motherId: v.id, motherName: v.name }))}
                    placeholder="Rechercher la mère…"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Date de sortie</label>
                    <input type="date" value={form.dedicationDate} onChange={e => set('dedicationDate', e.target.value)} className={inputCls()} />
                  </div>
                  <MemberPicker
                    members={members}
                    label="Pasteur célébrant"
                    value={{ id: form.celebratingPastorId, name: form.celebratingPastorName }}
                    onChange={v => setForm(f => ({ ...f, celebratingPastorId: v.id, celebratingPastorName: v.name }))}
                    placeholder="Rechercher le pasteur…"
                  />
                </div>
              </div>
            )}

            {/* ── BAPTÊME ── */}
            {form.type === 'Baptême' && (
              <div className="space-y-5">
                <div>
                  <MemberPicker
                    members={members}
                    label="Membre baptisé"
                    required
                    value={{ id: form.memberId, name: form.memberName }}
                    onChange={v => setForm(f => ({ ...f, memberId: v.id, memberName: v.name }))}
                    placeholder="Rechercher le membre…"
                  />
                  {errors.memberName && <p className="text-[10px] text-rose-500 mt-1">{errors.memberName}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Date de baptême</label>
                    <input type="date" value={form.baptismDate} onChange={e => set('baptismDate', e.target.value)} className={inputCls()} />
                  </div>
                  <MemberPicker
                    members={members}
                    label="Pasteur célébrant"
                    value={{ id: form.celebratingPastorId, name: form.celebratingPastorName }}
                    onChange={v => setForm(f => ({ ...f, celebratingPastorId: v.id, celebratingPastorName: v.name }))}
                    placeholder="Rechercher le pasteur…"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistryEventModal;
