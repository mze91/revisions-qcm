import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { aUnCode, CodeIncorrect, synchroniser } from './contenu'
import { Icone } from './ui'
import Code from './screens/Code'
import Accueil from './screens/Accueil'
import Reviser from './screens/Reviser'
import Erreurs from './screens/Erreurs'
import Cours from './screens/Cours'
import Session, { type ParametresSession } from './screens/Session'

type Onglet = 'accueil' | 'entrainement' | 'erreurs' | 'cours'
export type EtatCours = 'chargement' | 'pret' | 'hors-ligne'

const ONGLETS: { id: Onglet; nom: string; icone: string }[] = [
  { id: 'accueil', nom: 'Accueil', icone: 'livre' },
  { id: 'entrainement', nom: "S'entraîner", icone: 'eclair' },
  { id: 'erreurs', nom: 'Mes erreurs', icone: 'cible' },
  { id: 'cours', nom: 'Mes cours', icone: 'livres' },
]

export default function App() {
  const [codeOk, setCodeOk] = useState(aUnCode)
  const [codeChange, setCodeChange] = useState(false)
  const [etat, setEtat] = useState<EtatCours>('chargement')
  const [onglet, setOnglet] = useState<Onglet>('accueil')
  const [session, setSession] = useState<ParametresSession | null>(null)
  const nbErreurs = useLiveQuery(() => db.erreurs.count(), [], 0)

  // À chaque ouverture : met à jour les cours publiés par Issa (en arrière-plan).
  useEffect(() => {
    if (!codeOk) return
    let actif = true
    setEtat('chargement')
    synchroniser()
      .then(() => actif && setEtat('pret'))
      .catch((e) => {
        if (!actif) return
        if (e instanceof CodeIncorrect) {
          setCodeChange(true)
          setCodeOk(false)
        } else setEtat('hors-ligne')
      })
    return () => {
      actif = false
    }
  }, [codeOk])

  const aller = (o: Onglet) => {
    setOnglet(o)
    window.scrollTo(0, 0)
  }

  if (!codeOk) return <Code codeChange={codeChange} onValide={() => setCodeOk(true)} />

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
        {onglet === 'accueil' && <Accueil allerA={aller} etat={etat} />}
        {onglet === 'entrainement' && <Reviser onLancer={setSession} etat={etat} />}
        {onglet === 'erreurs' && <Erreurs onLancer={setSession} />}
        {onglet === 'cours' && <Cours onLancer={setSession} etat={etat} />}
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
