import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { melanger } from '../correction'
import ChoixChapitres from './ChoixChapitres'
import type { ParametresSession } from './Session'
import type { Question } from '../types'

export default function Erreurs({ onLancer }: { onLancer: (p: ParametresSession) => void }) {
  const donnees = useLiveQuery(async () => {
    const erreurs = await db.erreurs.orderBy('ajouteLe').reverse().toArray()
    const questions = (await db.questions.bulkGet(erreurs.map((e) => e.questionId))).filter(
      (q): q is Question => !!q,
    )
    const compte = new Map<string, number>()
    for (const q of questions) compte.set(q.chapitreId, (compte.get(q.chapitreId) ?? 0) + 1)
    const echecs = new Map(erreurs.map((e) => [e.questionId, e.nbEchecs]))
    return {
      questions,
      compte,
      echecs,
      matieres: await db.matieres.orderBy('nom').toArray(),
      chapitres: await db.chapitres.toArray(),
    }
  }, [])
  // null = tous les chapitres cochés (y compris ceux qui reçoivent de nouvelles erreurs)
  const [coches, setCoches] = useState<Set<string> | null>(null)
  const [voirListe, setVoirListe] = useState(false)

  if (!donnees) return null
  const { questions, compte, echecs, matieres, chapitres } = donnees

  if (questions.length === 0) {
    return (
      <div>
        <h1>Mes erreurs</h1>
        <div className="vide">
          <p>🎉 Aucune erreur en attente.</p>
          <p className="aide">
            Chaque QCM raté arrive ici automatiquement. Il n'en sort que quand tu le réussis depuis cet onglet.
          </p>
        </div>
      </div>
    )
  }

  const selection = coches ?? new Set(compte.keys())
  const choisies = questions.filter((q) => selection.has(q.chapitreId))

  return (
    <div>
      <h1>Mes erreurs</h1>
      <p className="aide">
        {questions.length} QCM à retravailler. Un QCM sort de cette liste quand tu le réussis ici.
      </p>
      <ChoixChapitres
        matieres={matieres}
        chapitres={chapitres}
        compte={compte}
        coches={selection}
        onChange={setCoches}
      />

      <button className="lien" onClick={() => setVoirListe(!voirListe)}>
        {voirListe ? 'Masquer la liste' : 'Voir la liste des QCM'}
      </button>
      {voirListe && (
        <div className="liste-bilan">
          {choisies.map((q) => (
            <div key={q.id} className="ligne-bilan faux">
              <span>✗{(echecs.get(q.id) ?? 1) > 1 ? `×${echecs.get(q.id)}` : ''}</span>
              <span className="ligne-nom">{q.enonce}</span>
            </div>
          ))}
        </div>
      )}

      <div className="barre-action">
        <button
          className="principal"
          disabled={choisies.length === 0}
          onClick={() => onLancer({ questionIds: melanger(choisies.map((q) => q.id)), mode: 'erreurs' })}
        >
          {choisies.length === 0 ? 'Coche au moins un chapitre' : `Retravailler ces ${choisies.length} QCM`}
        </button>
      </div>
    </div>
  )
}
