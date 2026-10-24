import type { Chapitre, Matiere } from '../types'

interface Props {
  matieres: Matiere[]
  chapitres: Chapitre[]
  compte: Map<string, number> // nombre de questions disponibles par chapitre
  coches: Set<string>
  onChange: (coches: Set<string>) => void
}

// Liste des matières et de leurs chapitres, avec une case à cocher par chapitre.
export default function ChoixChapitres({ matieres, chapitres, compte, coches, onChange }: Props) {
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
        return (
          <section key={m.id} className="carte">
            <div className="carte-titre">
              <h3>{m.nom}</h3>
              <button className="lien" onClick={() => basculer(ids, !tous)}>
                {tous ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>
            {chs.map((c) => (
              <label key={c.id} className="ligne-case">
                <input type="checkbox" checked={coches.has(c.id)} onChange={(e) => basculer([c.id], e.target.checked)} />
                <span className="ligne-nom">{c.nom}</span>
                <span className="ligne-compte">{compte.get(c.id)}</span>
              </label>
            ))}
          </section>
        )
      })}
    </div>
  )
}
