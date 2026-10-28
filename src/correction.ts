import { db } from './db'
import type { Question, Reponse } from './types'

// Une discordance = un item coché alors qu'il est faux, ou non coché alors qu'il est vrai.
export function compterDiscordances(question: Question, choix: string[]): number {
  return question.items.filter((it) => it.correct !== choix.includes(it.lettre)).length
}

// Barème « médecine » par défaut : 0 discordance = 1 pt, 1 = 0,5, 2 = 0,2, 3 et plus = 0.
// Sera réglable par matière avec le mode examen.
export function points(discordances: number): number {
  return [1, 0.5, 0.2][discordances] ?? 0
}

// Enregistre la réponse et met à jour « Mes erreurs ».
// Renvoie ce qui s'est passé pour l'onglet erreurs.
export async function enregistrerReponse(
  question: Question,
  choix: string[],
  mode: Reponse['mode'],
): Promise<'ajoutee' | 'retiree' | 'gardee' | null> {
  const discordances = compterDiscordances(question, choix)
  const maintenant = Date.now()
  return db.transaction('rw', db.reponses, db.erreurs, async () => {
    await db.reponses.add({ questionId: question.id, date: maintenant, mode, choix, discordances })
    const existante = await db.erreurs.get(question.id)
    if (discordances > 0) {
      await db.erreurs.put({
        questionId: question.id,
        ajouteLe: existante?.ajouteLe ?? maintenant,
        derniereFois: maintenant,
        nbEchecs: (existante?.nbEchecs ?? 0) + 1,
      })
      return existante ? 'gardee' : 'ajoutee'
    }
    // Un QCM ne quitte « Mes erreurs » que s'il est réussi depuis cet onglet.
    if (existante && mode === 'erreurs') {
      await db.erreurs.delete(question.id)
      return 'retiree'
    }
    return null
  })
}

// Questions des fiches choisies, mélangées ; celles jamais faites passent en premier si demandé.
export async function preparerSerie(chapitreIds: string[], nouvellesDabord = true, taille = 0): Promise<string[]> {
  const questions = await db.questions.where('chapitreId').anyOf(chapitreIds).primaryKeys()
  let ordre = melanger(questions)
  if (nouvellesDabord) {
    const dejaFaites = new Set(await db.reponses.where('questionId').anyOf(questions).keys())
    ordre = [...ordre.filter((id) => !dejaFaites.has(id)), ...ordre.filter((id) => dejaFaites.has(id))]
  }
  return taille ? ordre.slice(0, taille) : ordre
}

export function melanger<T>(liste: T[]): T[] {
  const copie = [...liste]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}
