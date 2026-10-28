import type { ReactNode } from 'react'
import { couleurMatiere } from '../stats'
import { useOuvrirCours } from '../lecteur'
import { Icone } from '../ui'
import type { Chapitre, Question } from '../types'

// Certains QCM du tutorat demandent de cocher les propositions fausses : « Vrai » serait alors trompeur.
export const demandeFausses = (q: Question) => /fausse/i.test(q.enonce) && !/exacte/i.test(q.enonce)

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
                  <p>{it.explication}</p>
                  {it.source?.extrait && (
                    <blockquote>
                      <span className="source">
                        <Icone nom="livre" taille={14} /> Cours{it.source.page ? `, p. ${it.source.page}` : ''}
                      </span>
                      « {it.source.extrait} »
                    </blockquote>
                  )}
                  {chapitre?.cours && (
                    <button
                      className="voir-cours"
                      onClick={() =>
                        ouvrirCours({
                          chapitreId: chapitre.id,
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
