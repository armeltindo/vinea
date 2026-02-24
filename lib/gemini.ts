import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const getChurchName = () => {
  try {
    const saved = localStorage.getItem('vinea_church_info');
    if (saved) {
      return JSON.parse(saved).name || 'Vinea';
    }
  } catch (e) {}
  return 'Vinea';
};

/**
 * Instruction système commune pour garantir l'usage de la version Louis Segond 1910
 */
const SYSTEM_BASE = (churchName: string) => `Tu es un assistant administratif intelligent pour l'église ${churchName}. Tes réponses sont en français, professionnelles, encourageantes et synthétiques. Utilise des emojis pour illustrer tes points. TRÈS IMPORTANT : Pour toute citation biblique ou contenu spirituel, utilise exclusivement le texte de la version Louis Segond 1910.`;

export async function analyzePageData(pageTitle: string, data: any) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `En tant qu'assistant expert en gestion d'église pour l'application de l'église "${churchName}", analyse ces données de la page "${pageTitle}" et fournis un résumé stratégique très concis (maximum 4-5 points clés). 
      Données : ${JSON.stringify(data)}`,
      config: {
        systemInstruction: SYSTEM_BASE(churchName),
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur lors de l'analyse IA:", error);
    return "Désolé, une erreur est survenue lors de l'analyse de vos données. Veuillez réessayer plus tard.";
  }
}

export async function generateFinancialPrediction(finances: any[]) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cet historique financier de l'église ${churchName} et prédis la tendance des revenus pour le mois prochain. Identifie aussi d'éventuelles anomalies ou d'éventuelles d'éventuelles dépenses excessives.
      Historique : ${JSON.stringify(finances.slice(0, 50))}`,
      config: {
        systemInstruction: `Tu es un consultant financier expert pour l'église ${churchName}. Sois précis, donne des conseils de prudence budgétaire et encourage la bonne gestion. Réponds en Markdown court (max 150 mots). Si tu cites un verset sur la gestion, utilise exclusivement la version Louis Segond 1910.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur prédiction financière:", error);
    return null;
  }
}

export async function generateDonationReceipt(donation: any, member: any) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rédige un message de remerciement officiel et chaleureux pour un don/dîme.
      Donateur : ${member.firstName} ${member.lastName}
      Montant : ${donation.amount} F CFA
      Catégorie : ${donation.category}
      Date : ${donation.date}`,
      config: {
        systemInstruction: `Tu es le trésorier de l'église ${churchName}. Ton style est reconnaissant, spirituel et formel. Inclue un court verset sur la libéralité en utilisant EXCLUSIVEMENT le texte de la version Louis Segond 1910. Le message doit être prêt à être envoyé sur WhatsApp avec des emojis.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur reçu IA:", error);
    return null;
  }
}

export async function generateMeetingMinutes(meetingData: any) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Rédige un Procès-Verbal (PV) officiel et structuré pour la réunion suivante de l'église ${churchName} :
      Titre : ${meetingData.title}
      Date : ${meetingData.date}
      Participants : ${meetingData.attendees.join(', ')}
      Notes brutes : ${meetingData.summary}
      Décisions listées : ${JSON.stringify(meetingData.decisions)}`,
      config: {
        systemInstruction: `Tu es le secrétaire général de l'église ${churchName}. Ton style est formel, précis et ecclésiastique. Le PV doit comporter : 1. En-tête officiel, 2. Liste de présence & Quorum, 3. Résumé des points abordés, 4. Tableau des résolutions actées, 5. Conclusion. Toute référence biblique doit être issue de la version Louis Segond 1910. Réponds en Markdown.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur PV IA:", error);
    return null;
  }
}

export async function generateMeetingFlash(meetingData: any) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère un résumé 'Flash Info' court pour WhatsApp concernant la réunion : ${meetingData.title} de l'église ${churchName}. 
      Décisions prises : ${JSON.stringify(meetingData.decisions)}`,
      config: {
        systemInstruction: `Rédige un message très court (max 100 mots), chaleureux, utilisant des emojis, destiné aux membres de l'église pour les informer des grandes décisions. Toute citation biblique doit provenir de la version Louis Segond 1910. Commence par '📢 FLASH INFO ${churchName.toUpperCase()}'.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur Flash IA:", error);
    return null;
  }
}

