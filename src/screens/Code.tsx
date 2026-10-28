import { useState, type FormEvent } from 'react'
import { CodeIncorrect, HorsLigne, validerCode } from '../contenu'
import { Icone } from '../ui'

// Premier lancement : le code d'accès donné par Issa débloque les cours.
export default function Code({ onValide, codeChange }: { onValide: () => void; codeChange?: boolean }) {
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(
    codeChange ? 'Le code a changé. Demande le nouveau code à Issa.' : null,
  )
  const [enCours, setEnCours] = useState(false)

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setEnCours(true)
    setErreur(null)
    try {
      await validerCode(code)
      onValide()
    } catch (err) {
      setErreur(
        err instanceof CodeIncorrect
          ? 'Ce code ne marche pas. Vérifie-le (les tirets comptent) ou redemande-le à Issa.'
          : err instanceof HorsLigne
            ? "Pas de connexion Internet. Connecte-toi, puis réessaie."
            : 'Une erreur est survenue. Réessaie.',
      )
      navigator.vibrate?.(60)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="app">
      <form className="ecran-code" onSubmit={valider}>
        <div className="bienvenue-logo">
          <Icone nom="livre" taille={44} />
        </div>
        <h1>Bienvenue&nbsp;!</h1>
        <p>Pour ouvrir tes cours, entre le code d'accès que t'a donné Issa. Tu ne le taperas qu'une seule fois.</p>
        <input
          className={`champ ${erreur ? 'champ-erreur' : ''}`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ex. : soleil-panda-olive-42"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Code d'accès"
        />
        {erreur && <p className="message faux">{erreur}</p>}
        <button className="bouton principal" disabled={enCours || !code.trim()}>
          {enCours ? 'Vérification…' : 'Ouvrir mes cours'}
        </button>
      </form>
    </div>
  )
}
