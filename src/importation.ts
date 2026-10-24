import { db } from './db'
import type { Pack, Question } from './types'

export interface ResultatImport {
  matiere: string
  chapitres: { nom: string; questions: number }[]
}

// Vérifie le fichier avant de toucher aux données : un fichier abîmé ne doit rien casser.
function verifierPack(donnees: unknown): Pack {
  const p = donnees as Pack
  if (!p || p.format !== 'qcm-revision') throw new Error("Ce fichier n'est pas un fichier de QCM de l'appli.")
  if (p.version !== 1) throw new Error(`Version de fichier inconnue (${p.version}). Mets l'appli à jour.`)
  if (!p.matiere?.id || !p.matiere?.nom) throw new Error('Le fichier ne précise pas la matière.')
  if (!Array.isArray(p.chapitres) || p.chapitres.length === 0) throw new Error('Le fichier ne contient aucun chapitre.')
  for (const c of p.chapitres) {
    if (!c.id || !c.nom || !Array.isArray(c.questions)) throw new Error('Un chapitre du fichier est incomplet.')
    for (const q of c.questions) {
      if (!q.id || !q.enonce || !Array.isArray(q.items) || q.items.length < 2)
        throw new Error(`La question « ${q.id ?? '?'} » du chapitre « ${c.nom} » est incomplète.`)
    }
  }
  return p
}

export async function importerPack(texte: string): Promise<ResultatImport> {
  let donnees: unknown
  try {
    donnees = JSON.parse(texte)
  } catch {
    throw new Error("Le fichier est illisible (ce n'est pas un fichier de QCM valide).")
  }
  // Une sauvegarde complète peut aussi être importée par le même bouton.
  if ((donnees as { format?: string })?.format === 'sauvegarde-qcm-revision') {
    await restaurerSauvegarde(donnees as Sauvegarde)
    return { matiere: 'Sauvegarde restaurée', chapitres: [] }
  }
  const pack = verifierPack(donnees)
  const matiereId = pack.matiere.id
  const resultat: ResultatImport = { matiere: pack.matiere.nom, chapitres: [] }

  await db.transaction('rw', [db.matieres, db.chapitres, db.questions, db.erreurs], async () => {
    await db.matieres.put({ id: matiereId, nom: pack.matiere.nom })
    for (const [index, c] of pack.chapitres.entries()) {
      const chapitreId = `${matiereId}/${c.id}`
      await db.chapitres.put({
        id: chapitreId,
        matiereId,
        nom: c.nom,
        ordre: c.ordre ?? index + 1,
        source: c.source,
        importeLe: Date.now(),
      })
      const nouvelles: Question[] = c.questions.map((q) => ({
        ...q,
        id: `${chapitreId}#${q.id}`,
        chapitreId,
        matiereId,
        type: q.type ?? 'multiple',
      }))
      // Réimport d'un chapitre : les questions disparues du fichier sont retirées (et de « Mes erreurs »).
      const gardees = new Set(nouvelles.map((q) => q.id))
      const anciennes = await db.questions.where('chapitreId').equals(chapitreId).primaryKeys()
      const aRetirer = anciennes.filter((id) => !gardees.has(id))
      await db.questions.bulkDelete(aRetirer)
      await db.erreurs.bulkDelete(aRetirer)
      await db.questions.bulkPut(nouvelles)
      resultat.chapitres.push({ nom: c.nom, questions: nouvelles.length })
    }
  })
  return resultat
}

export async function supprimerChapitre(chapitreId: string) {
  await db.transaction('rw', [db.matieres, db.chapitres, db.questions, db.erreurs], async () => {
    const chapitre = await db.chapitres.get(chapitreId)
    const ids = await db.questions.where('chapitreId').equals(chapitreId).primaryKeys()
    await db.questions.bulkDelete(ids)
    await db.erreurs.bulkDelete(ids)
    await db.chapitres.delete(chapitreId)
    if (chapitre && (await db.chapitres.where('matiereId').equals(chapitre.matiereId).count()) === 0)
      await db.matieres.delete(chapitre.matiereId)
  })
}

// Sauvegarde complète : tout ce qui est sur le téléphone, dans un seul fichier.
interface Sauvegarde {
  format: 'sauvegarde-qcm-revision'
  version: 1
  date: string
  tables: Record<string, unknown[]>
}

const TABLES = ['matieres', 'chapitres', 'questions', 'reponses', 'erreurs'] as const

export async function creerSauvegarde(): Promise<Blob> {
  const tables: Record<string, unknown[]> = {}
  for (const t of TABLES) tables[t] = await db.table(t).toArray()
  const s: Sauvegarde = { format: 'sauvegarde-qcm-revision', version: 1, date: new Date().toISOString(), tables }
  return new Blob([JSON.stringify(s)], { type: 'application/json' })
}

async function restaurerSauvegarde(s: Sauvegarde) {
  if (s.version !== 1 || !s.tables) throw new Error('Sauvegarde illisible.')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(s.tables[t] ?? [])
    }
  })
}
