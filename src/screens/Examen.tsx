import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { compterDiscordances, melanger, points } from '../correction'
import { couleurMatiere } from '../stats'
import {
  demarrer,
  dureeSecondes,
  examenEnCours,
  garderEnCours,
  garderReglages,
  lireReglages,
  noteSur20,
  questionsDisponibles,
  terminer,
  type ExamenEnCours,
  type Reglages,
} from '../examen'
import { Anneau, Icone, Pastille } from '../ui'
import type { Chapitre, Question } from '../types'
import QuestionVue from './Question'
import type { ParametresSession } from './Session'

const NOMBRES = [20, 30, 45, 60]
const MINUTES: (number | null)[] = [null, 30, 45, 60, 90, 120]

const minutesTexte = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

// ——— Préparation : réglages de l'examen et historique ———
export function ExamenAccueil({
  onCommencer,
  onResultat,
  onFermer,
}: {
  onCommencer: (e: ExamenEnCours) => void
  onResultat: (id: number) => void
  onFermer: () => void
}) {
  const matieres = useLiveQuery(() => db.matieres.orderBy('nom').toArray(), [])
  const [matiereId, setMatiereId] = useState<string | null>(null)
  const [reglages, setReglages] = useState<Reglages | null>(null)
  const [disponibles, setDisponibles] = useState(0)
  const enCours = examenEnCours()
  const chapitres = useLiveQuery(() => (matiereId ? db.chapitres.where('matiereId').equals(matiereId).toArray() : []), [matiereId])
  const historique = useLiveQuery(() => db.examens.orderBy('debut').reverse().limit(20).toArray(), [])

  useEffect(() => {
    if (!matiereId && matieres?.length) setMatiereId(matieres[0].id)
  }, [matieres, matiereId])
  useEffect(() => {
    if (matiereId) setReglages(lireReglages(matiereId))
  }, [matiereId])
  useEffect(() => {
    if (matiereId && reglages) questionsDisponibles(matiereId, reglages).then((q) => setDisponibles(q.length))
  }, [matiereId, reglages])

  if (!matieres || !reglages || !matiereId) return null

  const changer = (r: Partial<Reglages>) => {
    const n = { ...reglages, ...r }
    setReglages(n)
    garderReglages(matiereId, n)
  }
  const groupes = [...new Set((chapitres ?? []).sort((a, b) => a.ordre - b.ordre).map((c) => c.groupe ?? ''))]
  const choisis = reglages.groupes ?? groupes
  const nombre = Math.min(reglages.nombre, disponibles)
  const basculerGroupe = (g: string) => {
    const s = choisis.includes(g) ? choisis.filter((x) => x !== g) : [...choisis, g]
    changer({ groupes: s.length === groupes.length ? null : s })
  }

  return (
    <div className="app">
      <header className="entete-session">
        <button className="icone-bouton" onClick={onFermer} aria-label="Retour">
          <Icone nom="croix" taille={22} epaisseur={2.4} />
        </button>
      </header>
      <main className="contenu avec-action">
        <h1 className="titre">Examen blanc</h1>
        <p className="aide">Chronométré, sans correction avant la fin, comme le jour J.</p>

        {enCours && (
          <button className="tuile tuile-grande" onClick={() => onCommencer(enCours)}>
            <span className="tuile-icone" style={{ background: 'var(--orange)' }}>
              <Icone nom="trophee" taille={24} />
            </span>
            <span className="tuile-texte">
              <strong>Reprendre l'examen en cours</strong>
              <small>Le chrono continue de tourner</small>
            </span>
            <Icone nom="fleche" />
          </button>
        )}

        {matieres.length > 1 && (
          <div className="segments marge">
            {matieres.map((m) => (
              <button key={m.id} className={m.id === matiereId ? 'actif' : ''} onClick={() => setMatiereId(m.id)}>
                {m.nom}
              </button>
            ))}
          </div>
        )}

        {groupes.length > 1 && (
          <section className="carte">
            <h3>Parties au programme</h3>
            {groupes.map((g) => (
              <button key={g} className={`chapitre ${choisis.includes(g) ? 'coche' : ''}`} onClick={() => basculerGroupe(g)}>
                <span className="case">{choisis.includes(g) && <Icone nom="coche" taille={16} epaisseur={3} />}</span>
                <span className="chapitre-nom">{g || 'Autres fiches'}</span>
              </button>
            ))}
          </section>
        )}

        <section className="carte">
          <h3>Questions</h3>
          <div className="segments">
            {NOMBRES.map((n) => (
              <button key={n} className={reglages.nombre === n ? 'actif' : ''} onClick={() => changer({ nombre: n })}>
                {n}
              </button>
            ))}
          </div>
          <div className="segments marge">
            <button className={reglages.source === 'tout' ? 'actif' : ''} onClick={() => changer({ source: 'tout' })}>
              Tous
            </button>
            <button className={reglages.source === 'tutorat' ? 'actif' : ''} onClick={() => changer({ source: 'tutorat' })}>
              Tutorat
            </button>
            <button className={reglages.source === 'annales' ? 'actif' : ''} onClick={() => changer({ source: 'annales' })}>
              Annales
            </button>
          </div>
          <p className="aide">
            {disponibles} QCM disponibles{nombre < reglages.nombre ? ` : l'examen en aura ${nombre}` : ''}.
          </p>
        </section>

        <section className="carte">
          <h3>Durée</h3>
          <div className="segments petits">
            {MINUTES.map((m) => (
              <button key={m ?? 'auto'} className={reglages.minutes === m ? 'actif' : ''} onClick={() => changer({ minutes: m })}>
                {m === null ? 'Auto' : m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? m % 60 : ''}` : `${m}′`}
              </button>
            ))}
          </div>
          <p className="aide">{minutesTexte(dureeSecondes(reglages, nombre))} pour {nombre} QCM.</p>
          <h3>Barème</h3>
          <div className="segments">
            <button className={reglages.bareme === 'discordances' ? 'actif' : ''} onClick={() => changer({ bareme: 'discordances' })}>
              Discordances
            </button>
            <button className={reglages.bareme === 'tout-ou-rien' ? 'actif' : ''} onClick={() => changer({ bareme: 'tout-ou-rien' })}>
              Tout ou rien
            </button>
          </div>
          <p className="aide">
            {reglages.bareme === 'discordances'
              ? 'Par QCM : 1 point sans erreur, 0,5 avec 1 discordance, 0,2 avec 2, 0 au-delà.'
              : 'Par QCM : 1 point seulement si tout est juste.'}{' '}
            Règle-le comme à ton examen.
          </p>
        </section>

        {!!historique?.length && (
          <section>
            <h3 className="sous-titre">Mes examens blancs</h3>
            <div className="liste">
              {historique.map((ex) => {
                const note = noteSur20(ex)
                return (
                  <button key={ex.id} className="ligne ligne-examen" onClick={() => onResultat(ex.id!)}>
                    <span className={`note ${note >= 10 ? 'bon' : 'faux'}`}>{note.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span>
                    <span className="ligne-texte">
                      {matieres.find((m) => m.id === ex.matiereId)?.nom} · {ex.questions.length} QCM
                      <small>{new Date(ex.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</small>
                    </span>
                    <Icone nom="fleche" taille={18} />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <div className="action-flottante sans-onglets">
          <button
            className="bouton principal"
            disabled={nombre === 0 || choisis.length === 0}
            onClick={async () => {
              if (enCours && !confirm('Un examen est déjà en cours. Le remplacer par un nouveau ?')) return
              onCommencer(await demarrer(matiereId, reglages))
            }}
          >
            <Icone nom="trophee" /> Commencer · {nombre} QCM · {minutesTexte(dureeSecondes(reglages, nombre))}
          </button>
        </div>
      </main>
    </div>
  )
}

// ——— La copie : chrono, navigation, aucune correction ———
export function ExamenCopie({ examen, onFini, onQuitter }: { examen: ExamenEnCours; onFini: (id: number) => void; onQuitter: () => void }) {
  const [e, setE] = useState(examen)
  const [questions, setQuestions] = useState<Map<string, Question>>(new Map())
  const [chapitres, setChapitres] = useState<Map<string, Chapitre>>(new Map())
  const [index, setIndex] = useState(0)
  const [grille, setGrille] = useState(false)
  const [maintenant, setMaintenant] = useState(Date.now())
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    ;(async () => {
      const qs = (await db.questions.bulkGet(e.ids)).filter((q): q is Question => !!q)
      setQuestions(new Map(qs.map((q) => [q.id, q])))
      const chs = await db.chapitres.bulkGet([...new Set(qs.map((q) => q.chapitreId))])
      setChapitres(new Map(chs.filter((c): c is Chapitre => !!c).map((c) => [c.id, c])))
    })()
  }, [e.ids])

  const restant = Math.max(0, Math.round((e.debut + e.dureeMax * 1000 - maintenant) / 1000))

  const rendre = async (sansDemander = false) => {
    if (envoi) return
    if (!sansDemander) {
      const vides = e.ids.filter((id) => !(e.reponses[id]?.length)).length
      const msg = vides ? `Il reste ${vides} QCM sans réponse. Rendre ta copie quand même ?` : 'Rendre ta copie ?'
      if (!confirm(msg)) return
    }
    setEnvoi(true)
    onFini(await terminer(e))
  }

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (restant === 0 && questions.size) rendre(true)
  }, [restant, questions.size])

  const majE = (n: ExamenEnCours) => {
    setE(n)
    garderEnCours(n)
  }

  const id = e.ids[index]
  const question = questions.get(id)
  if (!question) return null
  const choix = e.reponses[id] ?? []
  const cocher = (lettre: string) => {
    const nouveau =
      question.type === 'unique' ? (choix.includes(lettre) ? [] : [lettre]) : choix.includes(lettre) ? choix.filter((l) => l !== lettre) : [...choix, lettre]
    majE({ ...e, reponses: { ...e.reponses, [id]: nouveau } })
  }
  const aRevoir = e.aRevoir.includes(id)
  const repondues = e.ids.filter((x) => e.reponses[x]?.length).length
  const mm = String(Math.floor(restant / 60)).padStart(2, '0')
  const ss = String(restant % 60).padStart(2, '0')

  return (
    <div className="app session examen">
      <header className="entete-session">
        <button
          className="icone-bouton"
          onClick={() => confirm("Quitter ? L'examen reste en cours et le chrono continue.") && onQuitter()}
          aria-label="Quitter l'examen"
        >
          <Icone nom="croix" taille={22} epaisseur={2.4} />
        </button>
        <span className={`chrono ${restant < 300 ? 'urgent' : ''}`}>
          {Math.floor(restant / 3600) ? `${Math.floor(restant / 3600)}:` : ''}
          {Math.floor(restant / 3600) ? String(Math.floor((restant % 3600) / 60)).padStart(2, '0') : mm}:{ss}
        </span>
        <button className="compteur bouton-grille" onClick={() => setGrille(true)}>
          {index + 1}/{e.ids.length} ▾
        </button>
      </header>
      <div className="progression">
        <div style={{ width: `${(repondues / e.ids.length) * 100}%` }} />
      </div>

      <main className="contenu" key={id}>
        <QuestionVue
          question={question}
          chapitre={chapitres.get(question.chapitreId)}
          choix={choix}
          corrige={false}
          onCocher={cocher}
          etiquette={aRevoir && <span className="etiquette orange">À revoir</span>}
        />
      </main>

      <div className="feuille visible">
        <div className="nav-examen">
          <button className="bouton secondaire" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Question précédente">
            ←
          </button>
          <button
            className={`bouton secondaire ${aRevoir ? 'marque' : ''}`}
            onClick={() => majE({ ...e, aRevoir: aRevoir ? e.aRevoir.filter((x) => x !== id) : [...e.aRevoir, id] })}
          >
            {aRevoir ? '★ À revoir' : '☆ À revoir'}
          </button>
          {index + 1 < e.ids.length ? (
            <button className="bouton principal" onClick={() => setIndex(index + 1)} aria-label="Question suivante">
              →
            </button>
          ) : (
            <button className="bouton vert" onClick={() => rendre()}>
              Rendre
            </button>
          )}
        </div>
      </div>

      {grille && (
        <div className="voile" onClick={() => setGrille(false)}>
          <div className="feuille-grille" onClick={(ev) => ev.stopPropagation()}>
            <h3>
              {repondues} / {e.ids.length} répondues
            </h3>
            <div className="grille">
              {e.ids.map((x, i) => (
                <button
                  key={x}
                  className={`case-q ${e.reponses[x]?.length ? 'faite' : ''} ${e.aRevoir.includes(x) ? 'marquee' : ''} ${i === index ? 'ici' : ''}`}
                  onClick={() => {
                    setIndex(i)
                    setGrille(false)
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="aide">Violet : répondue · Étoile orange : à revoir</p>
            <button className="bouton vert" disabled={envoi} onClick={() => rendre()}>
              Rendre ma copie
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ——— Résultat : note, détail par partie, correction de chaque QCM ———
export function ExamenResultat({
  id,
  onFermer,
  onLancer,
}: {
  id: number
  onFermer: () => void
  onLancer: (p: ParametresSession) => void
}) {
  const donnees = useLiveQuery(async () => {
    const ex = await db.examens.get(id)
    if (!ex) return null
    const qs = (await db.questions.bulkGet(ex.questions.map((q) => q.questionId))).filter((q): q is Question => !!q)
    const chs = await db.chapitres.bulkGet([...new Set(qs.map((q) => q.chapitreId))])
    const matiere = await db.matieres.get(ex.matiereId)
    return {
      ex,
      matiere,
      questions: new Map(qs.map((q) => [q.id, q])),
      chapitres: new Map(chs.filter((c): c is Chapitre => !!c).map((c) => [c.id, c])),
    }
  }, [id])
  const [revue, setRevue] = useState<number | null>(null)

  if (!donnees) return null
  const { ex, matiere, questions, chapitres } = donnees
  const lignes = ex.questions
    .map((r) => ({ r, q: questions.get(r.questionId) }))
    .filter((l): l is { r: (typeof ex.questions)[number]; q: Question } => !!l.q)
    .map((l) => ({ ...l, d: compterDiscordances(l.q, l.r.choix) }))

  if (revue !== null) {
    const l = lignes[revue]
    return (
      <div className="app session">
        <header className="entete-session">
          <button className="icone-bouton" onClick={() => setRevue(null)} aria-label="Retour au résultat">
            <Icone nom="croix" taille={22} epaisseur={2.4} />
          </button>
          <span className="compteur">
            Correction {revue + 1}/{lignes.length}
          </span>
        </header>
        <main className="contenu" key={revue}>
          <QuestionVue question={l.q} chapitre={chapitres.get(l.q.chapitreId)} choix={l.r.choix} corrige={true} />
        </main>
        <div className="feuille visible">
          <div className="nav-examen">
            <button className="bouton secondaire" disabled={revue === 0} onClick={() => setRevue(revue - 1)}>
              ←
            </button>
            <span className={`resultat-q ${l.d === 0 ? 'bon' : 'faux'}`}>
              {points(l.d, ex.bareme).toLocaleString('fr-FR')} pt
            </span>
            <button className="bouton principal" disabled={revue + 1 >= lignes.length} onClick={() => setRevue(revue + 1)}>
              →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const note = noteSur20(ex)
  const parPartie = new Map<string, { pts: number; n: number }>()
  for (const l of lignes) {
    const g = chapitres.get(l.q.chapitreId)?.groupe ?? 'Autres'
    const p = parPartie.get(g) ?? { pts: 0, n: 0 }
    p.pts += points(l.d, ex.bareme)
    p.n++
    parPartie.set(g, p)
  }
  const ratees = lignes.filter((l) => l.d > 0).map((l) => l.q.id)
  const duree = Math.round(((ex.fin ?? ex.debut) - ex.debut) / 60000)

  return (
    <div className="app session">
      <header className="entete-session">
        <button className="icone-bouton" onClick={onFermer} aria-label="Fermer">
          <Icone nom="croix" taille={22} epaisseur={2.4} />
        </button>
      </header>
      <main className="contenu bilan">
        <h1 className="titre centre">Examen blanc{matiere ? ` · ${matiere.nom}` : ''}</h1>
        <div className="bilan-anneau">
          <Anneau valeur={note / 20} taille={180} epaisseur={16} couleur={note >= 10 ? 'var(--bon)' : 'var(--faux)'}>
            <strong>{note.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</strong>
            <small>sur 20</small>
          </Anneau>
        </div>
        <div className="bilan-chiffres">
          <div className="carte">
            <strong className="vert-texte">{ex.justes}</strong>
            <small>justes sur {lignes.length}</small>
          </div>
          <div className="carte">
            <strong>{duree} min</strong>
            <small>sur {Math.round(ex.dureeMax / 60)} min</small>
          </div>
        </div>

        {parPartie.size > 1 && (
          <section className="carte">
            <h3>Par partie</h3>
            {[...parPartie].map(([g, p]) => (
              <div key={g} className="partie-score">
                <span className="partie-score-nom">{g}</span>
                <span className="jauge">
                  <span style={{ width: `${(p.pts / p.n) * 100}%`, background: matiere ? couleurMatiere(matiere.id) : undefined }} />
                </span>
                <span className="partie-score-note">{((p.pts / p.n) * 20).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/20</span>
              </div>
            ))}
          </section>
        )}

        <h3 className="sous-titre">Correction</h3>
        <div className="liste">
          {lignes.map((l, i) => (
            <button key={l.q.id} className={`ligne ${l.d === 0 ? 'bon' : 'faux'}`} onClick={() => setRevue(i)}>
              <span className="ligne-icone">
                <Icone nom={l.d === 0 ? 'coche' : 'croix'} taille={14} epaisseur={3} />
              </span>
              <span className="ligne-texte">
                {i + 1}. {l.q.enonce}
              </span>
              <span className="ligne-fois">{points(l.d, ex.bareme).toLocaleString('fr-FR')}</span>
            </button>
          ))}
        </div>
      </main>
      <div className="feuille visible">
        {ratees.length > 0 && (
          <button className="bouton rouge" onClick={() => onLancer({ questionIds: melanger(ratees), mode: 'erreurs' })}>
            <Icone nom="cible" /> Retravailler les {ratees.length} QCM ratés
          </button>
        )}
        <button className="bouton secondaire" onClick={onFermer}>
          Terminer
        </button>
      </div>
    </div>
  )
}
