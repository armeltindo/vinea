import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, LogIn, Loader2, AlertCircle, Sparkles, Quote, ArrowRight } from 'lucide-react';
import { getMemberByPhoneAndLastName, normalizeForLogin } from '../lib/db';
import { MemberSession, MemberType } from '../types';
import { cn } from '../utils';

const VERSES = [
  { text: "Tout ce que vous faites, faites-le de bon coeur, comme pour le Seigneur et non pour des hommes,", ref: "Colossiens 3:23" },
  { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
  { text: "L'Eternel est mon berger: je ne manquerai de rien.", ref: "Psaumes 23:1" },
  { text: "Que tout ce que vous faites se fasse avec charité.", ref: "1 Corinthiens 16:14" },
  { text: "Confie-toi en l'Eternel de tout ton coeur, Et ne t'appuie pas sur ta sagesse;", ref: "Proverbes 3:5" },
  { text: "Car je connais les projets que j'ai formés sur vous, dit l'Eternel, projets de paix et non de malheur.", ref: "Jérémie 29:11" },
  { text: "Ne crains rien, car je suis avec toi; Ne promène pas des regards inquiets, car je suis ton Dieu.", ref: "Ésaïe 41:10" },
  { text: "Le Seigneur est ma lumière et mon salut: de qui aurais-je crainte?", ref: "Psaumes 27:1" },
  { text: "Fais de l'Eternel tes délices, et il te donnera ce que ton coeur désire.", ref: "Psaumes 37:4" },
  { text: "Recommande ton sort à l'Eternel, mets en lui ta confiance, et il agira.", ref: "Psaumes 37:5" },
  { text: "Soyez forts et courageux! Ne craignez point et ne soyez point effrayés devant eux.", ref: "Deutéronome 31:6" },
  { text: "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.", ref: "Psaumes 119:105" },
  { text: "L'Eternel combattra pour vous; et vous, gardez le silence.", ref: "Exode 14:14" },
  { text: "Demandez, et l'on vous donnera; cherchez, et vous trouverez; frappez, et l'on vous ouvrira.", ref: "Matthieu 7:7" },
  { text: "Si Dieu est pour nous, qui sera contre nous?", ref: "Romains 8:31" },
  { text: "Que la paix de Christ, à laquelle vous avez été appelés pour former un seul corps, règne dans vos coeurs.", ref: "Colossiens 3:15" },
  { text: "Mais ceux qui se confient en l'Eternel renouvellent leur force. Ils prennent le vol comme les aigles.", ref: "Ésaïe 40:31" },
  { text: "La joie de l'Eternel sera votre force.", ref: "Néhémie 8:10" },
  { text: "Car Dieu n'est pas un Dieu de désordre, mais de paix.", ref: "1 Corinthiens 14:33" },
  { text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.", ref: "Matthieu 11:28" },
  { text: "Le fruit de l'Esprit, c'est l'amour, la joie, la paix, la patience, la bonté, la bénignité, la fidélité, la douceur, la tempérance.", ref: "Galates 5:22-23" },
  { text: "C'est par la grâce que vous êtes sauvés, par le moyen de la foi.", ref: "Éphésiens 2:8" },
  { text: "Je vous laisse la paix, je vous donne ma paix.", ref: "Jean 14:27" },
  { text: "Le malheur atteint souvent le juste, mais l'Eternel l'en délivre toujours.", ref: "Psaumes 34:19" },
  { text: "Ne vous inquiétez donc pas du lendemain; car le lendemain aura soin de lui-même.", ref: "Matthieu 6:34" },
  { text: "Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.", ref: "Matthieu 6:33" },
  { text: "Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.", ref: "Psaumes 46:1" },
  { text: "Je t'instruirai et te montrerai la voie que tu dois suivre; je te conseillerai, j'aurai le regard sur toi.", ref: "Psaumes 32:8" },
  { text: "Celui qui demeure sous l'abri du Très-Haut repose à l'ombre du Tout Puissant.", ref: "Psaumes 91:1" },
  { text: "Toutes choses concourent au bien de ceux qui aiment Dieu.", ref: "Romains 8:28" },
  { text: "La bonté de l'Eternel n'est pas épuisée, ses compassions ne sont pas à leur terme; elles se renouvellent chaque matin.", ref: "Lamentations 3:22-23" },
  { text: "Il donne de la force à celui qui est fatigué, et il augmente la vigueur de celui qui tombe en défaillance.", ref: "Ésaïe 40:29" },
  { text: "L'Eternel gardera ton départ et ton arrivée, dès maintenant et à jamais.", ref: "Psaumes 121:8" },
  { text: "Car rien n'est impossible à Dieu.", ref: "Luc 1:37" },
  { text: "Le coeur de l'homme médite sa voie, mais c'est l'Eternel qui affermit ses pas.", ref: "Proverbes 16:9" },
  { text: "Goûtez et voyez combien l'Eternel est bon! Heureux l'homme qui cherche en lui son refuge!", ref: "Psaumes 34:8" },
  { text: "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence.", ref: "Romains 12:2" },
  { text: "L'amour est patient, il est plein de bonté; l'amour n'est point envieux; l'amour ne se vante point.", ref: "1 Corinthiens 13:4" },
  { text: "Voici le jour que l'Eternel a fait: Qu'il soit pour nous un sujet d'allégresse et de joie!", ref: "Psaumes 118:24" },
  { text: "Dieu est amour.", ref: "1 Jean 4:8" },
  { text: "Le nom de l'Eternel est une tour forte; Le juste s'y réfugie, et se trouve en sûreté.", ref: "Proverbes 18:10" },
  { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
  { text: "Et mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus-Christ.", ref: "Philippiens 4:19" },
  { text: "Soyez aimables les uns envers les autres, pleins de compassion, vous pardonnant réciproquement.", ref: "Éphésiens 4:32" },
  { text: "Que le Dieu de l'espérance vous remplisse de toute joie et de toute paix dans la foi.", ref: "Romains 15:13" },
  { text: "Le Seigneur est fidèle, il vous affermira et vous préservera du malin.", ref: "2 Thessaloniciens 3:3" },
  { text: "La prière fervente du juste a une grande efficace.", ref: "Jacques 5:16" },
  { text: "Si l'un de vous manque de sagesse, qu'il la demande à Dieu.", ref: "Jacques 1:5" },
  { text: "Vous êtes le sel de la terre.", ref: "Matthieu 5:13" },
  { text: "Vous êtes la lumière du monde.", ref: "Matthieu 5:14" },
  { text: "Ma grâce te suffit, car ma puissance s'accomplit dans la faiblesse.", ref: "2 Corinthiens 12:9" },
  { text: "Le Seigneur est proche de ceux qui ont le coeur brisé.", ref: "Psaumes 34:18" },
  { text: "Dieu essuiera toute larme de leurs yeux.", ref: "Apocalypse 21:4" },
  { text: "Si tu peux!... Tout est possible à celui qui croit.", ref: "Marc 9:23" },
  { text: "Sois fidèle jusqu'à la mort, et je te donnerai la couronne de vie.", ref: "Apocalypse 2:10" },
  { text: "Le coeur joyeux rend le visage serein.", ref: "Proverbes 15:13" },
  { text: "L'Eternel est ma force et mon bouclier; en lui mon coeur se confie, et je suis secouru.", ref: "Psaumes 28:7" },
  { text: "Approchez-vous de Dieu, et il s'approchera de vous.", ref: "Jacques 4:8" },
  { text: "Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", ref: "Jean 3:16" },
  { text: "Ne nous lassons pas de faire le bien; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas.", ref: "Galates 6:9" },
  { text: "Soyez toujours joyeux.", ref: "1 Thessaloniciens 5:16" },
  { text: "Priez sans cesse.", ref: "1 Thessaloniciens 5:17" },
  { text: "Rendez grâces en toutes choses.", ref: "1 Thessaloniciens 5:18" },
  { text: "La crainte de l'Eternel est le commencement de la sagesse.", ref: "Proverbes 9:10" },
  { text: "Tout est possible à Dieu.", ref: "Matthieu 19:26" },
  { text: "Tu aimeras ton prochain comme toi-même.", ref: "Matthieu 22:39" },
  { text: "Christ en vous, l'espérance de la gloire.", ref: "Colossiens 1:27" },
  { text: "Le Seigneur est mon aide, je ne craindrai rien.", ref: "Hébreux 13:6" },
  { text: "Ayez foi en Dieu.", ref: "Marc 11:22" },
  { text: "Heureux les coeurs purs, car ils verront Dieu!", ref: "Matthieu 5:8" },
  { text: "Je suis le chemin, la vérité, et la vie.", ref: "Jean 14:6" },
  { text: "Demandez et vous recevrez, afin que votre joie soit parfaite.", ref: "Jean 16:24" },
  { text: "Crois au Seigneur Jésus, et tu seras sauvé, toi et ta famille.", ref: "Actes 16:31" },
  { text: "La foi vient de ce qu'on entend, et ce qu'on entend vient de la parole de Christ.", ref: "Romains 10:17" },
  { text: "Il n'y a donc maintenant aucune condamnation pour ceux qui sont en Jésus-Christ.", ref: "Romains 8:1" },
  { text: "Rien ne pourra nous séparer de l'amour de Dieu manifesté en Jésus-Christ notre Seigneur.", ref: "Romains 8:39" },
  { text: "Ne soyez pas vaincus par le mal, mais surmontez le mal par le bien.", ref: "Romains 12:21" },
  { text: "C'est Christ qui vit en moi.", ref: "Galates 2:20" },
  { text: "Faites tout au nom du Seigneur Jésus.", ref: "Colossiens 3:17" },
  { text: "Ta parole est la vérité.", ref: "Jean 17:17" },
  { text: "Je serre ta parole dans mon coeur, afin de ne pas pécher contre toi.", ref: "Psaumes 119:11" },
  { text: "La révélation de tes paroles éclaire.", ref: "Psaumes 119:130" },
  { text: "Le secours me vient de l'Eternel, qui a fait les cieux et la terre.", ref: "Psaumes 121:2" },
  { text: "L'Eternel est celui qui te garde, l'Eternel est ton ombre à ta main droite.", ref: "Psaumes 121:5" },
  { text: "Ceux qui se confient en l'Eternel sont comme la montagne de Sion: elle ne chancelle point.", ref: "Psaumes 125:1" },
  { text: "Comme des montagnes entourent Jérusalem, ainsi l'Eternel entoure son peuple.", ref: "Psaumes 125:2" },
  { text: "L'Eternel a fait pour nous de grandes choses; nous sommes dans la joie.", ref: "Psaumes 126:3" },
  { text: "Ceux qui sèment avec larmes moissonneront avec chants d'allégresse.", ref: "Psaumes 126:5" },
  { text: "Si l'Eternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain.", ref: "Psaumes 127:1" },
  { text: "Heureux tout homme qui craint l'Eternel, qui marche dans ses voies!", ref: "Psaumes 128:1" },
  { text: "J'espère en l'Eternel, mon âme espère, et j'attends sa promesse.", ref: "Psaumes 130:5" },
  { text: "Car la miséricorde est auprès de l'Eternel, et la rédemption est auprès de lui en abondance.", ref: "Psaumes 130:7" },
  { text: "Oh! qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble!", ref: "Psaumes 133:1" },
  { text: "Bénis l'Eternel, ô mon âme! Que tout ce qui est en moi bénisse son saint nom!", ref: "Psaumes 103:1" },
  { text: "L'Eternel est miséricordieux et compatissant, lent à la colère et riche en bonté.", ref: "Psaumes 103:8" },
  { text: "Autant l'orient est éloigné de l'occident, autant il éloigne de nous nos transgressions.", ref: "Psaumes 103:12" },
  { text: "Avec Dieu, nous ferons des exploits.", ref: "Psaumes 108:13" },
  { text: "Fais-moi dès le matin entendre ta bonté! Car je me confie en toi.", ref: "Psaumes 143:8" },
  { text: "Que ton bon esprit me conduise sur la voie droite!", ref: "Psaumes 143:10" },
  { text: "Heureux le peuple dont l'Eternel est le Dieu!", ref: "Psaumes 144:15" },
  { text: "L'Eternel soutient tous ceux qui tombent, et il redresse tous ceux qui sont courbés.", ref: "Psaumes 145:14" },
  { text: "L'Eternel est proche de tous ceux qui l'invoquent.", ref: "Psaumes 145:18" },
  { text: "Il guérit ceux qui ont le coeur brisé, et il panse leurs blessures.", ref: "Psaumes 147:3" },
  { text: "Que tout ce qui respire loue l'Eternel! Louez l'Eternel!", ref: "Psaumes 150:6" },
];

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

  const selectedVerse = useMemo(() => {
    const dayIndex = Math.floor((Date.now() + 3600000) / 86400000);
    return VERSES[dayIndex % VERSES.length];
  }, []);

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

                <div className="mt-4 space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden group",
                      loading
                        ? "bg-white/20 text-white/60 cursor-not-allowed"
                        : "bg-gradient-to-r from-white to-indigo-50 text-indigo-700 hover:from-indigo-50 hover:to-white shadow-xl shadow-indigo-900/40 hover:shadow-indigo-900/60 hover:scale-[1.01] active:scale-[0.99]"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Vérification en cours...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={18} className="shrink-0" />
                        <span>Accéder à mon espace membre</span>
                        <ArrowRight size={16} className="shrink-0 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-indigo-300/70 text-[11px]">
                    Accès réservé aux membres enregistrés
                  </p>
                </div>
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

        {/* Verset biblique du jour */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={11} className="text-amber-300 shrink-0" />
            <span className="text-[10px] font-semibold text-indigo-200 tracking-wide uppercase">Méditation du jour</span>
          </div>
          <div className="flex gap-2.5">
            <Quote size={18} className="text-white/15 shrink-0 mt-0.5" />
            <div>
              <p className="text-white/80 text-xs leading-relaxed italic">
                {selectedVerse.text}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-px w-4 bg-indigo-400/30" />
                <p className="text-[10px] font-medium text-indigo-300">{selectedVerse.ref}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-indigo-300/60 text-xs mt-4">
          Vinea — Système de gestion ecclésiale
        </p>
      </div>
    </div>
  );
};

export default ExerciceSpirituelLogin;
