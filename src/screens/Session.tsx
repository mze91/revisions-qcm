import { useEffect, useState } from 'react'
import { db } from '../db'
import { compterDiscordances, enregistrerReponse, points } from '../correction'
import { couleurMatiere } from '../stats'
import { Anneau, Icone } from '../ui'
import type { Chapitre, Question, Reponse } from '../types'

export interface ParametresSession {
  questionIds: string[]
  mode: Reponse['mode']
}

interface Resultat {
  question: Question
  discordances: number
}

interface Props {
  parametres: ParametresSession
  onQuitter: (versErreurs?: boolean) => void
}

const MESSAGES_ERREURS = {
  ajoutee: 'Ajoutée à « Mes erreurs »',
  gardee: 'Reste dans « Mes erreurs »',
  retiree: 'Retirée de « Mes erreurs » 🎉',
}

const BRAVO = ['Parfait !', 'Excellent !', 'Bien joué !', 'Impeccable !', 'Bravo !']
const PRESQUE = ['Presque !', 'Pas loin !', 'Tout près !']
const A_REVOIR = ['À revoir', 'On retravaille ça', 'Pas grave, on apprend']

const auHasard = (liste: string[]) => liste[Math.floor(Math.random() * liste.length)]

export default function Session({ parametres, onQuitter }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [chapitres, setChapitres] = useState<Map<string, Chapitre>>(new Map())
  const [index, setIndex] = useState(0)
  const [choix, setChoix] = useState<string[]>([])
  const [corrige, setCorrige] = useState(false)
  const [effetErreurs, setEffetErreurs] = useState<keyof typeof MESSAGES_ERREURS | null>(null)
  const [titre, setTitre] = useState('')
  const [resultats, setResultats] = useState<Resultat[]>([])

  useEffect(() => {
    ;(async () => {
      const trouvees = await db.questions.bulkGet(parametres.questionIds)
      const qs = trouvees.filter((q): q is Question => !!q)
      const chs = await db.chapitres.bulkGet([...new Set(qs.map((q) => q.chapitreId))])
      setChapitres(new Map(chs.filter((c): c is Chapitre => !!c).map((c) => [c.id, c])))
      setQuestions(qs)
    })()
  }, [parametres])

  if (!questions) return null

  const total = questions.length
  if (total === 0) {
    return (
      <div className="app session">
        <div className="vide">
          <p>Aucune question à faire.</p>
          <button className="bouton principal" onClick={() => onQuitter()}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  if (index >= total) return <Bilan resultats={resultats} mode={parametres.mode} onQuitter={onQuitter} />

  const question = questions[index]
  const chapitre = chapitres.get(question.chapitreId)
  const discordances = corrige ? compterDiscordances(question, choix) : 0
  const ton = discordances === 0 ? 'bon' : 'faux'

  const cocher = (lettre: string) => {
    if (corrige) return
    // Mise à jour à partir de l'état précédent : deux touches rapides ne s'écrasent pas.
    if (question.type === 'unique') setChoix((c) => (c.includes(lettre) ? [] : [lettre]))
    else setChoix((c) => (c.includes(lettre) ? c.filter((l) => l !== lettre) : [...c, lettre]))
  }

  const valider = async () => {
    const d = compterDiscordances(question, choix)
    setTitre(auHasard(d === 0 ? BRAVO : d === 1 ? PRESQUE : A_REVOIR))
    setCorrige(true)
    if (d > 0) navigator.vibrate?.(60)
    const effet = await enregistrerReponse(question, choix, parametres.mode)
    setEffetErreurs(effet)
    setResultats([...resultats, { question, discordances: d }])
  }

  const suivante = () => {
    setIndex(index + 1)
    setChoix([])
    setCorrige(false)
    setEffetErreurs(null)
    window.scrollTo(0, 0)
  }

  const quitter = () => {
    if (resultats.length === 0 || confirm('Arrêter la série ? Tes réponses déjà validées sont gardées.')) onQuitter()
  }

  return (
    <div className={`app session ${parametres.mode === 'erreurs' ? 'mode-erreurs' : ''}`}>
      <header className="entete-session">
        <button className="icone-bouton" onClick={quitter} aria-label="Arrêter la série">
          <Icone nom="croix" taille={22} epaisseur={2.4} />
        </button>
        <div className="progression">
          <div style={{ width: `${((index + (corrige ? 1 : 0)) / total) * 100}%` }} />
        </div>
        <span className="compteur">
          {index + 1}/{total}
        </span>
      </header>

      <main className="contenu" key={index}>
        {chapitre && (
          <p className="chapitre-question" style={{ color: couleurMatiere(chapitre.matiereId) }}>
            {parametres.mode === 'erreurs' && <span className="etiquette rouge">Mes erreurs</span>}
            {chapitre.nom}
          </p>
        )}
        <h2 className="enonce">{question.enonce}</h2>
        <p className="consigne">
          {question.type === 'unique' ? 'Une seule bonne réponse' : 'Une ou plusieurs bonnes réponses'}
        </p>

        <div className="items">
          {question.items.map((it, i) => {
            const coche = choix.includes(it.lettre)
            const juste = coche === it.correct
            const classe = corrige ? (juste ? 'bon' : 'faux') : coche ? 'coche' : ''
            return (
              <div key={it.lettre} className={`item ${classe}`} style={{ animationDelay: `${i * 40}ms` }}>
                <button className="item-bouton" onClick={() => cocher(it.lettre)} disabled={corrige}>
                  <span className="lettre">
                    {corrige ? <Icone nom={juste ? 'coche' : 'croix'} taille={16} epaisseur={3} /> : it.lettre}
                  </span>
                  <span className="item-texte">{it.texte}</span>
                  {corrige && <span className={`verdict ${it.correct ? 'vrai' : ''}`}>{it.correct ? 'Vrai' : 'Faux'}</span>}
                </button>
                {corrige && (
                  <div className="correction">
                    <p className="ton-choix">
                      {it.lettre} · {coche ? 'Tu as coché' : "Tu n'as pas coché"} — {juste ? 'bien vu' : 'erreur'}
                    </p>
                    <p>{it.explication}</p>
                    {it.source?.extrait && (
                      <blockquote>
                        <span className="source">
                          <Icone nom="livre" taille={14} /> Cours{it.source.page ? `, p. ${it.source.page}` : ''}
                        </span>
                        « {it.source.extrait} »
                      </blockquote>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <div className={`feuille ${corrige ? `visible ${ton}` : ''}`}>
        {corrige && (
          <div className="feuille-tete">
            <span className="feuille-icone">
              <Icone nom={discordances === 0 ? 'coche' : 'croix'} taille={22} epaisseur={3} />
            </span>
            <span>
              <strong>{titre}</strong>
              <small>
                {discordances === 0 ? 'Aucune erreur' : `${discordances} discordance${discordances > 1 ? 's' : ''}`} ·{' '}
                {points(discordances).toLocaleString('fr-FR')} pt
                {effetErreurs && ` · ${MESSAGES_ERREURS[effetErreurs]}`}
              </small>
            </span>
          </div>
        )}
        {corrige ? (
          <button className={`bouton ${ton === 'bon' ? 'vert' : 'rouge'}`} onClick={suivante}>
            {index + 1 < total ? 'Continuer' : 'Voir mon bilan'}
          </button>
        ) : (
          <button className="bouton principal" onClick={valider}>
            Valider
          </button>
        )}
      </div>
    </div>
  )
}

function Bilan({
  resultats,
  mode,
  onQuitter,
}: {
  resultats: Resultat[]
  mode: Reponse['mode']
  onQuitter: (versErreurs?: boolean) => void
}) {
  const justes = resultats.filter((r) => r.discordances === 0).length
  const score = resultats.reduce((s, r) => s + points(r.discordances), 0)
  const ratees = resultats.length - justes
  const part = resultats.length ? score / resultats.length : 0
  const message =
    part >= 0.9 ? 'Exceptionnel 🏆' : part >= 0.7 ? 'Très bon travail 💪' : part >= 0.5 ? 'Bien, continue 👍' : 'On s’accroche 🌱'
  const couleur = part >= 0.7 ? 'var(--bon)' : part >= 0.5 ? 'var(--orange)' : 'var(--faux)'
  return (
    <div className="app session">
      <main className="contenu bilan">
        <h1 className="titre centre">{message}</h1>
        <div className="bilan-anneau">
          <Anneau valeur={part} taille={180} epaisseur={16} couleur={couleur}>
            <strong>{score.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</strong>
            <small>sur {resultats.length}</small>
          </Anneau>
        </div>
        <div className="bilan-chiffres">
          <div className="carte">
            <strong className="vert-texte">{justes}</strong>
            <small>juste{justes > 1 ? 's' : ''}</small>
          </div>
          <div className="carte">
            <strong className="rouge-texte">{ratees}</strong>
            <small>à revoir</small>
          </div>
        </div>
        <p className="aide centre">
          {mode === 'erreurs'
            ? `${justes} QCM retiré${justes > 1 ? 's' : ''} de « Mes erreurs »${ratees ? `, ${ratees} y reste${ratees > 1 ? 'nt' : ''}` : ''}.`
            : ratees > 0
              ? `Les ${ratees} QCM ratés t'attendent dans « Mes erreurs ».`
              : 'Aucune erreur, rien à retravailler !'}
        </p>
        <div className="liste">
          {resultats.map((r, i) => (
            <div key={i} className={`ligne ${r.discordances === 0 ? 'bon' : 'faux'}`}>
              <span className="ligne-icone">
                <Icone nom={r.discordances === 0 ? 'coche' : 'croix'} taille={14} epaisseur={3} />
              </span>
              <span className="ligne-texte">{r.question.enonce}</span>
            </div>
          ))}
        </div>
      </main>
      <div className="feuille visible">
        {ratees > 0 && (
          <button className="bouton rouge" onClick={() => onQuitter(true)}>
            <Icone nom="cible" /> Retravailler mes erreurs
          </button>
        )}
        <button className="bouton secondaire" onClick={() => onQuitter()}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  )
}