export async function extractMeetingTasks(summary: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse ces notes de réunion et extrais une liste d'actions concrètes (tâches).
      Notes : ${summary}`,
      config: {
        systemInstruction: "Réponds uniquement sous forme d'un tableau JSON d'objets avec les clés 'title' (la tâche), 'responsible' (si mentionné), 'deadline' (si mentionnée au format YYYY-MM-DD ou null).",
        responseMimeType: "application/json"
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erreur Extraction tâches:", error);
    return [];
  }
}

export async function suggestVisitorFollowUp(visitor: any) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse le profil de ce visiteur de l'église ${churchName} et suggère 2 ou 3 actions de suivi prioritaires et concrètes.
      Visiteur : ${visitor.firstName} ${visitor.lastName}
      Statut : ${visitor.status}
      Notes initiales : ${visitor.notes}
      Historique : ${JSON.stringify(visitor.followUpHistory || [])}`,
      config: {
        systemInstruction: `Tu es un assistant de suivi pastoral pour l'église ${churchName}. Propose des actions bienveillantes, spécifiques aux besoins mentionnés dans les notes. Toute citation biblique doit impérativement utiliser le texte de la version Louis Segond 1910. Réponds par une liste courte de points d'action en français.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur suggestion IA:", error);
    return null;
  }
}

export async function generateWelcomeMessage(visitor: any) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rédige un message de bienvenue personnalisé pour un visiteur de l'église ${churchName}.
      Visiteur : ${visitor.firstName} ${visitor.lastName}
      Service visité : ${visitor.service}
      Notes de la visite : ${visitor.notes}
      
      Le message doit :
      1. Être chaleureux, pastoral et bienveillant.
      2. Remercier pour sa venue au service de "${visitor.service}".
      3. Faire référence de manière subtile et empathique aux points mentionnés dans les notes de visite.
      4. Inclure un court verset biblique encourageant adapté à la situation évoquée dans les notes, en utilisant EXCLUSIVEMENT la version Louis Segond 1910.
      5. Finir par une invitation à rester en contact.
      6. Être prêt à être envoyé par WhatsApp.`,
      config: {
        systemInstruction: `Tu es un pasteur accueillant de l'église ${churchName}. Ton langage est moderne, plein d'amour et de compassion. Réponds uniquement avec le texte du message en français, sans commentaires additionnels. Ne dépasse pas 150 mots.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur génération message bienvenue:", error);
    return null;
  }
}

export async function analyzeSermon(theme: string, content: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cette prédication intitulée "${theme}". 
      Contenu : ${content}
      
      Fournis :
      1. Les 3 points principaux (clairs et bibliques).
      2. Une application pratique pour la vie quotidienne.
      3. Une courte citation inspirante extraite du texte.
      Toute référence biblique doit être citée selon la version Louis Segond 1910.`,
      config: {
        systemInstruction: "Tu es un assistant homilétique. Ton ton est spirituel, clair et encourageant. Utilise un format Markdown structuré. Utilise exclusivement la version Louis Segond 1910 pour les versets.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur analyse prédication:", error);
    return null;
  }
}

export async function generateSocialSummary(theme: string, content: string) {
  const churchName = getChurchName();
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rédige un résumé très court (max 50 mots) de la prédication "${theme}" pour les réseaux sociaux de l'église ${churchName}. 
      Contenu : ${content}
      
      Le résumé doit être percutant, donner envie d'écouter le message et inclure 3-4 hashtags pertinents à la fin. Si tu inclus un verset, utilise la version Louis Segond 1910.`,
      config: {
        systemInstruction: `Tu es un community manager chrétien pour l'église ${churchName}. Ton style est dynamique et inspirant.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur résumé social:", error);
    return null;
  }
}

export async function suggestSermonTags(content: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse ce texte de prédication et suggère une liste de 5 mots-clés (tags) thématiques séparés par des virgules.
      Contenu : ${content}`,
      config: {
        systemInstruction: "Réponds uniquement par la liste de mots-clés, sans rien d'autre.",
      },
    });
    return response.text?.split(',').map(t => t.trim()) || [];
  } catch (error) {
    console.error("Erreur tags:", error);
    return [];
  }
}

export async function generateMeditation(theme?: string) {
  try {
    const ai = getAI();
    const prompt = theme 
      ? `Rédige une méditation chrétienne inspirante sur le thème : "${theme}".`
      : "Rédige une méditation chrétienne quotidienne basée sur un verset biblique encourageant de ton choix.";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Tu es un pasteur bienveillant et inspiré. Rédige une méditation courte comprenant : 1) Un verset de référence (Version Louis Segond 1910 UNIQUEMENT), 2) Une réflexion courte et profonde, 3) Une prière de conclusion. Format : Markdown simple.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur lors de la génération de méditation:", error);
    return null;
  }
}

/**
 * Suggère un titre de méditation basé sur les versets et les questions.
 */
export async function suggestMeditationTitle(scripture: string, questions: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Propose un titre court et percutant (maximum 5-7 mots) pour une méditation chrétienne basée sur ces éléments :
      Versets : ${scripture}
      Questions de réflexion : ${questions}`,
      config: {
        systemInstruction: "Tu es un rédacteur inspiré. Réponds uniquement par le titre suggéré, sans ponctuation inutile autour.",
      },
    });
    return response.text?.trim().replace(/^"|"$/g, '') || null;
  } catch (error) {
    console.error("Erreur suggestion titre:", error);
    return null;
  }
}

/**
 * Suggère un résumé de méditation basé sur les versets et les questions.
 */
export async function suggestMeditationSummary(scripture: string, questions: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rédige un résumé inspirant et court (maximum 60-80 mots) pour une méditation chrétienne basée sur ces éléments :
      Versets : ${scripture}
      Questions de réflexion : ${questions}`,
      config: {
        systemInstruction: "Tu es un pasteur bienveillant. Ton style est édifiant et encourageant. Réponds uniquement avec le résumé. Si tu cites la Bible, utilise la version Louis Segond 1910.",
      },
    });
    return response.text?.trim() || null;
  } catch (error) {
    console.error("Erreur suggestion résumé:", error);
    return null;
  }
}

/**
 * Génère une pensée de leadership basée sur un verset pour inspirer les administrateurs.
 */
export async function generateLeadershipThought(verse: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sur la base de ce verset biblique : "${verse}", fournis un court conseil de leadership inspirant (maximum 30 mots) pour un administrateur d'église qui commence sa journée. Le verset fourni est supposé être en Louis Segond 1910.`,
      config: {
        systemInstruction: "Tu es un mentor en leadership chrétien. Ton ton est encourageant, sage et concis.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erreur génération pensée leadership:", error);
    return null;
  }
}