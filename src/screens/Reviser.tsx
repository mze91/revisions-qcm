import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { melanger } from '../correction'
import { useStats } from '../stats'
import { Icone } from '../ui'
import ChoixChapitres from './ChoixChapitres'
import type { ParametresSession } from './Session'

const CLE_SELECTION = 'reviser.chapitres'
const TAILLES = [10, 20, 40, 0] // 0 = toutes

function lireSelection(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLE_SELECTION) ?? '[]'))
  } catch {
    return new Set()
  }
}

interface Props {
  onLancer: (p: ParametresSession) => void
  allerAuxCours: () => void
}

export default function Reviser({ onLancer, allerAuxCours }: Props) {
  const matieres = useLiveQuery(() => db.matieres.orderBy('nom').toArray(), [])
  const chapitres = useLiveQuery(() => db.chapitres.toArray(), [])
  const compte = useLiveQuery(async () => {
    const m = new Map<string, number>()
    await db.questions.each((q) => m.set(q.chapitreId, (m.get(q.chapitreId) ?? 0) + 1))
    return m
  }, [])
  const stats = useStats()
  const [coches, setCoches] = useState<Set<string>>(lireSelection)
  const [taille, setTaille] = useState(20)
  const [nouvellesDabord, setNouvellesDabord] = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem(CLE_SELECTION, JSON.stringify([...coches]))
    } catch {
      /* stockage indisponible : la sélection ne sera simplement pas retenue */
    }
  }, [coches])

  if (!matieres || !chapitres || !compte) return null

  if (matieres.length === 0) {
    return (
      <div>
        <h1 className="titre">S'entraîner</h1>
        <div className="vide">
          <p>Aucun QCM pour l'instant.</p>
          <button className="bouton principal" onClick={allerAuxCours}>
            <Icone nom="importer" /> Importer mes QCM
          </button>
        </div>
      </div>
    )
  }

  const selection = [...coches].filter((id) => compte.has(id))
  const disponibles = selection.reduce((s, id) => s + (compte.get(id) ?? 0), 0)
  const nombre = taille ? Math.min(taille, disponibles) : disponibles

  const lancer = async () => {
    const questions = await db.questions.where('chapitreId').anyOf(selection).primaryKeys()
    let ordre = melanger(questions)
    if (nouvellesDabord) {
      const dejaFaites = new Set(await db.reponses.where('questionId').anyOf(questions).keys())
      ordre = [...ordre.filter((id) => !dejaFaites.has(id)), ...ordre.filter((id) => dejaFaites.has(id))]
    }
    onLancer({ questionIds: taille ? ordre.slice(0, taille) : ordre, mode: 'entrainement' })
  }

  return (
    <div className="avec-action">
      <h1 className="titre">S'entraîner</h1>
      <p className="sous-titre">
        <span className="etape">1</span> Coche les chapitres à travailler
      </p>
      <ChoixChapitres
        matieres={matieres}
        chapitres={chapitres}
        compte={compte}
        coches={coches}
        onChange={setCoches}
        maitrise={stats?.maitrise}
      />

      <p className="sous-titre">
        <span className="etape">2</span> Combien de questions&nbsp;?
      </p>
      <div className="carte">
        <div className="segments">
          {TAILLES.map((t) => (
            <button key={t} className={taille === t ? 'actif' : ''} onClick={() => setTaille(t)}>
              {t || 'Toutes'}
            </button>
          ))}
        </div>
        <label className="interrupteur">
          <span>
            Questions jamais faites en premier
          </span>
          <input type="checkbox" checked={nouvellesDabord} onChange={(e) => setNouvellesDabord(e.target.checked)} />
          <span className="glissiere" />
        </label>
      </div>

      <div className="action-flottante">
        <button className="bouton principal" disabled={disponibles === 0} onClick={lancer}>
          {disponibles === 0 ? (
            'Coche au moins un chapitre'
          ) : (
            <>
              <Icone nom="eclair" /> C'est parti · {nombre} QCM
            </>
          )}
        </button>
      </div>
    </div>
  )
}
