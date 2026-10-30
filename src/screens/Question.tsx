import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { couleurMatiere } from '../stats'
import { useOuvrirCours } from '../lecteur'
import { Icone } from '../ui'
import type { Chapitre, Question } from '../types'

// Certains QCM du tutorat demandent de cocher les propositions fausses : « Vrai » serait alors trompeur.
// Les annales disent aussi « inexacte(s) », « erronée(s) » ou « incorrecte(s) ».
export const demandeFausses = (q: Question) => {
  const enonce = q.enonce.replace(/inexacte|erron[ée]|incorrecte/gi, 'fausse')
  return /fausse/i.test(enonce) && !/exacte/i.test(enonce)
}

interface Props {
  question: Question
  chapitre?: Chapitre
  choix: string[]
  corrige: boolean
  onCocher?: (lettre: string) => void
  etiquette?: ReactNode
}

// Une question : énoncé, items à cocher, puis (une fois corrigée) l'explication de chaque item
// et le passage du cours, ouvrable dans le lecteur.
export default function QuestionVue({ question, chapitre, choix, corrige, onCocher, etiquette }: Props) {
  const ouvrirCours = useOuvrirCours()
  const fausses = demandeFausses(question)
  // Nom des autres fiches citées par les items (QCM d'annale à cheval sur plusieurs fiches).
  const autresFiches = useLiveQuery(async () => {
    const ids = [...new Set(question.items.flatMap((it) => (it.source?.fiche ? [`${question.matiereId}/${it.source.fiche}`] : [])))]
    const chapitres = await db.chapitres.bulkGet(ids)
    return new Map(chapitres.flatMap((c) => (c ? [[c.id.split('/')[1], c.nom] as const] : [])))
  }, [question.id])

  return (
    <>
      {chapitre && (
        <p className="chapitre-question" style={{ color: couleurMatiere(chapitre.matiereId) }}>
          {etiquette}
          {chapitre.nom}
        </p>
      )}
      {question.origine === 'annale' && (
        <span className="etiquette tutorat">{question.annee ? `Annale ${question.annee}` : 'QCM du tutorat'}</span>
      )}
      <h2 className="enonce">{question.enonce}</h2>
      <p className="consigne">
        {fausses
          ? 'Coche les propositions FAUSSES'
          : question.type === 'unique'
            ? 'Une seule bonne réponse'
            : 'Une ou plusieurs bonnes réponses'}
      </p>

      <div className="items">
        {question.items.map((it, i) => {
          const coche = choix.includes(it.lettre)
          const juste = coche === it.correct
          const classe = corrige ? (juste ? 'bon' : 'faux') : coche ? 'coche' : ''
          return (
            <div key={it.lettre} className={`item ${classe}`} style={{ animationDelay: `${i * 40}ms` }}>
              <button className="item-bouton" onClick={() => onCocher?.(it.lettre)} disabled={corrige || !onCocher}>
                <span className="lettre">
                  {corrige ? <Icone nom={juste ? 'coche' : 'croix'} taille={16} epaisseur={3} /> : it.lettre}
                </span>
                <span className="item-texte">{it.texte}</span>
                {corrige && (
                  <span className={`verdict ${it.correct ? 'vrai' : ''}`}>
                    {fausses ? (it.correct ? 'À cocher' : 'À laisser') : it.correct ? 'Vrai' : 'Faux'}
                  </span>
                )}
              </button>
              {corrige && (
                <div className="correction">
                  <p className="ton-choix">
                    {it.lettre} · {coche ? 'Tu as coché' : "Tu n'as pas coché"} — {juste ? 'bien vu' : 'erreur'}
                  </p>
                  {/* « Vrai. Cette proposition est fausse… » se lit mal : l'étiquette dit déjà « À cocher ». */}
                  <p>{fausses ? it.explication.replace(/^(Vrai|Faux)\.\s*/, '') : it.explication}</p>
                  {it.source?.extrait && (
                    <blockquote>
                      <span className="source">
                        <Icone nom="livre" taille={14} /> {it.source.fiche ? `Fiche « ${autresFiches?.get(it.source.fiche) ?? '…'} »` : 'Cours'}{it.source.page ? `, p. ${it.source.page}` : ''}
                      </span>
                      « {it.source.extrait} »
                    </blockquote>
                  )}
                  {chapitre?.cours && (
                    <button
                      className="voir-cours"
                      onClick={() =>
                        ouvrirCours({
                          chapitreId: it.source?.fiche ? `${chapitre.matiereId}/${it.source.fiche}` : chapitre.id,
                          page: it.source?.page,
                          zones: it.source?.zones,
                          extrait: it.source?.extrait,
                        })
                      }
                    >
                      <Icone nom="livre" taille={16} /> Voir dans le cours
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
