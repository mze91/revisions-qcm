import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useStats } from '../stats'
import { Anneau, Icone } from '../ui'
import type { EtatCours } from '../App'
import Attente from './Attente'

const OBJECTIF_JOUR = 20 // QCM par jour pour remplir l'anneau

function salutation() {
  const h = new Date().getHours()
  if (h < 5 || h >= 18) return 'Bonsoir'
  return 'Bonjour'
}

interface Props {
  allerA: (onglet: 'entrainement' | 'erreurs' | 'cours') => void
  etat: EtatCours
  onExamen: () => void
  onRevisionDuJour: (ids: string[]) => void
}

export default function Accueil({ allerA, etat, onExamen, onRevisionDuJour }: Props) {
  const stats = useStats()
  const compte = useLiveQuery(
    async () => ({
      questions: await db.questions.count(),
      chapitres: await db.chapitres.count(),
      erreurs: await db.erreurs.count(),
    }),
    [],
  )
  if (!stats || !compte) return null

  if (compte.questions === 0) return <Attente etat={etat} />

  return (
    <div>
      <header className="hero">
        <p className="hero-sur">{salutation()} 👋</p>
        <h1>Prête à réviser&nbsp;?</h1>
        <div className="hero-stats">
          <div className="hero-stat">
            <Anneau valeur={stats.aujourdhui / OBJECTIF_JOUR} taille={58} epaisseur={7} couleur="#fff">
              <strong>{stats.aujourdhui}</strong>
            </Anneau>
            <span>
              QCM aujourd'hui
              <small>objectif {OBJECTIF_JOUR}</small>
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-icone">
              <Icone nom="flamme" taille={26} />
            </span>
            <span>
              <strong>{stats.serie}</strong> jour{stats.serie > 1 ? 's' : ''}
              <small>de suite</small>
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-icone">
              <Icone nom="trophee" taille={26} />
            </span>
            <span>
              <strong>{stats.reussite ?? '–'}</strong>
              {stats.reussite !== null && ' %'}
              <small>de réussite</small>
            </span>
          </div>
        </div>
      </header>

      <nav className="menu">
        {stats.duJour.length > 0 && (
          <button className="tuile tuile-du-jour" onClick={() => onRevisionDuJour(stats.duJour)}>
            <span className="tuile-icone" style={{ background: 'var(--orange)' }}>
              <Icone nom="flamme" taille={26} />
            </span>
            <span className="tuile-texte">
              <strong>Révision du jour</strong>
              <small>
                {stats.duJour.length} QCM à revoir maintenant, pour bien les retenir
              </small>
            </span>
            <span className="tuile-badge orange">{stats.duJour.length}</span>
          </button>
        )}

        <button className="tuile tuile-grande" onClick={() => allerA('entrainement')}>
          <span className="tuile-icone" style={{ background: 'var(--accent)' }}>
            <Icone nom="eclair" taille={26} />
          </span>
          <span className="tuile-texte">
            <strong>S'entraîner</strong>
            <small>Choisis tes fiches, correction immédiate</small>
          </span>
          <Icone nom="fleche" />
        </button>

        <button className="tuile" onClick={() => allerA('erreurs')}>
          <span className="tuile-icone" style={{ background: 'var(--faux)' }}>
            <Icone nom="cible" taille={24} />
          </span>
          <span className="tuile-texte">
            <strong>Mes erreurs</strong>
            <small>{compte.erreurs ? `${compte.erreurs} QCM à retravailler` : 'Aucune erreur en attente'}</small>
          </span>
          {compte.erreurs > 0 && <span className="tuile-badge">{compte.erreurs}</span>}
        </button>

        <button className="tuile" onClick={() => allerA('cours')}>
          <span className="tuile-icone" style={{ background: 'var(--bleu)' }}>
            <Icone nom="livres" taille={24} />
          </span>
          <span className="tuile-texte">
            <strong>Mes cours</strong>
            <small>
              {compte.chapitres} fiche{compte.chapitres > 1 ? 's' : ''} · {compte.questions} QCM
            </small>
          </span>
          <Icone nom="fleche" />
        </button>

        <button className="tuile" onClick={onExamen}>
          <span className="tuile-icone" style={{ background: 'var(--texte)' }}>
            <Icone nom="trophee" taille={24} />
          </span>
          <span className="tuile-texte">
            <strong>Examen blanc</strong>
            <small>Chronométré, correction à la fin, comme le jour J</small>
          </span>
          <Icone nom="fleche" />
        </button>
      </nav>
    </div>
  )
}
