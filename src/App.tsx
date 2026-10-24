import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { Icone } from './ui'
import Accueil from './screens/Accueil'
import Reviser from './screens/Reviser'
import Erreurs from './screens/Erreurs'
import Cours from './screens/Cours'
import Session, { type ParametresSession } from './screens/Session'

type Onglet = 'accueil' | 'entrainement' | 'erreurs' | 'cours'

const ONGLETS: { id: Onglet; nom: string; icone: string }[] = [
  { id: 'accueil', nom: 'Accueil', icone: 'livre' },
  { id: 'entrainement', nom: "S'entraîner", icone: 'eclair' },
  { id: 'erreurs', nom: 'Mes erreurs', icone: 'cible' },
  { id: 'cours', nom: 'Mes cours', icone: 'livres' },
]

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>('accueil')
  const [session, setSession] = useState<ParametresSession | null>(null)
  const nbErreurs = useLiveQuery(() => db.erreurs.count(), [], 0)

  const aller = (o: Onglet) => {
    setOnglet(o)
    window.scrollTo(0, 0)
  }

  if (session) {
    return (
      <Session
        parametres={session}
        onQuitter={(versErreurs) => {
          setSession(null)
          aller(versErreurs ? 'erreurs' : 'accueil')
        }}
      />
    )
  }

  return (
    <div className="app">
      <main className="contenu" key={onglet}>
        {onglet === 'accueil' && <Accueil allerA={aller} />}
        {onglet === 'entrainement' && <Reviser onLancer={setSession} allerAuxCours={() => aller('cours')} />}
        {onglet === 'erreurs' && <Erreurs onLancer={setSession} />}
        {onglet === 'cours' && <Cours />}
      </main>
      <nav className="onglets">
        {ONGLETS.map((o) => (
          <button key={o.id} className={onglet === o.id ? 'actif' : ''} onClick={() => aller(o.id)}>
            <span className="onglet-icone">
              <Icone nom={o.icone} taille={24} epaisseur={onglet === o.id ? 2.3 : 1.9} />
              {o.id === 'erreurs' && nbErreurs > 0 && <span className="badge">{nbErreurs}</span>}
            </span>
            {o.nom}
          </button>
        ))}
      </nav>
    </div>
  )
}
