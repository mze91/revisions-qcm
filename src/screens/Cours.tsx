import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { creerSauvegarde, importerPack, supprimerChapitre } from '../importation'
import { couleurMatiere } from '../stats'
import { Icone, Pastille } from '../ui'

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
      <h1 className="titre">Mes cours</h1>

      <section className="carte import">
        <span className="import-icone">
          <Icone nom="importer" taille={28} />
        </span>
        <h3>Ajouter des QCM</h3>
        <p className="aide">Choisis le fichier de QCM reçu (il se termine par .json). Un chapitre déjà présent est mis à jour.</p>
        <input ref={fichier} type="file" multiple hidden onChange={(e) => importer(e.target.files)} />
        <button className="bouton principal" onClick={() => fichier.current?.click()}>
          <Icone nom="plus" /> Importer un fichier
        </button>
        {messages.map((m, i) => (
          <p key={i} className={`message ${m.type}`}>
            <Icone nom={m.type === 'bon' ? 'coche' : 'croix'} taille={16} epaisseur={3} />
            {m.texte}
          </p>
        ))}
      </section>

      {matieres.map((m) => {
        const couleur = couleurMatiere(m.id)
        const chs = chapitres.filter((c) => c.matiereId === m.id).sort((a, b) => a.ordre - b.ordre)
        return (
          <section key={m.id} className="carte matiere">
            <div className="matiere-tete">
              <Pastille nom={m.nom} couleur={couleur} />
              <div className="matiere-nom">
                <h3>{m.nom}</h3>
                <small>
                  {chs.length} chapitre{chs.length > 1 ? 's' : ''}
                </small>
              </div>
            </div>
            {chs.map((c) => (
              <div key={c.id} className="chapitre fixe">
                <span className="chapitre-texte">
                  <span className="chapitre-nom">{c.nom}</span>
                  <span className="chapitre-info">
                    {compte.get(c.id) ?? 0} QCM · importé le {new Date(c.importeLe).toLocaleDateString('fr-FR')}
                  </span>
                </span>
                <button
                  className="icone-bouton danger"
                  aria-label={`Supprimer ${c.nom}`}
                  onClick={() => {
                    if (confirm(`Supprimer « ${c.nom} » et ses QCM du téléphone ?`)) supprimerChapitre(c.id)
                  }}
                >
                  <Icone nom="poubelle" taille={20} />
                </button>
              </div>
            ))}
          </section>
        )
      })}

      <section className="carte">
        <h3>Sauvegarde</h3>
        <p className="aide">
          Tout est enregistré sur ce téléphone. Fais une sauvegarde de temps en temps (QCM, erreurs, historique).
          Pour la restaurer, importe le fichier de sauvegarde avec « Importer un fichier ».
        </p>
        <button className="bouton secondaire" onClick={sauvegarder}>
          <Icone nom="sauver" /> Créer une sauvegarde
        </button>
      </section>
    </div>
  )
}
