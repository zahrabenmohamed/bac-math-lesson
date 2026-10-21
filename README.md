# Les nombres complexes — plateforme d'apprentissage (2 Bac SPC / SVT)

Application web d'apprentissage interactif pour le chapitre « Les nombres complexes » : chaque leçon alterne
courtes explications (avec exemple résolu) et exercices corrigés instantanément **par le serveur**, avec XP,
niveaux, série quotidienne, badges, liste d'erreurs et révision.

> **Contenu pédagogique : statut `draft`.** Tout le contenu est original, mais il doit être relu par un enseignant.
> Le découpage en 7 leçons n'a pas été vérifié contre le *Cadre de référence de l'examen national* : à valider.

| Partie | Leçons |
|---|---|
| 1 | L01 forme algébrique · L02 conjugué et module · L03 plan complexe · L04 second degré · **B1 exercice final** |
| 2 | L05 forme trigonométrique et argument · L06 notation exponentielle, Moivre, Euler · L07 applications géométriques · **B2 exercice final** |

Architecture, modèle de données et règles : [docs/PLAN.md](docs/PLAN.md).

## Démarrer avec Docker

```bash
cp .env.example .env     # renseigner JWT_SECRET (>= 32 caractères) et DB_PASSWORD
docker compose up --build
```

Puis ouvrir http://localhost:8081, créer un compte et lancer la leçon 1. La base PostgreSQL est créée par
Flyway et le contenu est chargé automatiquement au démarrage du backend : aucune étape manuelle.
Documentation de l'API (OpenAPI) : http://localhost:8080/swagger-ui.html

> `docker-compose.yml` n'a pas pu être exécuté sur la machine de développement (Docker absent) ; le backend, le
> frontend et leurs tests ont été exécutés séparément. Signalez tout problème au premier `docker compose up`.

## Développer sans Docker

Backend (Java 21, Maven) avec une base H2 en mémoire, re-remplie à chaque démarrage :

```bash
cd backend
JWT_SECRET=dev-only-secret-dev-only-secret-0123456789 mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Frontend (Node 22+), proxy `/api` → `localhost:8080` :

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

`VITE_USE_MOCK=true npm run dev` lance l'interface sur des données de démonstration embarquées, sans backend ni connexion.

## Tests

```bash
cd backend && mvn test      # règles XP/série/maîtrise, parseur et correction, contenu, API (MockMvc + sécurité)
cd frontend && npm test     # logique du lecteur de leçon
```

Les tests de contenu vérifient la cohérence de chaque exercice et que la **réponse modèle** de chacun est jugée correcte
par le vrai correcteur.

## Sécurité

- Mots de passe hachés avec BCrypt ; JWT HS256 à durée limitée (`JWT_EXPIRY_MINUTES`, 120 par défaut).
- Aucun secret dans git : `JWT_SECRET` n'a pas de valeur par défaut (le backend refuse de démarrer sans) ; voir `.env.example`.
- Les bonnes réponses ne quittent jamais le serveur avant la réponse de l'élève (`exercises.answer` n'est jamais sérialisé
  dans `GET /lessons/{id}` ; un test le vérifie).
- Validation des entrées (Bean Validation), CORS restreint à `CORS_ORIGINS`.

## API

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | e-mail + mot de passe → JWT |
| GET | `/chapters/complexes` | leçons + progression (verrouillée / à faire / terminée) |
| GET | `/lessons/{code}` | étapes sans solutions (403 si verrouillée) |
| POST | `/lessons/{code}/complete` | termine la leçon (409 si exercices non traités) |
| POST | `/exercises/{code}/answer` | `{choices}` ou `{text}` → `{correct, explanation, solution, xpAwarded, mastered}` |
| POST | `/exercises/{code}/hint` | indice (réduit l'XP de la réponse suivante) |
| GET | `/me/progress`, `/me/mistakes` · POST `/me/review-session` | profil, erreurs, révision |

Les identifiants publics sont les codes de contenu (`L01`, `L01-E1`).

## Règles

- **XP** : 10 par réussite, 5 avec indice, +25 sur un exercice final. Niveau = ⌊√(XP/50)⌋ + 1.
- **Série** : +1 si activité le lendemain du dernier jour actif ; remise à 1 après un jour manqué.
- **Maîtrise** : une question ratée devient « maîtrisée » après 2 réussites consécutives ; un échec remet le compteur à 0.
- **Réponses saisies** : `3 + 4i`, `4i + 3`, `1/2 - 1/2 i`, `sqrt(2)/2`, `pi/4`, décimales avec virgule ou point.
  Les réponses complexes doivent être sous forme algébrique `a + bi` (une réponse comme `(2+3i)+(1-5i)` est refusée comme
  non simplifiée). Une saisie illisible renvoie une erreur 400 et n'est pas comptée comme tentative.

## Ajouter une leçon

1. Créer `backend/src/main/resources/content/complexes/lesson-XX.json` (modèle : `lesson-01.json`) :

   ```json
   { "code": "L08", "part": 2, "position": 10, "title": "…", "kind": "LESSON", "status": "draft",
     "steps": [
       { "type": "EXPLANATION", "title": "…", "body": "Markdown + $KaTeX$",
         "example": { "statement": "…", "solution": "…" } },
       { "type": "EXERCISE", "exercise": {
           "code": "L08-E1", "type": "QCM", "skill": "Nom de la compétence",
           "payload": { "prompt": "…", "multiple": false, "options": [ { "id": "a", "text": "…" } ] },
           "answer":  { "correct": ["a"], "feedback": { "b": "erreur typique si l'option b est choisie" } },
           "solution": "…", "hint": "…" } }
     ] }
   ```

2. Types d'exercices : `QCM` (`answer.correct` = liste d'ids), `NUMERIC` (`payload.format` = `complex` ou `real` ;
   `answer` = `{re, im, tolerance}` ou `{value, tolerance}`), `METHOD` (`payload.stages` = étapes avec options ;
   `answer.order` = id correct de chaque étape).
3. Les leçons sont ordonnées par `part` puis `position` ; une leçon se déverrouille quand la précédente est terminée.
4. Redémarrer le backend (chargement idempotent : mise à jour par `code`, l'historique des élèves est conservé), puis
   `mvn test` : le test de contenu vérifie la structure et la réponse modèle. Mettre à jour les effectifs attendus dans
   `ContentLoaderTest`.

## Hors périmètre du MVP

Autres chapitres, connexion par OTP téléphonique, mode hors-ligne, interface d'administration, paiements, vidéo,
arabe/RTL, saisie manuscrite. Storybook n'est pas encore installé (les composants sont dans `frontend/src/components`).
