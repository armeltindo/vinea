import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import MemberDetails from '../components/MemberDetails';
import { getMembers, deleteMember } from '../lib/db';
import { Member } from '../types';
import { formatFirstName } from '../utils';

const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    getMembers().then(members => {
      const found = members.find(m => m.id === id) ?? null;
      setMember(found);
      setNotFound(!found);
      setLoading(false);
    });
  }, [id]);

  const handleEdit = (m: Member) => {
    navigate('/members', { state: { editId: m.id } });
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!member) return;
    await deleteMember(member.id);
    navigate('/members');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400 opacity-60" />
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 opacity-40">
        <AlertTriangle size={48} />
        <p className="text-sm font-medium">Membre introuvable</p>
        <button onClick={() => navigate('/members')} className="text-xs text-indigo-600 underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      {/* Barre de navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/members')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs text-slate-400">Membres</p>
          <h1 className="text-base font-semibold text-slate-900 leading-tight">
            {formatFirstName(member.firstName)} {member.lastName.toUpperCase()}
          </h1>
        </div>
      </div>

      {/* Détails du membre en mode page */}
      <MemberDetails
        member={member}
        isOpen={true}
        asPage={true}
        onClose={() => navigate('/members')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPreviewPhoto={(url) => setPreviewImageUrl(url)}
        onUpdateMember={(updated) => setMember(updated)}
      />

      {/* Confirmation suppression */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50">
              <Trash2 size={36} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 leading-tight tracking-tight">Supprimer ?</h3>
            <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">
              {formatFirstName(member.firstName)} {member.lastName.toUpperCase()} sera définitivement supprimé.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-semibold hover:bg-rose-700 transition-all shadow-xl shadow-rose-200">
                Supprimer
              </button>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all border border-slate-200">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aperçu photo */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setPreviewImageUrl(null)}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
          <img src={previewImageUrl} alt="Photo" className="relative max-w-sm w-full rounded-3xl shadow-2xl object-cover" />
        </div>
      )}
    </div>
  );
};

export default MemberDetailPage;
