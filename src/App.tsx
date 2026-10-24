import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import Reviser from './screens/Reviser'
import Erreurs from './screens/Erreurs'
import Cours from './screens/Cours'
import Session, { type ParametresSession } from './screens/Session'

type Onglet = 'reviser' | 'erreurs' | 'cours'

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>('reviser')
  const [session, setSession] = useState<ParametresSession | null>(null)
  const nbErreurs = useLiveQuery(() => db.erreurs.count(), [], 0)

  if (session) {
    return (
      <Session
        parametres={session}
        onQuitter={(versErreurs) => {
          setSession(null)
          if (versErreurs) setOnglet('erreurs')
        }}
      />
    )
  }

  return (
    <div className="app">
      <main className="contenu">
        {onglet === 'reviser' && <Reviser onLancer={setSession} allerAuxCours={() => setOnglet('cours')} />}
        {onglet === 'erreurs' && <Erreurs onLancer={setSession} />}
        {onglet === 'cours' && <Cours />}
      </main>
      <nav className="onglets">
        <button className={onglet === 'reviser' ? 'actif' : ''} onClick={() => setOnglet('reviser')}>
          <span className="icone">✏️</span>Réviser
        </button>
        <button className={onglet === 'erreurs' ? 'actif' : ''} onClick={() => setOnglet('erreurs')}>
          <span className="icone">
            🎯{nbErreurs > 0 && <span className="pastille">{nbErreurs}</span>}
          </span>
          Mes erreurs
        </button>
        <button className={onglet === 'cours' ? 'actif' : ''} onClick={() => setOnglet('cours')}>
          <span className="icone">📚</span>Mes cours
        </button>
      </nav>
    </div>
  )
}
