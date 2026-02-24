import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import AIAnalysis from '../components/AIAnalysis';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Sparkles, 
  X, 
  Save, 
  Loader2, 
  Tag, 
  ChevronRight, 
  Search, 
  Trash2, 
  AlertTriangle,
  History as HistoryIcon,
  TrendingUp,
  Receipt,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  Info,
  Calendar,
  Clock,
  Download,
  ShieldCheck,
  UserRound,
  MessageSquareText,
  Copy,
  Send,
  LayoutGrid,
  ListFilter,
  Users,
  Target,
  Flag,
  HandCoins,
  ArrowRight,
  TrendingDown,
  Percent,
  CheckCircle2,
  HeartPulse,
  Crown,
  RefreshCw,
  MessageCircle,
  ChevronLeft,
  Phone,
  FilterX,
  Edit,
  Filter,
  CircleDashed,
  WalletCards,
  ArrowUpRight,
  UserX,
  MessageSquareQuote,
  Layout,
  StickyNote,
  Heart,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../constants';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { analyzePageData, generateDonationReceipt } from '../lib/gemini';
import { cn, generateId, getInitials, formatFirstName } from '../utils';
import { OperationType, PaymentMethod, FinancialRecord, Member, DonationCampaign, DonationPromise } from '../types';
import { GoogleGenAI } from "@google/genai";
import { getFinancialRecords, createFinancialRecord, updateFinancialRecord, deleteFinancialRecord, getDonationCampaigns, createDonationCampaign, updateDonationCampaign, deleteDonationCampaign, getDonationPromises, createDonationPromise, deleteDonationPromise, getMembers, getChurchSettings } from '../lib/db';

interface FinanceCategory {
  id: string;
  name: string;
  type: OperationType;
}

