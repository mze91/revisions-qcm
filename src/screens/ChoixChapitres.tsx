import { useState, type CSSProperties } from 'react'
import type { Chapitre, Matiere } from '../types'
import { couleurMatiere } from '../stats'
import { Icone, Pastille } from '../ui'

interface Props {
  matieres: Matiere[]
  chapitres: Chapitre[]
  compte: Map<string, number> // nombre de questions disponibles par fiche
  coches: Set<string>
  onChange: (coches: Set<string>) => void
  maitrise?: Map<string, number> // 0 à 1, affichée en barre sous la fiche
  unite?: string
}

// Matières (une carte colorée chacune), leurs parties repliables, et les fiches à cocher.
export default function ChoixChapitres({ matieres, chapitres, compte, coches, onChange, maitrise, unite = 'QCM' }: Props) {
  const [ouverts, setOuverts] = useState<Set<string>>(new Set())

  const basculer = (ids: string[], cocher: boolean) => {
    const suivant = new Set(coches)
    for (const id of ids) {
      if (cocher) suivant.add(id)
      else suivant.delete(id)
    }
    onChange(suivant)
  }

  const deplier = (cle: string) => {
    const s = new Set(ouverts)
    if (s.has(cle)) s.delete(cle)
    else s.add(cle)
    setOuverts(s)
  }

  const ligne = (c: Chapitre) => {
    const coche = coches.has(c.id)
    const m100 = Math.round((maitrise?.get(c.id) ?? 0) * 100)
    return (
      <button key={c.id} className={`chapitre ${coche ? 'coche' : ''}`} onClick={() => basculer([c.id], !coche)}>
        <span className="case">{coche && <Icone nom="coche" taille={16} epaisseur={3} />}</span>
        <span className="chapitre-texte">
          <span className="chapitre-nom">{c.nom}</span>
          <span className="chapitre-info">
            {compte.get(c.id)} {unite}
            {maitrise && ` · maîtrisé à ${m100} %`}
          </span>
          {maitrise && (
            <span className="jauge">
              <span style={{ width: `${m100}%` }} />
            </span>
          )}
        </span>
      </button>
    )
  }

  return (
    <div className="choix">
      {matieres.map((m) => {
        const chs = chapitres
          .filter((c) => c.matiereId === m.id && (compte.get(c.id) ?? 0) > 0)
          .sort((a, b) => a.ordre - b.ordre)
        if (chs.length === 0) return null
        const ids = chs.map((c) => c.id)
        const tous = ids.every((id) => coches.has(id))
        const nbCoches = ids.filter((id) => coches.has(id)).length
        const couleur = couleurMatiere(m.id)
        const groupes = [...new Set(chs.map((c) => c.groupe ?? ''))]
        return (
          <section key={m.id} className="carte matiere" style={{ '--couleur': couleur } as CSSProperties}>
            <div className="matiere-tete">
              <Pastille nom={m.nom} couleur={couleur} />
              <div className="matiere-nom">
                <h3>{m.nom}</h3>
                <small>
                  {nbCoches ? `${nbCoches} / ${chs.length} fiches cochées` : `${chs.length} fiche${chs.length > 1 ? 's' : ''}`}
                </small>
              </div>
              <button className="puce" onClick={() => basculer(ids, !tous)}>
                {tous ? 'Aucune' : 'Toutes'}
              </button>
            </div>
            {groupes.length === 1
              ? chs.map(ligne)
              : groupes.map((g) => {
                  const fiches = chs.filter((c) => (c.groupe ?? '') === g)
                  const gIds = fiches.map((c) => c.id)
                  const gCoches = gIds.filter((id) => coches.has(id)).length
                  const cle = `${m.id}|${g}`
                  const ouvert = ouverts.has(cle)
                  return (
                    <div key={cle} className="sous-partie">
                      <div className="sous-partie-tete">
                        <button className="sous-partie-titre" onClick={() => deplier(cle)} aria-expanded={ouvert}>
                          <span className={`chevron ${ouvert ? 'ouvert' : ''}`}>
                            <Icone nom="fleche" taille={18} />
                          </span>
                          <span>
                            <strong>{g || 'Autres fiches'}</strong>
                            <small>
                              {gCoches ? `${gCoches} / ${fiches.length} cochées` : `${fiches.length} fiches`}
                            </small>
                          </span>
                        </button>
                        <button className="puce petite" onClick={() => basculer(gIds, gCoches < gIds.length)}>
                          {gCoches === gIds.length ? 'Aucune' : 'Toutes'}
                        </button>
                      </div>
                      {ouvert && fiches.map(ligne)}
                    </div>
                  )
                })}
          </section>
        )
      })}
    </div>
  )
}
