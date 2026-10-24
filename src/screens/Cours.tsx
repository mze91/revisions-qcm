import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { creerSauvegarde, importerPack, supprimerChapitre } from '../importation'

interface Message {
  type: 'bon' | 'faux'
  texte: string
}

export default function Cours() {
  const matieres = useLiveQuery(() => db.matieres.orderBy('nom').toArray(), [])
  const chapitres = useLiveQuery(() => db.chapitres.toArray(), [])
  const compte = useLiveQuery(async () => {
    const m = new Map<string, number>()
    await db.questions.each((q) => m.set(q.chapitreId, (m.get(q.chapitreId) ?? 0) + 1))
    return m
  }, [])
  const fichier = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const importer = async (fichiers: FileList | null) => {
    if (!fichiers) return
    const nouveaux: Message[] = []
    for (const f of Array.from(fichiers)) {
      try {
        const texte = await f.text()
        if (
          texte.includes('"sauvegarde-qcm-revision"') &&
          !confirm('Restaurer cette sauvegarde ? Tout ce qui est sur le téléphone sera remplacé par son contenu.')
        )
          continue
        const r = await importerPack(texte)
        const detail = r.chapitres.map((c) => `${c.nom} (${c.questions} QCM)`).join(', ')
        nouveaux.push({ type: 'bon', texte: `${r.matiere}${detail ? ' : ' + detail : ''}` })
      } catch (e) {
        nouveaux.push({ type: 'faux', texte: `${f.name} : ${(e as Error).message}` })
      }
    }
    setMessages(nouveaux)
    if (fichier.current) fichier.current.value = ''
  }

  const sauvegarder = async () => {
    const blob = await creerSauvegarde()
    const nom = `sauvegarde-qcm-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([blob], nom, { type: 'application/json' })
    // Sur téléphone : menu de partage (Enregistrer dans Fichiers, AirDrop…). Sinon : téléchargement.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: nom })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nom
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!matieres || !chapitres || !compte) return null

  return (
    <div>
      <h1>Mes cours</h1>

      <section className="carte">
        <h3>Ajouter des QCM</h3>
        <p className="aide">
          Choisis un fichier de QCM fait à partir de ton cours (il se termine par .json). Si le chapitre existe
          déjà, il est mis à jour.
        </p>
        <input ref={fichier} type="file" multiple hidden onChange={(e) => importer(e.target.files)} />
        <button className="principal" onClick={() => fichier.current?.click()}>
          Importer un fichier
        </button>
        {messages.map((m, i) => (
          <p key={i} className={`message ${m.type}`}>
            {m.type === 'bon' ? '✓ ' : '⚠️ '}
            {m.texte}
          </p>
        ))}
      </section>

      {matieres.map((m) => (
        <section key={m.id} className="carte">
          <h3>{m.nom}</h3>
          {chapitres
            .filter((c) => c.matiereId === m.id)
            .sort((a, b) => a.ordre - b.ordre)
            .map((c) => (
              <div key={c.id} className="ligne-chapitre">
                <div>
                  <div className="ligne-nom">{c.nom}</div>
                  <div className="aide">
                    {compte.get(c.id) ?? 0} QCM · importé le {new Date(c.importeLe).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button
                  className="lien danger"
                  onClick={() => {
                    if (confirm(`Supprimer « ${c.nom} » et ses QCM du téléphone ?`)) supprimerChapitre(c.id)
                  }}
                >
                  Supprimer
                </button>
              </div>
            ))}
        </section>
      ))}

      <section className="carte">
        <h3>Sauvegarde</h3>
        <p className="aide">
          Tout est enregistré sur ce téléphone. Fais une sauvegarde de temps en temps (QCM, erreurs, historique).
          Pour la restaurer, importe le fichier de sauvegarde avec le bouton « Importer un fichier ».
        </p>
        <button className="secondaire" onClick={sauvegarder}>
          Créer une sauvegarde
        </button>
      </section>
    </div>
  )
}
