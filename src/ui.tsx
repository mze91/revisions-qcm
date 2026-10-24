import type { ReactNode } from 'react'

// Icônes dessinées (traits arrondis) : plus nettes que des emojis, et elles suivent la couleur du texte.
const TRACES: Record<string, ReactNode> = {
  reviser: (
    <>
      <path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13.5" />
      <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3H5.5A1.5 1.5 0 0 0 4 19.5Z" />
      <path d="m9 10 2 2 4-4" />
    </>
  ),
  cible: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  livres: (
    <>
      <rect x="3" y="4" width="4.5" height="16" rx="1.2" />
      <rect x="9.5" y="4" width="4.5" height="16" rx="1.2" />
      <path d="m15.8 5.6 3.4-.9 3.3 14.4-3.4.9Z" />
    </>
  ),
  flamme: <path d="M12 3c1 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4.2.3 1.4 1 2.2 1.8 2.5C11 8.5 11 5.5 12 3Z" />,
  eclair: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  coche: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  croix: <path d="M6 6l12 12M18 6 6 18" />,
  fleche: <path d="M5 12h14m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  importer: (
    <>
      <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </>
  ),
  sauver: (
    <>
      <path d="M12 15V4m-4.5 4.5L12 4l4.5 4.5" />
      <path d="M5 19h14" />
    </>
  ),
  poubelle: <path d="M5 7h14M10 7V5h4v2m-7 0 1 12h8l1-12" />,
  livre: (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2Z" />
      <path d="M12 6.5v14" />
    </>
  ),
  trophee: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4m-3.5 3h7" />
    </>
  ),
}

export function Icone({ nom, taille = 22, epaisseur = 2 }: { nom: keyof typeof TRACES | string; taille?: number; epaisseur?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRACES[nom]}
    </svg>
  )
}

// Anneau de progression façon « Forme » d'Apple. valeur entre 0 et 1.
export function Anneau({
  valeur,
  taille = 44,
  epaisseur = 5,
  couleur = 'var(--accent)',
  children,
}: {
  valeur: number
  taille?: number
  epaisseur?: number
  couleur?: string
  children?: ReactNode
}) {
  const r = (taille - epaisseur) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="anneau" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille}>
        <circle cx={taille / 2} cy={taille / 2} r={r} stroke="var(--piste)" strokeWidth={epaisseur} fill="none" />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          stroke={couleur}
          strokeWidth={epaisseur}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, valeur)))}
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      {children && <div className="anneau-centre">{children}</div>}
    </div>
  )
}

export function Pastille({ nom, couleur, taille = 40 }: { nom: string; couleur: string; taille?: number }) {
  return (
    <span className="pastille-matiere" style={{ background: couleur, width: taille, height: taille, fontSize: taille * 0.42 }}>
      {nom.trim().charAt(0).toUpperCase()}
    </span>
  )
}
