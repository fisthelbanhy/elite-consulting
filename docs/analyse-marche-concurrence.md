# La Frangine — Analyse de marché, concurrence et stratégie de conversion (refonte 2026)

> **Date** : 22 septembre 2026 · **Périmètre** : Congo-Brazzaville (focus Brazzaville et Pointe-Noire), zone CEMAC · **Objet** : repositionner lafrangine.com et concevoir une refonte (SvelteKit + API Python) qui **convertit**.
> **Méthode** : recherche documentaire (sources officielles ARPCE, ARTF, BEAC, Banque mondiale, DataReportal, documentation des prestataires de paiement, sites concurrents), relevés StatCounter (CSV, août 2026), lecture de la page d'accueil legacy et du dictionnaire de données issu de la migration. Les sources sont citées en ligne et listées en fin de document. Les chiffres issus de blogs marketing (fiabilité faible) sont signalés comme tels et ne portent aucune recommandation clé.

---

## 0. Résumé exécutif

**Le constat**
- **Le marché existe, mais il est mobile, WhatsApp et Mobile Money d'abord.** 6,4 M d'habitants, âge médian 18,6 ans, 70 % d'urbains ; 3,57 M d'abonnés à l'internet mobile (T2 2025, ARPCE), dont 46 % en 4G et encore 23 % en 2G. Android représente environ 82 % des mobiles (Tecno en tête), Chrome 80 %, Google 96 % des recherches. Facebook compte 1,1 M d'utilisateurs et WhatsApp est le canal de vente de fait.
- **L'argent circule par Mobile Money, pas par les banques.** Le taux de bancarisation est d'environ 8,8 % (2020). En 2024, 3 516 Md FCFA ont transité par le Mobile Money au Congo (3ᵉ pays de la CEMAC). MTN détient environ 60 % des abonnés mobiles et environ 71 % du Mobile Money, Airtel le reste. L'épargne informelle (likelemba) est omniprésente.
- **Le besoin d'accompagnement est massif et subventionné.** 70 % des emplois sont informels et le chômage des jeunes atteint environ 42 %. Le programme PSIPJ (Banque mondiale) finance **40 000 jeunes porteurs d'activités en 2026**. L'ACPCE permet de créer une entreprise en ligne depuis décembre 2025 (5 000 entreprises créées en 2025). FIGA, ADPME et plusieurs incubateurs complètent le dispositif. **Aucun acteur ne propose aujourd'hui un accompagnement humain, numérique et WhatsApp-first de ces micro-entrepreneurs** : c'est un espace libre.
- **Sur les annonces, l'emploi et l'annuaire, la bataille est perdue d'avance** face à CoinAfrique, Facebook Marketplace, l'ACPE (3 574 offres), Emploi.cg et des groupes Facebook de dizaines de milliers de membres. Ces sections doivent **alimenter** le cœur de valeur, pas le constituer.
- **L'ancien site n'a pas échoué pour des raisons techniques, mais faute de focus.** Sept promesses concurrentes, aucun CTA principal, aucune preuve sociale, et une inscription à 14 règles (captcha, pseudo, situation matrimoniale…). Il fallait lancer sept marchés à deux faces en même temps. Résultat : **68 membres** et environ 10 000 visites en près de 10 ans, et 18 tables sur 65 jamais utilisées.
- **Des risques réglementaires sont à traiter avant le lancement.** Les « placements rémunérés entre membres » et la « carte de pointage » relèvent potentiellement de la collecte d'épargne et des services de paiement réglementés (COBAC). Le prêt et l'equity participatifs exigent un agrément COSUMAF. Les fiches « maladie → produit Aloe Vera + posologie » violent la politique Forever Living, qui interdit les allégations thérapeutiques.

**Le positionnement recommandé (un seul)**
> **« La Frangine, la grande sœur de ceux qui se lancent. »** C'est la plateforme d'accompagnement des micro-entrepreneurs congolais : une conseillère humaine joignable sur WhatsApp, des outils d'argent collectif (Likelemba digitale, appels de fonds) et un flux d'opportunités (marchés, emplois, partenaires). Tout pour passer de l'idée au premier client, puis au premier financement.

- **Cibles prioritaires** : ① les micro-entrepreneurs et commerçantes du secteur informel (25–40 ans, Brazzaville et Pointe-Noire) ; ② les jeunes porteurs de projet de 20 à 30 ans (diplômés sans emploi, bénéficiaires PSIPJ) ; ③ les dirigeants de TPE/PME (cible de monétisation « Pro »). La diaspora est une cible secondaire.
- **Hiérarchie** : 3 piliers au lieu de 7 menus, à savoir **Se lancer** (diagnostic, accompagnement, business plan), **Financer & épargner** (Likelemba, appels de fonds, offres financières) et **Trouver des opportunités** (marchés, emploi, annonces, annuaire, partenariats). L'offre Forever Living passe dans un espace « Boutique bien-être » secondaire et conforme.

**Les 5 leviers de conversion prioritaires**
1. **Une promesse et un CTA uniques** : « Faire mon diagnostic gratuit (3 min) », sans compte, puis restitution et prise de contact avec la conseillère.
2. **Une inscription sans mot de passe** : numéro de téléphone + code OTP (WhatsApp, avec repli SMS), 3 champs maximum, et un profil complété progressivement.
3. **Un parcours WhatsApp-first avec une vraie personne** : liens `wa.me` contextuels pré-remplis, délai de réponse affiché, notifications utiles.
4. **Une confiance visible** : badges de vérification, paiement MTN/Airtel intégré avec reçu instantané, charte anti-arnaque (« on ne vous demandera jamais votre code PIN »), témoignages réels, mentions légales complètes.
5. **Un site léger et rapide en 3G** : PWA installable, rendu serveur (SSR), moins de 500 Ko pour l'accueil, mode économie de données, SEO local Brazzaville et Pointe-Noire.

**Paiement** : l'agrégateur recommandé est **pawaPay**. Sa couverture Congo-Brazzaville avec MTN (`MTN_MOMO_COG`) et Airtel (`AIRTEL_COG`) en XAF est confirmée par sa documentation officielle, et il est déjà utilisé par une application de tontine CEMAC. Certitude : **élevée sur la couverture**, **moyenne sur les conditions d'ouverture de compte marchand**, à valider commercialement. La solution de repli est l'intégration directe de l'API Open de MTN MoMo et du portail développeurs d'Airtel. CinetPay et Flutterwave ne sont **pas** confirmés pour le Congo-Brazzaville.

**Modèle économique** : revenus B2B et Pro d'abord, puis frais de service. L'abonnement Pro à 5 000 FCFA/mois est repackagé avec des bénéfices concrets. S'y ajoutent des frais de gestion Likelemba, la mise en avant d'annonces, des alertes marchés publics, des forfaits d'accompagnement et, surtout, des **contrats avec les programmes et institutions** (PSIPJ, FIGA, IMF, banques) pour le suivi et la génération de leads.

---

## Sommaire
1. Contexte marché Congo-Brazzaville / CEMAC 2025-2026
2. Concurrents et alternatives par section
3. Diagnostic de l'ancien site et choix du positionnement
4. Stratégie de conversion
5. Modèle économique
6. KPI et funnel
7. Recommandations design
8. Feuille de route 90 jours
9. Sources

---

## 1. Contexte marché Congo-Brazzaville / CEMAC 2025-2026

### 1.1 Démographie et macro-économie

