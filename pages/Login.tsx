import React, { useState, useMemo, useRef } from 'react';
import { 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  ChevronLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Quote,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../utils';
import Logo from '../components/Logo';

interface LoginProps {
  onLogin: (email: string, role: string, permissions: string[]) => void;
}

type ViewState = 'login' | 'forgot-password' | 'success';

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
  { text: "Soyez reconnaissants.", ref: "Colossiens 3:15" },
  { text: "Il donne de la force à celui qui est fatigué, et il augmente la vigueur de celui qui tombe en défaillance.", ref: "Ésaïe 40:29" },
  { text: "L'Eternel gardera ton départ et ton arrivée, dès maintenant et à jamais.", ref: "Psaumes 121:8" },
  { text: "Car rien n'est impossible à Dieu.", ref: "Luc 1:37" },
  { text: "Le coeur de l'homme médite sa voie, mais c'est l'Eternel qui affermit ses pas.", ref: "Proverbes 16:9" },
  { text: "Goûtez et voyez combien l'Eternel est bon! Heureux l'homme qui cherche en lui son refuge!", ref: "Psaumes 34:8" },
  { text: "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence.", ref: "Romains 12:2" },
  { text: "L'amour est patient, il est plein de bonté; l'amour n'est point envieux; l'amour ne se vante point.", ref: "1 Corinthiens 13:4" },
  { text: "Voici le jour que l'Eternel a fait: Qu'il soit pour nous un sujet d'allégresse et de joie!", ref: "Psaumes 118:24" },
  { text: "Sois sans crainte, petit troupeau; car votre Père a trouvé bon de vous donner le royaume.", ref: "Luc 12:32" },
  { text: "Dieu est amour.", ref: "1 Jean 4:8" },
  { text: "Ta droite me soutient, et ta bonté me fait grandir.", ref: "Psaumes 18:35" },
  { text: "Le nom de l'Eternel est une tour forte; Le juste s'y réfugie, et se trouve en sûreté.", ref: "Proverbes 18:10" },
  { text: "En tout temps, le juste a de la compassion, et il prête; et sa postérité est bénie.", ref: "Psaumes 37:26" },
  { text: "Que tes oeuvres sont nombreuses, ô Eternel! Tu les as toutes faites avec sagesse.", ref: "Psaumes 104:24" },
  { text: "Je t'aime, ô Eternel, ma force!", ref: "Psaumes 18:1" },
  { text: "Bénis l'Eternel, ô mon âme, et n'oublie aucun de ses bienfaits!", ref: "Psaumes 103:2" },
  { text: "Car là où est ton trésor, là aussi sera ton coeur.", ref: "Matthieu 6:21" },
  { text: "Si nous nous aimons les uns les autres, Dieu demeure en nous.", ref: "1 Jean 4:12" },
  { text: "L'Eternel est bon envers tous, et ses compassions s'étendent sur toutes ses oeuvres.", ref: "Psaumes 145:9" },
  { text: "Heureux ceux qui procurent la paix, car ils seront appelés fils de Dieu!", ref: "Matthieu 5:9" },
  { text: "L'Eternel est mon rocher, ma forteresse, mon libérateur!", ref: "Psaumes 18:2" },
  { text: "Prie ton Père qui est là dans le lieu secret; et ton Père, qui voit dans le secret, te le rendra.", ref: "Matthieu 6:6" },
  { text: "Et mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus-Christ.", ref: "Philippiens 4:19" },
  { text: "Soyez aimables les uns envers les autres, pleins de compassion, vous pardonnant réciproquement.", ref: "Éphésiens 4:32" },
  { text: "Que le Dieu de l'espérance vous remplisse de toute joie et de toute paix dans la foi.", ref: "Romains 15:13" },
  { text: "L'Esprit lui-même rend témoignage à notre esprit que nous sommes enfants de Dieu.", ref: "Romains 8:16" },
  { text: "Le Seigneur est fidèle, il vous affermira et vous préservera du malin.", ref: "2 Thessaloniciens 3:3" },
  { text: "La prière fervente du juste a une grande efficace.", ref: "Jacques 5:16" },
  { text: "Comme un père a compassion de ses enfants, l'Eternel a compassion de ceux qui le craignent.", ref: "Psaumes 103:13" },
  { text: "Si l'un de vous manque de sagesse, qu'il la demande à Dieu.", ref: "Jacques 1:5" },
  { text: "Vous êtes le sel de la terre.", ref: "Matthieu 5:13" },
  { text: "Vous êtes la lumière du monde.", ref: "Matthieu 5:14" },
  { text: "L'Eternel garde tous ceux qui l'aiment.", ref: "Psaumes 145:20" },
  { text: "Quand je marche dans la vallée de l'ombre de la mort, je ne crains aucun mal.", ref: "Psaumes 23:4" },
  { text: "Ma grâce te suffit, car ma puissance s'accomplit dans la faiblesse.", ref: "2 Corinthiens 12:9" },
  { text: "Celui qui croit en moi fera aussi les oeuvres que je fais.", ref: "Jean 14:12" },
  { text: "Le Seigneur est proche de ceux qui ont le coeur brisé.", ref: "Psaumes 34:18" },
  { text: "Dieu essuiera toute larme de leurs yeux.", ref: "Apocalypse 21:4" },
  { text: "Mieux vaut un peu, avec la crainte de l'Eternel, qu'un grand trésor, avec le trouble.", ref: "Proverbes 15:16" },
  { text: "Le pain de Dieu, c'est celui qui descend du ciel et qui donne la vie au monde.", ref: "Jean 6:33" },
  { text: "Si tu peux!... Tout est possible à celui qui croit.", ref: "Marc 9:23" },
  { text: "Sois fidèle jusqu'à la mort, et je te donnerai la couronne de vie.", ref: "Apocalypse 2:10" },
  { text: "La langue douce est un arbre de vie.", ref: "Proverbes 15:4" },
  { text: "Le coeur joyeux rend le visage serein.", ref: "Proverbes 15:13" },
  { text: "Heureux l'homme qui ne marche pas selon le conseil des méchants.", ref: "Psaumes 1:1" },
  { text: "L'Eternel est ma force et mon bouclier; en lui mon coeur se confie, et je suis secouru.", ref: "Psaumes 28:7" },
  { text: "L'Eternel est mon berger, je ne manquerai de rien.", ref: "Psaumes 23:1" },
  { text: "Approchez-vous de Dieu, et il s'approchera de vous.", ref: "Jacques 4:8" },
  { text: "Car le salaire du péché, c'est la mort; mais le don gratuit de Dieu, c'est la vie éternelle en Jésus-Christ notre Seigneur.", ref: "Romains 6:23" },
  { text: "Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", ref: "Jean 3:16" },
  { text: "Ne nous lassons pas de faire le bien; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas.", ref: "Galates 6:9" },
  { text: "Soyez toujours joyeux.", ref: "1 Thessaloniciens 5:16" },
  { text: "Priez sans cesse.", ref: "1 Thessaloniciens 5:17" },
  { text: "Rendez grâces en toutes choses.", ref: "1 Thessaloniciens 5:18" },
  { text: "C'est ici la journée que l'Eternel a faite; égayons-nous et réjouissons-nous en elle.", ref: "Psaumes 118:24" },
  { text: "La crainte de l'Eternel est le commencement de la sagesse.", ref: "Proverbes 9:10" },
  { text: "Tout est possible à Dieu.", ref: "Matthieu 19:26" },
  { text: "Je te loue de ce que je suis une créature si merveilleuse.", ref: "Psaumes 139:14" },
  { text: "Que ton règne vienne; que ta volonté soit faite sur la terre comme au ciel.", ref: "Matthieu 6:10" },
  { text: "Tu aimeras ton prochain comme toi-même.", ref: "Matthieu 22:39" },
  { text: "Si vous pardonnez aux hommes leurs offenses, votre Père céleste vous pardonnera aussi.", ref: "Matthieu 6:14" },
  { text: "Christ en vous, l'espérance de la gloire.", ref: "Colossiens 1:27" },
  { text: "Le Seigneur est mon aide, je ne craindrai rien.", ref: "Hébreux 13:6" },
  { text: "Ayez foi en Dieu.", ref: "Marc 11:22" },
  { text: "Heureux les coeurs purs, car ils verront Dieu!", ref: "Matthieu 5:8" },
  { text: "La lumière luit dans les ténèbres, et les ténèbres ne l'ont point reçue.", ref: "Jean 1:5" },
  { text: "Que votre lumière luise ainsi devant les hommes.", ref: "Matthieu 5:16" },
  { text: "Celui qui croit en moi a la vie éternelle.", ref: "Jean 6:47" },
  { text: "Je suis le chemin, la vérité, et la vie.", ref: "Jean 14:6" },
  { text: "Nul ne vient au Père que par moi.", ref: "Jean 14:6" },
  { text: "En vérité, en vérité, je vous le dis, celui qui écoute ma parole, et qui croit à celui qui m'a envoyé, a la vie éternelle.", ref: "Jean 5:24" },
  { text: "Demandez et vous recevrez, afin que votre joie soit parfaite.", ref: "Jean 16:24" },
  { text: "Il n'y a de salut en aucun autre.", ref: "Actes 4:12" },
  { text: "Crois au Seigneur Jésus, et tu seras sauvé, toi et ta famille.", ref: "Actes 16:31" },
  { text: "La foi vient de ce qu'on entend, et ce qu'on entend vient de la parole de Christ.", ref: "Romains 10:17" },
  { text: "Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton coeur que Dieu l'a ressuscité des morts, tu seras sauvé.", ref: "Romains 10:9" },
  { text: "Il n'y a donc maintenant aucune condamnation pour ceux qui sont en Jésus-Christ.", ref: "Romains 8:1" },
  { text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu.", ref: "Romains 8:28" },
  { text: "Rien ne pourra nous séparer de l'amour de Dieu manifesté en Jésus-Christ notre Seigneur.", ref: "Romains 8:39" },
  { text: "Offrez vos corps comme un sacrifice vivant, saint, agréable à Dieu.", ref: "Romains 12:1" },
  { text: "Ne soyez pas vaincus par le mal, mais surmontez le mal par le bien.", ref: "Romains 12:21" },
  { text: "Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ.", ref: "Galates 6:2" },
  { text: "C'est Christ qui vit en moi.", ref: "Galates 2:20" },
  { text: "Faites tout au nom du Seigneur Jésus.", ref: "Colossiens 3:17" },
  { text: "L'Eternel est proche de tous ceux qui l'invoquent.", ref: "Psaumes 145:18" },
  { text: "Ta parole est la vérité.", ref: "Jean 17:17" },
  { text: "Heureux celui qui lit et ceux qui entendent les paroles de la prophétie.", ref: "Apocalypse 1:3" },
  { text: "L'Eternel est ma part et ma coupe.", ref: "Psaumes 16:5" },
  { text: "Je serre ta parole dans mon coeur, afin de ne pas pécher contre toi.", ref: "Psaumes 119:11" },
  { text: "Tes témoignages sont mes délices.", ref: "Psaumes 119:24" },
  { text: "Ouvre mes yeux, pour que je contemple les merveilles de ta loi!", ref: "Psaumes 119:18" },
  { text: "La révélation de tes paroles éclaire.", ref: "Psaumes 119:130" },
  { text: "Que mon âme vive pour te louer!", ref: "Psaumes 119:175" },
  { text: "L'Eternel est mon secours; je regarderai mes ennemis avec joie.", ref: "Psaumes 118:7" },
  { text: "Mieux vaut chercher un refuge en l'Eternel que de se confier à l'homme.", ref: "Psaumes 118:8" },
  { text: "Ma force et le sujet de mes louanges, c'est l'Eternel.", ref: "Psaumes 118:14" },
  { text: "La pierre qu'ont rejetée ceux qui bâtissaient est devenue la principale de l'angle.", ref: "Psaumes 118:22" },
  { text: "Louez l'Eternel, car il est bon, car sa miséricorde dure à toujours!", ref: "Psaumes 118:1" },
  { text: "L'Eternel me châtie, mais il ne me livre pas à la mort.", ref: "Psaumes 118:18" },
  { text: "O Eternel, accorde le salut! O Eternel, donne la prospérité!", ref: "Psaumes 118:25" },
  { text: "L'Eternel est Dieu, et il nous éclaire.", ref: "Psaumes 118:27" },
  { text: "Tu es mon Dieu, et je te louerai.", ref: "Psaumes 118:28" },
  { text: "Qu'Israël dise: Car sa miséricorde dure à toujours!", ref: "Psaumes 118:2" },
  { text: "Du sein de la détresse j'ai invoqué l'Eternel: l'Eternel m'a exaucé.", ref: "Psaumes 118:5" },
  { text: "L'Eternel est pour moi, je ne crains rien: que peuvent me faire des hommes?", ref: "Psaumes 118:6" },
  { text: "Il est bon de louer l'Eternel, et de célébrer ton nom, ô Très-Haut!", ref: "Psaumes 92:1" },
  { text: "D'annoncer le matin ta bonté, et ta fidélité pendant les nuits.", ref: "Psaumes 92:2" },
  { text: "Tu me réjouis par tes oeuvres, ô Eternel! Et je chante avec allégresse l'ouvrage de tes mains.", ref: "Psaumes 92:4" },
  { text: "Que tes oeuvres sont grandes, ô Eternel! Que tes pensées sont profondes!", ref: "Psaumes 92:5" },
  { text: "Le juste croît comme le palmier, il s'élève comme le cèdre du Liban.", ref: "Psaumes 92:12" },
  { text: "Ils portent encore des fruits dans la vieillesse, ils sont pleins de sève et verdoyants.", ref: "Psaumes 92:14" },
  { text: "Pour faire connaître que l'Eternel est juste. Il est mon rocher.", ref: "Psaumes 92:15" },
  { text: "L'Eternel règne, il est revêtu de majesté.", ref: "Psaumes 93:1" },
  { text: "Tes témoignages sont entièrement véritables.", ref: "Psaumes 93:5" },
  { text: "La sainteté convient à ta maison, ô Eternel! pour toute la durée des jours.", ref: "Psaumes 93:5" },
  { text: "Venez, chantons avec allégresse à l'Eternel! Poussons des cris de joie vers le rocher de notre salut.", ref: "Psaumes 95:1" },
  { text: "Allons au-devant de lui avec des louanges, faisons retentir des cantiques en son honneur!", ref: "Psaumes 95:2" },
  { text: "Car l'Eternel est un grand Dieu, il est un grand roi au-dessus de tous les dieux.", ref: "Psaumes 95:3" },
  { text: "Venez, prosternons-nous et humilions-nous, fléchissons le genou devant l'Eternel, notre créateur!", ref: "Psaumes 95:6" },
  { text: "Car il est notre Dieu, et nous sommes le peuple de son pâturage.", ref: "Psaumes 95:7" },
  { text: "Chantez à l'Eternel un cantique nouveau! Chantez à l'Eternel, vous tous, habitants de la terre!", ref: "Psaumes 96:1" },
  { text: "Bénissez son nom, annoncez de jour en jour son salut!", ref: "Psaumes 96:2" },
  { text: "Racontez parmi les nations sa gloire, parmi tous les peuples ses merveilles!", ref: "Psaumes 96:3" },
  { text: "Car l'Eternel est grand et très digne de louange.", ref: "Psaumes 96:4" },
  { text: "Rendez à l'Eternel gloire pour son nom! Apportez des offrandes, et entrez dans ses parvis!", ref: "Psaumes 96:8" },
  { text: "Adorez l'Eternel avec des ornements sacrés.", ref: "Psaumes 96:9" },
  { text: "Que les cieux se réjouissent, et que la terre soit dans l'allégresse!", ref: "Psaumes 96:11" },
  { text: "L'Eternel règne: que la terre soit dans l'allégresse, que les îles nombreuses se réjouissent!", ref: "Psaumes 97:1" },
  { text: "Les cieux publient sa justice, et tous les peuples voient sa gloire.", ref: "Psaumes 97:6" },
  { text: "Vous qui aimez l'Eternel, haïssez le mal! Il garde les âmes de ses fidèles.", ref: "Psaumes 97:10" },
  { text: "La lumière est semée pour le juste, et la joie pour ceux dont le coeur est droit.", ref: "Psaumes 97:11" },
  { text: "Justes, réjouissez-vous en l'Eternel, et célébrez par vos louanges sa sainteté!", ref: "Psaumes 97:12" },
  { text: "Poussez vers l'Eternel des cris de joie, vous tous, habitants de la terre!", ref: "Psaumes 98:4" },
  { text: "Chantez, faites retentir des cantiques et des instruments de musique!", ref: "Psaumes 98:4" },
  { text: "Que la mer retentisse avec tout ce qu'elle contient.", ref: "Psaumes 98:7" },
  { text: "Que les fleuves battent des mains, que toutes les montagnes poussent des cris de joie.", ref: "Psaumes 98:8" },
  { text: "L'Eternel règne: les peuples tremblent.", ref: "Psaumes 99:1" },
  { text: "Qu'on célèbre ton nom grand et redoutable! Il est saint!", ref: "Psaumes 99:3" },
  { text: "Exaltez l'Eternel, notre Dieu, et prosternez-vous devant son marchepied! Il est saint!", ref: "Psaumes 99:5" },
  { text: "Poussez vers l'Eternel des cris de joie, vous tous, habitants de la terre!", ref: "Psaumes 100:1" },
  { text: "Servez l'Eternel, avec joie, venez avec allégresse en sa présence!", ref: "Psaumes 100:2" },
  { text: "Sachez que l'Eternel est Dieu! C'est lui qui nous a faits, et nous lui appartenons.", ref: "Psaumes 100:3" },
  { text: "Entrez dans ses portes avec des louanges, dans ses parvis avec des cantiques!", ref: "Psaumes 100:4" },
  { text: "Célébrez-le, bénissez son nom!", ref: "Psaumes 100:4" },
  { text: "Car l'Eternel est bon; sa miséricorde dure à toujours.", ref: "Psaumes 100:5" },
  { text: "Sa fidélité de génération en génération.", ref: "Psaumes 100:5" },
  { text: "Je chanterai la bonté et la justice; c'est à toi, Eternel! que je chanterai.", ref: "Psaumes 101:1" },
  { text: "Je prendrai garde à la voie droite.", ref: "Psaumes 101:2" },
  { text: "Je marcherai dans l'intégrité de mon coeur, au milieu de ma maison.", ref: "Psaumes 101:2" },
  { text: "Je ne mettrai rien de mauvais devant mes yeux.", ref: "Psaumes 101:3" },
  { text: "Celui qui marche dans une voie intègre sera mon serviteur.", ref: "Psaumes 101:6" },
  { text: "Eternel, écoute ma prière, et que mon cri parvienne jusqu'à toi!", ref: "Psaumes 102:1" },
  { text: "Bénis l'Eternel, ô mon âme! Que tout ce qui est en moi bénisse son saint nom!", ref: "Psaumes 103:1" },
  { text: "C'est lui qui pardonne toutes tes iniquités, qui guérit toutes tes maladies.", ref: "Psaumes 103:3" },
  { text: "C'est lui qui délivre ta vie de la fosse, qui te couronne de bonté et de miséricorde.", ref: "Psaumes 103:4" },
  { text: "L'Eternel fait justice, il fait droit à tous les opprimés.", ref: "Psaumes 103:6" },
  { text: "L'Eternel est miséricordieux et compatissant, lent à la colère et riche en bonté.", ref: "Psaumes 103:8" },
  { text: "Il ne nous traite pas selon nos péchés, il ne nous punit pas selon nos iniquités.", ref: "Psaumes 103:10" },
  { text: "Autant l'orient est éloigné de l'occident, autant il éloigne de nous nos transgressions.", ref: "Psaumes 103:12" },
  { text: "Mais la bonté de l'Eternel dure à jamais pour ceux qui le craignent.", ref: "Psaumes 103:17" },
  { text: "L'Eternel a établi son trône dans les cieux, et son règne domine sur toutes choses.", ref: "Psaumes 103:19" },
  { text: "Bénissez l'Eternel, vous ses anges, qui êtes puissants en force!", ref: "Psaumes 103:20" },
  { text: "Bénis l'Eternel, ô mon âme! Eternel, mon Dieu, tu es infiniment grand!", ref: "Psaumes 104:1" },
  { text: "Il a posé la terre sur ses fondements, elle ne sera jamais ébranlée.", ref: "Psaumes 104:5" },
  { text: "Tous ces animaux espèrent en toi, pour que tu leur donnes la nourriture en son temps.", ref: "Psaumes 104:27" },
  { text: "Que ma parole lui soit agréable! Je veux me réjouir en l'Eternel.", ref: "Psaumes 104:34" },
  { text: "Louez l'Eternel! Invoquez son nom! Faites connaître parmi les peuples ses hauts faits!", ref: "Psaumes 105:1" },
  { text: "Chantez, chantez en son honneur! Parlez de toutes ses merveilles!", ref: "Psaumes 105:2" },
  { text: "Glorifiez-vous de son saint nom! Que le coeur de ceux qui cherchent l'Eternel se réjouisse!", ref: "Psaumes 105:3" },
  { text: "Cherchez l'Eternel et sa force, cherchez continuellement sa face!", ref: "Psaumes 105:4" },
  { text: "Souvenez-vous des prodiges qu'il a faits, de ses miracles et des jugements de sa bouche!", ref: "Psaumes 105:5" },
  { text: "Louez l'Eternel! Louez l'Eternel, car il est bon, car sa miséricorde dure à toujours!", ref: "Psaumes 106:1" },
  { text: "Heureux ceux qui observent la loi, qui pratiquent la justice en tout temps!", ref: "Psaumes 106:3" },
  { text: "Béni soit l'Eternel, le Dieu d'Israël, d'éternité en éternité!", ref: "Psaumes 106:48" },
  { text: "Louez l'Eternel, car il est bon, car sa miséricorde dure à toujours!", ref: "Psaumes 107:1" },
  { text: "Qu'ils louent l'Eternel pour sa bonté, et pour ses merveilles en faveur des fils de l'homme!", ref: "Psaumes 107:8" },
  { text: "Car il a satisfait l'âme altérée, il a comblé de biens l'âme affamée.", ref: "Psaumes 107:9" },
  { text: "Dans leur détresse, ils crièrent à l'Eternel, et il les délivra de leurs angoisses.", ref: "Psaumes 107:13" },
  { text: "Il envoya sa parole et les guérit, il les fit échapper à la fosse.", ref: "Psaumes 107:20" },
  { text: "Quiconque est sage prenne garde à ces choses, et soit attentif aux bontés de l'Eternel.", ref: "Psaumes 107:43" },
  { text: "Mon coeur est affermi, ô Dieu! Je chanterai, je ferai retentir mes instruments.", ref: "Psaumes 108:1" },
  { text: "Je te louerai parmi les peuples, Eternel! Je te chanterai parmi les nations.", ref: "Psaumes 108:3" },
  { text: "Car ta bonté s'élève au-dessus des cieux, et ta fidélité atteint jusqu'aux nues.", ref: "Psaumes 108:4" },
  { text: "Avec Dieu, nous ferons des exploits.", ref: "Psaumes 108:13" },
  { text: "L'Eternel est ma force et le sujet de mes louanges; c'est lui qui m'a sauvé.", ref: "Psaumes 118:14" },
  { text: "Ouvrez-moi les portes de la justice: j'entrerai, je louerai l'Eternel.", ref: "Psaumes 118:19" },
  { text: "Je te loue, parce que tu m'as exaucé, parce que tu m'as sauvé.", ref: "Psaumes 118:21" },
  { text: "Tu es mon Dieu, et je te louerai; mon Dieu! je t'exalterai.", ref: "Psaumes 118:28" },
  { text: "Heureux ceux qui sont intègres dans leur voie, qui marchent selon la loi de l'Eternel!", ref: "Psaumes 119:1" },
  { text: "Heureux ceux qui gardent ses préceptes, qui le cherchent de tout leur coeur.", ref: "Psaumes 119:2" },
  { text: "Tes commandements me rendent plus sage que mes ennemis.", ref: "Psaumes 119:98" },
  { text: "Que ta bonté soit ma consolation!", ref: "Psaumes 119:76" },
  { text: "Je lève mes yeux vers les montagnes... D'où me viendra le secours?", ref: "Psaumes 121:1" },
  { text: "Le secours me vient de l'Eternel, qui a fait les cieux et la terre.", ref: "Psaumes 121:2" },
  { text: "Voici, il ne sommeille ni ne dort, celui qui garde Israël.", ref: "Psaumes 121:4" },
  { text: "L'Eternel est celui qui te garde, l'Eternel est ton ombre à ta main droite.", ref: "Psaumes 121:5" },
  { text: "Pendant le jour le soleil ne te frappera point, ni la lune pendant la nuit.", ref: "Psaumes 121:6" },
  { text: "Je suis dans la joie quand on me dit: Allons à la maison de l'Eternel!", ref: "Psaumes 122:1" },
  { text: "Demandez la paix de Jérusalem. Que ceux qui t'aiment jouissent du repos!", ref: "Psaumes 122:6" },
  { text: "Comme les yeux des serviteurs sont fixés sur la main de leurs maîtres... ainsi nos yeux se tournent vers l'Eternel.", ref: "Psaumes 123:2" },
  { text: "Notre secours est dans le nom de l'Eternel, qui a fait les cieux et la terre.", ref: "Psaumes 124:8" },
  { text: "Ceux qui se confient en l'Eternel sont comme la montagne de Sion: elle ne chancelle point.", ref: "Psaumes 125:1" },
  { text: "Comme des montagnes entourent Jérusalem, ainsi l'Eternel entoure son peuple.", ref: "Psaumes 125:2" },
  { text: "Quand l'Eternel ramena les captifs de Sion, nous étions comme ceux qui font un rêve.", ref: "Psaumes 126:1" },
  { text: "Alors notre bouche était remplie de cris de joie, et notre langue de chants d'allégresse.", ref: "Psaumes 126:2" },
  { text: "L'Eternel a fait pour nous de grandes choses; nous sommes dans la joie.", ref: "Psaumes 126:3" },
  { text: "Ceux qui sèment avec larmes moissonneront avec chants d'allégresse.", ref: "Psaumes 126:5" },
  { text: "Celui qui marche en pleurant, quand il porte la semence, revient avec allégresse quand il porte ses gerbes.", ref: "Psaumes 126:6" },
  { text: "Si l'Eternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain.", ref: "Psaumes 127:1" },
  { text: "Si l'Eternel ne garde la ville, celui qui la garde veille en vain.", ref: "Psaumes 127:1" },
  { text: "Voici, des fils sont un héritage de l'Eternel, le fruit des entrailles est une récompense.", ref: "Psaumes 127:3" },
  { text: "Heureux l'homme qui en a rempli son carquois!", ref: "Psaumes 127:5" },
  { text: "Heureux tout homme qui craint l'Eternel, qui marche dans ses voies!", ref: "Psaumes 128:1" },
  { text: "Tu jouis alors du travail de tes mains, tu es heureux, tu prospères.", ref: "Psaumes 128:2" },
  { text: "Ta femme est comme une vigne féconde dans l'intérieur de ta maison.", ref: "Psaumes 128:3" },
  { text: "C'est ainsi qu'est béni l'homme qui craint l'Eternel.", ref: "Psaumes 128:4" },
  { text: "Que l'Eternel te bénisse de Sion!", ref: "Psaumes 128:5" },
  { text: "Du fond de l'abîme je t'invoque, ô Eternel!", ref: "Psaumes 130:1" },
  { text: "Si tu gardais le souvenir des iniquités, Eternel, Seigneur, qui pourrait subsister?", ref: "Psaumes 130:3" },
  { text: "Mais le pardon se trouve auprès de toi, afin qu'on te craigne.", ref: "Psaumes 130:4" },
  { text: "J'espère en l'Eternel, mon âme espère, et j'attends sa promesse.", ref: "Psaumes 130:5" },
  { text: "Mon âme compte sur le Seigneur, plus que les gardes ne comptent sur le matin.", ref: "Psaumes 130:6" },
  { text: "Car la miséricorde est auprès de l'Eternel, et la rédemption est auprès de lui en abondance.", ref: "Psaumes 130:7" },
  { text: "Eternel! je n'ai ni un coeur fier, ni des regards hautains.", ref: "Psaumes 131:1" },
  { text: "Loin de là, j'ai l'âme calme et tranquille, comme un enfant sevré qui est auprès de sa mère.", ref: "Psaumes 131:2" },
  { text: "Oh! qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble!", ref: "Psaumes 133:1" },
  { text: "C'est là que l'Eternel envoie la bénédiction, la vie, pour l'éternité.", ref: "Psaumes 133:3" },
  { text: "Louez l'Eternel! Louez le nom de l'Eternel, louez-le, serviteurs de l'Eternel!", ref: "Psaumes 135:1" },
  { text: "Louez l'Eternel, car l'Eternel est bon! Chantez à son nom, car il est favorable!", ref: "Psaumes 135:3" },
  { text: "Je sais que l'Eternel est grand, et que notre Seigneur est au-dessus de tous les dieux.", ref: "Psaumes 135:5" },
  { text: "Tout ce que l'Eternel veut, il le fait, dans les cieux et sur la terre.", ref: "Psaumes 135:6" },
  { text: "Eternel! ton nom subsiste à toujours, Eternel! ta mémoire dure de génération en génération.", ref: "Psaumes 135:13" },
  { text: "Béni soit de Sion l'Eternel, qui habite à Jérusalem! Louez l'Eternel!", ref: "Psaumes 135:21" },
  { text: "Louez l'Eternel, car il est bon, car sa miséricorde dure à toujours!", ref: "Psaumes 136:1" },
  { text: "Lui qui seul fait de grands prodiges, car sa miséricorde dure à toujours!", ref: "Psaumes 136:4" },
  { text: "Lui qui a fait les cieux avec intelligence, car sa miséricorde dure à toujours!", ref: "Psaumes 136:5" },
  { text: "Lui qui a étendu la terre sur les eaux, car sa miséricorde dure à toujours!", ref: "Psaumes 136:6" },
  { text: "Lui qui a fait les grands luminaires, car sa miséricorde dure à toujours!", ref: "Psaumes 136:7" },
  { text: "Le soleil pour présider au jour, car sa miséricorde dure à toujours!", ref: "Psaumes 136:8" },
  { text: "La lune et les étoiles pour présider à la nuit, car sa miséricorde dure à toujours!", ref: "Psaumes 136:9" },
  { text: "Lui qui se souvint de nous quand nous étions humiliés, car sa miséricorde dure à toujours!", ref: "Psaumes 136:23" },
  { text: "Lui qui donne la nourriture à toute chair, car sa miséricorde dure à toujours!", ref: "Psaumes 136:25" },
  { text: "Louez le Dieu des cieux, car sa miséricorde dure à toujours!", ref: "Psaumes 136:26" },
  { text: "Je te célèbre de tout mon coeur, je te chante en présence de Dieu.", ref: "Psaumes 138:1" },
  { text: "Je me prosterne dans ton saint temple, et je célèbre ton nom, à cause de ta bonté et de ta fidélité.", ref: "Psaumes 138:2" },
  { text: "Car ta renommée s'est accrue par l'accomplissement de tes promesses.", ref: "Psaumes 138:2" },
  { text: "Le jour où je t'ai invoqué, tu m'as exaucé, tu m'as rassuré, tu as fortifié mon âme.", ref: "Psaumes 138:3" },
  { text: "L'Eternel est élevé: il voit les humbles, et il reconnaît de loin les orgueilleux.", ref: "Psaumes 138:6" },
  { text: "Quand je marche au milieu de la détresse, tu me rends la vie.", ref: "Psaumes 138:7" },
  { text: "L'Eternel agira en ma faveur. Eternel, ta bonté dure à toujours.", ref: "Psaumes 138:8" },
  { text: "Eternel! tu me sondes et tu me connais.", ref: "Psaumes 139:1" },
  { text: "Tu sais quand je m'assieds et quand je me lève, tu pénètres de loin ma pensée.", ref: "Psaumes 139:2" },
  { text: "Tu sais quand je marche et quand je me couche, et tu pénètres toutes mes voies.", ref: "Psaumes 139:3" },
  { text: "Où irais-je loin de ton esprit, et où fuirais-je loin de ta face?", ref: "Psaumes 139:7" },
  { text: "Si je monte aux cieux, tu y es; si je me couche au séjour des morts, t'y voilà.", ref: "Psaumes 139:8" },
  { text: "Si je prends les ailes de l'aurore... là aussi ta main me conduira.", ref: "Psaumes 139:9-10" },
  { text: "C'est toi qui as former mes reins, qui m'as tissé dans le sein de ma mère.", ref: "Psaumes 139:13" },
  { text: "Je te loue de ce que je suis une créature si merveilleuse. Tes oeuvres sont admirables.", ref: "Psaumes 139:14" },
  { text: "Quand je n'étais qu'une masse informe, tes yeux me voyaient.", ref: "Psaumes 139:16" },
  { text: "Que tes pensées, ô Dieu, me semblent précieuses! Que le nombre en est grand!", ref: "Psaumes 139:17" },
  { text: "Sonde-moi, ô Dieu, et connais mon coeur! Eprouve-moi, et connais mes pensées!", ref: "Psaumes 139:23" },
  { text: "Regarde si je suis sur une mauvaise voie, et conduis-moi sur la voie de l'éternité!", ref: "Psaumes 139:24" },
  { text: "Eternel, je t'invoque: viens en hâte auprès de moi!", ref: "Psaumes 141:1" },
  { text: "Que ma prière soit devant ta face comme l'encens.", ref: "Psaumes 141:2" },
  { text: "Eternel, mets une garde à ma bouche, veille sur la porte de mes lèvres!", ref: "Psaumes 141:3" },
  { text: "C'est vers toi, Eternel, Seigneur! que se tournent mes yeux.", ref: "Psaumes 141:8" },
  { text: "De ma voix je crie à l'Eternel, de ma voix je supplie l'Eternel.", ref: "Psaumes 142:1" },
  { text: "Je répands ma plainte devant lui, je lui raconte ma détresse.", ref: "Psaumes 142:2" },
  { text: "Eternel! écoute ma prière, prête l'oreille à mes supplications!", ref: "Psaumes 143:1" },
  { text: "Je me souviens des jours d'autrefois, je médite sur toutes tes oeuvres.", ref: "Psaumes 143:5" },
  { text: "Fais-moi dès le matin entendre ta bonté! Car je me confie en toi.", ref: "Psaumes 143:8" },
  { text: "Fais-moi connaître le chemin où je dois marcher! Car j'élève à toi mon âme.", ref: "Psaumes 143:8" },
  { text: "Enseigne-moi à faire ta volonté! Car tu es mon Dieu.", ref: "Psaumes 143:10" },
  { text: "Que ton bon esprit me conduise sur la voie droite!", ref: "Psaumes 143:10" },
  { text: "A cause de ton nom, Eternel! rends-moi la vie.", ref: "Psaumes 143:11" },
  { text: "Béni soit l'Eternel, mon rocher!", ref: "Psaumes 144:1" },
  { text: "Ma bienveillance et ma forteresse, ma haute retraite et mon libérateur.", ref: "Psaumes 144:2" },
  { text: "Eternel, qu'est-ce que l'homme, pour que tu le connaisses?", ref: "Psaumes 144:3" },
  { text: "Heureux le peuple dont l'Eternel est le Dieu!", ref: "Psaumes 144:15" },
  { text: "Je t'exalterai, ô mon Dieu, mon roi! Et je bénirai ton nom à toujours et à perpétuité.", ref: "Psaumes 145:1" },
  { text: "Chaque jour je te bénirai, et je célébrerai ton nom à toujours.", ref: "Psaumes 145:2" },
  { text: "L'Eternel est grand et très digne de louange.", ref: "Psaumes 145:3" },
  { text: "Que chaque génération célèbre tes oeuvres, et publie tes hauts faits!", ref: "Psaumes 145:4" },
  { text: "Je dirai la splendeur glorieuse de ta majesté.", ref: "Psaumes 145:5" },
  { text: "Qu'on proclame le souvenir de ton immense bonté, et qu'on célèbre ta justice!", ref: "Psaumes 145:7" },
  { text: "L'Eternel est miséricordieux et compatissant.", ref: "Psaumes 145:8" },
  { text: "L'Eternel est bon envers tous.", ref: "Psaumes 145:9" },
  { text: "Toutes tes oeuvres te loueront, ô Eternel! Et tes fidèles te béniront.", ref: "Psaumes 145:10" },
  { text: "Ton règne est un règne de tous les siècles, et ta domination subsiste dans tous les âges.", ref: "Psaumes 145:13" },
  { text: "L'Eternel soutient tous ceux qui tombent, et il redresse tous ceux qui sont courbés.", ref: "Psaumes 145:14" },
  { text: "Tu ouvres ta main, et tu rassasies à souhait tout ce qui a vie.", ref: "Psaumes 145:16" },
  { text: "L'Eternel est juste dans toutes ses voies, et miséricordieux dans toutes ses oeuvres.", ref: "Psaumes 145:17" },
  { text: "L'Eternel est proche de tous ceux qui l'invoquent.", ref: "Psaumes 145:18" },
  { text: "Il remplit le désir de ceux qui le craignent.", ref: "Psaumes 145:19" },
  { text: "Ma bouche publiera la louange de l'Eternel.", ref: "Psaumes 145:21" },
  { text: "Louez l'Eternel! Mon âme, loue l'Eternel!", ref: "Psaumes 146:1" },
  { text: "Je louerai l'Eternel tant que je vivrai, je célébrerai mon Dieu tant que j'existerai.", ref: "Psaumes 146:2" },
  { text: "Heureux celui qui a pour secours le Dieu de Jacob, qui met son espoir en l'Eternel, son Dieu!", ref: "Psaumes 146:5" },
  { text: "Il a fait les cieux et la terre, la mer et tout ce qui s'y trouve.", ref: "Psaumes 146:6" },
  { text: "Il garde la fidélité à toujours.", ref: "Psaumes 146:6" },
  { text: "L'Eternel ouvre les yeux des aveugles; l'Eternel redresse ceux qui sont courbés.", ref: "Psaumes 146:8" },
  { text: "L'Eternel aime les justes.", ref: "Psaumes 146:8" },
  { text: "L'Eternel protège les étrangers, il soutient l'orphelin et la veuve.", ref: "Psaumes 146:9" },
  { text: "Louez l'Eternel! Car il est beau de célébrer notre Dieu, car il est doux, il est bienséant de le louer.", ref: "Psaumes 147:1" },
  { text: "Il guérit ceux qui ont le coeur brisé, et il panse leurs blessures.", ref: "Psaumes 147:3" },
  { text: "Il compte le nombre des étoiles, il leur donne à toutes des noms.", ref: "Psaumes 147:4" },
  { text: "Notre Seigneur est grand, puissant par sa force.", ref: "Psaumes 147:5" },
  { text: "L'Eternel soutient les malheureux.", ref: "Psaumes 147:6" },
  { text: "Chantez à l'Eternel avec actions de grâces.", ref: "Psaumes 147:7" },
  { text: "C'est lui qui couvre les cieux de nuages... qui fait germer l'herbe sur les montagnes.", ref: "Psaumes 147:8" },
  { text: "L'Eternel aime ceux qui le craignent, ceux qui espèrent en sa bonté.", ref: "Psaumes 147:11" },
  { text: "Jérusalem, célèbre l'Eternel! Sion, loue ton Dieu!", ref: "Psaumes 147:12" },
  { text: "Il donne la paix à ton territoire.", ref: "Psaumes 147:14" },
  { text: "Louez l'Eternel! Louez l'Eternel du haut des cieux! Louez-le dans les lieux élevés!", ref: "Psaumes 148:1" },
  { text: "Louez-le, vous tous ses anges! Louez-le, vous toutes ses armées!", ref: "Psaumes 148:2" },
  { text: "Louez-le, soleil et lune! Louez-le, vous toutes, étoiles lumineuses!", ref: "Psaumes 148:3" },
  { text: "Qu'ils louent le nom de l'Eternel! Car il a commandé, et ils ont été créés.", ref: "Psaumes 148:5" },
  { text: "Rois de la terre et tous les peuples, princes et tous les juges de la terre.", ref: "Psaumes 148:11" },
  { text: "Jeunes hommes et jeunes filles, vieillards et enfants!", ref: "Psaumes 148:12" },
  { text: "Qu'ils louent le nom de l'Eternel! Car son nom seul est élevé.", ref: "Psaumes 148:13" },
  { text: "Sa majesté est au-dessus de la terre et des cieux.", ref: "Psaumes 148:13" },
  { text: "Louez l'Eternel! Chantez à l'Eternel un cantique nouveau!", ref: "Psaumes 149:1" },
  { text: "Chantez ses louanges dans l'assemblée des fidèles!", ref: "Psaumes 149:1" },
  { text: "Qu'Israël se réjouisse en celui qui l'a fait! Que les fils de Sion soient dans l'allégresse à cause de leur roi!", ref: "Psaumes 149:2" },
  { text: "Car l'Eternel prend plaisir à son peuple.", ref: "Psaumes 149:4" },
  { text: "Il glorifie les malheureux en les sauvant.", ref: "Psaumes 149:4" },
  { text: "Que les fidèles triomphent dans la gloire.", ref: "Psaumes 149:5" },
  { text: "Louez l'Eternel! Louez Dieu dans son sanctuaire! Louez-le dans l'étendue où éclate sa puissance!", ref: "Psaumes 150:1" },
  { text: "Louez-le pour ses hauts faits! Louez-le selon l'immensité de sa grandeur!", ref: "Psaumes 150:2" },
  { text: "Louez-le avec le retentissement de la trompette! Louez-le avec le luth et la harpe!", ref: "Psaumes 150:3" },
  { text: "Louez-le avec le tambourin et avec des danses! Louez-le avec les instruments à cordes et le chalumeau!", ref: "Psaumes 150:4" },
  { text: "Louez-le avec les cymbales sonores! Louez-le avec les cymbales retentissantes!", ref: "Psaumes 150:5" },
  { text: "Que tout ce qui respire loue l'Eternel! Louez l'Eternel!", ref: "Psaumes 150:6" }
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<ViewState>('login');
  const [email, setEmail] = useState('admin@vinea.org');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCapsLock, setIsCapsLock] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentYear = new Date().getFullYear();
  
  const selectedVerse = useMemo(() => {
    return VERSES[Math.floor(Math.random() * VERSES.length)];
  }, []);

  // Salutation contextuelle
  const welcomeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    let baseGreeting = "Bienvenue";
    if (hour >= 5 && hour < 12) baseGreeting = "Bonjour";
    else if (hour >= 18 || hour < 5) baseGreeting = "Bonsoir";

    if (day === 0) return `Excellent Dimanche !`;
    if (day === 1) return `Bon début de semaine !`;
    return `${baseGreeting}, ravis de vous revoir.`;
  }, []);

  const checkCapsLock = (e: React.KeyboardEvent) => {
    setIsCapsLock(e.getModifierState('CapsLock'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      // Charger la liste actuelle des utilisateurs
      const savedAdmins = JSON.parse(localStorage.getItem('vinea_admin_users') || '[]');
      
      // 1. Chercher d'abord dans la liste persistée des utilisateurs
      const user = savedAdmins.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      
      if (user) {
        if (user.status === 'Actif' && password === 'password') {
          const perms = user.permissions || ['dashboard'];
          if (!perms.includes('spiritual')) perms.push('spiritual');
          onLogin(email, user.role, perms);
          return;
        } else if (user.status === 'Inactif') {
          setError('Accès restreint par l\'administrateur.');
          setIsLoading(false);
          return;
        }
      }

      // 2. Si non trouvé ou échec liste, vérifier le compte Super Admin de secours par défaut
      if (email.toLowerCase() === 'admin@vinea.org' && password === 'password') {
        onLogin(email, 'Super Admin', ['dashboard', 'members', 'visitors', 'spiritual', 'discipleship', 'attendance', 'planning', 'services', 'meetings', 'events', 'finances', 'meditations', 'reports', 'settings']);
        return;
      }

      // 3. Échec total
      setError('Identifiants invalides.');
      setIsLoading(false);
    }, 1500);
  };

  const handleButtonMagnetic = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  };

  const resetButtonMagnetic = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = `translate(0, 0)`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-sans text-slate-900 selection:bg-indigo-500/30">
      
      {/* Decorative blurred elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Background Texture Overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      <div className="relative z-10 w-full max-w-[440px] px-6 py-12 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Branding Area */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="absolute -inset-6 bg-indigo-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="relative w-20 h-20 flex items-center justify-center transition-all duration-700 group-hover:scale-110 active:scale-95 shadow-2xl rounded-[1.8rem] ring-8 ring-white/50 overflow-hidden">
              <Logo className="w-full h-full" />
            </div>
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-[0.4em] drop-shadow-sm">Vinea</h1>
            <div className="h-0.5 w-8 bg-indigo-600 mx-auto mt-1 rounded-full opacity-40"></div>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="relative bg-white border border-slate-200/60 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] p-8 md:p-10 flex flex-col justify-center overflow-hidden backdrop-blur-sm">
          
          {view === 'login' ? (
            <div className="relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{welcomeGreeting}</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Adresse Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                      type="email" 
                      autoFocus
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@vinea.org"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm font-bold shadow-sm transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label>
                    <button 
                      type="button" 
                      onClick={() => setView('forgot-password')}
                      className="text-[9px] font-black text-indigo-600 uppercase hover:text-indigo-700 tracking-widest transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={checkCapsLock}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-14 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none text-sm font-bold shadow-sm transition-all"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {isCapsLock && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-[9px] font-black uppercase tracking-widest mt-2 animate-pulse">
                      <AlertCircle size={12} /> VERROUILLAGE MAJUSCULES ACTIF
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-2 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only" 
                      />
                      <div className="w-5 h-5 bg-slate-100 border border-slate-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all shadow-inner"></div>
                      <CheckCircle2 className="absolute inset-0 text-white opacity-0 peer-checked:opacity-100 transition-opacity p-0.5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Se souvenir de moi</span>
                  </label>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in shake duration-500">
                    <ShieldAlert className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-tight">{error}</p>
                  </div>
                )}

                <button 
                  ref={buttonRef}
                  type="submit" 
                  disabled={isLoading}
                  onMouseMove={handleButtonMagnetic}
                  onMouseLeave={resetButtonMagnetic}
                  className="group relative w-full py-5 bg-indigo-600 text-white rounded-[1.6rem] text-xs font-black uppercase tracking-[0.25em] shadow-[0_20px_40px_-12px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70 overflow-hidden active:scale-95"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Authentification...
                    </>
                  ) : (
                    <>
                      Ouvrir la session
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : view === 'forgot-password' ? (
            <div className="relative z-10 animate-in fade-in slide-in-from-right-2 duration-500">
               <button onClick={() => setView('login')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors mb-8 group">
                 <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Retour à l'accueil
               </button>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Réinitialisation</h2>
               <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Entrez votre email pour recevoir les instructions de récupération de compte.</p>
               <form onSubmit={(e) => { e.preventDefault(); setIsLoading(true); setTimeout(() => { setIsLoading(false); setView('success'); }, 2000); }} className="space-y-6">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Email Administrateur</label>
                   <input 
                     type="email" 
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold shadow-sm"
                     placeholder="admin@vinea.org"
                     required
                   />
                 </div>
                 <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-5 bg-slate-900 text-white rounded-[1.6rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 disabled:opacity-70 transition-all active:scale-95"
                 >
                   Envoyer le lien de secours
                 </button>
               </form>
            </div>
          ) : (
            <div className="relative z-10 text-center animate-in zoom-in-95 duration-500 py-6">
               <div className="w-20 h-20 bg-emerald-500 text-white rounded-[1.8rem] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_40px_-12px_rgba(16,185,129,0.3)] border-4 border-white animate-bounce">
                 <CheckCircle2 size={32} strokeWidth={3} />
               </div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vérifiez vos mails</h2>
               <p className="text-sm text-slate-500 mt-4 font-medium leading-relaxed italic px-4">Si l'adresse existe, un lien magique de connexion vient d'être envoyé.</p>
               <button onClick={() => view === 'success' && setView('login')} className="mt-10 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100">
                 Retour au portail
               </button>
            </div>
          )}

          {/* Verse of the day section */}
          <div className="relative z-10 mt-10 pt-8 border-t border-slate-100 text-center">
            <div className="bg-slate-50/80 p-5 rounded-[2rem] border border-slate-100 shadow-inner group relative overflow-hidden">
                <div className="absolute top-[-10px] right-[-10px] opacity-5">
                    <Quote size={80} className="text-indigo-600 rotate-12" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles size={14} className="text-amber-500" />
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Méditation du Jour</h4>
                </div>
                <p className="text-[13px] font-bold text-slate-700 leading-relaxed italic px-2">
                  "{selectedVerse.text}"
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className="h-px w-4 bg-slate-200"></div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.15em]">
                    {selectedVerse.ref}
                  </p>
                  <div className="h-px w-4 bg-slate-200"></div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-300">
              <p className="text-[8px] font-black uppercase tracking-[0.2em]">© {currentYear} Vinea • Tous droits réservés</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        input::placeholder {
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.7rem;
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Login;