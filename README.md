# Les nombres complexes — plateforme d'apprentissage (2 Bac SPC / SVT)

Voir [docs/PLAN.md](docs/PLAN.md) pour l'architecture, le modèle de données et les jalons.

## Démarrage (jalon a)
```bash
cp .env.example .env   # puis renseigner JWT_SECRET
docker compose up --build
curl http://localhost:8080/actuator/health
```

## Tests backend
```bash
cd backend && mvn test
```
