import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { melanger, preparerSerie } from '../correction'
import { couleurMatiere, useStats } from '../stats'
import { useOuvrirCours } from '../lecteur'
import { Anneau, Icone } from '../ui'
import type { ParametresSession } from './Session'

// Page d'une fiche : la lire, réviser ses QCM, ou reprendre ses erreurs.
export default function Fiche({
  chapitreId,
  onLancer,
  onFermer,
}: {
  chapitreId: string
  onLancer: (p: ParametresSession) => void
  onFermer: () => void
}) {
  const ouvrirCours = useOuvrirCours()
  const stats = useStats()
  const donnees = useLiveQuery(async () => {
    const chapitre = await db.chapitres.get(chapitreId)
    const ids = await db.questions.where('chapitreId').equals(chapitreId).primaryKeys()
    const erreurs = (await db.erreurs.bulkGet(ids)).filter((e) => !!e).map((e) => e!.questionId)
    const tutorat = await db.questions.where('chapitreId').equals(chapitreId).filter((q) => q.origine === 'annale').count()
    const faites = new Set(await db.reponses.where('questionId').anyOf(ids).keys()).size
    return { chapitre, total: ids.length, erreurs, tutorat, faites }
  }, [chapitreId])

  if (!donnees?.chapitre) return null
  const { chapitre, total, erreurs, tutorat, faites } = donnees
  const couleur = couleurMatiere(chapitre.matiereId)
  const maitrise = stats?.maitrise.get(chapitre.id) ?? 0

  return (
    <div className="app">
      <header className="entete-session">
        <button className="icone-bouton" onClick={onFermer} aria-label="Retour">
          <Icone nom="croix" taille={22} epaisseur={2.4} />
        </button>
      </header>
      <main className="contenu fiche-page">
        <p className="chapitre-question" style={{ color: couleur }}>
          {chapitre.groupe}
        </p>
        <h1 className="titre">{chapitre.nom}</h1>

        <div className="carte fiche-stats">
          <Anneau valeur={maitrise} taille={72} epaisseur={8} couleur={couleur}>
            <strong>{Math.round(maitrise * 100)}%</strong>
          </Anneau>
          <div>
            <p>
              <strong>{total}</strong> QCM, dont {tutorat} du tutorat
            </p>
            <p>
              <strong>{faites}</strong> déjà faits · <strong className="rouge-texte">{erreurs.length}</strong> à retravailler
            </p>
          </div>
        </div>

        <div className="menu">
          {chapitre.cours && (
            <button className="tuile" onClick={() => ouvrirCours({ chapitreId: chapitre.id })}>
              <span className="tuile-icone" style={{ background: 'var(--bleu)' }}>
                <Icone nom="livre" taille={24} />
              </span>
              <span className="tuile-texte">
                <strong>Lire la fiche</strong>
                <small>{chapitre.pages} pages, avec schémas et tableaux</small>
              </span>
              <Icone nom="fleche" />
            </button>
          )}
          <button
            className="tuile tuile-grande"
            onClick={async () => onLancer({ questionIds: await preparerSerie([chapitre.id]), mode: 'entrainement' })}
          >
            <span className="tuile-icone" style={{ background: 'var(--accent)' }}>
              <Icone nom="eclair" taille={26} />
            </span>
            <span className="tuile-texte">
              <strong>Réviser les QCM</strong>
              <small>Les {total} QCM, ceux jamais faits d'abord</small>
            </span>
            <Icone nom="fleche" />
          </button>
          <button
            className="tuile"
            disabled={erreurs.length === 0}
            onClick={() => onLancer({ questionIds: melanger(erreurs), mode: 'erreurs' })}
          >
            <span className="tuile-icone" style={{ background: 'var(--faux)' }}>
              <Icone nom="cible" taille={24} />
            </span>
            <span className="tuile-texte">
              <strong>Mes erreurs sur cette fiche</strong>
              <small>{erreurs.length ? `${erreurs.length} QCM à retravailler` : 'Aucune erreur en attente'}</small>
            </span>
            {erreurs.length > 0 && <span className="tuile-badge">{erreurs.length}</span>}
          </button>
        </div>
      </main>
    </div>
  )
}
