import { Dexie, type EntityTable } from 'dexie'
import type { Chapitre, Erreur, Examen, Matiere, Question, Reponse } from './types'

// Toutes les données restent dans le navigateur du téléphone (IndexedDB).
export const db = new Dexie('revisions-qcm') as Dexie & {
  matieres: EntityTable<Matiere, 'id'>
  chapitres: EntityTable<Chapitre, 'id'>
  questions: EntityTable<Question, 'id'>
  reponses: EntityTable<Reponse, 'id'>
  erreurs: EntityTable<Erreur, 'questionId'>
  examens: EntityTable<Examen, 'id'>
}

db.version(1).stores({
  matieres: 'id, nom',
  chapitres: 'id, matiereId',
  questions: 'id, chapitreId, matiereId',
  reponses: '++id, questionId, date',
  erreurs: 'questionId, ajouteLe',
})

// Version 2 : historique des examens blancs.
db.version(2).stores({
  examens: '++id, matiereId, debut',
})

// Demande au navigateur de ne pas effacer les données quand le stockage est plein.
export function demanderStockagePersistant() {
  navigator.storage?.persist?.().catch(() => {})
}
