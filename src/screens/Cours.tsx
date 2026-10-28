import { useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { couleurMatiere, useStats } from '../stats'
import { Anneau, Icone, Pastille } from '../ui'
import type { EtatCours } from '../App'
import Attente from './Attente'

// Toutes les fiches, rangées par matière puis par partie. Toucher une fiche lance sa révision.
export default function Cours({ onOuvrirFiche, etat }: { onOuvrirFiche: (chapitreId: string) => void; etat: EtatCours }) {
  const matieres = useLiveQuery(() => db.matieres.orderBy('nom').toArray(), [])
  const chapitres = useLiveQuery(() => db.chapitres.toArray(), [])
  const compte = useLiveQuery(async () => {
    const m = new Map<string, number>()
    await db.questions.each((q) => m.set(q.chapitreId, (m.get(q.chapitreId) ?? 0) + 1))
    return m
  }, [])
  const stats = useStats()
  const [ouverts, setOuverts] = useState<Set<string>>(new Set())

  if (!matieres || !chapitres || !compte) return null

  if (matieres.length === 0)
    return (
      <div>
        <h1 className="titre">Mes cours</h1>
        <Attente etat={etat} />
      </div>
    )

  const basculer = (cle: string) => {
    const s = new Set(ouverts)
    if (s.has(cle)) s.delete(cle)
    else s.add(cle)
    setOuverts(s)
  }

  // Maîtrise moyenne de plusieurs fiches, pondérée par leur nombre de QCM.
  const maitrise = (ids: string[]) => {
    const total = ids.reduce((s, id) => s + (compte.get(id) ?? 0), 0)
    if (!total) return 0
    return ids.reduce((s, id) => s + (stats?.maitrise.get(id) ?? 0) * (compte.get(id) ?? 0), 0) / total
  }

  return (
    <div>
      <h1 className="titre">Mes cours</h1>
      <p className="aide">Touche une fiche pour la lire, réviser ses QCM ou reprendre tes erreurs.</p>

      {matieres.map((m) => {
        const couleur = couleurMatiere(m.id)
        const chs = chapitres.filter((c) => c.matiereId === m.id).sort((a, b) => a.ordre - b.ordre)
        const groupes = [...new Set(chs.map((c) => c.groupe ?? ''))]
        const nbQcm = chs.reduce((s, c) => s + (compte.get(c.id) ?? 0), 0)
        const globale = maitrise(chs.map((c) => c.id))
        return (
          <section key={m.id} style={{ '--couleur': couleur } as CSSProperties}>
            <div className="carte matiere-entete">
              <Pastille nom={m.nom} couleur={couleur} taille={48} />
              <div className="matiere-nom">
                <h2>{m.nom}</h2>
                <small>
                  {chs.length} fiches · {nbQcm} QCM
                </small>
              </div>
              <Anneau valeur={globale} taille={50} epaisseur={5} couleur={couleur}>
                <small className="anneau-texte">{Math.round(globale * 100)}%</small>
              </Anneau>
            </div>

            {groupes.map((g) => {
              const fiches = chs.filter((c) => (c.groupe ?? '') === g)
              const cle = `${m.id}|${g}`
              const ouvert = ouverts.has(cle) || groupes.length === 1
              const part = Math.round(maitrise(fiches.map((c) => c.id)) * 100)
              return (
                <div key={cle} className="carte partie">
                  {groupes.length > 1 && (
                    <button className="partie-tete" onClick={() => basculer(cle)} aria-expanded={ouvert}>
                      <span className="partie-texte">
                        <strong>{g || 'Autres fiches'}</strong>
                        <small>
                          {fiches.length} fiches · maîtrisé à {part} %
                        </small>
                      </span>
                      <span className={`chevron ${ouvert ? 'ouvert' : ''}`}>
                        <Icone nom="fleche" taille={20} />
                      </span>
                    </button>
                  )}
                  {ouvert &&
                    fiches.map((c) => {
                      const m100 = Math.round((stats?.maitrise.get(c.id) ?? 0) * 100)
                      return (
                        <button key={c.id} className="fiche" onClick={() => onOuvrirFiche(c.id)}>
                          <span className="chapitre-texte">
                            <span className="chapitre-nom">{c.nom}</span>
                            <span className="chapitre-info">
                              {compte.get(c.id) ?? 0} QCM · maîtrisé à {m100} %
                            </span>
                            <span className="jauge">
                              <span style={{ width: `${m100}%` }} />
                            </span>
                          </span>
                          <span className="fiche-go">
                            <Icone nom="fleche" taille={18} />
                          </span>
                        </button>
                      )
                    })}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
