import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { melanger } from '../correction'
import { Icone } from '../ui'
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
        <h1 className="titre">Mes erreurs</h1>
        <div className="vide">
          <div className="vide-icone bon">
            <Icone nom="coche" taille={40} epaisseur={2.6} />
          </div>
          <h2>Tout est à jour&nbsp;!</h2>
          <p>Chaque QCM raté arrive ici automatiquement. Il n'en sort que quand tu le réussis depuis cet onglet.</p>
        </div>
      </div>
    )
  }

  const selection = coches ?? new Set(compte.keys())
  const choisies = questions.filter((q) => selection.has(q.chapitreId))

  return (
    <div className="avec-action">
      <h1 className="titre">Mes erreurs</h1>
      <div className="carte resume-erreurs">
        <span className="resume-chiffre">{questions.length}</span>
        <span>
          <strong>QCM à retravailler</strong>
          <small>Un QCM sort de cette liste quand tu le réussis ici.</small>
        </span>
      </div>

      <ChoixChapitres
        matieres={matieres}
        chapitres={chapitres}
        compte={compte}
        coches={selection}
        onChange={setCoches}
        unite="à revoir"
      />

      <button className="lien" onClick={() => setVoirListe(!voirListe)}>
        {voirListe ? 'Masquer la liste' : 'Voir la liste des QCM'}
      </button>
      {voirListe && (
        <div className="liste">
          {choisies.map((q) => (
            <div key={q.id} className="ligne faux">
              <span className="ligne-icone">
                <Icone nom="croix" taille={14} epaisseur={3} />
              </span>
              <span className="ligne-texte">{q.enonce}</span>
              {(echecs.get(q.id) ?? 1) > 1 && <span className="ligne-fois">×{echecs.get(q.id)}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="action-flottante">
        <button
          className="bouton rouge"
          disabled={choisies.length === 0}
          onClick={() => onLancer({ questionIds: melanger(choisies.map((q) => q.id)), mode: 'erreurs' })}
        >
          {choisies.length === 0 ? (
            'Coche au moins un chapitre'
          ) : (
            <>
              <Icone nom="cible" /> Retravailler {choisies.length} QCM
            </>
          )}
        </button>
      </div>
    </div>
  )
}
