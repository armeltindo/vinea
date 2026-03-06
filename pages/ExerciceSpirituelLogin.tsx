import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { getMemberByPhoneAndLastName, normalizeForLogin } from '../lib/db';
import { MemberSession, MemberType } from '../types';
import { cn } from '../utils';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
};

const ExerciceSpirituelLogin: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'greeting'>('form');
  const [foundMember, setFoundMember] = useState<MemberSession | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !lastName.trim()) {
      setError('Veuillez renseigner votre numéro de téléphone et votre nom de famille.');
      return;
    }
    setLoading(true);
    setError('');

    const member = await getMemberByPhoneAndLastName(phone.trim(), lastName.trim());

    if (!member) {
      setError('Aucun compte trouvé avec ces informations. Vérifiez votre numéro et nom de famille.');
      setLoading(false);
      return;
    }

    if (!member.memberAccountActive) {
      setError('Votre compte n\'a pas encore été activé. Contactez votre faiseur de disciples.');
      setLoading(false);
      return;
    }

    // Faiseur de disciples = type Pasteur, Assistant, Co-dirigeant ou Ouvrier
    const isMentor = ![MemberType.MEMBRE_SIMPLE, MemberType.ENFANT].includes(member.type as MemberType);

    const session: MemberSession = {
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      gender: member.gender,
      isDiscipleMaker: isMentor,
      phone: member.phone,
      photoUrl: member.photoUrl,
    };

    setFoundMember(session);
    setStep('greeting');

    // Pause pour afficher le message de bienvenue puis rediriger
    setTimeout(() => {
      localStorage.setItem('vinea_member_session', JSON.stringify(session));
      navigate('/mon-espace/dashboard');
    }, 2200);
  };

  const title = foundMember
    ? `${getGreeting()}, ${foundMember.gender === 'Masculin' ? 'frère' : 'sœur'} en Christ ${foundMember.firstName} !`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex items-center justify-center p-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-xl">
            <span className="text-2xl font-black text-white">V</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Mon Espace - MIDC</h1>
          <p className="text-indigo-200 text-sm mt-1 font-medium">Portail Membres — Vinea</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          {step === 'form' ? (
            <>
              <p className="text-indigo-100 text-sm text-center mb-6 leading-relaxed">
                Veuillez entrer votre numéro de téléphone et votre nom de famille.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-indigo-200 mb-1.5 ml-1 block">
                    Numéro de téléphone
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Ex : 07 12 34 56 78"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/60 focus:bg-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/10 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-indigo-200 mb-1.5 ml-1 block">
                    Nom de famille
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Ex : DUPONT"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/60 focus:bg-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/10 outline-none text-sm font-medium transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-3 bg-rose-500/20 border border-rose-400/30 rounded-xl">
                    <AlertCircle size={16} className="text-rose-300 mt-0.5 shrink-0" />
                    <p className="text-rose-200 text-xs leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2",
                    loading
                      ? "bg-white/20 text-white/60 cursor-not-allowed"
                      : "bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-indigo-900/30"
                  )}
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Vérification...</>
                  ) : (
                    <><LogIn size={18} /> Se connecter</>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-20 h-20 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400/40">
                <span className="text-3xl">🙏</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-snug">{title}</h2>
                <p className="text-indigo-200 text-sm mt-2">Chargement de votre espace...</p>
              </div>
              <div className="flex justify-center">
                <Loader2 size={20} className="animate-spin text-indigo-300" />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-indigo-300/60 text-xs mt-6">
          Vinea — Système de gestion ecclésiale
        </p>
      </div>
    </div>
  );
};

export default ExerciceSpirituelLogin;
