import type { CSSProperties } from 'react'
import type { Chapitre, Matiere } from '../types'
import { couleurMatiere } from '../stats'
import { Icone, Pastille } from '../ui'

interface Props {
  matieres: Matiere[]
  chapitres: Chapitre[]
  compte: Map<string, number> // nombre de questions disponibles par chapitre
  coches: Set<string>
  onChange: (coches: Set<string>) => void
  maitrise?: Map<string, number> // 0 à 1, affichée en barre sous le chapitre
  unite?: string
}

// Matières (une carte colorée chacune) et leurs chapitres à cocher.
export default function ChoixChapitres({ matieres, chapitres, compte, coches, onChange, maitrise, unite = 'QCM' }: Props) {
  const basculer = (ids: string[], cocher: boolean) => {
    const suivant = new Set(coches)
    for (const id of ids) {
      if (cocher) suivant.add(id)
      else suivant.delete(id)
    }
    onChange(suivant)
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
        const couleur = couleurMatiere(m.id)
        return (
          <section key={m.id} className="carte matiere" style={{ '--couleur': couleur } as CSSProperties}>
            <div className="matiere-tete">
              <Pastille nom={m.nom} couleur={couleur} />
              <div className="matiere-nom">
                <h3>{m.nom}</h3>
                <small>
                  {chs.length} chapitre{chs.length > 1 ? 's' : ''}
                </small>
              </div>
              <button className="puce" onClick={() => basculer(ids, !tous)}>
                {tous ? 'Aucun' : 'Tous'}
              </button>
            </div>
            {chs.map((c) => {
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
            })}
          </section>
        )
      })}
    </div>
  )
}