const DEFAULT_CATEGORIES: FinanceCategory[] = [
  { id: 'c1', name: 'Dîmes', type: OperationType.REVENU },
  { id: 'c2', name: 'Offrandes', type: OperationType.REVENU },
  { id: 'c3', name: 'Dons', type: OperationType.REVENU },
  { id: 'c4', name: 'Soutien Projets', type: OperationType.REVENU },
  { id: 'c5', name: 'Loyer', type: OperationType.DEPENSE },
  { id: 'c6', name: 'Électricité', type: OperationType.DEPENSE },
  { id: 'c7', name: 'Eau', type: OperationType.DEPENSE },
  { id: 'c8', name: 'Social', type: OperationType.DEPENSE },
  { id: 'c9', name: 'Mission', type: OperationType.DEPENSE },
  { id: 'c10', name: 'Maintenance', type: OperationType.DEPENSE },
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const Finances: React.FC = () => {
  const [operations, setOperations] = useState<FinancialRecord[]>([]);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [promises, setPromises] = useState<DonationPromise[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>(() => {
    const saved = localStorage.getItem('vinea_finance_categories_v2');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [churchName, setChurchName] = useState('Vinea');

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; // 1er janv.
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Aujourd'hui
  });

  const [view, setView] = useState<'journal' | 'fidelity' | 'campaigns'>('journal');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Tous' | OperationType>('Tous');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [isOpFormOpen, setIsOpFormOpen] = useState(false);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletePromiseConfirmOpen, setIsDeletePromiseConfirmOpen] = useState(false);
  const [isDeleteCampaignConfirmOpen, setIsDeleteCampaignConfirmOpen] = useState(false);
  const [isOpDetailsOpen, setIsOpDetailsOpen] = useState(false);
  const [opToDeleteId, setOpToDeleteId] = useState<string | null>(null);
  const [promiseToDeleteId, setPromiseToDeleteId] = useState<string | null>(null);
  const [campaignToDeleteId, setCampaignToDeleteId] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<FinancialRecord | null>(null);
  
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [isPromiseFormOpen, setIsPromiseFormOpen] = useState(false);
  const [editingPromiseId, setEditingPromiseId] = useState<string | null>(null);
  const [isCampaignDetailsOpen, setIsCampaignDetailsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
  
  const [isDonorListModalOpen, setIsDonorListModalOpen] = useState(false);
  const [donorListFilter, setDonorListFilter] = useState<'all' | 'full' | 'partial' | 'none'>('all');
  const [donorSearchInModal, setDonorSearchInModal] = useState('');

  const [isPastoralFollowUpOpen, setIsPastoralFollowUpOpen] = useState(false);
  const [isGeneratingPastoralMsg, setIsGeneratingPastoralMsg] = useState(false);
  const [generatedPastoralMsg, setGeneratedPastoralMsg] = useState<{id: string, text: string} | null>(null);

  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOp, setNewOp] = useState<Partial<FinancialRecord>>({
    type: OperationType.REVENU,
    category: categories.find(c => c.type === OperationType.REVENU)?.name || 'Général',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: PaymentMethod.ESPECES,
    description: '',
    memberId: undefined,
    campaignId: undefined
  });

  const [newCampaign, setNewCampaign] = useState<Partial<DonationCampaign>>({
    name: '', description: '', goal: undefined, startDate: new Date().toISOString().split('T')[0], status: 'Active'
  });

  const [newPromise, setNewPromise] = useState<Partial<DonationPromise>>({
    memberId: '', amount: 0, date: new Date().toISOString().split('T')[0], campaignId: ''
  });

  const [newCat, setNewCat] = useState({ name: '', type: OperationType.REVENU });
  
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [ops, camps, proms, mems, settings] = await Promise.all([
        getFinancialRecords(),
        getDonationCampaigns(),
        getDonationPromises(),
        getMembers(),
        getChurchSettings(),
      ]);
      setOperations(ops);
      setCampaigns(camps);
      setPromises(proms);
      setMembers(mems);
      if (settings?.name) setChurchName(settings.name);
    };
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem('vinea_finance_categories_v2', JSON.stringify(categories));
  }, [categories]);

  const totals = useMemo(() => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);

    const periodOps = operations.filter(op => {
      const d = new Date(op.date);
      return d >= sDate && d <= eDate;
    });

    const revenus = periodOps
      .filter(op => op.type === OperationType.REVENU)
      .reduce((sum, op) => sum + op.amount, 0);
    const depenses = periodOps
      .filter(op => op.type === OperationType.DEPENSE)
      .reduce((sum, op) => sum + op.amount, 0);

    const totalRevenus = operations
      .filter(op => op.type === OperationType.REVENU)
      .reduce((sum, op) => sum + op.amount, 0);
    const totalDepenses = operations
      .filter(op => op.type === OperationType.DEPENSE)
      .reduce((sum, op) => sum + op.amount, 0);

    return { revenus, depenses, solde: totalRevenus - totalDepenses, periodOps };
  }, [operations, startDate, endDate]);

  const filteredOperations = useMemo(() => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);

    return operations.filter(op => {
      const d = new Date(op.date);
      if (d < sDate || d > eDate) return false;

      const member = members.find(m => m.id === op.memberId);
      const memberName = member 
        ? `${member.firstName} ${member.lastName}`.toLowerCase() 
        : (op.externalName || '').toLowerCase();
        
      const matchesSearch = op.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            op.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            memberName.includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'Tous' || op.type === typeFilter;
      const matchesCategory = !selectedCategoryFilter || op.category === selectedCategoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [operations, searchTerm, typeFilter, members, selectedCategoryFilter, startDate, endDate]);

  const campaignsWithStats = useMemo(() => {
    return campaigns.map(camp => {
      const campaignOps = operations.filter(op => op.campaignId === camp.id && op.type === OperationType.REVENU);
      const totalCollected = campaignOps.reduce((sum, op) => sum + op.amount, 0);
      const campaignPromises = promises.filter(p => p.campaignId === camp.id);
      const totalPledged = campaignPromises.reduce((sum, p) => sum + p.amount, 0);
      
      const progress = camp.goal ? Math.round((totalCollected / camp.goal) * 100) : 0;
      
      return { 
        ...camp, 
        totalCollected, 
        totalPledged, 
        progress,
        donorsCount: new Set([...campaignOps.map(op => op.memberId || op.externalName)].filter(Boolean)).size,
        promisesCount: campaignPromises.length
      };
    });
  }, [campaigns, operations, promises]);

  const campaignDonorsSummary = useMemo(() => {
    if (!selectedCampaign) return { all: [], full: [], partial: [], none: [] };
    
    const uniqueDonorKeys = Array.from(new Set([
      ...promises.filter(p => p.campaignId === selectedCampaign.id).map(p => p.memberId || p.externalName),
      ...operations.filter(op => op.campaignId === selectedCampaign.id).map(op => op.memberId || op.externalName).filter(Boolean) as string[]
    ]));

    const all: any[] = [];
    const full: any[] = [];
    const partial: any[] = [];
    const none: any[] = [];

    uniqueDonorKeys.forEach(key => {
      const member = members.find(m => m.id === key);
      const externalName = !member ? key : undefined;
      
      const donorPromises = promises.filter(p => p.campaignId === selectedCampaign.id && (p.memberId === key || p.externalName === key));
      const pld = donorPromises.reduce((s,p)=>s+p.amount,0);
        
      const gvn = operations
        .filter(o => o.campaignId === selectedCampaign.id && (o.memberId === key || o.externalName === key))
        .reduce((s,o)=>s+o.amount,0);
      
      const data = { 
        member, 
        externalName,
        pld, 
        gvn, 
        donorPromises,
        progress: pld > 0 ? Math.round((gvn/pld)*100) : (gvn > 0 ? 100 : 0) 
      };
      
      all.push(data);
      if (pld > 0 && gvn >= pld) full.push(data);
      else if (gvn > 0 && gvn < pld) partial.push(data);
      else if (gvn === 0 && pld > 0) none.push(data);
    });

    return { all, full, partial, none };
  }, [selectedCampaign, promises, operations, members]);

  const chartData = useMemo(() => {
    const revByCat = totals.periodOps
      .filter(op => op.type === OperationType.REVENU)
      .reduce((acc, op) => {
        acc[op.category] = (acc[op.category] || 0) + op.amount;
        return acc;
      }, {} as Record<string, number>);

    const colors = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#10b981', '#f59e0b', '#f43f5e'];
    return Object.entries(revByCat).map(([name, value], i) => ({
      name,
      value: Number(value),
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [totals.periodOps]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const toggleCategoryFilter = (catName: string) => {
    if (selectedCategoryFilter === catName) {
      setSelectedCategoryFilter(null);
    } else {
      setSelectedCategoryFilter(catName);
      setView('journal');
    }
  };

  const fidelityData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ 
        month: d.getMonth(), 
        year: d.getFullYear(), 
        label: d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase() 
      });
    }

    return members
      .filter(m => operations.some(op => op.memberId === m.id && op.type === OperationType.REVENU))
      .map(m => {
        const contributions = months.map(mon => {
          const hasGiven = operations.some(op => {
            const opDate = new Date(op.date);
            return op.memberId === m.id && 
                   op.type === OperationType.REVENU && 
                   opDate.getMonth() === mon.month && 
                   opDate.getFullYear() === mon.year;
          });
          return hasGiven;
        });

        const totalGiven = operations
          .filter(op => op.memberId === m.id && op.type === OperationType.REVENU)
          .reduce((sum, op) => sum + op.amount, 0);

        const frequency = Math.round((contributions.filter(c => c).length / months.length) * 100);

        return { member: m, contributions, totalGiven, frequency };
      })
      .sort((a, b) => b.frequency - a.frequency);
  }, [members, operations]);

  const pastoralCareData = useMemo(() => {
    const atRisk = fidelityData.filter(data => {
      const lastTwoMonthsEmpty = !data.contributions[data.contributions.length - 1] && 
                                !data.contributions[data.contributions.length - 2];
      const previouslyRegular = data.contributions.slice(0, 4).filter(c => c).length >= 2;
      return lastTwoMonthsEmpty && previouslyRegular;
    });

    const faithful = fidelityData.filter(data => data.frequency >= 80);

    return { atRisk, faithful };
  }, [fidelityData]);

  const handleGeneratePastoralMessage = async (member: Member, type: 'atRisk' | 'faithful') => {
    setIsGeneratingPastoralMsg(true);
    setGeneratedPastoralMsg(null);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const formattedName = `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}`;
      const prompt = type === 'atRisk' 
        ? `Rédige un message pastoral de 100 mots maximum pour un fidèle nommé ${formattedName}. Il était un contributeur régulier mais nous avons remarqué une baisse de sa libéralité ces derniers temps. Le ton doit être extrêmement bienveillant, spirituel, sans aucune pression financière, demandant simplement de ses nouvelles et proposant de prier pour ses projets ou d'éventuelles difficultés. Utilise exclusivement le texte de la version Louis Segond 1910 si tu cites un verset.`
        : `Rédige un message pastoral court de gratitude pour un pilier de l'église nommé ${formattedName}. Remercie-le pour sa fidélité constante et sa libéralité qui permet à l'église d'avancer. Utilise un ton de bénédiction. Utilise exclusivement le texte de la version Louis Segond 1910 pour la citation biblique.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `Tu es le Pasteur de l'église ${churchName}. Ton langage est empreint d'amour agapé, de sagesse et de dignité. Tu ne cites la Bible qu'en version Louis Segond 1910.`,
        },
      });
      
      setGeneratedPastoralMsg({ id: member.id, text: response.text || "Erreur de génération" });
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingPastoralMsg(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePageData("Finances", { 
      solde: totals.solde, 
      revenusMois: totals.revenus, 
      depensesMois: totals.depenses, 
      repartition: chartData,
      contributeursActifs: fidelityData.length,
      campagnes: campaignsWithStats.map(c => ({ name: c.name, progress: c.progress, collected: c.totalCollected }))
    });
    setAnalysis(result || null);
    setIsAnalyzing(false);
  };

  const handleGenerateReceipt = async (op: FinancialRecord) => {
    setIsGeneratingReceipt(true);
    const member = members.find(m => m.id === op.memberId);
    const donateur = member 
      ? { firstName: member.firstName, lastName: member.lastName } 
      : (op.externalName ? { firstName: op.externalName, lastName: '' } : null);

    if (!donateur) {
      alert("Impossible de générer un reçu pour une opération totalement anonyme.");
      setIsGeneratingReceipt(false);
      return;
    }
    const receipt = await generateDonationReceipt(op, donateur);
    setGeneratedReceipt(receipt);
    setIsGeneratingReceipt(false);
  };

  const shareReceiptWhatsApp = (op: FinancialRecord, text: string) => {
    const member = members.find(m => m.id === op.memberId);
    const phone = member?.whatsappPhone || member?.phone;
    if (phone) {
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else {
      alert("Aucun numéro de téléphone disponible pour ce membre.");
    }
  };

  const handleWhatsApp = (phone?: string, text?: string) => {
    if (phone) {
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text || '')}`;
      window.open(url, '_blank');
    } else {
      alert("Aucun numéro de téléphone disponible.");
    }
  };

  const handleSaveOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOp.amount || newOp.amount <= 0) return;
    setIsSubmitting(true);

    const externalName = !newOp.memberId && memberSearch.trim() !== '' ? memberSearch.trim() : undefined;

    setTimeout(() => {
      const opData = { ...newOp, externalName };
      if (editingOpId) {
        const updated = { ...opData, id: editingOpId } as FinancialRecord;
        setOperations(prev => prev.map(o => o.id === editingOpId ? updated : o));
        if (selectedOperation?.id === editingOpId) {
          setSelectedOperation(updated);
        }
        updateFinancialRecord(editingOpId, updated);
      } else {
        const operation: FinancialRecord = {
          ...(opData as FinancialRecord),
          id: generateId()
        };
        setOperations([operation, ...operations]);
        createFinancialRecord(operation);
      }
      setIsOpFormOpen(false);
      setEditingOpId(null);
      setIsSubmitting(false);
      setNewOp({
        type: OperationType.REVENU,
        category: categories.find(c => c.type === OperationType.REVENU)?.name || 'Général',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: PaymentMethod.ESPECES,
        description: '',
        memberId: undefined,
        campaignId: undefined
      });
      setMemberSearch('');
    }, 800);
  };

  const handleEditOperation = (op: FinancialRecord) => {
    setEditingOpId(op.id);
    setNewOp({ ...op });
    const member = members.find(m => m.id === op.memberId);
    setMemberSearch(member 
      ? `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}` 
      : (op.externalName || '')
    );
    setIsOpDetailsOpen(false);
    setIsOpFormOpen(true);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name) return;
    setIsSubmitting(true);
    setTimeout(() => {
      if (editingCampaignId) {
        const updated = { ...newCampaign, id: editingCampaignId } as DonationCampaign;
        setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? updated : c));
        if (selectedCampaign?.id === editingCampaignId) {
          setSelectedCampaign({ ...selectedCampaign, ...updated });
        }
        updateDonationCampaign(editingCampaignId, updated);
      } else {
        const campaign: DonationCampaign = {
          ...(newCampaign as DonationCampaign),
          id: generateId(),
          status: 'Active'
        };
        setCampaigns([campaign, ...campaigns]);
        createDonationCampaign(campaign);
      }
      setIsCampaignFormOpen(false);
      setEditingCampaignId(null);
      setNewCampaign({ name: '', description: '', goal: undefined, startDate: new Date().toISOString().split('T')[0] });
      setIsSubmitting(false);
    }, 800);
  };

  const handleEditCampaign = (camp: DonationCampaign) => {
    setEditingCampaignId(camp.id);
    setNewCampaign({
      name: camp.name,
      description: camp.description,
      goal: camp.goal,
      startDate: camp.startDate,
      status: camp.status
    });
    setIsCampaignFormOpen(true);
  };

  const handleSavePromise = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPromise.memberId && !memberSearch.trim()) || !newPromise.amount || !newPromise.campaignId) return;
    setIsSubmitting(true);

    const externalName = !newPromise.memberId && memberSearch.trim() !== '' ? memberSearch.trim() : undefined;

    setTimeout(() => {
      const promiseData = {
        ...(newPromise as DonationPromise),
        externalName,
        memberId: newPromise.memberId || undefined,
      };

      if (editingPromiseId) {
        setPromises(prev => prev.map(p => p.id === editingPromiseId ? { ...promiseData, id: editingPromiseId } : p));
        setIsPromiseFormOpen(false); // Fermer seulement en cas de modification
      } else {
        const promise: DonationPromise = {
          ...promiseData,
          id: generateId()
        };
        setPromises([promise, ...promises]);
        createDonationPromise(promise);
        // La modale reste ouverte pour de nouveaux enregistrements
      }

      setEditingPromiseId(null);
      // Réinitialisation des champs pour la promesse suivante (on garde la campagne et la date)
      setNewPromise({ 
        memberId: '', 
        amount: 0, 
        campaignId: selectedCampaign?.id || '', 
        date: new Date().toISOString().split('T')[0] 
      });
      setMemberSearch('');
      setIsSubmitting(false);
    }, 600);
  };

  const handleEditPromise = (promise: DonationPromise) => {
    setEditingPromiseId(promise.id);
    setNewPromise({ ...promise });
    if (promise.memberId) {
      const member = members.find(m => m.id === promise.memberId);
      setMemberSearch(member ? `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}` : '');
    } else {
      setMemberSearch(promise.externalName || '');
    }
    setIsPromiseFormOpen(true);
  };

  const handleDeletePromise = (id: string) => {
    setPromiseToDeleteId(id);
    setIsDeletePromiseConfirmOpen(true);
  };

  const confirmDeletePromise = () => {
    if (promiseToDeleteId) {
      setPromises(prev => prev.filter(p => p.id !== promiseToDeleteId));
      deleteDonationPromise(promiseToDeleteId);
      setIsDeletePromiseConfirmOpen(false);
      setPromiseToDeleteId(null);
    }
  };

  const handleAddCategory = () => {
    if (newCat.name.trim() && !categories.some(c => c.name === newCat.name.trim() && c.type === newCat.type)) {
      setCategories([...categories, { id: generateId(), name: newCat.name.trim(), type: newCat.type }]);
      setNewCat({ ...newCat, name: '' });
    }
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaignToDeleteId(id);
    setIsDeleteCampaignConfirmOpen(true);
  };

  const confirmDeleteCampaign = () => {
    if (campaignToDeleteId) {
      setCampaigns(prev => prev.filter(c => c.id !== campaignToDeleteId));
      setPromises(prev => prev.filter(p => p.campaignId !== campaignToDeleteId));
      deleteDonationCampaign(campaignToDeleteId);
      setIsDeleteCampaignConfirmOpen(false);
      setIsCampaignDetailsOpen(false);
      setCampaignToDeleteId(null);
    }
  };

  const handleExportCSV = () => {
    const rows = filteredOperations.map(op => {
      const member = members.find(m => m.id === op.memberId);
      const nameStr = member 
        ? `${member.lastName.toUpperCase()} ${formatFirstName(member.firstName)}` 
        : (op.externalName || 'Anonyme');
      return [
        op.date,
        op.type,
        op.category,
        nameStr,
        op.amount,
        op.paymentMethod,
        `"${(op.description || '').replace(/"/g, '""')}"`
      ];
    });
    const headers = ['Date', 'Type', 'Catégorie', 'Fidèle', 'Montant', 'Méthode', 'Description'];
    const csvContent = "\ufeff" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vinea_finances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestion Financière {churchName}</h2>
          <p className="text-sm text-slate-500 font-medium italic">Tableau de bord financier et suivi nominatif des contributions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || operations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all uppercase tracking-widest disabled:opacity-50"
          >
            <Sparkles size={16} /> {isAnalyzing ? 'Analyse...' : 'Analyse IA'}
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-widest group shadow-sm"
          >
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" /> Exporter
          </button>
          <button 
            onClick={() => { setEditingOpId(null); setMemberSearch(''); setIsOpFormOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest"
          >
            <Plus size={18} /> Nouvelle Opération
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Filter size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période d'affichage</h4>
            <p className="text-sm font-black text-slate-900 uppercase">Filtrer par date</p>
          </div>
        </div>
        
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Début</label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" size={14} />
              <input 
                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fin</label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" size={14} />
              <input 
                type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Solde Total" icon={<Wallet size={20} className="text-indigo-600" />} subtitle="Disponibilité réelle">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900">{formatCurrency(totals.solde)}</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
               <TrendingUp size={20} />
            </div>
          </div>
        </Card>
        <Card title="Contributions (Période)" icon={<ArrowUpCircle size={20} className="text-emerald-500" />} subtitle="Entrées cumulées">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-emerald-600">{formatCurrency(totals.revenus)}</span>
          </div>
        </Card>
        <Card title="Dépenses (Période)" icon={<ArrowDownCircle size={20} className="text-rose-500" />} subtitle="Sorties cumulées">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-rose-600">{formatCurrency(totals.depenses)}</span>
          </div>
        </Card>
      </div>

      <AIAnalysis analysis={analysis} isLoading={isAnalyzing} />

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
              <button onClick={() => setView('journal')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", view === 'journal' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
                <HistoryIcon size={14} className="inline mr-2" /> Journal de Caisse
              </button>
              <button onClick={() => setView('campaigns')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", view === 'campaigns' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
                <Flag size={14} className="inline mr-2" /> Projets & Campagnes
              </button>
              <button onClick={() => setView('fidelity')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", view === 'fidelity' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>
                <ShieldCheck size={14} className="inline mr-2" /> Fidélité Financière
              </button>
            </div>
            {view === 'journal' && (
              <div className="flex items-center gap-2 ml-4">
                 {selectedCategoryFilter && (
                   <button 
                    onClick={() => setSelectedCategoryFilter(null)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 animate-in zoom-in-95"
                   >
                     <FilterX size={12} /> {selectedCategoryFilter}
                   </button>
                 )}
                 <div className="relative group shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 text-[10px] font-black border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 bg-white shadow-sm w-48 md:w-64"
                  />
                </div>
              </div>
            )}
            {view === 'campaigns' && (
              <button 
                onClick={() => { setEditingCampaignId(null); setNewCampaign({ name: '', description: '', goal: undefined, startDate: new Date().toISOString().split('T')[0] }); setIsCampaignFormOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ml-4 shrink-0"
              >
                <Plus size={14} /> Créer Campagne
              </button>
            )}
          </div>

          {view === 'journal' ? (
            <div className="space-y-4">
              {filteredOperations.length > 0 ? filteredOperations.map((op, idx) => {
                const member = members.find(m => m.id === op.memberId);
                const campaign = campaigns.find(c => c.id === op.campaignId);
                return (
                  <div 
                    key={op.id} 
                    onClick={() => { setSelectedOperation(op); setIsOpDetailsOpen(true); setGeneratedReceipt(null); }}
                    className={cn(
                      "group flex items-center justify-between p-5 bg-white border rounded-[2rem] hover:border-indigo-300 transition-all shadow-sm cursor-pointer",
                      op.type === OperationType.DEPENSE ? "border-rose-100" : "border-slate-100",
                      selectedCategoryFilter === op.category ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                        op.type === OperationType.DEPENSE ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                      )}>
                        {op.type === OperationType.DEPENSE ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <h4 className="font-black text-slate-900 text-sm uppercase truncate">{op.description || op.category}</h4>
                           <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-400 rounded text-[8px] font-black uppercase">{op.category}</span>
                           {campaign && (
                             <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded text-[8px] font-black uppercase flex items-center gap-1">
                               <Flag size={8} /> {campaign.name}
                             </span>
                           )}
                        </div>
                        {member ? (
                          <div className="flex items-center gap-2 mt-1">
                             <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 text-[6px] font-black text-indigo-600 uppercase">
                                {member.photoUrl ? (
                                  <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(member.firstName, member.lastName)
                                )}
                             </div>
                             <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest flex items-center gap-1">
                                {formatFirstName(member.firstName)} <span className="uppercase">{member.lastName}</span>
                             </p>
                          </div>
                        ) : op.externalName ? (
                          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                             <User size={10}/> <span className="uppercase">{op.externalName}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Opération Anonyme</p>
                        )}
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{new Date(op.date).toLocaleDateString('fr-FR')} • {op.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={cn("text-lg font-black", op.type === OperationType.DEPENSE ? "text-rose-600" : "text-emerald-600")}>
                         {op.type === OperationType.DEPENSE ? '-' : '+'}{formatCurrency(op.amount)}
                       </p>
                       <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {op.type === OperationType.REVENU && (member || op.externalName) && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(op); }}
                             className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                             title="Générer reçu IA"
                           >
                             <Sparkles size={14} />
                           </button>
                         )}
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleEditOperation(op); }} 
                           className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                           title="Modifier"
                         >
                           <Edit size={14} />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); setOpToDeleteId(op.id); setIsDeleteConfirmOpen(true); }} className="p-1.5 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg">
                           <Trash2 size={14} />
                         </button>
                       </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[3rem] opacity-30">
                  <HistoryIcon size={48} className="mx-auto" />
                  <p className="text-sm font-black uppercase mt-4">Aucune opération trouvée</p>
                </div>
              )}
            </div>
          ) : view === 'campaigns' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              {campaignsWithStats.length > 0 ? campaignsWithStats.map(camp => (
                <Card key={camp.id} onClick={() => { setSelectedCampaign(camp); setIsCampaignDetailsOpen(true); }} className="group hover:border-indigo-400 border-2 transition-all p-0 overflow-hidden shadow-sm hover:shadow-xl cursor-pointer active:scale-[0.98]">
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{camp.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{camp.status === 'Active' ? 'Campagne en cours' : 'Projet terminé'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                        <Flag size={20} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Collecté Réel</p>
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(camp.totalCollected).split(' ')[0]} F</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Promesses Totales</p>
                        <p className="text-sm font-black text-indigo-600">{formatCurrency(camp.totalPledged).split(' ')[0]} F</p>
                      </div>
                    </div>

                    {camp.goal && (
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-slate-500">Objectif : {formatCurrency(camp.goal)}</span>
                            <span className="text-indigo-600">{camp.progress}%</span>
                         </div>
                         <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${camp.progress}%` }}></div>
                         </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-700 uppercase">{camp.donorsCount} Donateurs</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <HandCoins size={14} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-700 uppercase">{camp.promisesCount} Promesses</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="col-span-2 py-24 text-center bg-white border border-dashed border-slate-200 rounded-[3rem] opacity-30">
                  <Flag size={48} className="mx-auto" />
                  <p className="text-sm font-black uppercase mt-4">Aucune campagne de don active</p>
                  <button onClick={() => setIsCampaignFormOpen(true)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Lancer une campagne</button>
                </div>
              )}
            </div>
          ) : (
            <Card title="Répertoire de Fidélité Financière" icon={<ShieldCheck size={20} className="text-indigo-600" />} subtitle="Fréquence des contributions sur les 6 derniers mois">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-slate-100">
                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fidèle</th>
                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Régularité (6 mois)</th>
                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fréquence</th>
                       <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Donné</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {fidelityData.map((data, idx) => (
                       <tr key={data.member.id} className="hover:bg-slate-50 transition-colors group">
                         <td className="py-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px] uppercase overflow-hidden shrink-0 shadow-sm">
                                {data.member.photoUrl ? (
                                  <img src={data.member.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(data.member.firstName, data.member.lastName)
                                )}
                             </div>
                             <div>
                               <p className="text-xs font-black text-slate-800 leading-none">{formatFirstName(data.member.firstName)} <span className="uppercase">{data.member.lastName}</span></p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{data.member.type}</p>
                             </div>
                           </div>
                         </td>
                         <td className="py-4">
                           <div className="flex items-center justify-center gap-1">
                             {data.contributions.map((hasGiven, cIdx) => (
                               <div key={cIdx} className={cn(
                                 "w-6 h-6 rounded-md flex items-center justify-center border",
                                 hasGiven ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-200 text-slate-300"
                               )}>
                                 {hasGiven ? <Check size={10} strokeWidth={4} /> : <div className="w-1 h-1 bg-slate-200 rounded-full" />}
                               </div>
                             ))}
                           </div>
                         </td>
                         <td className="py-4 text-right">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded uppercase",
                              data.frequency >= 80 ? "bg-emerald-50 text-emerald-600" : data.frequency >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {data.frequency}%
                            </span>
                         </td>
                         <td className="py-4 text-right">
                           <p className="text-sm font-black text-slate-900">{formatCurrency(data.totalGiven)}</p>
                         </td>
                       </tr>
                     ))}
                     {fidelityData.length === 0 && (
                       <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic text-xs uppercase tracking-widest">Aucun contributeur enregistré sur la période</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </Card>
          )}
        </div>

        <div className="lg:w-80 space-y-6">
          <Card title="Répartition Revenus" icon={<TrendingUp size={18} />} subtitle="Distribution par catégorie">
            {chartData.length > 0 ? (
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={70} 
                      paddingAngle={5} 
                      dataKey="value"
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                      onClick={(data) => toggleCategoryFilter(data.name)}
                      cursor="pointer"
                    >
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '10px', fontBold: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 opacity-20 border-2 border-dashed border-slate-100 rounded-3xl">
                <TrendingUp size={48} />
                <p className="text-[10px] font-black uppercase mt-2">Aucune donnée</p>
              </div>
            )}
            <div className="space-y-2 mt-4 max-h-40 overflow-y-auto custom-scrollbar">
               {chartData.map(item => (
                 <button 
                  key={item.name} 
                  onClick={() => toggleCategoryFilter(item.name)}
                  className={cn(
                    "w-full flex justify-between items-center p-2 rounded-xl text-[9px] font-black uppercase transition-all",
                    selectedCategoryFilter === item.name ? "bg-indigo-50 shadow-sm" : "hover:bg-slate-50"
                  )}
                 >
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div><span className={cn("text-slate-500", selectedCategoryFilter === item.name && "text-indigo-600")}>{item.name}</span></div>
                    <span className="text-slate-800">{Math.round((item.value / (totals.revenus || 1)) * 100)}%</span>
                 </button>
               ))}
            </div>
          </Card>

          <button 
            onClick={() => setIsCatManagerOpen(true)}
            className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Tag size={16} /> Gérer les Catégories
          </button>

          <div 
            onClick={() => setIsPastoralFollowUpOpen(true)}
            className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-xl cursor-pointer hover:scale-[1.02] transition-all"
          >
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform"><ShieldCheck size={80} className="text-indigo-400"/></div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Rigueur {churchName}</p>
             <h3 className="text-xl font-black mt-2">Suivi Pastoral de la Libéralité.</h3>
             <p className="text-[9px] font-bold text-slate-500 mt-4 uppercase tracking-widest leading-relaxed">Encouragez vos membres dans leur croissance financière et spirituelle par une reconnaissance personnalisée.</p>
             <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                Ouvrir le centre de soin <ChevronRight size={14} />
             </div>
          </div>
        </div>
      </div>

      {isPastoralFollowUpOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsPastoralFollowUpOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-2xl bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
              <div className="px-10 py-12 bg-slate-900 text-white rounded-tl-[3rem] shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck size={180} /></div>
                <button onClick={() => setIsPastoralFollowUpOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors text-white"><ChevronLeft size={24} /></button>
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Soin Pastoral</span>
                  <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">Vigilance Financière</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Garantir la bonne santé spirituelle par la libéralité</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><HeartPulse size={24}/></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Membres Fragiles</p>
                      <p className="text-2xl font-black text-rose-600">{pastoralCareData.atRisk.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Crown size={24}/></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Membres Zélés</p>
                      <p className="text-2xl font-black text-emerald-600">{pastoralCareData.faithful.length}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <HeartPulse size={18} className="text-rose-500" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Soutien nécessaire (Baisse de régularité)</h4>
                  </div>
                  <div className="space-y-4">
                    {pastoralCareData.atRisk.map(data => (
                      <div key={data.member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5 group transition-all hover:border-rose-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg font-black text-slate-400 uppercase overflow-hidden shrink-0 shadow-sm">
                               {data.member.photoUrl ? (
                                 <img src={data.member.photoUrl} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 getInitials(data.member.firstName, data.member.lastName)
                               )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 uppercase truncate">{formatFirstName(data.member.firstName)} <span className="uppercase">{data.member.lastName}</span></p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Inactif depuis 2 mois</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleGeneratePastoralMessage(data.member, 'atRisk')}
                              disabled={isGeneratingPastoralMsg}
                              className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                              title="Générer encouragement IA"
                            >
                              {isGeneratingPastoralMsg && generatedPastoralMsg?.id !== data.member.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                            <button onClick={() => window.open(`tel:${data.member.phone}`)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-200 transition-all shadow-sm">
                              <Phone size={18} />
                            </button>
                          </div>
                        </div>

                        {generatedPastoralMsg?.id === data.member.id && (
                          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl animate-in zoom-in-95 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-indigo-600 uppercase">Suggestion IA Pastorale</span>
                              <button onClick={() => setGeneratedPastoralMsg(null)} className="text-slate-400 hover:text-rose-500"><X size={14}/></button>
                            </div>
                            <p className="text-xs text-indigo-800 leading-relaxed font-medium italic">"{generatedPastoralMsg.text}"</p>
                            <button 
                              onClick={() => {
                                const url = `https://wa.me/${data.member.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(generatedPastoralMsg.text)}`;
                                window.open(url, '_blank');
                              }}
                              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                            >
                              <MessageCircle size={14} /> Envoyer via WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {pastoralCareData.atRisk.length === 0 && (
                      <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aucune alerte de fidélité en cours</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Crown size={18} className="text-emerald-500" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Piliers & Intendants Fidèles</h4>
                  </div>
                  <div className="space-y-4">
                    {pastoralCareData.faithful.slice(0, 5).map(data => (
                      <div key={data.member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg font-black text-emerald-600 uppercase overflow-hidden shrink-0 shadow-sm">
                             {data.member.photoUrl ? (
                               <img src={data.member.photoUrl} alt="" className="w-full h-full object-cover" />
                             ) : (
                               getInitials(data.member.firstName, data.member.lastName)
                             )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase">{formatFirstName(data.member.firstName)} <span className="uppercase">{data.member.lastName}</span></p>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Fidélité : {data.frequency}%</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleGeneratePastoralMessage(data.member, 'faithful')}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <Crown size={14}/> Gratitude
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 bg-white shrink-0">
                <button 
                  onClick={() => setIsPastoralFollowUpOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                >
                  Fermer le centre de soin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpFormOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsOpFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-8 text-white">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xl font-black uppercase tracking-tight">{editingOpId ? 'Modifier la Transaction' : 'Nouvelle Transaction'}</h3>
                 <button onClick={() => setIsOpFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
               </div>
               <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Enregistrement comptable {churchName}</p>
            </div>
            <form onSubmit={handleSaveOperation} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 custom-scrollbar pb-20">
               <div className="space-y-4">
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                     <button type="button" onClick={() => setNewOp({...newOp, type: OperationType.REVENU, category: categories.find(c => c.type === OperationType.REVENU)?.name || ''})} className={cn("flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all", newOp.type === OperationType.REVENU ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400")}>Entrée</button>
                     <button type="button" onClick={() => setNewOp({...newOp, type: OperationType.DEPENSE, category: categories.find(c => c.type === OperationType.DEPENSE)?.name || ''})} className={cn("flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all", newOp.type === OperationType.DEPENSE ? "bg-rose-500 text-white shadow-lg" : "text-slate-400")}>Sortie</button>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fidèle concerné (Nom ou Recherche)</label>
                    <div className="relative group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" value={memberSearch}
                        onChange={(e) => { setMemberSearch(e.target.value); setIsMemberDropdownOpen(true); if(!e.target.value) setNewOp({...newOp, memberId: undefined}); }}
                        placeholder="Tapez un nom ou cherchez un membre..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold shadow-sm"
                      />
                    </div>
                    {isMemberDropdownOpen && memberSearch && !newOp.memberId && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                        {members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())).map(m => (
                          <button key={m.id} type="button" onClick={() => { setNewOp({...newOp, memberId: m.id}); setMemberSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); setIsMemberDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                             <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-[8px] font-black text-slate-500 uppercase">
                                {m.photoUrl ? (
                                  <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(m.firstName, m.lastName)
                                )}
                             </div>
                             {formatFirstName(m.firstName)} {m.lastName.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {newOp.type === OperationType.REVENU && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lier à une campagne (Facultatif)</label>
                      <select 
                        value={newOp.campaignId || ''} 
                        onChange={(e) => {
                          const cid = e.target.value;
                          const camp = campaigns.find(c => c.id === cid);
                          setNewOp({
                            ...newOp, 
                            campaignId: cid || undefined, 
                            category: cid ? 'Dons Projets' : (categories.find(c => c.type === OperationType.REVENU)?.name || 'Général'),
                            description: cid ? `Don pour la campagne : ${camp?.name}` : newOp.description
                          });
                        }} 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-black uppercase shadow-sm"
                      >
                        <option value="">-- Aucune campagne --</option>
                        {campaigns.filter(c => c.status === 'Active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                       <input type="date" required value={newOp.date} onChange={(e) => setNewOp({...newOp, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                       <input 
                         type="number" required min="1" 
                         value={newOp.amount || ''} 
                         onChange={(e) => setNewOp({...newOp, amount: parseInt(e.target.value) || 0})} 
                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black text-indigo-600 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                         placeholder="0" 
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie ({newOp.type === OperationType.REVENU ? 'Entrée' : 'Sortie'})</label>
                    <select required value={newOp.category} onChange={(e) => setNewOp({...newOp, category: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-black uppercase tracking-widest shadow-sm">
                      {categories.filter(c => c.type === newOp.type).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      <option value="Général">Général</option>
                      {newOp.campaignId && <option value="Dons Projets">Dons Projets</option>}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moyen de paiement</label>
                    <select value={newOp.paymentMethod} onChange={(e) => setNewOp({...newOp, paymentMethod: e.target.value as PaymentMethod})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-black uppercase tracking-widest shadow-sm">
                       {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Motif</label>
                    <textarea rows={3} value={newOp.description} onChange={(e) => setNewOp({...newOp, description: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[2rem] outline-none text-sm font-medium resize-none shadow-sm transition-all" placeholder="Détails de l'opération..." />
                  </div>
               </div>
               <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setIsOpFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingOpId ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isCampaignFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCampaignFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-8 text-white relative">
               <button onClick={() => setIsCampaignFormOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
               <h3 className="text-xl font-black uppercase tracking-tight">{editingCampaignId ? 'Modifier Campagne' : 'Nouvelle Campagne'}</h3>
               <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Mobilisation de fonds {churchName}</p>
            </div>
            <form onSubmit={handleSaveCampaign} className="p-8 space-y-6 bg-slate-50/30">
               <div className="space-y-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du projet / campagne</label><input type="text" required value={newCampaign.name} onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})} placeholder="Ex: Achat Sonorisation" className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black shadow-sm" /></div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Objectif financier (Facultatif)</label>
                    <input 
                      type="number" 
                      value={newCampaign.goal || ''} 
                      onChange={(e) => setNewCampaign({...newCampaign, goal: parseInt(e.target.value) || undefined})} 
                      placeholder="Ex: 5 000 000" 
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black text-indigo-600 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Vision</label><textarea rows={3} value={newCampaign.description} onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})} placeholder="Décrivez l'impact de ce projet..." className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-medium resize-none shadow-sm" /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de lancement</label><input type="date" value={newCampaign.startDate} onChange={(e) => setNewCampaign({...newCampaign, startDate: e.target.value})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" /></div>
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={() => setIsCampaignFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {editingCampaignId ? 'Mettre à jour' : 'Créer Campagne'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isCampaignDetailsOpen && selectedCampaign && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCampaignDetailsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[3rem] overflow-hidden max-h-[90vh]">
            <div className="px-10 py-12 bg-indigo-600 text-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Flag size={180} /></div>
              <button onClick={() => setIsCampaignDetailsOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors text-white"><ArrowLeft size={24} /></button>
              <div className="relative z-10 space-y-4">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Dossier Campagne</span>
                  <span className="px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">{selectedCampaign.status}</span>
                </div>
                <h3 className="text-3xl font-black uppercase leading-tight tracking-tighter">{selectedCampaign.name}</h3>
                <p className="text-xs text-indigo-100 font-bold uppercase tracking-widest italic">{selectedCampaign.description || 'Pas de description.'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dons Réels</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {formatCurrency(operations.filter(op => op.campaignId === selectedCampaign.id).reduce((s,o) => s+o.amount, 0))}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Promesses</p>
                  <p className="text-2xl font-black text-indigo-600">
                    {formatCurrency(promises.filter(p => p.campaignId === selectedCampaign.id).reduce((s,p) => s+p.amount, 0))}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Target size={14} className="text-indigo-600" /> Centre de Pilotage des Engagements
                 </h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button 
                      onClick={() => { setDonorListFilter('all'); setIsDonorListModalOpen(true); }}
                      className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-slate-400 hover:shadow-xl transition-all group"
                    >
                       <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Users size={16} />
                       </div>
                       <div className="text-center">
                          <p className="text-lg font-black text-slate-900 leading-none">{campaignDonorsSummary.all.length}</p>
                          <p className="text-[7px] font-black text-slate-500 uppercase mt-1 tracking-widest">Tous</p>
                       </div>
                    </button>

                    <button 
                      onClick={() => { setDonorListFilter('full'); setIsDonorListModalOpen(true); }}
                      className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group"
                    >
                       <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={16} />
                       </div>
                       <div className="text-center">
                          <p className="text-lg font-black text-slate-900 leading-none">{campaignDonorsSummary.full.length}</p>
                          <p className="text-[7px] font-black text-emerald-600 uppercase mt-1 tracking-widest">Soldés</p>
                       </div>
                    </button>
                    
                    <button 
                      onClick={() => { setDonorListFilter('partial'); setIsDonorListModalOpen(true); }}
                      className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                    >
                       <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <RefreshCw size={16} />
                       </div>
                       <div className="text-center">
                          <p className="text-lg font-black text-slate-900 leading-none">{campaignDonorsSummary.partial.length}</p>
                          <p className="text-[7px] font-black text-indigo-600 uppercase mt-1 tracking-widest">Partiels</p>
                       </div>
                    </button>

                    <button 
                      onClick={() => { setDonorListFilter('none'); setIsDonorListModalOpen(true); }}
                      className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/5 transition-all group"
                    >
                       <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CircleDashed size={16} />
                       </div>
                       <div className="text-center">
                          <p className="text-lg font-black text-slate-900 leading-none">{campaignDonorsSummary.none.length}</p>
                          <p className="text-[7px] font-black text-rose-600 uppercase mt-1 tracking-widest">Rien versé</p>
                       </div>
                    </button>
                 </div>
                </div>

                <button 
                  onClick={() => { 
                    setEditingPromiseId(null);
                    setNewPromise({ memberId: '', amount: 0, campaignId: selectedCampaign.id, date: new Date().toISOString().split('T')[0] }); 
                    setMemberSearch('');
                    setIsPromiseFormOpen(true); 
                  }}
                  className="w-full py-4 bg-white border-2 border-dashed border-indigo-200 rounded-[2rem] text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Enregistrer une promesse
                </button>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                     <StickyNote size={14} className="text-indigo-600" /> Registre des Engagements
                   </h4>
                   <div className="space-y-3">
                      {promises.filter(p => p.campaignId === selectedCampaign.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => {
                        const m = members.find(mem => mem.id === p.memberId);
                        const nameStr = m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : (p.externalName || 'Inconnu');
                        return (
                          <div key={p.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group shadow-sm hover:border-indigo-200 transition-all">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-[8px] font-black uppercase">
                                   {m?.photoUrl ? (
                                     <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                     getInitials(m?.firstName, m?.lastName)
                                   )}
                                </div>
                                <div>
                                   <p className="text-xs font-black text-slate-800 uppercase">{nameStr}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(p.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <p className="text-sm font-black text-indigo-600">{formatCurrency(p.amount)}</p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => handleEditPromise(p)} className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit size={14}/></button>
                                   <button onClick={() => handleDeletePromise(p.id)} className="p-1.5 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg"><Trash2 size={14}/></button>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                      {promises.filter(p => p.campaignId === selectedCampaign.id).length === 0 && (
                        <div className="py-12 text-center opacity-20 border border-dashed border-slate-200 rounded-[2rem]">
                          <StickyNote size={40} className="mx-auto" />
                          <p className="text-[9px] font-black uppercase mt-3">Aucun engagement enregistré</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                     <HistoryIcon size={14} className="text-indigo-600" /> Journal de la Campagne
                   </h4>
                   <div className="space-y-3">
                      {operations.filter(op => op.campaignId === selectedCampaign.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(op => {
                        const m = members.find(mem => mem.id === op.memberId);
                        const nameStr = m ? `${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}` : (op.externalName || 'Anonyme');
                        return (
                          <div key={op.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-[8px] font-black uppercase">
                                   {m?.photoUrl ? (
                                     <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                     getInitials(m?.firstName, m?.lastName)
                                   )}
                                </div>
                                <div>
                                   <p className="text-xs font-black text-slate-800 uppercase">{nameStr}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(op.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                             </div>
                             <p className="text-sm font-black text-emerald-600">+{formatCurrency(op.amount)}</p>
                          </div>
                        );
                      })}
                      {operations.filter(op => op.campaignId === selectedCampaign.id).length === 0 && (
                        <div className="py-12 text-center opacity-20">
                          <HistoryIcon size={40} className="mx-auto" />
                          <p className="text-[9px] font-black uppercase mt-3">Aucun versement enregistré</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 bg-white flex flex-col gap-4 shrink-0 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)]">
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const status = selectedCampaign.status === 'Active' ? 'Terminée' : 'Active';
                      setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? { ...c, status } as DonationCampaign : c));
                      setSelectedCampaign({ ...selectedCampaign, status } as DonationCampaign);
                      updateDonationCampaign(selectedCampaign.id, { status });
                    }}
                    className={cn("flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl", selectedCampaign.status === 'Active' ? "bg-slate-900 text-white" : "bg-emerald-50 text-emerald-700")}
                  >
                    {selectedCampaign.status === 'Active' ? 'Clôturer Campagne' : 'Réactiver Campagne'}
                  </button>
                  <button 
                    onClick={() => handleEditCampaign(selectedCampaign)}
                    className="flex-1 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit size={18} /> Modifier
                  </button>
                </div>
                <button 
                  onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                  className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Supprimer définitivement
                </button>
              </div>
          </div>
        </div>
      )}

      {isDonorListModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsDonorListModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className={cn(
               "p-8 text-white shrink-0 relative",
               donorListFilter === 'full' ? "bg-emerald-600" : 
               donorListFilter === 'partial' ? "bg-indigo-600" : 
               donorListFilter === 'all' ? "bg-slate-900" :
               "bg-rose-600"
            )}>
               <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xl font-black uppercase tracking-tight">
                    {donorListFilter === 'full' ? 'Engagements Soldés' : 
                     donorListFilter === 'partial' ? 'Règlements Partiels' : 
                     donorListFilter === 'all' ? 'Tous les Engagements' :
                     'Promesses en Attente'}
                 </h3>
                 <button onClick={() => setIsDonorListModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
               </div>
               <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest italic truncate">{selectedCampaign.name}</p>
            </div>
            
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Chercher un donateur..." 
                    value={donorSearchInModal}
                    onChange={(e) => setDonorSearchInModal(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
               {campaignDonorsSummary[donorListFilter]
                 .filter(d => {
                   const name = d.member ? `${d.member.firstName} ${d.member.lastName}` : d.externalName;
                   return (name || '').toLowerCase().includes(donorSearchInModal.toLowerCase());
                 })
                 .map((data, idx) => (
                  <div key={data.member?.id || data.externalName || idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 group">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-lg overflow-hidden shrink-0 shadow-sm">
                              {data.member?.photoUrl ? (
                                <img src={data.member.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : data.member ? (
                                getInitials(data.member.firstName, data.member.lastName)
                              ) : (
                                data.externalName?.charAt(0).toUpperCase() || '?'
                              )}
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase truncate max-w-[180px]">{data.member ? `${data.member.firstName} ${data.member.lastName}` : data.externalName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                 Promis : {formatCurrency(data.pld)} • <span className="text-emerald-600">Réglé : {formatCurrency(data.gvn)}</span>
                              </p>
                           </div>
                        </div>
                        <div className="flex gap-1">
                           {data.donorPromises && data.donorPromises.length > 0 && (
                             <div className="flex gap-1 mr-2 pr-2 border-r border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => handleEditPromise(data.donorPromises[0])}
                                 className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                 title="Modifier la promesse"
                               >
                                 <Edit size={16} />
                               </button>
                               <button 
                                 onClick={() => handleDeletePromise(data.donorPromises[0].id)}
                                 className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                 title="Supprimer la promesse"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           )}
                           
                           {data.gvn < data.pld ? (
                             <button 
                               onClick={() => {
                                 const name = data.member?.firstName || data.externalName;
                                 handleWhatsApp(data.member?.whatsappPhone || data.member?.phone, `Cher ${name}, nous vous remercions pour votre promesse de ${formatCurrency(data.pld)} pour le projet "${selectedCampaign.name}". Il reste ${formatCurrency(data.pld - data.gvn)} à solder. Dieu vous bénisse.`);
                               }}
                               className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                               title="Relancer via WhatsApp"
                             >
                               <MessageCircle size={18} />
                             </button>
                           ) : (
                             <button 
                               onClick={() => {
                                 const name = data.member?.firstName || data.externalName;
                                 handleWhatsApp(data.member?.whatsappPhone || data.member?.phone, `Bonjour ${name}, toute l'église vous remercie pour votre fidélité concernant le projet "${selectedCampaign.name}". Vous avez soldé votre promesse ! Soyez abondamment béni.`);
                               }}
                               className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                               title="Féliciter via WhatsApp"
                             >
                               <Crown size={18} />
                             </button>
                           )}
                           <button 
                              onClick={() => {
                                 const description = data.member ? `Versement pour ${selectedCampaign.name}` : `Versement externe pour ${selectedCampaign.name}`;
                                 const name = data.member 
                                    ? `${formatFirstName(data.member.firstName)} ${data.member.lastName.toUpperCase()}` 
                                    : (data.externalName || '');
                                 setMemberSearch(name);
                                 setNewOp({ 
                                    type: OperationType.REVENU,
                                    category: 'Dons Projets',
                                    amount: 0,
                                    date: new Date().toISOString().split('T')[0],
                                    paymentMethod: PaymentMethod.ESPECES,
                                    description,
                                    memberId: data.member?.id,
                                    externalName: data.externalName,
                                    campaignId: selectedCampaign.id
                                 });
                                 setIsOpFormOpen(true);
                              }}
                              className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                              title="Nouveau versement"
                           >
                              <HandCoins size={18} />
                           </button>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase">
                           <span className="text-slate-400">Progression engagement</span>
                           <span className="text-indigo-600 font-bold">{data.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                           <div className={cn("h-full transition-all duration-1000", data.progress >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${data.progress}%` }}></div>
                        </div>
                     </div>
                  </div>
               ))}
               {campaignDonorsSummary[donorListFilter].length === 0 && (
                 <div className="py-24 text-center opacity-30">
                    <UserX size={48} className="mx-auto" />
                    <p className="text-[10px] font-black uppercase mt-3">Aucun donateur dans cette catégorie</p>
                 </div>
               )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Potentiel restant</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-1">
                    {formatCurrency(campaignDonorsSummary[donorListFilter].reduce((s,d) => s + Math.max(0, d.pld - d.gvn), 0))}
                  </p>
               </div>
               <button onClick={() => setIsDonorListModalOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl active:scale-95 transition-all">Fermer la liste</button>
            </div>
          </div>
        </div>
      )}

      {isPromiseFormOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsPromiseFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-indigo-600 p-8 text-white">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xl font-black uppercase tracking-tight">{editingPromiseId ? 'Modifier l\'Engagement' : 'Promesse de Don'}</h3>
                 <button onClick={() => setIsPromiseFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
               </div>
               <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Enregistrement d'un engagement spirituel</p>
            </div>
            <form onSubmit={handleSavePromise} className="p-8 space-y-6 bg-slate-50/30">
               <div className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prometteur (Membre ou Externe)</label>
                    <div className="relative group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" required value={memberSearch}
                        onChange={(e) => { setMemberSearch(e.target.value); setIsMemberDropdownOpen(true); if(!e.target.value) setNewPromise({...newPromise, memberId: ''}); }}
                        placeholder="Chercher un membre ou saisir un nom..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold shadow-sm"
                      />
                    </div>
                    {isMemberDropdownOpen && memberSearch && !newPromise.memberId && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl custom-scrollbar">
                        {members.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())).map(m => (
                          <button key={m.id} type="button" onClick={() => { setNewPromise({...newPromise, memberId: m.id}); setMemberSearch(`${formatFirstName(m.firstName)} ${m.lastName.toUpperCase()}`); setIsMemberDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center gap-3">
                             <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-[8px] font-black text-slate-500 uppercase">
                                {m.photoUrl ? (
                                  <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(m.firstName, m.lastName)
                                )}
                             </div>
                             {formatFirstName(m.firstName)} {m.lastName.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                    {!newPromise.memberId && memberSearch.trim() && (
                      <p className="text-[9px] text-amber-600 font-bold uppercase mt-1 px-1">Le donateur sera enregistré comme externe.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                       <input 
                         type="number" required min="1" 
                         value={newPromise.amount || ''} 
                         onChange={(e) => setNewPromise({...newPromise, amount: parseInt(e.target.value) || 0})} 
                         className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-black text-indigo-600 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                         placeholder="0" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                       <input type="date" required value={newPromise.date} onChange={(e) => setNewPromise({...newPromise, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold shadow-sm" />
                    </div>
                  </div>
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={() => setIsPromiseFormOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Fermer</button>
                  <button type="submit" disabled={isSubmitting || (!newPromise.memberId && !memberSearch.trim())} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingPromiseId ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isOpDetailsOpen && selectedOperation && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsOpDetailsOpen(false)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col rounded-[2.5rem] overflow-hidden max-h-[90vh]">
            <div className={cn(
              "px-10 py-12 text-white rounded-t-[2.5rem] shrink-0 relative overflow-hidden",
              selectedOperation.type === OperationType.DEPENSE ? "bg-rose-600" : "bg-emerald-600"
            )}>
              <div className="absolute top-0 right-0 p-8 opacity-10"><Receipt size={180} /></div>
              <button onClick={() => setIsOpDetailsOpen(false)} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full text-white transition-colors text-white"><X size={24} /></button>
              <div className="relative z-10 space-y-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Fiche Transaction</span>
                <h3 className="text-4xl font-black uppercase leading-tight tracking-tighter">{formatCurrency(selectedOperation.amount)}</h3>
                <div className="flex items-center gap-4 text-white/80">
                   <span className="text-xs font-bold uppercase tracking-widest">{new Date(selectedOperation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 space-y-8">
              {selectedOperation.type === OperationType.REVENU && (selectedOperation.memberId || selectedOperation.externalName) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} className="text-indigo-600" /> Reçu de remerciement IA</h4>
                    {generatedReceipt && <button onClick={() => setGeneratedReceipt(null)} className="text-[9px] font-black text-slate-400 uppercase hover:text-rose-500">Effacer</button>}
                  </div>
                  
                  {!generatedReceipt ? (
                    <button 
                      onClick={() => handleGenerateReceipt(selectedOperation)}
                      disabled={isGeneratingReceipt}
                      className="w-full py-4 bg-white border-2 border-dashed border-indigo-200 text-indigo-600 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingReceipt ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                      Générer un remerciement pastoral
                    </button>
                  ) : (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] animate-in zoom-in-95 duration-300 space-y-4 shadow-sm">
                      <p className="text-xs text-emerald-800 font-medium leading-relaxed italic">"{generatedReceipt}"</p>
                      <div className="flex gap-2 pt-2 border-t border-emerald-100">
                        <button onClick={() => { navigator.clipboard.writeText(generatedReceipt); alert("Copié !"); }} className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"><Copy size={12}/> Copier</button>
                        <button onClick={() => shareReceiptWhatsApp(selectedOperation, generatedReceipt)} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"><Send size={12}/> WhatsApp</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                {(selectedOperation.memberId || selectedOperation.externalName) && (
                  <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                     <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black uppercase overflow-hidden shrink-0 shadow-sm">
                      {selectedOperation.memberId 
                        ? (members.find(m => m.id === selectedOperation.memberId)?.photoUrl 
                            ? <img src={members.find(m => m.id === selectedOperation.memberId)!.photoUrl} className="w-full h-full object-cover" />
                            : getInitials(members.find(m => m.id === selectedOperation.memberId)?.firstName, members.find(m => m.id === selectedOperation.memberId)?.lastName))
                        : (selectedOperation.externalName?.charAt(0) || 'U')
                      }
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Contributeur</p>
                       <p className="text-sm font-black text-indigo-700 uppercase">
                        {selectedOperation.memberId 
                          ? `${formatFirstName(members.find(m => m.id === selectedOperation.memberId)?.firstName || '')} ${members.find(m => m.id === selectedOperation.memberId)?.lastName.toUpperCase()}`
                          : selectedOperation.externalName
                        }
                       </p>
                     </div>
                  </div>
                )}
                {selectedOperation.campaignId && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                     <Flag size={16} className="text-emerald-600" />
                     <div>
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Campagne de don</p>
                       <p className="text-xs font-black text-emerald-800 uppercase">{campaigns.find(c => c.id === selectedOperation.campaignId)?.name}</p>
                     </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{selectedOperation.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paiement</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{selectedOperation.paymentMethod}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motif / Notes</p>
                    <p className="text-sm text-slate-700 font-medium italic">"{selectedOperation.description || 'Pas de description.'}"</p>
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex gap-3 shrink-0">
              <button 
                onClick={() => handleEditOperation(selectedOperation)}
                className="flex-[2] py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Modifier l'opération
              </button>
              <button onClick={() => { setOpToDeleteId(selectedOperation.id); setIsDeleteConfirmOpen(true); }} className="flex-1 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase">Supprimer ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">Cette action retirera définitivement ce relevé de l'historique.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={() => { if(opToDeleteId) { setOperations(prev => prev.filter(h => h.id !== opToDeleteId)); deleteFinancialRecord(opToDeleteId); setOpToDeleteId(null); setIsDeleteConfirmOpen(false); setIsOpDetailsOpen(false); } }} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {isDeletePromiseConfirmOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeletePromiseConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase">Supprimer l'Engagement ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">Cette promesse sera définitivement retirée. Cette action est irréversible.</p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDeletePromise} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeletePromiseConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteCampaignConfirmOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteCampaignConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Supprimer Campagne ?</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed italic">
              Cette action retirera définitivement la campagne. Les dons déjà perçus resteront dans le journal.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDeleteCampaign} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Confirmer</button>
              <button onClick={() => setIsDeleteCampaignConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {isCatManagerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCatManagerOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-indigo-600 p-8 text-white shrink-0">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xl font-black uppercase tracking-tight">Catégories Typées</h3>
                 <button onClick={() => setIsCatManagerOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
               </div>
               <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Distinction Entrées / Sorties</p>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajouter une catégorie</p>
                  <input type="text" value={newCat.name} onChange={(e) => setNewCat({...newCat, name: e.target.value})} placeholder="Nom (ex: Travaux)..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold shadow-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => setNewCat({...newCat, type: OperationType.REVENU})} className={cn("flex-1 py-2 text-[8px] font-black uppercase rounded-lg border", newCat.type === OperationType.REVENU ? "bg-emerald-50 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-400")}>Entrée</button>
                    <button onClick={() => setNewCat({...newCat, type: OperationType.DEPENSE})} className={cn("flex-1 py-2 text-[8px] font-black uppercase rounded-lg border", newCat.type === OperationType.DEPENSE ? "bg-rose-500 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-400")}>Sortie</button>
                  </div>
                  <button onClick={handleAddCategory} disabled={!newCat.name.trim()} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-sm">Ajouter à la liste</button>
               </div>

               <div className="space-y-4">
                 {[OperationType.REVENU, OperationType.DEPENSE].map(type => (
                   <div key={type} className="space-y-2">
                      <h4 className={cn("text-[9px] font-black uppercase tracking-widest", type === OperationType.REVENU ? "text-emerald-600" : "text-rose-600")}>{type === OperationType.REVENU ? 'Entrées' : 'Sorties'}</h4>
                      <div className="grid grid-cols-1 gap-1.5">
                         {categories.filter(c => c.type === type).map(cat => (
                           <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group transition-all hover:border-slate-200">
                             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{cat.name}</span>
                             <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-200 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
               </div>
            </div>
            <div className="p-8 border-t border-slate-100 shrink-0">
               <button onClick={() => setIsCatManagerOpen(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finances;