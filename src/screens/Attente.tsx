import type { EtatCours } from '../App'

// Affiché tant qu'aucun cours n'est encore sur le téléphone.
export default function Attente({ etat }: { etat: EtatCours }) {
  if (etat === 'hors-ligne')
    return (
      <div className="vide">
        <h2>Pas de connexion</h2>
        <p>Connecte-toi à Internet une première fois pour charger tes cours. Ensuite, l'appli marche hors ligne.</p>
      </div>
    )
  if (etat === 'chargement')
    return (
      <div className="vide">
        <div className="chargeur" aria-hidden="true" />
        <h2>Préparation de tes cours…</h2>
        <p>Quelques secondes, le temps de tout télécharger.</p>
      </div>
    )
  return (
    <div className="vide">
      <h2>Pas encore de cours</h2>
      <p>Issa ajoute tes cours bientôt : ils apparaîtront ici tout seuls.</p>
    </div>
  )
}
