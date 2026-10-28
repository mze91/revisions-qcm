import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { aUnCode, CodeIncorrect, synchroniser } from './contenu'
import { FournisseurLecteur } from './lecteur'
import type { ExamenEnCours } from './examen'
import { Icone } from './ui'
import Code from './screens/Code'
import Accueil from './screens/Accueil'
import Reviser from './screens/Reviser'
import Erreurs from './screens/Erreurs'
import Cours from './screens/Cours'
import Fiche from './screens/Fiche'
import Session, { type ParametresSession } from './screens/Session'
import { ExamenAccueil, ExamenCopie, ExamenResultat } from './screens/Examen'

type Onglet = 'accueil' | 'entrainement' | 'erreurs' | 'cours'
export type EtatCours = 'chargement' | 'pret' | 'hors-ligne'

// Écrans plein écran, ouverts par-dessus les onglets.
type Ecran =
  | { type: 'session'; parametres: ParametresSession }
  | { type: 'fiche'; chapitreId: string }
  | { type: 'examen' }
  | { type: 'copie'; examen: ExamenEnCours }
  | { type: 'resultat'; id: number }

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
  // Pile d'écrans : fermer l'écran du dessus ramène au précédent (ex. fiche → révision → fiche).
  const [pile, setPile] = useState<Ecran[]>([])
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

  if (!codeOk) return <Code codeChange={codeChange} onValide={() => setCodeOk(true)} />

  const ouvrir = (e: Ecran) => {
    setPile([...pile, e])
    window.scrollTo(0, 0)
  }
  // Remplace l'écran du dessus (ex. copie d'examen → résultat).
  const remplacer = (e: Ecran) => setPile([...pile.slice(0, -1), e])
  const fermer = () => setPile(pile.slice(0, -1))
  const aller = (o: Onglet) => {
    setPile([])
    setOnglet(o)
    window.scrollTo(0, 0)
  }
  const lancer = (parametres: ParametresSession) => ouvrir({ type: 'session', parametres })

  const dessus = pile.at(-1)
  let ecran
  if (dessus?.type === 'session')
    ecran = <Session key={pile.length} parametres={dessus.parametres} onQuitter={(versErreurs) => (versErreurs ? aller('erreurs') : fermer())} />
  else if (dessus?.type === 'fiche') ecran = <Fiche chapitreId={dessus.chapitreId} onLancer={lancer} onFermer={fermer} />
  else if (dessus?.type === 'examen')
    ecran = (
      <ExamenAccueil
        onCommencer={(examen) => ouvrir({ type: 'copie', examen })}
        onResultat={(id) => ouvrir({ type: 'resultat', id })}
        onFermer={fermer}
      />
    )
  else if (dessus?.type === 'copie')
    ecran = <ExamenCopie examen={dessus.examen} onFini={(id) => remplacer({ type: 'resultat', id })} onQuitter={fermer} />
  else if (dessus?.type === 'resultat') ecran = <ExamenResultat id={dessus.id} onFermer={fermer} onLancer={lancer} />
  else
    ecran = (
      <div className="app">
        <main className="contenu" key={onglet}>
          {onglet === 'accueil' && (
            <Accueil
              allerA={aller}
              etat={etat}
              onExamen={() => ouvrir({ type: 'examen' })}
              onRevisionDuJour={(ids) => lancer({ questionIds: ids, mode: 'entrainement' })}
            />
          )}
          {onglet === 'entrainement' && <Reviser onLancer={lancer} etat={etat} />}
          {onglet === 'erreurs' && <Erreurs onLancer={lancer} />}
          {onglet === 'cours' && <Cours onOuvrirFiche={(chapitreId) => ouvrir({ type: 'fiche', chapitreId })} etat={etat} />}
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

  return <FournisseurLecteur>{ecran}</FournisseurLecteur>
}
