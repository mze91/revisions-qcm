import { db } from './db'
import type { Pack, Question } from './types'

// Enregistre une matière publiée (voir src/contenu.ts). Le contenu publié fait foi :
// les fiches et QCM qui n'y sont plus sont retirés, ceux qui restent gardent leur historique
// et leur place dans « Mes erreurs » (même identifiant).
export async function enregistrerPack(pack: Pack) {
  if (pack?.format !== 'qcm-revision' || pack.version !== 1 || !pack.matiere?.id || !Array.isArray(pack.chapitres))
    throw new Error('Contenu illisible.')
  const matiereId = pack.matiere.id

  await db.transaction('rw', [db.matieres, db.chapitres, db.questions, db.erreurs, db.reponses], async () => {
    await db.matieres.put({ id: matiereId, nom: pack.matiere.nom })
    const chapitresGardes = new Set<string>()
    for (const [index, c] of pack.chapitres.entries()) {
      const chapitreId = `${matiereId}/${c.id}`
      chapitresGardes.add(chapitreId)
      await db.chapitres.put({
        id: chapitreId,
        matiereId,
        nom: c.nom,
        groupe: c.groupe,
        ordre: c.ordre ?? index + 1,
        source: c.source,
        pages: c.pages,
        cours: c.cours,
        importeLe: Date.now(),
      })
      const nouvelles: Question[] = c.questions.map((q) => ({
        ...q,
        id: `${chapitreId}#${q.id}`,
        chapitreId,
        matiereId,
        type: q.type ?? 'multiple',
      }))
      const gardees = new Set(nouvelles.map((q) => q.id))
      const anciennes = await db.questions.where('chapitreId').equals(chapitreId).primaryKeys()
      const aRetirer = anciennes.filter((id) => !gardees.has(id))
      await db.questions.bulkDelete(aRetirer)
      await db.erreurs.bulkDelete(aRetirer)
      await db.reponses.where('questionId').anyOf(aRetirer).delete()
      await db.questions.bulkPut(nouvelles)
    }
    // Fiches retirées de la matière.
    for (const ch of await db.chapitres.where('matiereId').equals(matiereId).toArray()) {
      if (chapitresGardes.has(ch.id)) continue
      const ids = await db.questions.where('chapitreId').equals(ch.id).primaryKeys()
      await db.questions.bulkDelete(ids)
      await db.erreurs.bulkDelete(ids)
      await db.reponses.where('questionId').anyOf(ids).delete()
      await db.chapitres.delete(ch.id)
    }
  })
}
