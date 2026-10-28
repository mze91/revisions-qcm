// Format des fichiers de QCM (« packs ») produits par la commande /generer-qcm.
// Voir docs/FORMAT-PACK.md pour la description complète.

export interface SourceCours {
  page?: number
  extrait: string
}

export interface ItemPack {
  lettre: string
  texte: string
  correct: boolean
  explication: string
  source: SourceCours
}

export interface QuestionPack {
  id: string
  type: 'multiple' | 'unique'
  enonce: string
  items: ItemPack[]
  origine?: 'genere' | 'annale'
}

export interface ChapitrePack {
  id: string
  nom: string
  ordre?: number
  groupe?: string // partie de la matière, ex. « Pharmacologie »
  source?: string
  questions: QuestionPack[]
}

export interface Pack {
  format: 'qcm-revision'
  version: 1
  matiere: { id: string; nom: string }
  chapitres: ChapitrePack[]
}

// Données enregistrées sur l'appareil

export interface Matiere {
  id: string
  nom: string
}

export interface Chapitre {
  id: string // `${matiereId}/${idDuPack}`
  matiereId: string
  nom: string
  groupe?: string
  ordre: number
  source?: string
  importeLe: number
}

export interface Question extends Omit<QuestionPack, 'id'> {
  id: string // `${chapitreId}#${idDuPack}`
  chapitreId: string
  matiereId: string
}

export interface Reponse {
  id?: number
  questionId: string
  date: number
  mode: 'entrainement' | 'erreurs'
  choix: string[]
  discordances: number
}

export interface Erreur {
  questionId: string
  ajouteLe: number
  derniereFois: number
  nbEchecs: number
}
