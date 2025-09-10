<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

**Raggy** est un chatbot RAG (Retrieval-Augmented Generation) générique et modulaire construit avec NestJS. Il peut être adapté à différents domaines simplement en modifiant les variables d'environnement, sans changer le code source.

### Fonctionnalités principales

- 🔍 **Recherche vectorielle** avec pgvector et Ollama
- 💬 **Gestion de conversations** avec historique intelligent
- 📄 **Traitement de documents** (PDF, CSV, TXT, JSON)
- 🔧 **Configuration multi-domaines** (Nutrition, Assurance, Support, etc.)
- 🚀 **API REST complète** pour intégrations

### Technologies

- **Backend**: NestJS, TypeORM, PostgreSQL
- **IA**: LangChain.js v0.3, Ollama (gemma3:latest, nomic-embed-text)
- **Vector DB**: pgvector pour la recherche sémantique

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Configuration Multi-Domaines

Raggy peut être configuré pour différents domaines simplement en modifiant le fichier `.env` :

### Variables d'environnement principales

```bash
SYSTEM_PROMPT="Description du rôle de l'assistant"
ASSISTANT_NAME="Nom de l'assistant"
ASSISTANT_ROLE="Rôle détaillé"
DOMAIN_SPECIFIC_RULES="Règles spécifiques au domaine"
```

### Exemples de configuration

**Pour un assistant nutrition :**

```bash
SYSTEM_PROMPT="Vous êtes un assistant virtuel spécialisé en nutrition et bien-être. Répondez de manière professionnelle et bienveillante."
ASSISTANT_NAME="Oto"
ASSISTANT_ROLE="assistant virtuel spécialisé en nutrition et bien-être"
DOMAIN_SPECIFIC_RULES="NE FAIS AUCUNE RÉFÉRENCE aux cas spécifiques des documents. NE PRÉSENTE PAS les problèmes médicaux des documents comme étant ceux de l'utilisateur actuel. NE MENTIONNE PAS d'habitudes alimentaires des documents comme étant celles de l'utilisateur. BASE TA RÉPONSE UNIQUEMENT sur ce que l'utilisateur a réellement dit dans cette conversation. Si l'utilisateur n'a pas mentionné un problème de santé spécifique, ne l'invente pas. Utilise les documents SEULEMENT pour donner des conseils nutritionnels généraux."
```

**Pour un assistant assurance :**

```bash
SYSTEM_PROMPT="Vous êtes un assistant virtuel spécialisé en assurances et services financiers. Répondez de manière professionnelle et sécurisante."
ASSISTANT_NAME="AssurBot"
ASSISTANT_ROLE="assistant virtuel spécialisé en assurances"
DOMAIN_SPECIFIC_RULES="Utilise les documents pour fournir des informations sur les contrats d'assurance, les garanties et les démarches administratives. NE DONNE PAS de conseils juridiques. REDIRIGE vers un conseiller pour les situations complexes."
```

📖 **Documentation complète**: Voir [CONFIGURATION.md](CONFIGURATION.md)

## Run tests

# unit tests

$ npm run test

# e2e tests

$ npm run test:e2e

# test coverage

$ npm run test:cov

````

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
````

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