| Indicateur | Valeur | Source |
|---|---|---|
| Population | 6,14 M (RGPH-5, déc. 2023) ; 6,41–6,44 M projetés en 2025 | [ARPCE T2-2025](https://arpce.org/api/publications/observatoire-du-marche-de-linternet-mobile-rapport-du-2e-trimestre-2025/download), [DataReportal 2025](https://datareportal.com/reports/digital-2025-republic-of-the-congo) |
| Âge médian / urbanisation | 18,6 ans / 69,9 % urbains (47 % de moins de 18 ans) | DataReportal ; [Banque mondiale](https://www.worldbank.org/en/country/congo/overview) |
| Croissance PIB 2025 | +3,1 % (hors pétrole +3,8 %), inflation 2,9 % | Banque mondiale (mars 2026) |
| Pauvreté | 51,7 % (seuil 3,00 $ PPA 2021) | Banque mondiale |
| Dette publique | 97,4 % du PIB, pays en surendettement | Banque mondiale |
| Chômage des jeunes | ~42 % | Banque mondiale |
| Informalité | 70 % des emplois ; seuls 13 % des travailleurs sont dans des grandes entreprises ou des PME | [Banque mondiale – Inclusion économique des femmes et des jeunes](https://documents1.worldbank.org/curated/en/099050006282227757/pdf/P173535057d9e40ac08f95009ab647bf319.pdf) |
| Femmes entrepreneures | « 1 entrepreneur sur 6 est une femme » | [Fondation Sounga](https://fondationsounga.org/lincubateur-sounga-nga/) |
| Diaspora (transferts) | 11,6 Md FCFA (2023) → 24,3 Md (2024) → 32,5 Md (2025) ; 47 % aide familiale, 21 % investissement, 17 % construction | [allAfrica / Dépêches de Brazzaville, août 2026](https://fr.allafrica.com/stories/202608170176.html) |

**Lecture pour La Frangine** : la population est très jeune et urbaine. Le chômage est massif, l'économie est de subsistance informelle et le crédit est rare et cher (plus de 14 % par an selon le [JDN, mars 2026](https://www.journaldunet.com/start-up/1548353-brazzaville-prochaine-frontiere-de-la-tech-africaine-ce-que-les-startups-congolaises-revelent-de-l-afrique-centrale-de-demain/)). Le besoin n'est pas « un site d'annonces de plus ». Il s'agit d'**aider des gens qui se débrouillent à structurer, financer et développer une activité**. Les deux pôles, Brazzaville et Pointe-Noire, concentrent l'essentiel de la cible adressable en ligne.

### 1.2 Connectivité et usages numériques

| Indicateur | Valeur | Source |
|---|---|---|
| Connexions mobiles | 6,33 M (98,7 % de la population), dont 66,8 % en haut débit (3G/4G/5G) | DataReportal 2025 |
| Internautes | 2,46 M (38,4 %) ; **3,95 M de personnes hors ligne (61,6 %)** | DataReportal 2025 |
| Abonnés à l'internet mobile | 3,571 M (T2-2025) : 4G 46,4 %, 3G 30,1 %, **2G 23,4 %** | [ARPCE, Observatoire internet mobile T2-2025](https://arpce.org/api/publications/observatoire-du-marche-de-linternet-mobile-rapport-du-2e-trimestre-2025/download) |
| Trafic | 31,2 Md Mo sur le trimestre (+44 % sur un an), dont 79 % en 4G | ARPCE |
| Prix moyen pondéré | **0,55 FCFA/Mo** (≈ 560 FCFA/Go), −23,6 % sur un an | ARPCE |
| Dépense data moyenne (ARPU) | 1 590 FCFA/mois/abonné | ARPCE |
| Consommation moyenne (calcul) | ≈ **2,9 Go/mois/abonné** (31 176 M Mo ÷ 3,571 M ÷ 3 mois) | calcul d'après l'ARPCE |
| Parts de marché mobiles | MTN ≈ 59,7 % / Airtel ≈ 40,3 % (avril 2026) ; 4G : MTN 68 % | [Sikafinance, avril 2026](https://www.sikafinance.com/marches/congo-le-marche-de-la-telephonie-mobile-genere-6-4-milliards-fcfa-de-revenus-a-fin-avril-2026_63408), ARPCE |
| OS mobile (août 2026) | **Android 82 %**, iOS 18 % | [StatCounter CG](https://gs.statcounter.com/os-market-share/mobile/congo) (CSV) |
| Marques de mobiles (août 2026) | Tecno 23 %, Apple 17,8 %, Samsung 12,5 %, Itel 11,9 %, Huawei 11,3 %, Xiaomi 3,9 %, Infinix 2,5 % | [StatCounter vendeurs](https://gs.statcounter.com/vendor-market-share/mobile/congo) |
| Navigateur mobile | Chrome 79,6 %, Safari 14,8 %, Opera 2,6 % | [StatCounter navigateurs](https://gs.statcounter.com/browser-market-share/mobile/congo) |
| Moteur de recherche | **Google 96,3 %**, Bing 3,2 % | [StatCounter moteurs](https://gs.statcounter.com/search-engine-market-share/all/congo) |
| Réseaux sociaux (audiences publicitaires) | Facebook 1,10 M (17,1 %), LinkedIn 250 k (+25 %/an), Messenger 238 k, Instagram 165 k, X 31 k | DataReportal 2025 |
| Trafic social référent | Facebook ≈ 65–80 % des visites venues des réseaux sociaux | [StatCounter social](https://gs.statcounter.com/social-media-stats/all/congo) |

**Ce que ces chiffres imposent à la refonte**
- **Plus de la moitié des abonnés (53 %) sont encore en 2G ou 3G.** La performance réseau lent est un prérequis de conversion, pas une option. Pour rappel, 53 % des visites mobiles sont abandonnées au-delà de 3 s de chargement ([Think with Google via Marketing Dive](https://www.marketingdive.com/news/google-53-of-mobile-users-abandon-sites-that-take-over-3-seconds-to-load/426070/)).
- **Le parc est Android d'entrée de gamme** (Tecno, Itel, Infinix, Huawei, Samsung série A) avec Chrome. Il faut concevoir en *mobile-first* pour des écrans de 360–412 px de large et des processeurs modestes (JavaScript léger). La PWA est pleinement supportée sur Chrome Android, où se trouve l'essentiel de la cible.
- **Google est la porte d'entrée (96 %)** : le SEO local est un canal d'acquisition gratuit et sous-exploité par les concurrents locaux.
- **La data n'est pas hors de prix au Mo (≈ 560 FCFA/Go), mais elle est prépayée et rationnée** : environ 2,9 Go par mois en moyenne, et l'offre est quasi exclusivement prépayée selon l'ARPCE. Une page de 5 Mo « coûte » à l'utilisateur 1/600ᵉ de son budget mensuel à chaque visite. La légèreté est aussi une marque de respect.
- **WhatsApp est le canal conversationnel dominant.** DataReportal ne publie pas de chiffre WhatsApp pour le Congo, mais le parcours type (découverte sur Facebook, négociation sur WhatsApp, paiement Mobile Money, livraison à moto) est décrit de façon concordante par les acteurs du marché. Source à fiabilité moyenne : [Whakup](https://whakup.com/blog/geo-marches/whatsapp-ecommerce-congo-canal-vente-principal).
- **61,6 % de la population est hors ligne.** Pour toucher les commerçantes des marchés, il faudra un relais humain : ambassadrices de terrain, partenaires, agents.

### 1.3 Mobile Money, paiements et agrégateurs

**Poids du Mobile Money**

| Indicateur | Valeur | Source |
|---|---|---|
| Abonnés Mobile Money actifs | 2,8 M en 2022 (47,1 % de pénétration) ; MTN leader avec **71,5 %** | [ARTF/DGE, *Mobile money et inclusion financière en République du Congo*, enquête mai 2024](https://www.artf.cg/storage/download/publications/BItvf6e7Xn80iUaSDhSpbs0O7rXv7M7JzxxC4fqc.pdf) |
| Volume mensuel | 238 Md FCFA et 79 M de transactions (janvier 2024) | ARPCE, via [CIO Mag](https://cio-mag.com/congo-le-marche-du-mobile-money-compte-environ-28-millions-dabonnes-actifs-arpce/) |
| Volume annuel 2024 | **3 516 Md FCFA** : le Congo est 3ᵉ de la CEMAC après le Cameroun et le Gabon | BEAC, *Rapport sur les services de paiement dans la CEMAC 2024*, via [Agence Ecofin](https://www.agenceecofin.com/actualites/0705-138200-mobile-money-le-cameroun-domine-l-espace-cemac-avec-65-des-comptes-en-2024) |
| CEMAC 2024 | 51,2 M de comptes (+28 %), 34 779 Md FCFA (+20 %), 3,74 Md de transactions | BEAC, via [Investir au Cameroun](https://www.investiraucameroun.com/finance/0405-23354-cemac-le-cameroun-reste-roi-du-mobile-money-en-2024-avec-65-1-des-comptes-et-57-de-la-valeur-des-transactions) |
| Structure des usages | Dépôts, retraits et envois = **91,6 %** de la valeur ; paiements de services seulement ≈ 4–5 % | ARTF (données ARPCE 2021-2022) |
| Points de vente | **93,3 % des marchands Mobile Money sont à Brazzaville et Pointe-Noire** ; le cash-in/cash-out représente 75,5 % de leur activité, MoMo Pay et Airtel Money marchand environ 13 % | ARTF 2024 |
| Bancarisation | 528 202 comptes bancaires fin 2020, soit un taux d'inclusion bancaire de **8,8 %** | ARTF (DGIFN) |
| Frais | Transferts passés de 2,5 % à 3,5 % (2019), plus une taxe de 1 % sur les transferts électroniques | [RFSIC / OpenEdition](https://journals.openedition.org/rfsic/9767?lang=en) |

**Enseignements.** Le Mobile Money sert surtout à **envoyer et retirer de l'argent**. Le paiement en ligne d'un service reste un geste peu fréquent : il faudra l'expliquer, le rassurer et le rendre instantané. La sécurité est la première inquiétude des usagers, selon l'ARTF et le RFSIC (fraudes au code PIN). Les arnaques via de fausses offres diffusées sur WhatsApp et Facebook sont fréquentes ([ARPCE, sensibilisation](https://www.govern1.com/CG/Brazzaville/253207738024669/ARPCE-Congo) ; [Vox Congo](https://www.vox.cg/la-police-a-mis-la-main-sur-deux-arnaqueurs-de-transferts-monetaires-electroniques/)). La **charte anti-arnaque** doit donc être un élément central de la marque, et pas une simple mention en bas de page.

**Interopérabilité.** GIMACPAY (le switch régional de la BEAC) relie les banques, et MTN Congo et Airtel Congo sont annoncés sur la plateforme ([Business in Cameroon](https://www.businessincameroon.com/telecom/2207-10565-nexttel-yup-airtel-tchad-mtn-congo-others-to-soon-join-gimacpay) ; [allAfrica](https://fr.allafrica.com/stories/202010100407.html)). Les transferts MTN ↔ Airtel sont possibles, avec des frais. **Charden Farell** est une institution de microfinance de transfert d'argent créée en 2003, avec environ 87 agences dans les 12 départements et l'application *Charden Mobile* ([groupechardenfarell.com](https://www.groupechardenfarell.com/), [Google Play](https://play.google.com/store/apps/details?id=com.Charden_Farell_Mobile&hl=en_US)). C'est un canal de paiement légitime pour les non-utilisateurs de Mobile Money, mais il n'offre pas d'API publique identifiée, donc la confirmation reste manuelle.

**Agrégateurs de paiement : ce qui fonctionne réellement au Congo-Brazzaville**

| Prestataire | Congo-Brazzaville (XAF) ? | Opérateurs | Éléments vérifiés | Certitude |
|---|---|---|---|---|
| **pawaPay** | **Oui** | MTN (`MTN_MOMO_COG`), Airtel (`AIRTEL_COG`) | Documentation officielle des fournisseurs (XAF, pas de décimales, autorisation côté opérateur) ; pays listé sur le site ; utilisé par *My Tontine* pour la CEMAC ; partenariat Airtel Money Africa 2025 incluant le Congo-Brazzaville | **Élevée** sur la couverture ; **moyenne** sur l'onboarding (entité, KYB, tarifs non publics) |
| **MTN MoMo Open API** (direct) | Oui | MTN uniquement | Page officielle MTN Congo « Open API » (collectes, décaissements) → momodeveloper.mtn.com ; Congo listé | Élevée (mais onboarding opérateur plus lent, un contrat par opérateur) |
| **Airtel Africa Developer Portal** (direct) | Probable | Airtel uniquement | Portail panafricain Collections/Disbursements ; bibliothèque open source `lepresk/momo-api` ciblant Airtel Money Congo | Moyenne |
| CinetPay | **Non confirmé** | — | La documentation officielle liste la RD Congo (CDF) et, en XAF, le Cameroun. Seuls des blogs secondaires affirment le contraire | **Faible** : à exclure sauf preuve écrite |
| Flutterwave | **Non** (mobile money) | — | Le centre d'aide ne liste en XAF que le Cameroun (MTN, Orange) | Faible |
| MaxiCash, Flexpay, MeSomb | Incertain | — | Mentionnés uniquement par des blogs marketing | Faible |

**Recommandation paiement**
1. **pawaPay en solution principale.** Une seule API couvre MTN et Airtel (environ 100 % du Mobile Money congolais) pour les dépôts, les décaissements et les remboursements, avec des callbacks et une confirmation automatique. Cela supprime la confirmation manuelle par gestionnaire, qui est un frein majeur à la conversion.
2. **Repli** : intégrations directes MTN MoMo Open API et Airtel, par exemple via la bibliothèque `lepresk/momo-api`, si pawaPay refuse l'onboarding ou si ses tarifs sont prohibitifs.
3. **Conserver** « Cash » (en agence ou au bureau de l'avenue Nelson Mandela) et Charden Farell comme modes **déclaratifs** confirmés par un gestionnaire, avec un délai affiché (« confirmé en moins de 2 h ouvrées »).
4. **Architecture non-custodiale** : les fonds des Likelemba et des appels de fonds vont **directement d'un membre à l'autre** (ou vers un compte marchand d'un partenaire agréé). La Frangine n'encaisse que **ses propres frais de service**. Voir le §1.5 sur la réglementation.

### 1.4 Épargne informelle, tontines et inclusion financière

- La **likelemba** (tontine rotative, en lingala) est le premier outil d'épargne et de crédit des ménages et des commerçant·es. Longtemps surtout féminine, elle concerne aujourd'hui aussi les salariés et les petits comme les grands commerçants ([ADIAC](https://www.adiac-congo.com/content/la-tontine-financiere-une-banque-informelle-et-traditionnelle-qui-traverse-les-generations)). Elle sert d'épargne forcée, de protection contre le vol et la pression familiale, et de financement de besoins coûteux ([REVUE-CRIGED](https://criged-isc.org/pdfFile/78_20-35.pdf)). Les tontines se sont largement déplacées sur des **groupes WhatsApp**, avec des risques de défaut et de fraude ([Alternance](https://alternance.cd/2020/07/13/de-likelemba-bwakisa-carte-moziki-a-tontine-whatsapp-risque-ou-opportunite-pour-leconomie-informelle-congolaise-opinion-de-prince-bagula/)).
- Le taux d'inclusion financière moyen de la CEMAC est estimé à environ 42 %, sous la moyenne africaine (source secondaire). La BEAC a adopté une [Stratégie régionale d'inclusion financière](https://www.beac.int/wp-content/uploads/2025/02/Strat%C3%A9gie-R%C3%A9gionale-dInclusion-Financi%C3%A8re-de-la-CEMAC.pdf) en 2025.
- **Opportunité** : digitaliser la **gestion** (calendrier, rappels, reçus, score de fiabilité, cautions et témoins) des likelemba **existantes**, sans détenir les fonds. C'est exactement ce que font Djangui (en mode déclaratif) et My Tontine (Mobile Money via pawaPay), et le legacy de La Frangine possède déjà la logique métier (groupes, cotisations, cautions, témoins).

### 1.5 Cadre réglementaire à intégrer dès la conception

| Sujet | Texte | Conséquence pour La Frangine |
|---|---|---|
| Collecte d'épargne / microfinance | Règlement n°01/17/CEMAC/UMAC/COBAC (en vigueur depuis le 1er janvier 2018) : l'activité de microfinance sans agrément est interdite ([texte, SGG Congo](https://www.sgg.cg/txts-droit-reg/cemac-reglement-2017-01-exercice-controle-microfinance.pdf)) | **Épargne solidaire « placements rémunérés entre membres »** et **« carte de pointage » avec solde géré par la plateforme** : risque d'exercice illégal. Il faut les transformer en outil de suivi déclaratif, ou les opérer **en partenariat avec une IMF agréée** (Charden Farell est une IMF) |
| Services de paiement / monnaie électronique | Règlement n°04/18/CEMAC/UMAC/COBAC du 21/12/2018 ([BEAC](https://www.beac.int/wp-content/uploads/2019/07/REGLEMENT-N-04-18-CEMAC-UMAC-COBAC-du-21-d%C3%A9cembre-2018.pdf)) | Ne pas tenir de comptes de paiement pour des tiers. Passer par un prestataire agréé ou un agrégateur, et n'encaisser que ses propres frais |
| Financement participatif | Règlement n°01/22/CEMAC/UMAC/CM/COSUMAF (23/07/2022) : « conseiller en financement participatif » agréé par la COSUMAF. Plan d'action 2026 de la COSUMAF : opérationnaliser le crowdfunding d'investissement ([Droit Médias Finance](https://www.droitmediasfinance.com/index.php/actualites/droit-des-marches-financiers/943-cemac-uemoa-quelles-recentes-evolutions-du-cadre-juridique-du-financement-participatif-ou-crowdfunding), [Investir au Cameroun](https://www.investiraucameroun.com/finance/2904-23336-crowdfunding-en-cemac-la-cosumaf-prepare-un-nouveau-guichet-de-financement-pour-les-pme)) | **Appels de fonds** en « crédit » et « actionnariat » : à limiter à de la **mise en relation** avec avertissement, sans intermédiation de fonds, en attendant un éventuel agrément. Le **don** est le mode par défaut. C'est aussi une **opportunité** : se positionner tôt comme candidat conseiller agréé |
| Données personnelles | Loi n°29-2019 du 10 octobre 2019 : consentement exprès, transparence, information ([Ministère de l'Économie](https://www.economie.gouv.cg/fr/content/loi-n%C2%B029-2019-du-10-octobre-2019-portant-protection-des-donn%C3%A9es-%C3%A0-caract%C3%A8re-personnel)) ; lois de 2019 sur la cybersécurité et les transactions électroniques | Consentement explicite (WhatsApp, marketing), politique de confidentialité claire, **fin du stockage des mots de passe en clair** (constaté dans le legacy), minimisation des données (situation matrimoniale, nombre d'enfants…) |
| Forever Living (FLP) | Politique FBO : interdiction de prétendre que les produits préviennent, traitent ou guérissent une maladie ; interdiction des promesses de revenus. Ordonnance **FTC (avril 2026)** : au moins **77 % des FBO sans aucun revenu** sur 5 ans, **89 % des nouveaux n'ont pas récupéré leur mise de départ (plus de 300 $)** en 2 ans ([FTC](https://www.ftc.gov/news-events/news/press-releases/2026/04/ftc-order-prohibit-forever-living-its-operators-deceiving-consumers-about-potential-earnings)) | Supprimer les fiches « maladie → produit + posologie ». Pas de promesse de gains dans l'assistant d'adhésion (kit de 56 000 à 66 000 FCFA) : afficher un avertissement et des chiffres réalistes. Ne pas mettre le MLM en avant sur la marque principale (risque réputationnel) |

### 1.6 Écosystème entrepreneurial et d'appui (des partenaires, pas des concurrents)

- **ACPCE** : création d'entreprise **100 % en ligne depuis le 5 décembre 2025** ([monentreprise.acpce.cg](https://monentreprise.acpce.cg/)), numéro court 1730, **5 000 entreprises créées en 2025** ([Panoramik](https://www.panoramik-actu.com/creer-son-entreprise-au-congo-en-ligne-et-sans-se-deplacer-cest-desormais-une-realite/)). La taxe unifiée pour une entreprise individuelle est d'environ 100 000 FCFA (source secondaire).
- **PSIPJ** (Banque mondiale, 133 M$) : **40 000 jeunes accompagnés vers l'auto-emploi** et 5 000 apprentis. Budget 2026 de 44,12 Md FCFA, avec une application mobile de suivi des ventes et de conseil prévue ([Afrik.com](https://www.afrik.com/congo-la-banque-mondiale-en-mission-sur-le-psipj-dote-de-133-millions-de-dollars), [Congo-B](https://congo-b.com/jeunesse-45-000-opportunites-en-2026/)). C'est **la plus grande cohorte de nouveaux micro-entrepreneurs du pays**, et donc un partenaire et client B2G potentiel.
- **FIGA** (Fonds d'impulsion, de garantie et d'accompagnement, 2019) : crédit KOLISA et incubation O-SEED ; partenariat avec Bpifrance ([Bpifrance](https://presse.bpifrance.fr/bpifrance-et-le-fonds-dimpulsion-de-garantie-et-daccompagnement-figa-du-congo-renforcent-leur-partenariat-pour-faicilier-lacces-au-financement-des-pme-et-accompagner-la-creation-dentreprises-au-congo), [allAfrica](https://fr.allafrica.com/stories/202609030605.html)).
- **ADPME** (2022), incubateurs **Sounga Nga** (femmes entrepreneures, 5ᵉ édition en 2026), **Kosála**, **Bantu Hub**, salon **OSIANE** (9ᵉ édition en 2025). Loi start-up de 2022 encore peu appliquée ([JDN](https://www.journaldunet.com/start-up/1548353-brazzaville-prochaine-frontiere-de-la-tech-africaine-ce-que-les-startups-congolaises-revelent-de-l-afrique-centrale-de-demain/)).
- **Marchés publics** : l'ARMP publie le BOAMP (bulletins PDF, accès à l'achat ou par abonnement, [armp.cg](https://armp.cg/)) ; la DGCMP gère la commande publique ; le Ministère des Finances publie aussi des appels d'offres nationaux ([finances.gouv.cg](https://www.finances.gouv.cg/fr/type/appels-doffres-national)). **L'information existe mais elle est dispersée, en PDF et peu lisible sur mobile.** Des agrégateurs émergent (WuriPay, GlobalTenders).

**Synthèse du §1.** Le marché réunit trois conditions favorables à un « accompagnateur » numérique : ① une masse de micro-entrepreneurs informels et de jeunes poussés vers l'auto-emploi, ② un rail de paiement mature (Mobile Money) mais sous-utilisé pour les services, ③ un écosystème d'appui public et bailleur riche mais **fragmenté et peu digitalisé côté usager**. La Frangine peut être **l'interface humaine et mobile** entre ces trois mondes.

## 2. Concurrents et alternatives par section

> Légende du modèle économique : **[V]** vérifié sur le site ou dans une source, **[I]** inféré (pratique habituelle du secteur, à confirmer).

### 2.1 Emploi (section « Ressources humaines »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **ACPE** – [acpe.cg](https://www.acpe.cg/offres-emplois) (agence publique) | Accompagner chercheurs d'emploi et entreprises vers l'insertion | **3 574 offres** (Brazzaville 1 554, Pointe-Noire 1 823), gratuité, légitimité publique, suivi des candidatures | Inscription obligatoire pour consulter, horaires de guichet (7h30–14h), UX administrative | Service public gratuit [V] | Afficher un **volume d'offres par ville** ; suivi du statut de candidature |
| **Emploi.cg** – [emploi.cg](https://www.emploi.cg/) | Leader privé : offres, CVthèque, annuaire des recruteurs | Notoriété, SEO fort (pages par ville et par métier), fiches recruteurs | Généraliste, peu d'accompagnement, protection anti-robots (site non joignable par un outil automatisé) | Annonces et CVthèque payantes pour les recruteurs [I] | Pages SEO « emplois à Brazzaville / Pointe-Noire », fiche recruteur |
| **CoinAfrique Emplois**, **Jumia Deals (Afribaba/Vendito)** – [jumia.cg](https://www.jumia.cg/offres-emploi), **GoAfricaOnline**, **Jooble** | Offres d'emploi intégrées à des sites d'annonces ou d'agrégation | Trafic existant | Qualité hétérogène, offres non vérifiées | Mise en avant payante [I] | — |
| **Groupes Facebook** (« Offres d'emploi Congo Brazzaville », « OFFRES D'EMPLOI – CONGO BZ »…) | Diffusion instantanée et gratuite | Audience de dizaines de milliers de membres, réactivité, gratuit | Arnaques (fausses offres payantes), aucun filtre, offres éphémères | Gratuit | Relayer ses propres offres **vérifiées** dans ces groupes ; badge « offre vérifiée » |
| **UNICONGO** (patronat) – [unicongo.cg](https://www.unicongo.cg/recrutement/), **LinkedIn** (250 k utilisateurs, +25 %/an) | Recrutement de cadres et d'entreprises formelles | Qualité des recruteurs | Peu accessibles aux profils informels | Service aux adhérents [I] / freemium | — |

**Verdict** : ne pas concurrencer frontalement. La section RH devient un **flux d'opportunités** au service des jeunes porteurs de projet (stages, missions, emplois vérifiés) et un **outil pour les TPE membres** (publier une offre en 2 minutes, relayée sur WhatsApp et Facebook). Le JobPosting (schema.org) donne une visibilité gratuite dans Google.

### 2.2 Petites annonces, immobilier, commerce et livraison (section « E-commerce »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **CoinAfrique Congo** – [cg.coinafrique.com](https://cg.coinafrique.com/) | « Achète facile, vends rapide » : annonces gratuites, 12 catégories, 13 villes | Leader des annonces, application Android, **invitation « ajouter à l'écran d'accueil »** (PWA), filtres ville/quartier/prix, badges « Top annonce », « Livraison disponible » | Pas de vérification forte des vendeurs, arnaques possibles | Annonces gratuites + **boosts « Top annonces »** payants [V] | Boosts à petit prix, filtres par quartier, PWA, publication en moins d'une minute |
| **Facebook Marketplace** et groupes de vente | Gratuit, audience maximale, contact par Messenger ou WhatsApp | Audience de 1,1 M, zéro friction | Aucune confiance, pas de paiement, mauvaise recherche | Gratuit (publicité Meta) | Contact WhatsApp en un clic sur chaque annonce |
| **Jumia Deals / Afribaba** – jumia.cg | Annonces généralistes | Marque connue | Jumia Deals a fermé au Cameroun en 2024, activité incertaine ([Localhost Digital](https://localhost-digital.com/2024/04/03/jumia-deals-nest-plus-disponible-au-cameroun-le-site-annonceflash-prend-le-relais/)) | Mise en avant [I] | — |
| **Kusosa** – [kusosa.com](https://kusosa.com/location/appartements/brazzaville) | « Recherche immobilière simplifiée », **annonces vérifiées**, visite en ligne, **sécurisation de visite** | Confiance (vérification + visite accompagnée), WhatsApp, offre PRO et CRM pour les agences | Faible volume (18 appartements à Brazzaville au moment du relevé) | Abonnements PRO et CRM agences [V] | **Badge « annonce vérifiée »**, « visite sécurisée », offre B2B aux agences |
| **Maisonbrazza**, **Icazi**, **Immobilier 3.0**, **NBY Immo** | Sites immobiliers et agences locales | Spécialisation, filtres par quartier (Moungali, Ouenzé, Poto-Poto, Bacongo…) | Volumes modestes, sites d'agence | Commissions d'agence [I] | Pages par quartier |
| **Asepeli** (Pointe-Noire) | Marketplace et boutique en ligne généraliste | Pionnier local (cité dès 2018), présence Facebook | Logistique, stocks | Marge et commission vendeurs [I] | — |
| **Yango** (Brazzaville depuis 2023) · **Noki Noki** (livraison de proximité, Brazzaville/Pointe-Noire/Dakar/Abidjan/Libreville, 3 M$ en seed) · moto-coursiers (1 000 à 3 000 FCFA par course) | Transport et livraison à la demande | Flottes, applications, suivi | Tarifs élevés pour les petites commandes (Yango) | Commission par course [V] | **Partenariat plutôt que construction** du service « Courses » |

**Verdict** : les annonces sont un marché « winner-takes-most » dominé par CoinAfrique et Facebook. La Frangine ne gagnera pas sur le volume, mais peut gagner sur **la confiance et la niche** :
- **Immobilier vérifié** : visite accompagnée par une « frangine », pour la diaspora et les jeunes actifs ;
- **Annonces B2B entre membres** (stock, matériel, troc) ;
- le **service Courses** repositionné en « **Courses pour ma famille** » pour la **diaspora** (32,5 Md FCFA de transferts en 2025, dont 47 % d'aide familiale), exécuté par un partenaire de livraison.

### 2.3 Financement participatif (section « Appels de fonds »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **M-Changa** (Kenya) – [mchanga.africa](https://www.mchanga.africa/) | Collectes pour frais médicaux, obsèques, mariages, projets de groupe | Mobile Money natif, **collectes par USSD sans internet**, transparence en temps réel | Uniquement le don | Commission de **4,25 % à environ 5 %** des fonds collectés [V] | Page de collecte simple, jauge « collecté / objectif », partage WhatsApp |
| **Fiatope** – [fiatope.com](https://www.fiatope.com/financement-participatif-en-afrique-le-jackpot-sous-certaines-conditions) | Financement d'amorçage de projets à impact en Afrique | Positionnement entrepreneuriat | Audience limitée | Commission [I] | Récit du porteur, contreparties |
| **Afrikwity** (equity), **MiProjet** (Côte d'Ivoire, structuration + financement) – [ivoireprojet.com](https://ivoireprojet.com/) | Structurer puis financer des PME | **Accompagnement avant la levée** | Réglementation, faible liquidité | Frais de structuration + success fee [I] | **« Structurer avant de lever »** : colle au legacy (business plan puis appel de fonds) |
| **Plateformes internationales** (GoFundMe, Leetchi, Kiva, Babyloan) | Collecte auprès de la diaspora | Paiement par carte, confiance | Pas de Mobile Money congolais ; seules **3 %** des levées « Afrique » passent par des plateformes africaines ([Cambridge CCAF, via Fiatope](https://www.fiatope.com/financement-participatif-en-afrique-le-jackpot-sous-certaines-conditions)) | Frais de 0 à 8 % | — |
| **Collectes WhatsApp** et famille | Solidarité immédiate | Confiance interpersonnelle | Aucune traçabilité | Gratuit | Traçabilité et reçus |

**Verdict** : la réglementation COSUMAF interdit, sans agrément, l'intermédiation de prêts et de titres. Recommandation : des **appels de fonds « dons & promesses »** vers des projets **vérifiés et accompagnés**, avec des fonds versés directement au porteur et une jauge « promis / collecté » (déjà dans le legacy). La mise en relation « crédit / investissement » reste **informative**, avec un avertissement. En parallèle, étudier une demande d'agrément de conseiller en financement participatif (COSUMAF 2026) : c'est une barrière à l'entrée future.

### 2.4 Tontines digitales (section « Likelemba »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **Djangui 3.0** – [djangui.net](https://djangui.net/?lang=en) | « Tontine digitale n°1 en Afrique », coach financier IA | 15+ pays **dont le Congo**, multi-opérateurs, **non-custodial** (mode déclaratif), score de réputation, fonds de solidarité | Marque camerounaise, pas de présence physique au Congo, promesse IA peu concrète | **Freemium** : gratuit (2 groupes / 10 membres), Premium **2 500 FCFA/mois**, Business **9 900 FCFA/mois** [V] | Mode déclaratif, score de fiabilité, freemium par nombre de groupes |
| **My Tontine** – [mytontine.app](https://mytontine.app/fr) | « La tontine de demain, aujourd'hui », CEMAC + Afrique de l'Ouest | **Mobile Money via pawaPay**, **score de fiabilité des membres** (ex. 87 % « Excellent »), rappels SMS et e-mail | Traction faible affichée (« 127 membres actifs ») | Gratuit / Premium 15 000 FCFA/an / Entreprise 50 000 FCFA/an, **plus une commission sur les frais de gestion** (60 %, 30 %, 15 %) [V] | Preuve que pawaPay fonctionne en CEMAC ; transparence des commissions avec exemples chiffrés |
| **MaTontine** (Sénégal) – [GSMA](https://www.gsma.com/mobilefordevelopment/digital-grantees-portfolio/matontine/) | Digitaliser les tontines de femmes puis leur donner accès au crédit et à l'assurance | 95 % de femmes, **défaut nul sur les micro-prêts**, fonctionne par SMS et USSD | Croissance lente | Commissions sur crédit et assurance distribués [V] | **L'historique de tontine comme score de crédit**, vendu à des IMF partenaires |
| **MoneyFellows** (Égypte) – [TechCrunch](https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt) | Cercles d'épargne numériques et accès anticipé au pot | **8,5 M d'utilisateurs**, 13 M$ levés en 2025, scoring comportemental | Modèle qui porte du risque de crédit | Frais pour les premières positions de tirage [V] | **Faire payer le droit de recevoir le pot en premier** (tirage anticipé) |
| **PiggyVest** (Nigeria) | Épargne ciblée et bloquée | **6 M d'utilisateurs**, 1 300 Md NGN versés en 2025 ([TechPoint](https://techpoint.africa/news/piggyvest-2025-payouts/)) | Nécessite une licence | Marge sur les placements [V] | Ton, pédagogie, « épargne bloquée » ludique |
| **Groupes WhatsApp + cahier** (statu quo) | Confiance entre proches | Gratuit, familier | Défauts, litiges, aucun reçu | Gratuit | C'est **le vrai concurrent** : l'import d'un groupe WhatsApp existant doit prendre moins de 2 minutes |

**Verdict** : c'est le **meilleur actif différenciant** de La Frangine. Le lingala « Likelemba » est un nom local fort, la logique métier du legacy est riche (cautions, témoins, reçus séquentiels) et la conseillère humaine peut arbitrer les litiges. Les concurrents sont étrangers et sans ancrage local. À construire : ① la **gestion déclarative gratuite**, ② le paiement MoMo/Airtel via pawaPay en option, ③ un score de fiabilité, ④ **à terme**, l'historique comme passerelle vers le crédit d'une IMF partenaire.

### 2.5 Annuaires d'entreprises, comparateur de prix et appels d'offres (section « Entreprises - Marchés »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **GoAfricaOnline** – [goafricaonline.com](https://www.goafricaonline.com/directory) | Annuaire panafricain et pages entreprises | SEO, volume, emploi intégré | Données souvent anciennes | Pages premium [I] | Fiche entreprise riche et référencée |
| **CongoFinder**, **Congopro**, **Africannuaire**, **Cybo**, pages jaunes de congobrazza.info | Annuaires généralistes | Inscription gratuite | Fraîcheur et vérification des données faibles | Freemium [I] | — |
| **ARMP / BOAMP** – [armp.cg](https://armp.cg/) | Publication officielle des avis de marchés publics | Source officielle | PDF, accès payant ou par abonnement, peu lisible sur mobile | Vente de bulletins et abonnements [V] | Source à **reformater** en fiches mobiles |
| **WuriPay** – [wuripay.com/marches-publics/congo](https://wuripay.com/marches-publics/congo) | Agrégation des appels d'offres (125 actifs, 52 à Brazzaville) | **Alertes e-mail et WhatsApp**, filtres secteur et ville, export des DAO | Pas d'accompagnement à la soumission | **Freemium, 7 jours d'essai** puis abonnement [V] | **Alertes WhatsApp par secteur** (produit Pro) |
| **GlobalTenders**, **DgMarket**, sites des bailleurs (UE, BDEAC) | Agrégateurs internationaux | Exhaustivité | En anglais, chers, orientés grands comptes | Abonnement [V] | — |
| **Comparateurs bancaires** | — | — | **Aucun comparateur de frais bancaires identifié pour le Congo-Brazzaville.** Bankizy ne couvre que la France ; les banques publient leurs conditions en PDF (ex. [UBA Congo](https://www.ubacongobrazzaville.com/wp-content/uploads/sites/10/2024/10/CONDITIONS-DE-BANQUE-UBA-CONGO-2023-derniere-version.pdf)) | — | **Espace libre** : un « benchmark des tarifs bancaires » en contenu SEO et produit d'appel |

**Verdict** : l'annuaire seul n'a pas de valeur (marché saturé, données mortes). Sa valeur apparaît s'il est **le résultat de l'activité des membres** : fiche entreprise créée pendant l'accompagnement et **vérifiée** (RCCM/NIU), réussites publiées. Les **appels d'offres** sont un excellent produit **Pro payant** (alertes WhatsApp + aide à la constitution du dossier), à condition d'offrir plus qu'un agrégateur : un accompagnement au dossier.

### 2.6 Conseil financier et accompagnement des PME (sections « Offres financières » et « Le saviez-vous ? »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **FIGA** | Garantie, crédit KOLISA, incubation (O-SEED) | Financement réel, légitimité publique | Capacité limitée, processus longs, faible présence numérique côté usager | Public [V] | **Partenaire prioritaire** : préparer des dossiers « FIGA-ready » |
| **ADPME**, **ACPCE** (création en ligne, 1730) | Appui aux PME, formalisation | Gratuité, légitimité | Guichets, communication institutionnelle | Public [V] | Guides pas à pas « Créer mon entreprise sur monentreprise.acpce.cg » |
| **PSIPJ** (Banque mondiale) | 40 000 jeunes vers l'auto-emploi en 2026 | Budget important (44 Md FCFA en 2026) | Besoin d'outils de suivi numérique | Projet bailleur [V] | **Client B2G** : suivi des bénéficiaires, conseil, marketplace |
| **Incubateurs** (Sounga Nga, Kosála, Bantu Hub, O-SEED) | Formation et incubation par cohortes | Qualité, réseau | Petites cohortes (ex. 19 diplômées en 2023 chez Sounga Nga) | Subventions, services (coworking, domiciliation) [V] | Partenariats de sourcing de projets et de témoignages |
| **societe.cg** | Portail de guides pour entrepreneurs | Contenu SEO | Pas d'accompagnement humain | Contenu, services [I] | Stratégie de contenu |
| **Banques** (11 établissements : BGFI, Ecobank, UBA, LCB, BCI, Crédit du Congo, MUCODEC…) et **IMF** (Charden Farell, MUCODEC) | Crédit, comptes | Capacité de financement | Garanties exigées, taux élevés, peu adaptées à l'informel | Intérêts, frais | **Client B2B** : génération de leads qualifiés (dossiers « bancables ») |
| **Fintechs locales** (MoneyVerse : avance sur salaire ; Abiki Brokers : micro-assurance) | Services financiers ciblés | Innovation | Jeunes, petite échelle | Commissions | Partenariats de distribution |

**Verdict** : le point le plus faible du marché est **l'interface humaine de proximité** entre l'entrepreneur informel et ces dispositifs. C'est **le cœur du positionnement** : La Frangine diagnostique, oriente, prépare les dossiers et suit. Elle ne prête pas elle-même.

### 2.7 Distribution Forever Living en ligne (section « Opportunité d'affaire »)

| Acteur | Proposition de valeur | Points forts | Faiblesses | Modèle économique | À emprunter |
|---|---|---|---|---|---|
| **Site officiel FLP Congo** – [foreverliving.com/cog](https://foreverliving.com/cog/fr-cg/home) | Catalogue et inscription FBO | Marque mondiale | Site instable lors de nos tests (erreurs de connexion) | Vente directe [V] | — |
| **Sites de distributeurs indépendants** (ex. [aloe-vera-pour-tous.com](https://www.aloe-vera-pour-tous.com/afrique-republique-du-congo), aloeveramaroc.net « Forever Congo ») | Recrutement de distributeurs par pays | SEO multi-pays | Discours souvent promotionnel, parfois non conforme | Commissions de parrainage [V] | Rien, sauf la conformité à respecter |
| **Pages Facebook et WhatsApp de FBO** | Vente de proximité | Relation personnelle | Allégations santé fréquentes | Marge + parrainage | — |

**Verdict** : c'est une source de revenus d'appoint (catalogue de 130 produits déjà migré), mais **incompatible avec une marque de confiance si elle est mise en avant**. Recommandation : un espace « **Boutique bien-être** » (catalogue, commande, livraison) et une page « Devenir distributeur » **conforme** (avertissement sur les revenus, aucune promesse de gains, aucune allégation santé), accessibles depuis le pilier « Trouver des opportunités » mais **jamais dans le hero**.

### 2.8 Synthèse : carte des espaces libres

| Besoin | Saturé | Partiellement couvert | **Libre** |
|---|---|---|---|
| Publier une annonce / trouver un objet | CoinAfrique, Facebook | — | — |
| Trouver un emploi | ACPE, Emploi.cg, groupes Facebook | — | — |
| Gérer une tontine | — | Djangui, My Tontine (étrangers, faible traction locale) | **Likelemba locale + arbitrage humain + passerelle vers le crédit** |
| Être accompagné de l'idée au financement | — | Incubateurs (petites cohortes), FIGA, ADPME (guichets) | **Accompagnement humain, numérique, WhatsApp-first, à grande échelle** |
| Trouver des marchés publics | — | ARMP (PDF), WuriPay (agrégation) | **Alertes + aide au dossier pour TPE** |
| Comparer les frais bancaires | — | — | **Benchmark local** (contenu SEO + lead-gen) |
| Faire confiance à un inconnu en ligne | — | Kusosa (immobilier vérifié) | **Vérification des membres, charte anti-arnaque, médiation** |

## 3. Diagnostic de l'ancien site et choix du positionnement

### 3.1 Ce que disent les données de production

Voir `docs/MIGRATION_STATUS.md` et `docs/data-dictionary-*.md`.

| Donnée réelle | Valeur | Lecture |
|---|---|---|
| Membres inscrits | **68** en environ 10 ans | Aucune dynamique d'acquisition |
| Visites journalisées | 10 032 ; 596 visites de membres connectés | Taux de visite vers inscription très faible, et membres peu revenus |
| Articles e-commerce | 15 | Pas de masse critique côté offre |
| Sujets de conseil / forum | 14 | Communauté inexistante |
| Partenariats / troc | 6 | Idem |
| Appels de fonds exploitables | Quasi nuls (le 1er rattaché à une entreprise inexistante) | Aucune preuve de réussite à montrer |
| Tables jamais utilisées | **18 sur 65** (accompagnement ×4, benchmarking ×3…) | Fonctionnalités construites sans demande |
| Opérations de caisse / bancaires | 89 pointages, 22 ordres de virement | Usage surtout interne ou gestionnaire |
| Messages | 35 | Le canal humain existait mais restait enfoui |

### 3.2 Pourquoi une plateforme « fourre-tout » à 7 sections convertit mal

1. **Pas de promesse compréhensible en 5 secondes.** « Le site qui vous accompagne dans votre initiative » ne dit ni *pour qui*, ni *quoi*, ni *quel résultat*. L'accueil empile 7 blocs de texte de même poids, avec « Continuer la suite » comme seul appel à l'action (relevé sur lafrangine.primera-c.net).
2. **Sept marchés à deux faces à amorcer en même temps.** Emploi (candidats/recruteurs), annonces (vendeurs/acheteurs), crowdfunding (porteurs/contributeurs), tontines, annuaire, comparateur, forum… Chacun exige une masse critique. Avec 68 membres, **chaque section paraît vide**, et le vide fait fuir (preuve sociale négative).
3. **L'inscription est une douane.** 14 règles : captcha de 9 lettres, pseudo d'au moins 6 caractères, mot de passe + confirmation, situation matrimoniale obligatoire, « droit point de caisse » obligatoire, ville… Tout cela est demandé **avant d'avoir reçu la moindre valeur**. Le benchmark e-commerce indique qu'environ 8 champs suffisent là où la moyenne est de 11,3, et que chaque champ superflu fait chuter la conversion ([Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)).
4. **Aucun signal de confiance.** Il n'y a ni visage, ni témoignage, ni chiffre, ni partenaire, ni mentions légales détaillées. Le copyright date de 2016. Le paiement est confirmé à la main, sans délai annoncé. Côté sécurité, les mots de passe étaient stockés en clair et la récupération **affichait le mot de passe à l'écran**. Or l'environnement est marqué par les arnaques au Mobile Money.
5. **Le cœur humain était caché.** La vraie différence (une conseillère « la frangine », un questionnaire « Découverte de soi », un conseiller clientèle en offres financières) était enfouie au 2ᵉ ou 3ᵉ niveau de menu, alors que c'est **ce que les concurrents n'ont pas**.
6. **Incohérences de marque et risques.** Le MLM Forever Living côtoie la finance solidaire, des fiches santé affichent des posologies et des « placements rémunérés » ne sont pas agréés. Ce mélange **abîme la crédibilité** d'une plateforme qui manie l'argent des gens.
7. **Pas de boucle de retour.** Il n'y a ni notification, ni WhatsApp, ni e-mail de relance, ni raison de revenir. Une plateforme communautaire sans canal de rappel meurt.

### 3.3 Positionnements possibles

| Critère (pondération) | A. « Super-app de l'entrepreneur congolais » | **B. « La grande sœur qui accompagne ceux qui se lancent »** | C. « Inclusion financière / tontine d'abord » | D. « Le site d'annonces local » |
|---|---|---|---|---|
| Différenciation face aux concurrents (25 %) | Moyenne (tout le monde veut être une super-app) | **Forte** (humain + local + marque « frangine ») | Moyenne (Djangui, My Tontine) | Faible (CoinAfrique, Facebook) |
| Faisabilité avec les ressources actuelles (20 %) | Faible (7 produits à bâtir et animer) | **Bonne** (1 parcours cœur + des modules existants) | Bonne | Bonne techniquement, intenable commercialement |
| Adéquation avec la marque (15 %) | Faible | **Excellente** (« la frangine », conseillère existante) | Moyenne | Faible |
| Potentiel de revenus (20 %) | Élevé en théorie, lointain | **Bon** (Pro, B2B/B2G, frais de service) | Moyen (tickets faibles, régulation) | Faible (boosts, publicité) |
| Risque réglementaire (10 %) | Élevé | **Maîtrisé** (non-custodial, orientation vers des acteurs agréés) | Élevé si détention de fonds | Faible |
| Vitesse pour obtenir des preuves de succès (10 %) | Lente | **Rapide** (premiers diagnostics et accompagnements en semaines) | Moyenne | Lente (masse critique) |
| **Score indicatif / 5** | 2,4 | **4,4** | 3,2 | 2,1 |

### 3.4 Positionnement recommandé

**Promesse de marque**
> **La Frangine — La grande sœur de ceux qui se lancent.**
> *Un conseil humain sur WhatsApp, une Likelemba sans prise de tête et les bonnes opportunités au bon moment, pour faire grandir votre activité au Congo.*

**Proposition de valeur (canevas)**
- **Pour** les commerçant·es, artisan·es, jeunes porteurs de projet et petites entreprises de Brazzaville, Pointe-Noire et d'ailleurs au Congo,
- **qui** se lancent ou se débrouillent seuls, sans banque, sans réseau et sans savoir par où commencer,
- **La Frangine est** une plateforme d'accompagnement mobile, adossée à de vraies conseillères,
- **qui** diagnostique votre projet en 3 minutes, vous oriente vers les bons dispositifs (ACPCE, FIGA, IMF, banques), organise votre épargne en groupe (Likelemba) et vous signale les marchés, emplois et partenaires utiles,
- **contrairement aux** groupes WhatsApp et sites d'annonces, où l'on est seul face aux arnaques, **La Frangine** vérifie les membres, trace chaque franc et reste joignable par une personne qui vous connaît.

**Pourquoi « grande sœur » fonctionne**
- C'est l'archétype local de confiance : celle qui conseille, avance un peu d'argent, présente les bonnes personnes et gronde quand il le faut. Le nom de marque est donc **déjà un positionnement** que l'ancien site n'exploitait pas.
- Elle humanise une offre financière dans un marché où la **sécurité est la première inquiétude** (ARTF 2024).
- Elle parle naturellement aux **femmes entrepreneures**, sous-représentées (1 sur 6) et cœur historique des likelemba, **sans exclure** les hommes : « frangine » est un terme affectueux et unisexe dans l'usage.

### 3.5 Cibles prioritaires (personas)

| Persona | Profil | Besoins / douleurs | Équipement et canaux | Déclencheur de conversion | Priorité |
|---|---|---|---|---|---|
| **Grâce, 31 ans, commerçante** (pagnes et cosmétiques, marché Total, Bacongo) | Activité informelle depuis 6 ans, vend aussi via le statut WhatsApp, membre de 2 likelemba | Financer son stock, sécuriser sa tontine (un membre a déjà disparu avec le pot), se formaliser « un jour » | Tecno Android, MTN MoMo, forfaits data à la semaine, Facebook + WhatsApp | « Organisez votre likelemba : rappels, reçus, garants. Gratuit. » + une conseillère qui parle comme elle | **P1 (cœur)** |
| **Junior, 24 ans, jeune diplômé** (Pointe-Noire) | Licence en gestion, sans emploi, candidat au PSIPJ, idée de lavage auto ou de restauration | Savoir si son idée tient, rédiger un business plan, trouver des financements et des stages | Itel/Infinix, Airtel Money, Facebook, groupes d'offres d'emploi | « Votre idée tient-elle la route ? Diagnostic gratuit en 3 min » | **P1 (volume)** |
| **M. Okemba, 46 ans, gérant de TPE BTP** (Brazzaville, 12 salariés) | RCCM et NIU en règle, réponses sporadiques aux appels d'offres | Ne rater aucun marché, monter des dossiers, accéder au crédit et au découvert | Samsung, WhatsApp, LinkedIn, e-mail | « Recevez les marchés de votre secteur sur WhatsApp, avec l'aide au dossier » (Pro) | **P2 (monétisation)** |
| **Nadège, 38 ans, diaspora** (Paris) | Envoie de l'argent à sa famille chaque mois, veut financer le commerce de sa mère | Être sûre que l'argent sert au projet, faire livrer des courses, investir sans se faire avoir | iPhone, carte bancaire, WhatsApp | « Suivez le projet que vous financez, preuves à l'appui » | **P3 (secondaire)** |

### 3.6 Nouvelle hiérarchie de l'offre (de 7 menus à 3 piliers)

| Pilier (navigation) | Contenu issu du legacy | Mise en avant | Décision |
|---|---|---|---|
| **1. Se lancer** *(cœur)* | Découverte de soi → **Diagnostic entrepreneur** ; auto-diagnostic Business Plan ; Accompagnement (business plan bancable, projet agricole, restructuration de crédit, crédit immobilier) ; forum Conseil → **Questions à la frangine** ; guides (créer son entreprise sur l'ACPCE, ouvrir un compte…) | **Hero + CTA principal** | Fusionner les questionnaires dans un **diagnostic progressif unique** ; accompagnement en forfaits |
| **2. Financer & épargner** | **Likelemba** ; Appels de fonds (dons et promesses, projets vérifiés) ; Offres financières (demande de crédit orientée vers les partenaires, placements via des partenaires agréés, contentieux et restructuration) ; **Benchmark des tarifs bancaires** | 2ᵉ bloc de l'accueil | Likelemba = produit phare n°2. **Épargne solidaire et carte de pointage** : retirées du public, conservées comme outil interne ou partenaire tant que le cadre légal n'est pas validé |
| **3. Trouver des opportunités** | Marchés et appels d'offres (+ alertes) ; Emplois et stages ; Annonces (immobilier vérifié, articles, **troc et partenariats**) ; Répertoire d'entreprises vérifiées ; Réussites ; **Boutique bien-être** et Devenir distributeur (FLP) ; Courses (via partenaire) | Flux « Opportunités du moment » | Le comparateur de prix B2B est fusionné dans « Annonces B2B / demandes de devis » ; les « Rumeurs économiques » deviennent des **« Actus & décryptages »** modérés (pas de rumeurs sous la marque) |
| Transverse | Messagerie avec la frangine, suggestions, profil, paiements, espace gestion | Bouton flottant WhatsApp / chat | — |
| **Supprimé** | Fiches « Santé : maladie → produit + posologie » | — | Non conforme (politique FLP, risque sanitaire) : remplacé par des fiches produits neutres |

## 4. Stratégie de conversion

### 4.1 Principe directeur : « valeur d'abord, compte ensuite, humain toujours »

Le visiteur doit **recevoir quelque chose d'utile avant qu'on lui demande quoi que ce soit** : un diagnostic, une réponse, une opportunité. Le compte se crée **au moment où il protège ce qu'il vient d'obtenir** (« Recevez votre résultat sur WhatsApp », « Enregistrez votre Likelemba »). À chaque étape, une personne réelle est joignable.

**Conversion principale (macro)** : *Diagnostic terminé + numéro vérifié*, c'est-à-dire un lead qualifié et contactable par la conseillère.
**Conversions secondaires** : création ou import d'une Likelemba ; publication d'une annonce ou d'une offre ; activation des alertes marchés ; souscription Pro ; demande d'accompagnement payante ; adhésion distributeur (conforme).

### 4.2 Architecture de la page d'accueil (mobile-first, dans l'ordre de défilement)

| # | Bloc | Contenu | Objectif |
|---|---|---|---|
| 0 | **Barre de confiance** (fine, en haut) | « Basés à Brazzaville, Av. Nelson Mandela · Une vraie conseillère vous répond sur WhatsApp · 7j/7, 8h–20h » | Crédibilité instantanée |
| 1 | **Hero** | H1 + sous-titre + **CTA principal** + CTA WhatsApp + micro-réassurances + photo réelle d'une conseillère ou d'une membre (WebP ≤ 60 Ko) | Clarté de la promesse, clic sur le CTA principal |
| 2 | **« Que voulez-vous faire aujourd'hui ? »** | 4 cartes d'intention : *Lancer ou structurer mon activité* · *Organiser ma Likelemba* · *Trouver des marchés et des clients* · *Trouver un emploi ou un stage* | Auto-segmentation (chaque carte ouvre un parcours dédié) |
| 3 | **Preuve sociale chiffrée** | Compteurs **réels** (« 312 diagnostics réalisés », « 48 Likelemba actives », « 1 250 000 FCFA de cotisations suivies ce mois-ci ») + logos partenaires (ACPCE, FIGA, IMF, incubateurs, **une fois les accords signés**) | Réduire le doute. **Ne jamais afficher de faux chiffres** : tant que les volumes sont faibles, montrer des histoires plutôt que des compteurs |
| 4 | **Comment ça marche (3 étapes)** | ① « Faites votre diagnostic (3 min, gratuit) » → ② « Votre frangine vous rappelle sur WhatsApp avec un plan d'action » → ③ « On avance ensemble : épargne, financement, opportunités » | Lever l'incertitude sur le processus |
| 5 | **Zoom Likelemba** | Maquette d'écran (calendrier, reçus, score de fiabilité) + bénéfices + CTA « Créer ma Likelemba » | 2ᵉ porte d'entrée |
| 6 | **Opportunités du moment** | 3 à 6 cartes dynamiques légères (appel d'offres, emploi vérifié, projet à soutenir) + « Recevoir les alertes sur WhatsApp » | Fraîcheur, raison de revenir, SEO |
| 7 | **Qui est « la frangine » ?** | Visages et prénoms des conseillères, parcours, langues parlées (français, lingala, kituba), engagement de délai de réponse | Humaniser, se différencier |
| 8 | **Témoignages** | 3 témoignages avec photo, prénom, quartier et activité ; vidéo courte ≤ 30 s en option (chargée au clic) | Identification |
| 9 | **Votre sécurité** | « Membres vérifiés », « Paiement MTN MoMo / Airtel Money avec reçu immédiat », « **Nous ne vous demanderons JAMAIS votre code PIN** », « Vos données ne sont jamais revendues (loi 29-2019) » | Lever la peur de l'arnaque |
| 10 | **Tarifs transparents** | Gratuit / Frangine Pro 5 000 FCFA/mois / Accompagnement sur devis : tableau à 3 colonnes | Anticiper l'objection prix |
| 11 | **FAQ** (6 à 8 questions, accordéon, schema `FAQPage`) | Voir les exemples au §4.3 | Objections + SEO |
| 12 | **CTA final + pied de page** | Rappel du CTA principal ; contacts (téléphone, WhatsApp, e-mail, adresse, horaires) ; mentions légales (raison sociale Primera-C, RCCM, NIU), confidentialité, CGU ; « Installer l'application » (PWA) | Rattrapage, conformité |

**Règles** : un seul CTA principal par écran, de couleur unique (accent latérite). CTA WhatsApp en style secondaire (contour vert). Pas de carrousel, de vidéo en lecture automatique ni de pop-up à l'arrivée. Contenu clé visible sans JavaScript (SSR).

### 4.3 Exemples de titres, accroches et CTA (en français, ton de proximité)

**Hero (variantes à tester en A/B)**
- H1 A : **« Votre projet mérite une grande sœur. »**
  Sous-titre : « Conseils, épargne en groupe, opportunités : La Frangine vous accompagne pas à pas, de l'idée au premier client. »
- H1 B : **« Vous vous lancez ? On ne vous laisse pas seul·e. »**
  Sous-titre : « Une vraie conseillère sur WhatsApp, votre Likelemba bien organisée et les bons marchés au bon moment. »
- H1 C (orienté résultat) : **« De l'idée au premier financement, avec une frangine à vos côtés. »**
- CTA principal : **« Faire mon diagnostic gratuit »**, avec la mention « 3 min · sans mot de passe »
- CTA secondaire : **« Écrire à une conseillère sur WhatsApp »**
- Micro-réassurance sous les boutons : « Gratuit · Réponse en moins de 2 h · Vos infos restent confidentielles »

**Cartes d'intention**
- « **Lancer mon activité** : savoir par où commencer, créer mon entreprise, faire mon business plan. »
- « **Organiser ma Likelemba** : fini les cahiers et les disputes. Rappels, reçus, garants. »
- « **Décrocher des marchés** : appels d'offres et clients, directement sur WhatsApp. »
- « **Trouver un emploi ou un stage** : des offres vérifiées, sans arnaque. »

**Likelemba**
- Titre : « **Votre Likelemba, sans stress et sans cahier.** »
- Puces : « Chaque membre voit qui a cotisé » · « Rappel automatique la veille » · « Reçu pour chaque versement » · « Garants et témoins enregistrés »
- CTA : « **Créer ma Likelemba** » / « **Importer mon groupe WhatsApp** »

**Appels de fonds**
- « **Votre famille, vos amis, la diaspora croient en votre projet ? Montrez-leur où va chaque franc.** »
- CTA porteur : « Présenter mon projet » · CTA contributeur : « Soutenir ce projet » / « Promettre un montant »

**Marchés (Pro)**
- « **Ne ratez plus un appel d'offres.** Les marchés de votre secteur, résumés, sur WhatsApp. »
- CTA : « Recevoir les alertes (7 jours offerts) »

**Emploi**
- « **Des offres vérifiées par nos équipes.** Si on vous demande de l'argent pour un emploi, c'est une arnaque : signalez-le. »
- CTA candidat : « Créer mon profil en 1 minute » · CTA employeur : « Publier une offre (gratuit pour les membres) »

**FAQ (exemples)**
1. *« C'est vraiment gratuit ? »* : « Oui. Le diagnostic, la Likelemba de base et les réponses de votre frangine sont gratuits. Les services avancés (alertes marchés, mise en avant, accompagnement de dossier) sont payants et toujours annoncés avant. »
2. *« Qui est derrière La Frangine ? »* : « Une équipe basée à Brazzaville (Primera-C, avenue Nelson Mandela), active depuis 2016. Nos conseillères sont joignables au [numéro]. »
3. *« Est-ce que La Frangine garde mon argent ? »* : « Non. Les cotisations vont directement d'un membre à l'autre (MTN MoMo, Airtel Money). Nous enregistrons et vérifions, nous ne détenons pas vos fonds. »
4. *« Comment savoir si un membre est fiable ? »* : « Badges de vérification (téléphone, pièce d'identité, entreprise), historique et score de fiabilité. »
5. *« Pouvez-vous me prêter de l'argent ? »* : « Nous ne prêtons pas. Nous préparons votre dossier et vous orientons vers FIGA, des IMF ou des banques partenaires. »
6. *« Je n'ai pas de compte Mobile Money ? »* : « Vous pouvez payer en espèces à notre bureau ou via Charden Farell. »

**Microcopies utiles**
- Bouton d'envoi du code : « Recevoir mon code sur WhatsApp » (lien discret : « Je préfère un SMS »)
- État vide : « Pas encore d'offre ici… Laissez votre numéro, on vous prévient dès qu'il y en a une. » (transforme le vide en lead)
- Erreur réseau : « La connexion est faible. Votre saisie est gardée, on renverra dès que le réseau revient. »

### 4.4 Parcours d'inscription à friction minimale

**Problème legacy** : 14 règles, captcha, pseudo, mot de passe, situation matrimoniale… avant toute valeur.

**Parcours cible (inscription progressive)**

| Étape | Ce qui est demandé | Déclencheur | Notes techniques |
|---|---|---|---|
| 0. Anonyme | Rien | Arrivée | Diagnostic, consultation des opportunités et de la FAQ **sans compte** ; réponses stockées côté client (localStorage) et serveur (session anonyme) |
| 1. Identification | **Prénom + numéro de téléphone** (indicatif +242 prérempli, validation 05/06/04… à 9 chiffres) + consentement WhatsApp (case non cochée par défaut) | « Recevoir mon résultat » / « Enregistrer ma Likelemba » / « Publier » | **OTP à 6 chiffres via un modèle WhatsApp d'authentification**, repli par SMS après 30 s. Pas de mot de passe (session longue durée + appareil de confiance). Remplacer le captcha par un honeypot + une limitation de débit par numéro et par IP |
| 2. Contexte | 2 ou 3 questions liées à l'intention (type d'activité, ville/quartier, stade du projet) | Juste après l'OTP, de façon facultative (« Passer ») | Sert la personnalisation et le routage vers une conseillère |
| 3. Profil progressif | Pièce d'identité, entreprise (RCCM/NIU), photo… | **Seulement quand c'est nécessaire** : rejoindre une Likelemba en tant que garant, publier une annonce immobilière, souscrire Pro | Chaque donnée demandée est justifiée (« Pour obtenir le badge vérifié ») |
| 4. Données sensibles | Situation matrimoniale, nombre d'enfants… | Uniquement dans un dossier d'accompagnement crédit, avec consentement explicite | Minimisation (loi 29-2019) |

- **Connexion** : « Mon numéro → code » ; **suppression** des identifiants et des pseudos obligatoires (pseudo facultatif, affiché en public à la place du nom si l'on veut).
- **Comptes existants (68)** : migration douce. Au premier passage, « Confirmez votre numéro » par OTP, puis rattachement du compte legacy.
- **Coûts** : sur l'API WhatsApp Business, les conversations de service sont **gratuites** depuis le 1ᵉʳ novembre 2024 et les messages utilitaires envoyés dans la fenêtre de service le sont aussi. Les codes OTP, eux, sont facturés au message, le Congo étant dans la zone tarifaire « Rest of Africa » ([Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)). Il faut comparer avec les tarifs SMS locaux (MTN/Airtel ou un agrégateur SMS). Selon l'analyse d'[Authgear](https://www.authgear.com/post/whatsapp-api-pricing/), l'OTP par WhatsApp coûte en moyenne 7 à 8 fois moins cher que le SMS à l'échelle mondiale.

### 4.5 Micro-conversions par section

| Pilier / section | Micro-conversion n°1 (sans compte) | Micro-conversion n°2 (lead) | Conversion (activation) | Monétisation éventuelle |
|---|---|---|---|---|
| **Se lancer** : diagnostic | Démarrer le diagnostic | Numéro vérifié pour recevoir le résultat | 1er échange avec la conseillère | Forfait accompagnement ou business plan |
| Se lancer : guides | Lire un guide (« Créer mon entreprise en ligne en 2026 ») | Télécharger la checklist (PDF léger) contre un numéro | Prendre rendez-vous | — |
| **Likelemba** | Simuler (« Combien je reçois et quand ? ») | Créer un brouillon de groupe | Groupe avec 3 membres ou plus ayant confirmé + 1er cycle enregistré | Premium (groupes multiples, paiement intégré, tirage anticipé) |
| **Appels de fonds** | Consulter un projet et partager sur WhatsApp | Suivre le projet (« Me prévenir ») | Promesse puis versement confirmé | Frais de service contributeur ou porteur |
| **Offres financières** | Utiliser le comparateur de frais bancaires | Demander « Quel crédit pour moi ? » | Dossier de crédit transmis à un partenaire | Frais de dossier, commission partenaire |
| **Marchés / AO** | Consulter une fiche d'appel d'offres | Activer 7 jours d'alertes WhatsApp | Alertes configurées (secteur et ville) | Abonnement Pro |
| **Emploi** | Voir une offre | « Postuler » (profil en 1 minute) | Candidature envoyée | Offre sponsorisée côté recruteur |
| **Annonces** | Voir une annonce, cliquer sur WhatsApp | Sauvegarder une recherche | Publier une annonce | Boost |
| **Répertoire** | Rechercher une entreprise | Réclamer sa fiche | Fiche vérifiée et complétée | Fiche premium (Pro) |
| **Boutique bien-être / FLP** | Voir un produit | Commander via WhatsApp | Commande payée | Marge et commission |

### 4.6 Éléments de confiance à intégrer

1. **Vérification graduée des membres**, avec des badges visibles sur chaque profil ou annonce :
   - « Téléphone vérifié » (OTP) ;
   - « Identité vérifiée » (pièce contrôlée par une conseillère, en visio WhatsApp ou au bureau) ;
   - « Entreprise vérifiée » (RCCM/NIU contrôlés) ;
   - « Recommandé par 3 membres ».
2. **Modération annoncée** : toute annonce, offre ou appel de fonds est relu **sous 24 h**. Bouton « Signaler » partout. Emplois : **règle anti-arnaque explicite** (« aucun recruteur ne peut vous demander d'argent »).
3. **Charte « Ma frangine ne me demandera jamais… »** : mon code PIN, un transfert vers un numéro personnel, un paiement hors plateforme. Rappel affiché dans chaque écran de paiement.
4. **Paiement traçable** : pawaPay, avec reçu instantané (écran + WhatsApp), une référence unique (le format legacy est conservé), l'historique dans l'espace membre et une politique de remboursement écrite.
5. **Transparence légale** : page « Qui sommes-nous » (équipe, photos, date de création 2016, adresse, horaires, carte) ; mentions légales complètes (RCCM, NIU) ; politique de confidentialité conforme à la loi 29-2019 ; CGU ; **avertissements réglementaires** sur les appels de fonds et l'opportunité FLP.
6. **Preuve sociale authentique** : témoignages recueillis avec consentement écrit ; « Réussites entrepreneuriales » (module existant) transformées en études de cas avant/après ; avis Google Business Profile.
7. **Signaux d'activité** en temps réel, seulement s'ils sont vrais : « 3 nouvelles offres vérifiées aujourd'hui », « Réponse moyenne de la conseillère : 1 h 12 ».
8. **Sécurité technique visible** : HTTPS, OTP, pas de mot de passe stocké en clair (correction du legacy), déconnexion des appareils à distance.

### 4.7 WhatsApp, appel et notifications

- **Bouton flottant** « WhatsApp » en bas à droite sur mobile (il remplace le widget de messagerie legacy pour les visiteurs), avec des **messages pré-remplis contextuels**, par exemple : `https://wa.me/242XXXXXXXXX?text=Bonjour%20la%20Frangine%2C%20je%20viens%20de%20la%20page%20Likelemba%20et%20j'ai%20une%20question`. Le lien est tracé (UTM + événement analytics).
- **Clic-pour-appeler** (`tel:+242…`) sur les pages accompagnement et crédit, avec horaires affichés. Les publics moins à l'aise à l'écrit préfèrent la voix ; **accepter les notes vocales WhatsApp**.
- **Stack progressive** : ① *WhatsApp Business* (application gratuite, catalogue, étiquettes, réponses rapides) au lancement ; ② **API WhatsApp Business** via un fournisseur (BSP) une fois environ 500 conversations par mois atteintes, pour les OTP, rappels de cotisation, alertes marchés et reçus.
- **Notifications, par ordre de priorité** : WhatsApp (utilitaire, opt-in) > **Web Push** (supporté sur Chrome Android, et sur iOS 16.4+ si la PWA est installée) > SMS (repli critique : OTP, rappel de paiement) > e-mail (peu consulté par la cible, à réserver aux Pro).
- **Relances automatiques clés** :
  - J+0, résultat du diagnostic ;
  - J+1, « Votre frangine vous a écrit » ;
  - veille d'échéance Likelemba ;
  - nouvelle alerte marché ;
  - J+7 sans activité, « Où en est votre projet ? ».
  Plafond : 3 messages par semaine et par membre, désinscription en un mot (« STOP »).

### 4.8 PWA, hors-ligne et performance sur réseau lent

**Budget de performance (à inscrire dans la CI)**

| Métrique | Cible accueil | Cible pages de liste |
|---|---|---|
| Poids total transféré (premier chargement) | **≤ 500 Ko** | ≤ 800 Ko |
| JavaScript initial (compressé) | ≤ 100 Ko | ≤ 150 Ko |
| LCP (Moto G ou Tecno d'entrée de gamme, « Slow 4G ») | ≤ 2,5 s | ≤ 3 s |
| INP | ≤ 200 ms | ≤ 200 ms |
| CLS | ≤ 0,1 | ≤ 0,1 |
| Visite répétée (service worker) | ≤ 50 Ko réseau | — |

**Mesures**
- **SSR SvelteKit** pour toutes les pages publiques (contenu lisible avant hydratation). Formulaires en *progressive enhancement* (`use:enhance`) : **ils fonctionnent même si le JavaScript échoue**.
- Images **AVIF/WebP** responsives (`srcset`), chargement différé, dimensions fixées. Photos compressées à ≤ 60 Ko ; placeholders LQIP.
- **Une seule famille de police auto-hébergée**, en sous-ensemble latin, `font-display: swap`, avec repli `system-ui`. Icônes SVG en ligne (pas de fonte d'icônes).
- **Aucun script tiers bloquant**. Analytics légère (Plausible ou Umami auto-hébergé, moins de 2 Ko) plutôt que des pixels lourds ; pixel Meta chargé **après consentement** et seulement sur les pages de campagne.
- **Service worker** :
  - cache « stale-while-revalidate » de l'accueil, des guides et des dernières opportunités consultées ;
  - page hors-ligne utile (« Vos Likelemba, vos reçus et vos guides restent disponibles ») ;
  - **Background Sync** pour les formulaires envoyés hors connexion (cotisation déclarée, annonce, question).
- **Manifest PWA** : invitation « Installer La Frangine » **après** une 2ᵉ visite ou une 1ʳᵉ conversion (jamais à l'arrivée). Icône et nom courts. CoinAfrique pratique déjà l'ajout à l'écran d'accueil. Pour rappel, la PWA de Jumia a produit **+33 % de conversion** et la PWA de Konga consomme **92 % de données en moins** au premier chargement que l'application native ([web.dev – Jumia](https://web.dev/case-studies/jumia), [Konga](https://developers.google.com/web/showcase/2016/konga)).
- **Mode « économie de données »** (interrupteur dans le pied de page, activé automatiquement si `navigator.connection.saveData` ou si le réseau est détecté en 2G/3G) : images remplacées par des vignettes, vidéos désactivées.
- **Pagination** (15 éléments) plutôt que défilement infini. Recherche côté serveur.
- **Tests réels** : WebPageTest et Lighthouse en profil « Slow 4G », plus des tests terrain sur un Tecno Spark ou un Itel en 3G à Brazzaville et Pointe-Noire.

### 4.9 SEO local (Brazzaville, Pointe-Noire)

Google représente 96 % des recherches : c'est le canal d'acquisition gratuit n°1.

- **Fondations** :
  - `lang="fr"` et ciblage Congo (hreflang `fr-CG`) ;
  - titres et méta-descriptions uniques ;
  - plan de site XML ; URLs lisibles en français (`/likelemba`, `/marches-publics/brazzaville`, `/emplois/pointe-noire`) ;
  - données structurées `Organization`, `LocalBusiness` (adresse avenue Nelson Mandela), `FAQPage`, **`JobPosting`** (visibilité dans Google Jobs), `Event` (formations), `BreadcrumbList`.
- **Google Business Profile** (Brazzaville, puis Pointe-Noire en cas d'antenne) : catégories « Consultant en création d'entreprise » et « Service financier » ; photos réelles ; collecte d'avis systématique après chaque accompagnement.
- **Pages « ville × intention »** générées à partir de vraies données, jamais vides :
  - « Appels d'offres à Brazzaville », « Emplois à Pointe-Noire » ;
  - « Location d'appartement à Moungali (vérifiée) » ;
  - « Tontine en ligne au Congo » ;
  - « Créer son entreprise à Brazzaville (ACPCE en ligne) ».
- **Contenus piliers** (guides evergreen de 1 500 mots, mis à jour chaque année) :
  - « Créer son entreprise au Congo en 2026 : étapes, coûts, délais » ;
  - « Organiser une likelemba sans risque » ;
  - « Comparatif des frais bancaires au Congo » : **aucun concurrent local**, fort potentiel de liens entrants ;
  - « Répondre à un appel d'offres public : le guide pour TPE » ;
  - « Mobile Money : les arnaques à connaître ».
- **Netlinking local** : partenaires (incubateurs, FIGA, ACPCE, IMF), presse (Les Dépêches de Brazzaville/ADIAC, La Semaine Africaine), salon OSIANE.

### 4.10 Accessibilité et inclusion

- **WCAG 2.2 niveau AA** : contrastes de 4,5:1 minimum (palette vérifiée au §7), texte de base à **16 px minimum** (18 px conseillé), zones tactiles de **48 × 48 px**, focus visible, libellés de formulaire explicites (pas de placeholder utilisé comme label), messages d'erreur en texte clair.
- **Français simple (niveau B1)** : phrases courtes, un verbe d'action par bouton, montants toujours en « FCFA » avec séparateur de milliers (« 5 000 FCFA »).
- **Pictogrammes toujours accompagnés d'un texte** pour les publics peu lettrés, **audio** en option pour les contenus clés (courtes notes vocales de la conseillère en français et en lingala).
- **Clins d'œil en lingala et kituba** dans la microcopie (« Mbote ! », « Tokende ! » : « Allons-y ! »), en gardant le français pour l'information importante.
- Compatibilité lecteur d'écran (TalkBack) ; pas d'information transmise uniquement par la couleur.

### 4.11 Ton éditorial

- **Voix** : celle d'une grande sœur **bienveillante, franche et compétente**. Elle encourage (« Vous avez déjà fait le plus dur : commencer »), elle prévient (« Attention, cette offre ressemble à une arnaque »), elle ne juge jamais.
- **Vouvoiement chaleureux** par défaut (public mixte, sujets d'argent), avec possibilité de tutoiement dans la messagerie si le membre tutoie.
- **Concret et chiffré** : « 3 min », « réponse en moins de 2 h », « 5 000 FCFA/mois, sans engagement ».
- **À bannir** : jargon financier non expliqué, promesses de gains (« devenez riche », « revenus passifs »), allégations santé, urgence artificielle.

### 4.12 Canaux d'acquisition qui alimentent le funnel

| Canal | Action | Coût | Pourquoi |
|---|---|---|---|
| **Partenariats d'orientation** (ACPCE, FIGA, PSIPJ, incubateurs, IMF) | Le diagnostic La Frangine devient l'outil de pré-qualification des partenaires | Faible | Cible déjà motivée, légitimité par association |
| **Ambassadrices de terrain** (marchés Total, Poto-Poto, Ouenzé, Grand marché de Pointe-Noire) | Inscription assistée sur le téléphone de la commerçante, QR code sur flyer | Commission par membre **activé** | 61,6 % de la population est hors ligne ; la confiance passe par une personne |
| **Facebook et Instagram Ads** | Campagnes « Diagnostic gratuit » ciblées Brazzaville et Pointe-Noire, 20–45 ans | CPM bas (à mesurer) | 1,1 M d'utilisateurs Facebook ; principale source de trafic social |
| **Groupes WhatsApp et Facebook existants** | Partage des opportunités vérifiées (emplois, marchés) avec un lien vers la fiche | Gratuit | Capter l'audience des groupes sans les concurrencer |
| **SEO** | Guides + pages ville × intention | Temps éditorial | Google à 96 % |
| **Parrainage** | « Invitez votre groupe Likelemba » (la tontine est virale par nature) | Frais offerts | Chaque Likelemba créée amène 5 à 20 membres |

## 5. Modèle économique

### 5.1 Principes

1. **Le gratuit crée la confiance, le payant vend du temps gagné ou de l'argent obtenu.** Le diagnostic, la Likelemba de base, les questions à la frangine et la consultation des opportunités restent gratuits.
2. **Payer comme on consomme la data : en prépayé.** La culture du forfait (ARPCE : offres quasi exclusivement prépayées) et l'absence de prélèvement automatique en Mobile Money (chaque débit requiert l'autorisation du client) imposent de vendre des **pass** (7 jours / 30 jours / 1 an) plutôt que des abonnements à reconduction tacite.
3. **Ne jamais détenir les fonds des membres.** La Frangine facture **ses propres services** (réglementation COBAC, §1.5).
4. **Les meilleurs payeurs sont les institutions** (programmes, bailleurs, IMF, banques, opérateurs) qui ont besoin d'atteindre, qualifier et suivre des micro-entrepreneurs. Viser **B2B2C** au moins autant que B2C.

### 5.2 Sources de revenus

| Source | Offre / prix indicatif | Payeur | Référence marché | Priorité |
|---|---|---|---|---|
| **Frangine Pro** (repackaging du statut Master) | **Pass 30 jours : 5 000 FCFA** · Pass 7 jours : 1 500 FCFA · Pass 1 an : 50 000 FCFA (2 mois offerts). Contenu : badge « Entreprise vérifiée », fiche premium dans le répertoire, **alertes marchés WhatsApp illimitées**, 3 boosts par mois, offres d'emploi illimitées, Likelemba illimitées, **30 min de conseil par mois** | TPE, commerçant·es établi·es | Djangui Premium 2 500 FCFA/mois ; WuriPay (freemium, 7 jours d'essai) ; ARPU data de 1 590 FCFA/mois (repère de sensibilité au prix) | **P1** |
| **Accompagnement** (forfaits) | Diagnostic approfondi + plan d'action : 10 000 FCFA · Business plan « bancable » : 75 000 à 150 000 FCFA · Dossier de crédit ou de subvention (FIGA, IMF, banque) : 25 000 FCFA · Dossier de soumission à un appel d'offres : sur devis | Porteurs de projet, TPE | Modèle MiProjet (structuration) ; les 4 modules « Accompagnement » du legacy | **P1** |
| **Contrats B2B / B2G** | Suivi numérique de cohortes (PSIPJ, FIGA, incubateurs), diagnostics de présélection, tableaux de bord d'impact : 2 à 10 M FCFA par contrat et par an (hypothèse) | Programmes publics, bailleurs, ONG, fondations | Le PSIPJ prévoit une application de suivi des ventes et de conseil pour ses 40 000 bénéficiaires | **P1** (principal levier de chiffre d'affaires en année 1) |
| **Apport d'affaires financier** | Commission par dossier qualifié transmis et/ou financé, versée par l'IMF ou la banque (ex. 5 000 à 15 000 FCFA par dossier qualifié, hypothèse) | IMF, banques, assureurs | MaTontine (distribution de crédit et d'assurance) | P2 |
| **Likelemba Premium** | Gratuit jusqu'à 1 groupe de 12 membres ; Premium organisatrice 2 000 FCFA/mois (groupes illimités, relances SMS, export) ; **frais de service de 1 %** sur les cotisations payées dans l'application (pawaPay), à arbitrer avec les frais opérateurs ; **tirage anticipé** payant (modèle MoneyFellows), seulement après validation juridique | Organisatrices, membres | Djangui, My Tontine (commissions sur frais de gestion), MoneyFellows | P2 |
| **Mise en avant d'annonces** | Boost 7 jours : 1 000 FCFA ; « À la une » accueil : 3 000 FCFA | Vendeurs, agences | CoinAfrique « Top annonces » | P2 |
| **Offres d'emploi sponsorisées** | 10 000 FCFA par offre mise en avant et relayée sur WhatsApp et Facebook | Recruteurs | Emploi.cg (pratique du secteur) | P3 |
| **Appels de fonds** | Frais de service de 3 à 5 % à la charge du porteur (ou contribution volontaire du donateur) sur les dons **passés par la plateforme** | Porteurs, donateurs | M-Changa 4,25 à 5 % | P3 (après validation juridique) |
| **Boutique bien-être / FLP** | Marge sur les ventes du catalogue ; commissions de distributeur **conformes** | Clients | Kit d'adhésion de 56 000 à 66 000 FCFA (legacy) | P3 (revenu d'appoint, pas de mise en avant) |
| **Courses pour ma famille** (diaspora) | Frais de service de 10 % + livraison du partenaire (Yango, Noki Noki, coursiers) | Diaspora | 32,5 Md FCFA de transferts en 2025, dont 47 % d'aide familiale | P3 (paiement par carte à résoudre) |
| **Sponsoring de contenus** | Guides et webinaires sponsorisés par une banque, une IMF ou un opérateur, clairement étiquetés. Le **benchmark bancaire reste non sponsorisé** (neutralité) | Institutions | — | P3 |
| Publicité display | Uniquement au-delà d'environ 50 000 visites par mois | Annonceurs | Module Publicité legacy | P4 |

### 5.3 Ordre de grandeur de l'année 1 (scénario central, hypothèses à valider)

| Ligne | Hypothèse moyenne de l'année (montée en charge) | CA annuel (FCFA) |
|---|---|---|
| Frangine Pro | 60 pass de 30 jours actifs en moyenne (120 à M12) × 5 000 × 12 | 3 600 000 |
| Accompagnement | 6 forfaits par mois × 90 000 en moyenne × 12 | 6 480 000 |
| Contrats B2B / B2G | 2 contrats × 6 000 000 | 12 000 000 |
| Apport d'affaires financier | 10 dossiers qualifiés par mois × 10 000 × 12 | 1 200 000 |
| Boosts + emplois sponsorisés | 150 000 par mois × 12 | 1 800 000 |
| Likelemba Premium et frais | 60 000 par mois × 12 | 720 000 |
| Boutique, FLP et courses (marge) | 150 000 par mois × 12 | 1 800 000 |
| **Total** | | **≈ 27,6 M FCFA (≈ 42 000 €)** |

Fourchette : scénario prudent ≈ 11 M FCFA (sans contrat B2G), ambitieux ≈ 55 M FCFA (4 contrats institutionnels). **Enseignement : sans partenariats institutionnels, le B2C seul ne finance pas des conseillères salariées en année 1.** Le B2C sert à prouver l'impact, et cette preuve vend le B2B/B2G.

**Principaux postes de coût** : conseillères (le cœur de la promesse ; objectif de 1 conseillère pour 300 à 500 membres actifs, aidée par des réponses types et une base de connaissances), ambassadrices terrain (rémunérées à l'activation), messagerie (OTP, utilitaires), frais de paiement (pawaPay, tarifs non publics), hébergement, conseil juridique CEMAC (Likelemba, appels de fonds, CGU).

---

## 6. KPI et funnel

### 6.1 North Star Metric

> **Membres activés sur 30 jours** : membres ayant réalisé, au cours des 30 derniers jours, au moins **une action de valeur** (diagnostic terminé, échange avec une conseillère, cotisation Likelemba enregistrée, annonce ou offre publiée, candidature, alerte marché active, paiement).

Elle capture à la fois l'accompagnement (le cœur) et l'usage des outils, et elle se corrèle au revenu (Pro, accompagnement) comme à l'impact (preuve pour les contrats B2G).

### 6.2 Funnel principal et cibles initiales (hypothèses à calibrer après 8 semaines)

| Étape | Événement analytics | Taux cible | Leviers |
|---|---|---|---|
| Visite | `page_view` (source, ville, réseau 3G/4G) | — | SEO, Facebook, partenaires, ambassadrices |
| Engagement | `intent_card_click` ou `diagnostic_start` | **25 %** des visiteurs | Hero, cartes d'intention |
| Diagnostic terminé | `diagnostic_complete` | 60 % des démarrés | ≤ 8 questions, barre de progression, sauvegarde automatique |
| **Lead vérifié** (macro-conversion) | `otp_verified` | 50 % des diagnostics terminés, soit **≈ 7,5 % des visiteurs** | OTP WhatsApp, 2 champs |
| Activation à 7 jours | `first_advisor_reply_read` ou `key_action` | 50 % des leads | Premier message personnalisé en moins de 2 h |
| Rétention M1 / M3 | activation répétée | 40 % / 25 % | Likelemba (usage récurrent par nature), alertes |
| Monétisation à 90 jours | `payment_success` (Pro, forfait, boost) | 5 à 8 % des activés | Offre au moment du besoin (dossier, marché) |

### 6.3 Funnels secondaires

- **Likelemba** : simulateur → brouillon → invitations envoyées → 3 membres ou plus confirmés → 1ᵉʳ cycle complet → 2ᵉ groupe créé (viralité : invitations par organisatrice, **coefficient K**).
- **Paiement** : checkout initié → autorisation opérateur demandée → succès. Suivre le **taux d'échec par opérateur** et le délai de confirmation (pawaPay vs manuel).
- **Opportunités** : vue de fiche → clic WhatsApp ou candidature → alerte activée → passage à Pro.
- **Acquisition terrain** : QR scanné → lead → activé, suivi **par ambassadrice** (qui sert de base à sa rémunération).

### 6.4 KPI opérationnels (la promesse humaine doit être tenue)

| KPI | Cible |
|---|---|
| Délai de première réponse de la conseillère (heures ouvrées) | **≤ 2 h** (médiane), ≤ 4 h (p90) |
| Satisfaction après échange (CSAT, 1 question sur WhatsApp) | ≥ 4,5/5 |
| Délai de modération des annonces, offres et appels de fonds | ≤ 24 h |
| Part des paiements confirmés automatiquement | ≥ 80 % après intégration pawaPay |
| Taux de retard de cotisation Likelemba | < 10 % des échéances |
| Signalements d'arnaque traités sous 24 h | 100 % |
| Core Web Vitals (p75 mobile, données réelles) | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 |

### 6.5 KPI business

CAC par canal (Facebook, ambassadrices, partenaires, SEO), **LTV** Pro, taux de conversion gratuit → Pro, CA par ligne, nombre de contrats B2B/B2G, dossiers transmis et **financés** (preuve d'impact), NPS trimestriel.

### 6.6 Instrumentation

- Analytics légère et respectueuse des données (**Umami ou Plausible auto-hébergé**) + **événements serveur** (inscriptions, paiements, cotisations) dans la base : c'est la source de vérité.
- UTM systématiques sur les liens WhatsApp, Facebook, QR codes et partenaires ; un code par ambassadrice.
- Tableau de bord hebdomadaire (réutiliser l'espace `/gestion`) : funnel, North Star, délais de réponse, paiements, performance.
- **Rituel** : revue hebdomadaire de 30 minutes et un test A/B par mois sur le hero ou le CTA (à partir d'environ 1 000 visiteurs par semaine ; en dessous, tests qualitatifs avec 5 utilisatrices).

## 7. Recommandations design

### 7.1 Direction artistique : « Chaleur urbaine de Brazzaville »

Moderne, **solaire et humaine**, loin des codes froids de la banque comme de l'esthétique « clip-art » des sites communautaires des années 2010. Trois idées-forces :
1. **Le fleuve et la terre** : le bleu profond du fleuve Congo (héritage : `#1F3D63` est déjà la couleur d'en-tête du legacy) et la latérite ocre-rouge des rues de Brazzaville et Pointe-Noire.
2. **Le cercle** : la Likelemba, la famille, la communauté. Motif récurrent (avatars en cercle, jauges circulaires, « cercle de mains »).
3. **Le geste artisanal** : des illustrations commandées à un·e artiste congolais·e, inspirées du **style « Miké » de l'École de peinture de Poto-Poto** (fondée en 1951 : silhouettes fines et élancées, scènes de marché, [Wikipédia](https://fr.wikipedia.org/wiki/%C3%89cole_des_peintres_de_Poto-Poto)), et des **motifs de pagne** discrets en SVG pour les séparateurs.

### 7.2 Palette (tokens) et contrastes vérifiés

| Token | Hex | Rôle | Contraste (WCAG) |
|---|---|---|---|
| `--fleuve` (primaire) | **#1F3D63** | En-têtes, navigation, titres, liens | 11,0:1 sur blanc · 10,2:1 sur crème ✅ |
| `--laterite` (accent / CTA) | **#C2410C** | **Bouton d'action principal uniquement**, prix | Texte blanc 5,2:1 ✅ · sur crème 4,8:1 ✅ |
| `--foret` (succès / argent / WhatsApp) | **#1E7A5A** | Validations, badges « vérifié », CTA WhatsApp secondaire | Texte blanc 5,3:1 ✅ |
| `--soleil` (mise en valeur) | **#F2B632** | Surlignages, étiquettes « Nouveau », illustrations. **Jamais pour du texte sur blanc** | Encre sur soleil 9,1:1 ✅ |
| `--creme` (fond) | **#FBF6EE** | Fond principal (plus chaud et moins éblouissant que le blanc pur) | — |
| `--blanc` (surface) | #FFFFFF | Cartes, champs | — |
| `--encre` (texte) | **#1B1F24** | Texte courant | 15,4:1 sur crème ✅ |
| `--ardoise` (texte secondaire) | #5B6470 | Métadonnées, aides | 5,6:1 sur crème ✅ |
| `--alerte` (erreur) | #B42318 | Erreurs, arnaques signalées | Texte blanc 6,6:1 ✅ |

Clin d'œil discret au drapeau (vert, jaune, rouge) via forêt, soleil et latérite, sans pastiche patriotique. **Mode sombre** (facultatif, économe sur les écrans OLED) : fond `#111820`, surface `#1A2430`, texte `#F3EEE6`, accent `#F08A4B` (7,2:1 sur le fond sombre).

### 7.3 Typographie

- **Titres** : **Bricolage Grotesque** (Google Fonts, licence OFL, variable). Grotesque chaleureuse au caractère affirmé, lisible en gras sur petit écran. Graisses 700 et 800 uniquement, **auto-hébergée en sous-ensemble latin + latin-ext** (≈ 40–50 Ko en WOFF2), `font-display: swap`.
- **Texte courant** : **pile système** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, soit **Roboto sur Android** (82 % du parc), pour **0 Ko téléchargé** et une lisibilité optimale sur les écrans d'entrée de gamme.
- **Montants** : `font-variant-numeric: tabular-nums` ; format « 5 000 FCFA » (espace insécable fine).
- **Échelle mobile** : corps 17 px / interlignage 1,55 ; H1 `clamp(30px, 8vw, 44px)` ; H2 24–28 px ; boutons 17 px en gras. Longueur de ligne ≤ 70 caractères.

### 7.4 Iconographie et illustrations

- **Icônes** : [Lucide](https://lucide.dev) (licence ISC, trait de 1,75 px, coins arrondis), importées une par une en SVG en ligne (tree-shaking), **toujours accompagnées d'un libellé**.
- **Pictogrammes métiers** sur mesure (8 à 12 : commerçante, couturier, mécanicien, agricultrice, restauratrice, coiffeuse, maçon, transporteur) dans le style illustratif de marque, pour les cartes du diagnostic et du répertoire.
- **Illustrations** de scènes (marché, likelemba, remise du pot, signature de marché) en SVG optimisé (≤ 15 Ko chacune).
- **Motifs** : bordures inspirées du pagne en SVG répétable (≤ 3 Ko), utilisées avec parcimonie (séparateurs, fond du hero).

### 7.5 Photographie : authenticité avant tout

- **Vraies personnes, vrais lieux** : conseillères et membres (avec consentement écrit et droit à l'image), marché Total, Poto-Poto, corniche du fleuve, Grand marché et Côte sauvage de Pointe-Noire, ateliers, boutiques.
- **Lumière naturelle**, cadrages proches, sourires non forcés, diversité d'âges et de genres, **femmes en position d'expertes** (et pas seulement de bénéficiaires).
- **À proscrire** : banques d'images génériques (« homme d'affaires africain en costume devant un gratte-ciel »), photos détourées, filtres lourds.
- **Technique** : WebP/AVIF ≤ 60 Ko, dimensions fixes, `loading="lazy"` hors du premier écran, et une séance photo professionnelle d'une journée au lancement (investissement à fort effet sur la confiance).

### 7.6 Composants et patterns d'interface

- **Navigation mobile inférieure** (5 onglets) : *Accueil · Se lancer · Likelemba · Opportunités · Moi*. En-tête minimal : logo + bouton WhatsApp.
- **Barre CTA collante** en bas des pages clés (diagnostic, projet, offre), qui disparaît quand le clavier est ouvert.
- **Cartes** au rayon de 16 px, ombres très légères, espacement généreux (grille de 8 px).
- **Formulaires** : un champ par écran sur mobile pour le diagnostic (style conversationnel), clavier numérique pour les téléphones et montants, sauvegarde automatique, **boutons ≥ 48 px**. Référence : les principes du [GOV.UK Design System](https://design-system.service.gov.uk/) (un sujet par page, erreurs claires).
- **États vides transformés en leads** (« Soyez prévenu·e ») ; **squelettes de chargement** plutôt que des spinners.
- **Badges de confiance** standardisés (icône + texte) : Téléphone vérifié · Identité vérifiée · Entreprise vérifiée · Annonce vérifiée.

### 7.7 Références inspirantes

| Site | Ce qu'on retient |
|---|---|
| [Wave](https://www.wave.com/fr/) | Promesse **chiffrée** dans le hero (« Transférez de l'argent pour 1 % »), design épuré, témoignages d'usagers réels |
| [Djamo](https://www.djamo.com/ci/) | Preuve sociale massive (« 1,5 million de personnes », note 4,7), mise en page bento, partenaires bancaires affichés, « zéro frais cachés » |
| [M-Changa](https://www.mchanga.africa/) | Simplicité de la collecte, jauge objectif/collecté, **inclusion USSD** |
| [MoneyFellows](https://moneyfellows.com/) | UX des cercles d'épargne (positions de tirage, calendrier, scoring) |
| [PiggyVest](https://www.piggyvest.com/) | Ton pédagogique et complice sur l'épargne, rapports annuels partagés (« Savings Report ») |
| [CoinAfrique](https://cg.coinafrique.com/) | PWA « ajouter à l'écran d'accueil », badges d'annonces, filtres par quartier |
| [Kusosa](https://kusosa.com/) | **Annonces vérifiées + visite sécurisée** : la confiance comme produit |
| [WuriPay](https://wuripay.com/marches-publics/congo) | **Alertes WhatsApp** d'appels d'offres, essai gratuit de 7 jours |
| [Jumia PWA (web.dev)](https://web.dev/case-studies/jumia) | Preuve que la PWA légère convertit mieux en Afrique |
| [GOV.UK Design System](https://design-system.service.gov.uk/) | Formulaires accessibles et sobres, langage clair |

---

## 8. Feuille de route 90 jours (proposition)

| Période | Produit / tech | Marketing / ops | Juridique / partenariats | Objectif de sortie (hypothèses) |
|---|---|---|---|---|
| **J0–30 : Fondations** | Nouvelle accueil + 3 piliers ; **diagnostic v1** (≤ 8 questions) ; **OTP WhatsApp/SMS, sans mot de passe** ; budget de performance en CI ; analytics + événements serveur ; retrait des fiches santé et de l'épargne rémunérée publique | WhatsApp Business (numéro dédié, réponses types) ; page « Qui sommes-nous » avec photos réelles ; Google Business Profile | **Dossier pawaPay** (KYB) + demande MTN Open API en parallèle ; revue juridique CEMAC (Likelemba déclarative, appels de fonds, CGU, confidentialité loi 29-2019) | Site en ligne, 200 leads vérifiés |
| **J31–60 : Cœur de valeur** | **Likelemba v2** (déclarative, import de groupe, rappels, reçus, score de fiabilité) ; flux **Opportunités** (AO + emplois vérifiés) + alertes ; **PWA** + hors-ligne + mode économie de données | 5 guides SEO piliers ; pilote de **5 ambassadrices** au marché Total et à Pointe-Noire ; 1ʳᵉ campagne Facebook « Diagnostic gratuit » | 2 partenariats d'orientation (un incubateur + FIGA ou ACPCE) ; approche du PSIPJ | 600 leads, 150 membres activés, 15 Likelemba actives |
| **J61–90 : Monétisation** | **Paiement pawaPay en production** (Pro, forfaits, boosts) ; **Frangine Pro** ; appels de fonds v2 (dons, projets vérifiés) ; tableau de bord `/gestion` | 5 études de cas et témoignages ; test A/B du hero ; collecte d'avis Google | Proposition commerciale B2G (suivi de cohortes) ; 1 IMF partenaire (apport d'affaires) | **1 000 leads vérifiés, 300 membres activés, 30 Likelemba actives, 30 Pro, 1 contrat institutionnel en négociation** |

**Décisions à prendre par le porteur de projet** :
① valider le positionnement « grande sœur » et les 3 piliers ;
② arbitrer le sort de l'Épargne solidaire et de la carte de pointage (partenaire IMF ou retrait) ;
③ recruter ou désigner **au moins une conseillère dédiée** avant le lancement : sans elle, la promesse ne tient pas ;
④ ouvrir les démarches pawaPay ou MTN, qui prennent plusieurs semaines.

## 9. Sources

> Consultées entre le 21 et le 22 septembre 2026. Fiabilité : **[O]** officielle ou institutionnelle, **[P]** presse ou étude, **[E]** site d'entreprise, **[B]** blog marketing (fiabilité faible, contexte uniquement).

**Marché, démographie, connectivité**
- [O] ARPCE, *Observatoire du marché de l'internet mobile, T2-2025* : https://arpce.org/api/publications/observatoire-du-marche-de-linternet-mobile-rapport-du-2e-trimestre-2025/download
- [O] ARPCE, *Observatoire du marché de la téléphonie mobile, T2-2025* : https://arpce.org/api/publications/observatoire-du-marche-de-la-telephonie-mobile-du-2e-trimestre-2025/download
- [P] DataReportal, *Digital 2025: The Republic of the Congo* : https://datareportal.com/reports/digital-2025-republic-of-the-congo
- [O] Banque mondiale, *Congo – Overview* (mars 2026) : https://www.worldbank.org/en/country/congo/overview
- [O] Banque mondiale, *L'inclusion économique des femmes et des jeunes au Congo-Brazzaville* : https://documents1.worldbank.org/curated/en/099050006282227757/pdf/P173535057d9e40ac08f95009ab647bf319.pdf
- [P] StatCounter Global Stats, Congo (OS mobile, marques, navigateurs, moteurs, réseaux sociaux, export CSV août 2026) : https://gs.statcounter.com/os-market-share/mobile/congo
- [P] Sikafinance, *Congo : le marché de la téléphonie mobile…* (avril 2026) : https://www.sikafinance.com/marches/congo-le-marche-de-la-telephonie-mobile-genere-6-4-milliards-fcfa-de-revenus-a-fin-avril-2026_63408
- [P] Statista / cable.co.uk, *Price for 1GB mobile data in the Republic of the Congo* : https://www.statista.com/statistics/1273329/price-for-mobile-data-in-congo/
- [P] allAfrica / Les Dépêches de Brazzaville, contribution de la diaspora (août 2026) : https://fr.allafrica.com/stories/202608170176.html
- [P] Journal du Net, *Brazzaville, prochaine frontière de la tech africaine ?* (mars 2026) : https://www.journaldunet.com/start-up/1548353-brazzaville-prochaine-frontiere-de-la-tech-africaine-ce-que-les-startups-congolaises-revelent-de-l-afrique-centrale-de-demain/
- [P] The Conversation, *Congo-Brazzaville : ces innovations qui stimulent l'e-commerce* (2018) : https://theconversation.com/congo-brazzaville-ces-innovations-qui-stimulent-le-commerce-103029
- [P] Think with Google via Marketing Dive, 53 % d'abandon au-delà de 3 s : https://www.marketingdive.com/news/google-53-of-mobile-users-abandon-sites-that-take-over-3-seconds-to-load/426070/
- [P] GSMA, *The Mobile Economy Sub-Saharan Africa 2024* : https://event-assets.gsma.com/pdf/GSMA_ME_SSA_2024_Web.pdf

**Mobile Money, paiements, inclusion financière**
- [O] ARTF / DGE, *Mobile money et inclusion financière en République du Congo* (enquête mai 2024) : https://www.artf.cg/storage/download/publications/BItvf6e7Xn80iUaSDhSpbs0O7rXv7M7JzxxC4fqc.pdf
- [P] Agence Ecofin, *Mobile Money : le Cameroun domine l'espace CEMAC…* (BEAC 2024) : https://www.agenceecofin.com/actualites/0705-138200-mobile-money-le-cameroun-domine-l-espace-cemac-avec-65-des-comptes-en-2024
- [P] Investir au Cameroun, *Cemac : le Cameroun reste roi du Mobile Money en 2024* : https://www.investiraucameroun.com/finance/0405-23354-cemac-le-cameroun-reste-roi-du-mobile-money-en-2024-avec-65-1-des-comptes-et-57-de-la-valeur-des-transactions
- [P] CIO Mag, *Congo : le marché du mobile money compte environ 2,8 millions d'abonnés actifs (ARPCE)* : https://cio-mag.com/congo-le-marche-du-mobile-money-compte-environ-28-millions-dabonnes-actifs-arpce/
- [P] RFSIC / OpenEdition, *Usage du mobile money au Congo-Brazzaville* : https://journals.openedition.org/rfsic/9767?lang=en
- [O] BEAC, *Stratégie régionale d'inclusion financière de la CEMAC* : https://www.beac.int/wp-content/uploads/2025/02/Strat%C3%A9gie-R%C3%A9gionale-dInclusion-Financi%C3%A8re-de-la-CEMAC.pdf
- [E] pawaPay, site (pays couverts) : https://www.pawapay.io/ ; documentation des fournisseurs (COG : `AIRTEL_COG`, `MTN_MOMO_COG`) : https://docs.pawapay.io/v2/docs/providers
- [P] Connecting Africa, *Airtel Money, pawaPay enable remittances* (Congo-Brazzaville inclus, 2025) : https://www.connectingafrica.com/mobile-money/airtel-money-pawapay-enable-remittances-for-seven-african-countries
- [E] MTN Congo, *Open API* : https://www.mtn.cg/momo/momo-entreprise/open-api/ ; MoMo Developer Portal : https://momodeveloper.mtn.com/
- [E] Airtel Africa Developer Portal (communiqué) : https://www.airtel.africa/assets/pdf/press-release/Airtel-Africa-Developer-Portal_ENGLISH.pdf
- [E] Bibliothèque `lepresk/momo-api` (MTN + Airtel Congo) : https://github.com/lepresk/momo-api
- [E] CinetPay, documentation « univers de paiement » (pays : RDC, pas Congo-Brazzaville) : https://docs.cinetpay.com/api/1.0-fr/checkout/univers
- [E] Flutterwave, *Pay with Mobile Money* (XAF : Cameroun uniquement) : https://flutterwave.com/us/support/payment-methods/pay-with-mobile-money
- [P] Business in Cameroon, *MTN Congo… to join GimacPay* : https://www.businessincameroon.com/telecom/2207-10565-nexttel-yup-airtel-tchad-mtn-congo-others-to-soon-join-gimacpay
- [E] Groupe Charden Farell : https://www.groupechardenfarell.com/
- [O] Meta, *Pricing on the WhatsApp Business Platform* : https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- [B] Authgear, *WhatsApp API Pricing Explained (2026)* : https://www.authgear.com/post/whatsapp-api-pricing/
- [B] Whakup, *WhatsApp comme canal de vente principal au Congo-Brazzaville* : https://whakup.com/blog/geo-marches/whatsapp-ecommerce-congo-canal-vente-principal
- [B] I am Beezy, blog (paiement et e-commerce au Congo, contexte uniquement) : https://blog.iambeezy.app/fr/paiement-mobile-money-e-commerce-congo-brazzaville-vendeurs-2026/

**Tontines**
- [P] ADIAC, *La tontine financière : une banque informelle…* : https://www.adiac-congo.com/content/la-tontine-financiere-une-banque-informelle-et-traditionnelle-qui-traverse-les-generations
- [P] REVUE-CRIGED, *Les tontines (likelemba) en RD Congo* : https://criged-isc.org/pdfFile/78_20-35.pdf
- [P] Alternance, *De « Likelemba »… à Tontine WhatsApp* : https://alternance.cd/2020/07/13/de-likelemba-bwakisa-carte-moziki-a-tontine-whatsapp-risque-ou-opportunite-pour-leconomie-informelle-congolaise-opinion-de-prince-bagula/
- [E] Djangui : https://djangui.net/?lang=en · [E] My Tontine : https://mytontine.app/fr
- [P] GSMA, *MaTontine* : https://www.gsma.com/mobilefordevelopment/digital-grantees-portfolio/matontine/
- [P] TechCrunch, *MoneyFellows raises $13M* (2025) : https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt
- [P] TechPoint Africa, *PiggyVest 2025 payouts* : https://techpoint.africa/news/piggyvest-2025-payouts/
- [P] Cirkkle, *Top 5 digital tontine applications* : https://cirkkle.com/en/blog/top-5-digital-tontine-applications-in-the-world

**Réglementation**
- [O] Règlement n°01/17/CEMAC/UMAC/COBAC (microfinance) : https://www.sgg.cg/txts-droit-reg/cemac-reglement-2017-01-exercice-controle-microfinance.pdf
- [O] Règlement n°04/18/CEMAC/UMAC/COBAC (services de paiement) : https://www.beac.int/wp-content/uploads/2019/07/REGLEMENT-N-04-18-CEMAC-UMAC-COBAC-du-21-d%C3%A9cembre-2018.pdf
- [P] Droit Médias Finance, *CEMAC / UEMOA : cadre juridique du financement participatif* : https://www.droitmediasfinance.com/index.php/actualites/droit-des-marches-financiers/943-cemac-uemoa-quelles-recentes-evolutions-du-cadre-juridique-du-financement-participatif-ou-crowdfunding
- [P] Investir au Cameroun, *Crowdfunding en CEMAC : la Cosumaf prépare un nouveau guichet* (2026) : https://www.investiraucameroun.com/finance/2904-23336-crowdfunding-en-cemac-la-cosumaf-prepare-un-nouveau-guichet-de-financement-pour-les-pme
- [O] Loi n°29-2019 portant protection des données à caractère personnel : https://www.economie.gouv.cg/fr/content/loi-n%C2%B029-2019-du-10-octobre-2019-portant-protection-des-donn%C3%A9es-%C3%A0-caract%C3%A8re-personnel
- [O] FTC, *Order to Prohibit Forever Living… from Deceiving Consumers about Potential Earnings* (avril 2026) : https://www.ftc.gov/news-events/news/press-releases/2026/04/ftc-order-prohibit-forever-living-its-operators-deceiving-consumers-about-potential-earnings
- [E] Forever Living, *Company Policies and Procedures* (États-Unis, 2026) : https://cdn.foreverliving.com/content/MarketingConfigurableContent/USA/Company%20Policy%20/2026-05-01%20-%20U.S._Co_Policy_E%20Titan%20-%20FNL.pdf

**Entrepreneuriat, appui, marchés publics**
- [P] Panoramik, *Créer son entreprise au Congo en ligne* (ACPCE, déc. 2025) : https://www.panoramik-actu.com/creer-son-entreprise-au-congo-en-ligne-et-sans-se-deplacer-cest-desormais-une-realite/ ; [O] ACPCE : https://www.acpce.cg/en/
- [P] Afrik.com, *PSIPJ doté de 133 millions de dollars* : https://www.afrik.com/congo-la-banque-mondiale-en-mission-sur-le-psipj-dote-de-133-millions-de-dollars ; Congo-B, *45 000 opportunités en 2026* : https://congo-b.com/jeunesse-45-000-opportunites-en-2026/
- [O] Bpifrance, partenariat FIGA : https://presse.bpifrance.fr/bpifrance-et-le-fonds-dimpulsion-de-garantie-et-daccompagnement-figa-du-congo-renforcent-leur-partenariat-pour-faicilier-lacces-au-financement-des-pme-et-accompagner-la-creation-dentreprises-au-congo
- [P] allAfrica, *O-SEED* (sept. 2026) : https://fr.allafrica.com/stories/202609030605.html
- [E] Fondation Sounga, incubateur Sounga Nga : https://fondationsounga.org/lincubateur-sounga-nga/
- [O] ARMP Congo : https://armp.cg/ ; Ministère des Finances, appels d'offres nationaux : https://www.finances.gouv.cg/fr/type/appels-doffres-national
- [E] WuriPay, marchés publics Congo : https://wuripay.com/marches-publics/congo · GlobalTenders : https://www.globaltenders.com/government-tenders-congo
- [E] societe.cg, *Les banques au Congo Brazzaville* : https://societe.cg/guides/gerer-votre-entreprise/les-banques-au-congo-brazzaville-et-leurs-specificites/
- [E] UBA Congo, *Conditions de banque* : https://www.ubacongobrazzaville.com/wp-content/uploads/sites/10/2024/10/CONDITIONS-DE-BANQUE-UBA-CONGO-2023-derniere-version.pdf

**Concurrents (emploi, annonces, commerce, crowdfunding, annuaires, FLP)**
- [O] ACPE, offres d'emploi : https://www.acpe.cg/offres-emplois · [E] Emploi.cg : https://www.emploi.cg/ · [E] Jumia Deals Congo : https://www.jumia.cg/offres-emploi · [E] Jooble : https://fr.jooble.org/emploi-congo-brazzaville · [E] UNICONGO : https://www.unicongo.cg/recrutement/
- [E] Groupes Facebook d'emploi (ex.) : https://www.facebook.com/groups/622960875802472/
- [E] CoinAfrique Congo : https://cg.coinafrique.com/ · [E] Kusosa : https://kusosa.com/location/appartements/brazzaville · [E] Maisonbrazza : https://maisonbrazza.com/ · [E] Icazi : https://icazi.com/se-loger-a-brazzaville
- [P] Localhost Digital, *Jumia Deals n'est plus disponible au Cameroun* : https://localhost-digital.com/2024/04/03/jumia-deals-nest-plus-disponible-au-cameroun-le-site-annonceflash-prend-le-relais/
- [E] Yango Brazzaville : https://yango.com/fr_cg/city/brazzaville/ · [P] Agence Ecofin, *Noki Noki lève 3 M$* : https://www.agenceecofin.com/investissement/1306-119482-la-start-up-noki-noki-leve-3-millions-de-dollars-en-seedpour-revolutionner-la-livraison-de-proximite-en-afrique
- [E] M-Changa : https://www.mchanga.africa/ · [E] Fiatope : https://www.fiatope.com/financement-participatif-en-afrique-le-jackpot-sous-certaines-conditions · [E] MiProjet : https://ivoireprojet.com/
- [E] GoAfricaOnline : https://www.goafricaonline.com/directory · [E] CongoFinder : https://congofinder.com/ · [E] Cybo : https://fr.cybo.com/r%C3%A9publique-du-congo/
- [E] Forever Living Congo : https://foreverliving.com/cog/fr-cg/home · [E] Aloe Vera Pour Tous (Congo) : https://www.aloe-vera-pour-tous.com/afrique-republique-du-congo

**UX, performance, design**
- [P] Baymard Institute, *Checkout Optimization: Minimize Form Fields* : https://baymard.com/blog/checkout-flow-average-form-fields
- [E] web.dev, *Jumia case study* : https://web.dev/case-studies/jumia · *Konga* : https://developers.google.com/web/showcase/2016/konga
- [E] Wave : https://www.wave.com/fr/ · Djamo : https://www.djamo.com/ci/ · GOV.UK Design System : https://design-system.service.gov.uk/ · Lucide : https://lucide.dev
- [P] Wikipédia, *École de peinture de Poto-Poto* : https://fr.wikipedia.org/wiki/%C3%89cole_des_peintres_de_Poto-Poto

**Sources internes**
- `docs/MIGRATION_STATUS.md` (volumétrie réelle de production : 68 membres, 10 032 visites, tables vides)
- `docs/data-dictionary-membres.md` (règles d'inscription legacy, statut Master à 5 000 FCFA/mois)
- Page d'accueil legacy relevée le 22/09/2026 : http://lafrangine.primera-c.net/ (le domaine lafrangine.com ne résolvait pas au moment de l'analyse)

---

### Limites de l'analyse
- Les tarifs pawaPay, les conditions d'onboarding marchand (entité locale, KYB) et les tarifs SMS et WhatsApp « Rest of Africa » ne sont **pas publics** : ils sont à obtenir par contact commercial.
- Le modèle économique d'Emploi.cg et le volume réel des groupes Facebook n'ont pas pu être vérifiés (site protégé, groupes fermés).
- Les données Findex 2025 spécifiques au Congo-Brazzaville n'étaient pas lisibles en ligne. La bancarisation citée (8,8 %) date de 2020 (ARTF).
- La répartition desktop/mobile de StatCounter pour le Congo est erratique en 2026 (probable trafic de robots) et n'a pas été utilisée.
- Les projections financières (§5.3) et les cibles du funnel (§6.2) sont des **hypothèses de travail** à recalibrer après 8 semaines de données réelles.
