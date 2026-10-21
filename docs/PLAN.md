# Plan — Plateforme « Les nombres complexes » (2 Bac SPC / SVT)

## Hypothèses
- Nouveau dépôt séparé : `bac-complexes` (le dossier de travail initial est un autre projet).
- Package Java `ma.bac.complexes`. Auth e-mail + mot de passe, JWT HS256 (secret via env).
- Contenu en JSON, chargé au démarrage par un `ContentLoader` idempotent (upsert par `code`), statut `draft`.
- Docker n'est pas installé sur la machine de dev actuelle : les tests utilisent H2 (mode PostgreSQL) ; `docker compose up` est écrit mais à valider sur une machine avec Docker.
- Plan officiel : le Cadre de référence n'a pas encore été vérifié en ligne ; le découpage en 7 leçons est conservé comme proposé et signalé « à valider par un enseignant ».

## Architecture
```
frontend (React, nginx)  --/api-->  backend (Spring Boot)  -->  PostgreSQL
                                       |- auth (JWT)
                                       |- content (chapters/lessons/steps) + ContentLoader
                                       |- grading (AnswerChecker par type, ComplexParser)
                                       |- gamification (XP, niveaux, streak, maîtrise)
```
Le serveur est seul à connaître les bonnes réponses : `GET /lessons/{id}` renvoie `payload` sans clé `answer`/`solution`.

## Modèle de données
| Table | Colonnes clés | Justification |
|---|---|---|
| users | id, email (unique), password_hash, display_name, created_at | auth |
| chapters | id, code, title, status | un seul chapitre au MVP, mais extensible |
| lessons | id, chapter_id, code, part (1/2), position, title, kind (LESSON/BOSS) | carte de compétences, boss par partie |
| steps | id, lesson_id, position, type (EXPLANATION/EXERCISE), content JSON, exercise_id? | séquence du lecteur |
| exercises | id, code, type (QCM/NUMERIC/METHOD), payload JSON, answer JSON, solution, hint, skill | `answer` jamais exposé |
| attempts | id, user_id, exercise_id, answer JSON, correct, hint_used, time_ms, at | historique, stats 8 semaines |
| lesson_progress | user_id, lesson_id, steps_done, completed_at | déverrouillage + progression |
| exercise_mastery | user_id, exercise_id, streak_correct, mastered, ever_wrong | liste d'erreurs / maîtrise (2 succès consécutifs) |
| user_stats | user_id, xp, level, streak_days, last_active_date | gamification |

`exercise_mastery` est ajoutée au modèle initial : calculer la maîtrise depuis `attempts` à chaque lecture serait coûteux et fragile.

## Schéma JSON des exercices (payload côté client / answer côté serveur)
- **QCM** : payload `{ prompt, multiple, options:[{id,text}] }` ; answer `{ correct:[ids] }` ; `feedback:{ id: "erreur typique" }`.
- **NUMERIC** : payload `{ prompt, format:"complex"|"real", placeholder }` ; answer `{ re, im }` ou `{ value }`, `tolerance`.
- **METHOD** : payload `{ prompt, stages:[{ question, options:[{id,text}] }] }` ; answer `{ order:[id,...] }` (un choix par étape, correction étape par étape).
- Étape EXPLANATION : `{ title, body (Markdown + $KaTeX$), example:{ statement, solution } }`.

## Règles
- XP : 10 par réussite, 5 si indice utilisé, +25 boss ; niveau = floor(sqrt(xp/50))+1.
- Streak : +1 si activité le lendemain du dernier jour actif, remis à 1 après une journée manquée.
- Maîtrise : 2 réussites consécutives après au moins une erreur ; un échec remet le compteur à 0.

## Jalons
a. dépôt + compose + health check · b. schéma + loader + leçons 1–2 · c. auth + endpoints chapitre/leçon · d. correction + XP/maîtrise + tests · e. frontend shell, tokens, carte · f. lecteur de leçon (3 types) · g. profil + erreurs · h. leçons 3–7 · i. finitions + README.

## Écarts par rapport au plan initial (implémentation)
- Identifiants publics de l'API = codes de contenu (`complexes`, `L01`, `L01-E1`) et non des ids numériques.
- Tables ajoutées : `exercise_mastery` (maîtrise) et `hint_requests` (l'indice est demandé via l'API pour que le serveur
  connaisse la réduction d'XP ; le client ne la déclare pas).
- Endpoints ajoutés : `POST /lessons/{code}/complete`, `POST /exercises/{code}/hint`.
- Les réponses numériques complexes doivent être sous forme algébrique `a + bi` (une expression non simplifiée est refusée).
- Boss : exercices finaux B1/B2 (lecteur identique, bonus d'XP) ; la leçon suivante reste verrouillée tant qu'ils ne sont pas terminés.
