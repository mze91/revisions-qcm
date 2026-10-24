import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { melanger } from '../correction'
import { importerPack } from '../importation'
import exemple from '../../exemples/packs/physiologie/cycle-cardiaque.qcm.json?raw'
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
      <div className="vide">
        <h1>Bienvenue 👋</h1>
        <p>Pour commencer, importe un fichier de QCM fait à partir de ton cours.</p>
        <button className="principal" onClick={allerAuxCours}>
          Aller à « Mes cours »
        </button>
        <button className="secondaire" style={{ marginTop: 10 }} onClick={() => importerPack(exemple)}>
          Essayer avec un cours d'exemple
        </button>
      </div>
    )
  }

  const selection = [...coches].filter((id) => compte.has(id))
  const disponibles = selection.reduce((s, id) => s + (compte.get(id) ?? 0), 0)

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
    <div>
      <h1>Réviser</h1>
      <p className="aide">Coche les chapitres à travailler.</p>
      <ChoixChapitres matieres={matieres} chapitres={chapitres} compte={compte} coches={coches} onChange={setCoches} />

      <section className="carte">
        <h3>Nombre de questions</h3>
        <div className="segments">
          {TAILLES.map((t) => (
            <button key={t} className={taille === t ? 'actif' : ''} onClick={() => setTaille(t)}>
              {t || 'Toutes'}
            </button>
          ))}
        </div>
        <label className="ligne-case">
          <input type="checkbox" checked={nouvellesDabord} onChange={(e) => setNouvellesDabord(e.target.checked)} />
          <span className="ligne-nom">Questions jamais faites en premier</span>
        </label>
      </section>

      <div className="barre-action">
        <button className="principal" disabled={disponibles === 0} onClick={lancer}>
          {disponibles === 0
            ? 'Coche au moins un chapitre'
            : `Commencer (${taille ? Math.min(taille, disponibles) : disponibles} questions)`}
        </button>
      </div>
    </div>
  )
}
