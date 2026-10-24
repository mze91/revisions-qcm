import { useEffect, useState } from 'react'
import { db } from '../db'
import { compterDiscordances, enregistrerReponse, points } from '../correction'
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
  ajoutee: '➕ Ajoutée à « Mes erreurs »',
  gardee: '↩︎ Reste dans « Mes erreurs »',
  retiree: '✅ Retirée de « Mes erreurs »',
}

export default function Session({ parametres, onQuitter }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [chapitres, setChapitres] = useState<Map<string, Chapitre>>(new Map())
  const [index, setIndex] = useState(0)
  const [choix, setChoix] = useState<string[]>([])
  const [corrige, setCorrige] = useState(false)
  const [effetErreurs, setEffetErreurs] = useState<keyof typeof MESSAGES_ERREURS | null>(null)
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
          <button className="principal" onClick={() => onQuitter()}>
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

  const cocher = (lettre: string) => {
    if (corrige) return
    // Mise à jour à partir de l'état précédent : deux touches rapides ne s'écrasent pas.
    if (question.type === 'unique') setChoix((c) => (c.includes(lettre) ? [] : [lettre]))
    else setChoix((c) => (c.includes(lettre) ? c.filter((l) => l !== lettre) : [...c, lettre]))
  }

  const valider = async () => {
    setCorrige(true)
    const effet = await enregistrerReponse(question, choix, parametres.mode)
    setEffetErreurs(effet)
    setResultats([...resultats, { question, discordances: compterDiscordances(question, choix) }])
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
    <div className="app session">
      <header className="entete-session">
        <button className="lien" onClick={quitter}>
          ✕ Arrêter
        </button>
        <span>
          {parametres.mode === 'erreurs' ? 'Mes erreurs · ' : ''}
          {index + 1} / {total}
        </span>
      </header>
      <div className="progression">
        <div style={{ width: `${((index + (corrige ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <main className="contenu">
        {chapitre && <p className="chapitre-question">{chapitre.nom}</p>}
        <h2 className="enonce">{question.enonce}</h2>
        <p className="aide">
          {question.type === 'unique' ? 'Une seule bonne réponse.' : 'Une ou plusieurs bonnes réponses.'}
        </p>

        <div className="items">
          {question.items.map((it) => {
            const coche = choix.includes(it.lettre)
            const classe = corrige ? (coche === it.correct ? 'bon' : 'faux') : coche ? 'coche' : ''
            return (
              <div key={it.lettre} className={`item ${classe}`}>
                <button className="item-bouton" onClick={() => cocher(it.lettre)} disabled={corrige}>
                  <span className="lettre">{it.lettre}</span>
                  <span className="item-texte">{it.texte}</span>
                  {corrige && <span className="verdict">{it.correct ? 'VRAI' : 'FAUX'}</span>}
                </button>
                {corrige && (
                  <div className="correction">
                    <p className="ton-choix">
                      {coche ? 'Tu as coché' : "Tu n'as pas coché"}
                      {coche === it.correct ? ' ✓' : ' ✗'}
                    </p>
                    <p>{it.explication}</p>
                    {it.source?.extrait && (
                      <blockquote>
                        <span className="source">Cours{it.source.page ? `, p. ${it.source.page}` : ''}</span>«{' '}
                        {it.source.extrait} »
                      </blockquote>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <div className="barre-action fixe">
        {corrige && (
          <div className={`bandeau ${discordances === 0 ? 'bon' : 'faux'}`}>
            <strong>
              {discordances === 0
                ? 'Juste ! 🎉'
                : `${discordances} discordance${discordances > 1 ? 's' : ''}`}
            </strong>{' '}
            · {points(discordances).toLocaleString('fr-FR')} pt
            {effetErreurs && <div className="effet">{MESSAGES_ERREURS[effetErreurs]}</div>}
          </div>
        )}
        {corrige ? (
          <button className="principal" onClick={suivante}>
            {index + 1 < total ? 'Question suivante' : 'Voir le bilan'}
          </button>
        ) : (
          <button className="principal" onClick={valider}>
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
  return (
    <div className="app session">
      <main className="contenu">
        <h1>Bilan</h1>
        <div className="carte bilan">
          <div className="grand-score">
            {score.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / {resultats.length}
          </div>
          <p>
            {justes} juste{justes > 1 ? 's' : ''} sur {resultats.length}
          </p>
          {mode === 'erreurs' ? (
            <p className="aide">
              {justes > 0 && `${justes} QCM retiré${justes > 1 ? 's' : ''} de « Mes erreurs ». `}
              {ratees > 0 && `${ratees} y reste${ratees > 1 ? 'nt' : ''}.`}
            </p>
          ) : (
            ratees > 0 && (
              <p className="aide">
                Les {ratees} QCM ratés sont dans « Mes erreurs ».
              </p>
            )
          )}
        </div>
        <div className="liste-bilan">
          {resultats.map((r, i) => (
            <div key={i} className={`ligne-bilan ${r.discordances === 0 ? 'bon' : 'faux'}`}>
              <span>{r.discordances === 0 ? '✓' : '✗'}</span>
              <span className="ligne-nom">{r.question.enonce}</span>
            </div>
          ))}
        </div>
      </main>
      <div className="barre-action fixe">
        {ratees > 0 && (
          <button className="secondaire" onClick={() => onQuitter(true)}>
            Voir « Mes erreurs »
          </button>
        )}
        <button className="principal" onClick={() => onQuitter()}>
          Terminer
        </button>
      </div>
    </div>
  )
}
