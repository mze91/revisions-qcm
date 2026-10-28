// Format des fichiers de QCM (« packs ») produits par la commande /generer-qcm.
// Voir docs/FORMAT-PACK.md pour la description complète.

export interface SourceCours {
  page?: number
  extrait: string
  zones?: number[][] // rectangles [x, y, largeur, hauteur] en fractions de la page, pour surligner l'extrait
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
  origine?: 'genere' | 'annale' // « annale » = QCM repris tel quel (tutorat ou vraie annale d'examen)
  annee?: string // pour une vraie annale d'examen : année ou session (ex. « 2024 » ou « Janvier 2024 »)
}

export interface ChapitrePack {
  id: string
  nom: string
  ordre?: number
  groupe?: string // partie de la matière, ex. « Pharmacologie »
  source?: string
  pages?: number // nombre de pages du cours publié
  cours?: string // chemin du paquet chiffré des pages, ajouté à la publication
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
  pages?: number
  cours?: string
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
  mode: 'entrainement' | 'erreurs' | 'examen'
  choix: string[]
  discordances: number
}

export interface Erreur {
  questionId: string
  ajouteLe: number
  derniereFois: number
  nbEchecs: number
}

export interface ReponseExamen {
  questionId: string
  choix: string[]
  aRevoir?: boolean
}

export interface Examen {
  id?: number
  matiereId: string
  debut: number
  fin?: number
  dureeMax: number // en secondes
  bareme: Bareme
  questions: ReponseExamen[]
  points?: number
  justes?: number
}

export type Bareme = 'discordances' | 'tout-ou-rien'
