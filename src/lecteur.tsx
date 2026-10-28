import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { db } from './db'
import { chargerPages, HorsLigne } from './contenu'
import { Icone } from './ui'
import type { Chapitre } from './types'

// Lecteur des fiches de cours (les vraies pages, avec schémas et tableaux).
// N'importe quel écran peut l'ouvrir, à une page donnée, avec un passage surligné.

export interface DemandeLecture {
  chapitreId: string
  page?: number
  zones?: number[][]
  extrait?: string
}

const Contexte = createContext<(d: DemandeLecture) => void>(() => {})
export const useOuvrirCours = () => useContext(Contexte)

export function FournisseurLecteur({ children }: { children: ReactNode }) {
  const [demande, setDemande] = useState<DemandeLecture | null>(null)
  return (
    <Contexte.Provider value={setDemande}>
      {children}
      {demande && <Lecteur demande={demande} onFermer={() => setDemande(null)} />}
    </Contexte.Provider>
  )
}

const ZOOMS = [1, 1.6, 2.2]

function Lecteur({ demande, onFermer }: { demande: DemandeLecture; onFermer: () => void }) {
  const [chapitre, setChapitre] = useState<Chapitre | null>(null)
  const [pages, setPages] = useState<string[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0)
  const [pageVue, setPageVue] = useState(demande.page ?? 1)
  const [voirExtrait, setVoirExtrait] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<(HTMLDivElement | null)[]>([])
  const place = useRef(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const c = await db.chapitres.get(demande.chapitreId)
      setChapitre(c ?? null)
      if (!c?.cours) {
        setErreur("Le cours de cette fiche n'est pas encore disponible.")
        return
      }
      try {
        setPages(await chargerPages(c.cours))
      } catch (e) {
        setErreur(
          e instanceof HorsLigne
            ? "Pas de connexion : cette fiche n'a jamais été ouverte sur ce téléphone. Connecte-toi une fois pour la télécharger."
            : "Impossible d'ouvrir le cours.",
        )
      }
    })()
  }, [demande.chapitreId])

  // Amène la page demandée (et le passage surligné) à l'écran dès que son image est chargée.
  const placer = (i: number) => {
    if (place.current || !demande.page || i !== demande.page - 1) return
    const el = pagesRef.current[i]
    const conteneur = zone.current
    if (!el || !conteneur) return
    const y = demande.zones?.length ? Math.min(...demande.zones.map((z) => z[1])) : 0
    conteneur.scrollTop = el.offsetTop + y * el.offsetHeight - 140
    place.current = true
  }

  const defiler = () => {
    const conteneur = zone.current
    if (!conteneur) return
    const milieu = conteneur.scrollTop + conteneur.clientHeight / 3
    const i = pagesRef.current.findIndex((el) => el && el.offsetTop + el.offsetHeight > milieu)
    if (i >= 0) setPageVue(i + 1)
  }

  return (
    <div className="lecteur" role="dialog" aria-label="Cours">
      <header className="lecteur-tete">
        <button className="icone-bouton" onClick={onFermer} aria-label="Fermer le cours">
          <Icone nom="croix" taille={22} epaisseur={2.4} />
        </button>
        <div className="lecteur-titre">
          <strong>{chapitre?.nom ?? 'Cours'}</strong>
          {pages && (
            <small>
              Page {pageVue} / {pages.length}
            </small>
          )}
        </div>
        <button
          className="icone-bouton"
          onClick={() => {
            place.current = true
            setZoom((zoom + 1) % ZOOMS.length)
          }}
          aria-label="Agrandir"
        >
          <span className="zoom-texte">{ZOOMS[(zoom + 1) % ZOOMS.length] === 1 ? '1×' : '+'}</span>
        </button>
      </header>

      <div className="lecteur-pages" ref={zone} onScroll={defiler}>
        {erreur && <p className="lecteur-message">{erreur}</p>}
        {!pages && !erreur && (
          <div className="vide">
            <div className="chargeur" />
            <p>Ouverture du cours…</p>
          </div>
        )}
        {pages?.map((src, i) => (
          <div
            key={i}
            className="lecteur-page"
            style={{ width: `${ZOOMS[zoom] * 100}%` }}
            ref={(el) => {
              pagesRef.current[i] = el
            }}
          >
            <img src={src} alt={`Page ${i + 1}`} loading={Math.abs(i + 1 - (demande.page ?? 1)) < 2 ? 'eager' : 'lazy'} onLoad={() => placer(i)} />
            {demande.page === i + 1 &&
              demande.zones?.map((z, k) => (
                <span
                  key={k}
                  className="surlignage"
                  style={{ left: `${z[0] * 100}%`, top: `${z[1] * 100}%`, width: `${z[2] * 100}%`, height: `${z[3] * 100}%` }}
                />
              ))}
          </div>
        ))}
      </div>

      {demande.extrait && pages && (
        <button className="lecteur-extrait" onClick={() => setVoirExtrait(!voirExtrait)}>
          <span className="surlignage-pastille" />
          {voirExtrait ? (
            <span className="lecteur-extrait-texte">« {demande.extrait} »</span>
          ) : (
            <span>
              {demande.zones?.length ? `Passage surligné, page ${demande.page}` : `Le passage est page ${demande.page}`} · voir le texte
            </span>
          )}
        </button>
      )}
    </div>
  )
}
