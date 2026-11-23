/**
 * Banque de contenu des jeux.
 *
 * Niveaux :
 *   1 = Soft      — on rigole, personne ne rougit
 *   2 = Hot       — ça pique, on ose
 *   3 = Sans honte — fin de soirée, plus rien à perdre
 *
 * Placeholders remplacés au tirage :
 *   {p}  un autre joueur au hasard
 *   {q}  un autre joueur (différent de {p})
 *   {n}  un nombre 2–5
 *
 * Règle d'or de tous les gages : la personne visée peut toujours refuser,
 * dans ce cas c'est le joueur qui tire la carte qui boit. Les gages qui
 * impliquent quelqu'un d'autre le disent explicitement.
 */

export const LEVELS = [
  { id: 1, label: 'Soft', emoji: '🍺' },
  { id: 2, label: 'Hot', emoji: '🔥' },
  { id: 3, label: 'Sans honte', emoji: '💀' },
];

export const DEFIS = [
  // ---- Niveau 1 : Soft ----
  { l: 1, t: 'Imite {p} pendant 30 secondes. Si la table ne devine pas, tu bois.' },
  { l: 1, t: 'Raconte ta pire cuite en 20 secondes chrono. Dépassement = gorgée.' },
  { l: 1, t: 'Fais un toast solennel à la santé du barman, debout, verre levé.' },
  { l: 1, t: 'Parle avec un accent (au choix de la table) jusqu\'à ton prochain tour.' },
  { l: 1, t: 'Montre la dernière photo de ta galerie. Refus = 2 gorgées.' },
  { l: 1, t: 'Tu es le serveur : va chercher la prochaine tournée au bar pour tout le monde.' },
  { l: 1, t: 'Fais deviner un film à la table uniquement par mime. 1 minute max.' },
  { l: 1, t: 'Cul sec ton verre… à la paille. Si pas de paille, tu bois en trinquant avec {p}.' },
  { l: 1, t: 'Échange de place avec {p}. Vous gardez le verre de l\'autre.' },
  { l: 1, t: 'Chante le refrain d\'une chanson choisie par {p}. À voix haute.' },
  { l: 1, t: 'Fais 10 pompes ici, maintenant. Chaque pompe ratée = une gorgée.' },
  { l: 1, t: 'Complimente sincèrement chaque personne de la table. Un vrai compliment, pas "t\'es sympa".' },
  { l: 1, t: 'Pendant 2 tours tu ne peux répondre qu\'avec des questions. Faute = gorgée.' },
  { l: 1, t: 'Donne ton téléphone à {p} pendant 5 minutes. Il peut poster une story.' },
  { l: 1, t: 'Fais un selfie de groupe avec la table d\'à côté.' },
  { l: 1, t: 'Bois de la main gauche jusqu\'à la fin de la partie. Oubli = gorgée.' },
  { l: 1, t: 'Dis un truc gentil et un truc chiant sur {p}. Il choisit dans quel ordre.' },
  { l: 1, t: 'Ton meilleur cri d\'animal. Volume max. Le bar doit entendre.' },
  { l: 1, t: 'Devine le prénom du barman. Faux = tu bois, vrai = tout le monde boit.' },
  { l: 1, t: 'Raconte ton dernier râteau. Détails obligatoires.' },
  { l: 1, t: 'Fais le tour de la table en marchant comme un mannequin. Regard de braise.' },
  { l: 1, t: 'Jusqu\'à ton prochain tour, tu appelles tout le monde "chef".' },
  { l: 1, t: 'Bois {n} gorgées en fixant {p} dans les yeux sans cligner.' },
  { l: 1, t: 'Explique le jeu de ce soir à quelqu\'un du bar comme si c\'était un sport olympique.' },
  { l: 1, t: 'Tu deviens le DJ : mets un son gênant sur ton téléphone à fond 15 secondes.' },

  // ---- Niveau 2 : Hot ----
  { l: 2, t: 'Va demander son prénom à un inconnu et reviens avec. Refus = cul sec.' },
  { l: 2, t: 'Bisou sur la joue de {p}. Trop timide = 3 gorgées.' },
  { l: 2, t: 'Enlève un vêtement de ton choix (chaussettes acceptées, mais la table juge).' },
  { l: 2, t: 'Fais un compliment à un inconnu au bar. Il faut qu\'il sourie.' },
  { l: 2, t: 'Raconte ton pire date en public, à voix haute, pour la table d\'à côté.' },
  { l: 2, t: 'Envoie "je pense à toi" à ton dernier ex. Montre l\'envoi. Refus = cul sec.' },
  { l: 2, t: 'Assieds-toi sur les genoux de {p} jusqu\'à ton prochain tour.' },
  { l: 2, t: 'Danse 20 secondes sans musique au milieu du bar. Engagement total.' },
  { l: 2, t: 'Fais un slow de 15 secondes avec {p}. Regard tendre obligatoire.' },
  { l: 2, t: 'Demande à un inconnu s\'il veut faire un cul sec contre toi. S\'il accepte, la table applaudit.' },
  { l: 2, t: 'Lis à voix haute ton dernier message envoyé. Peu importe à qui.' },
  { l: 2, t: 'Dis à {p} ce que tu as vraiment pensé la première fois que tu l\'as vu.' },
  { l: 2, t: 'Va aux toilettes et reviens avec un objet trouvé (pas dégueu). Prouve-le.' },
  { l: 2, t: 'Appelle un pote absent et chante-lui "Joyeux anniversaire". Ce n\'est pas son anniversaire.' },
  { l: 2, t: 'Fais deviner à la table un secret sur toi en 3 indices. Deviné = ils boivent, sinon toi.' },
  { l: 2, t: 'Bisou sur la joue de la personne la plus canon du bar (hors table). Demande poliment d\'abord.' },
  { l: 2, t: 'Échange un vêtement avec {p} pour 2 tours.' },
  { l: 2, t: 'Fais un speech de 30 secondes sur pourquoi {p} est ton crush secret. Convaincant.' },
  { l: 2, t: 'Bois dans le verre de {p} sans les mains.' },
  { l: 2, t: 'Va au bar et commande avec l\'accent le plus ridicule possible, sans rire.' },
  { l: 2, t: 'Montre tes 3 dernières recherches Google. Sans supprimer avant.' },
  { l: 2, t: 'Fais-toi dessiner une moustache au marqueur/eyeliner par {p}. Tu la gardes.' },
  { l: 2, t: 'Déclare ta flamme à un inconnu avec un genou à terre. Puis reviens comme si de rien.' },
  { l: 2, t: 'Bois {n} gorgées, puis fais 10 tours sur toi-même et marche droit jusqu\'au bar.' },
  { l: 2, t: '{p} choisit un inconnu, tu dois obtenir son Instagram.' },
  { l: 2, t: 'Fais un massage d\'épaules à {p} pendant tout le prochain tour.' },
  { l: 2, t: 'Raconte la chose la plus gênante que tu aies faite bourré. La vraie.' },
  { l: 2, t: 'Pendant 1 tour, tu parles uniquement en chuchotant à l\'oreille de {p}, qui traduit.' },
  { l: 2, t: 'Change ta photo de profil pour une photo prise maintenant par {p}. 24 h minimum.' },
  { l: 2, t: 'Fais deviner à un inconnu ton âge. S\'il te vieillit, cul sec.' },

  // ---- Niveau 3 : Sans honte ----
  { l: 3, t: 'Bisou sur la bouche avec {p}, si {p} est d\'accord. Sinon vous buvez tous les deux.' },
  { l: 3, t: 'Enlève ton haut (ou ton bas, au choix) pour un tour complet. Le bar est ton podium.' },
  { l: 3, t: 'Va demander à un inconnu de te noter sur 10. Tu bois le complément à 10.' },
  { l: 3, t: 'Body shot : {p} boit une gorgée posée sur toi (bras, cou, ventre : ton choix).' },
  { l: 3, t: 'Fais un strip-tease de 20 secondes sur ta chaise. Un seul vêtement retiré max.' },
  { l: 3, t: 'Demande à un inconnu s\'il veut t\'embrasser. Réponse en direct devant la table.' },
  { l: 3, t: 'Raconte ton fantasme le plus bizarre. La table vote : crédible ou bullshit. Bullshit = cul sec.' },
  { l: 3, t: 'Lèche le cou de {p} (ou sa joue s\'il refuse le cou). Refus = cul sec pour toi.' },
  { l: 3, t: 'Passe 1 tour torse nu / en brassière. Si le bar réagit, tout le monde boit.' },
  { l: 3, t: 'Va au bar et déclare à voix haute : "Je suis célibataire et disponible ce soir". Puis reviens.' },
  { l: 3, t: 'Échange ton pantalon / ta jupe avec {p} pour un tour. Oui, ici.' },
  { l: 3, t: 'Envoie un vocal de 10 secondes de gémissements à ta mère. Ou cul sec + gage suivant.' },
  { l: 3, t: 'Fais un suçon à {p} (avec son accord). Il le garde toute la soirée.' },
  { l: 3, t: 'Demande à un inconnu de te donner un gage. Si la table valide, tu le fais.' },
  { l: 3, t: 'Mime ta position préférée. La table devine. Non deviné = cul sec.' },
  { l: 3, t: 'Bisou à {p} et à {q}. Dans l\'ordre de ton choix. Refus = tu bois pour trois.' },
  { l: 3, t: 'Va draguer le barman / la barmaid pendant 1 minute, sérieusement.' },
  { l: 3, t: 'Dis à {p} la chose la plus dégueu que tu aies faite pour quelqu\'un que tu voulais.' },
  { l: 3, t: 'Le plus long baiser avec {p} (accord obligatoire). Table chrono, record de la soirée à battre.' },
  { l: 3, t: 'Rentre chez toi avec un vêtement de {p}, qui repart avec un des tiens.' },
  { l: 3, t: 'Va demander à la table la plus proche s\'ils veulent jouer avec vous. Ramène-en un.' },
  { l: 3, t: 'Cul sec, puis appelle ton crush et dis "j\'ai bu, mais c\'est pas pour ça que j\'appelle".' },
  { l: 3, t: 'Fais un lap dance de 15 secondes à {p}. Musique choisie par {q}.' },
  { l: 3, t: 'Montre une photo de toi nu(e) ou en sous-vêtements. Aucune = tu bois pour la table.' },
  { l: 3, t: 'Dis tout haut le nom de la personne de la table avec qui tu coucherais. Silence = cul sec.' },
  // ---- Ajouts : entre vous, sans impliquer d'inconnus ----
  { l: 1, t: 'Fais le tour de la table en donnant un surnom à chacun. Le meilleur reste toute la soirée.' },
  { l: 1, t: 'Jusqu\'à ton prochain tour, tu parles de toi à la troisième personne. Chaque « je » = gorgée.' },
  { l: 1, t: 'Fais une pub de 20 secondes pour ton verre. La table note sur 10 : moins de 6, tu bois.' },
  { l: 1, t: 'Chante le refrain choisi par {p}. Refus = 2 gorgées.' },
  { l: 1, t: 'Bras de fer avec {p}. Le perdant boit 2 gorgées.' },
  { l: 1, t: 'Tiens en équilibre sur un pied jusqu\'à la fin du tour de table. Pied posé = gorgée.' },
  { l: 1, t: 'Raconte une anecdote sur {p} : la table vote vraie ou inventée. Ceux qui se trompent boivent.' },
  { l: 1, t: 'Pierre-feuille-ciseaux en 3 manches contre {p}. Le perdant boit {n} gorgées.' },
  { l: 1, t: 'Ne dis plus ni « oui » ni « non » jusqu\'à ton prochain tour. Chaque faute = gorgée.' },
  { l: 1, t: 'Fais deviner une chanson en la fredonnant. Personne ne trouve en 20 secondes = tu bois.' },
  { l: 1, t: 'Invente un cri de guerre pour la table. Tout le monde le reprend avant de trinquer.' },
  { l: 1, t: 'Concours de regard avec {p}. Le premier qui rit ou cligne boit.' },
  { l: 1, t: 'Décris {p} comme une annonce Leboncoin. La table valide, ou tu bois.' },
  { l: 1, t: 'Trinque avec chaque personne de la table en la regardant dans les yeux. Un regard évité = gorgée pour toi.' },
  { l: 2, t: 'Lis à voix haute le dernier message que tu as envoyé. Refus = 3 gorgées.' },
  { l: 2, t: 'Laisse {p} écrire ta prochaine story. Tu valides avant de poster, ou tu bois 3 gorgées.' },
  { l: 2, t: 'Fais un compliment sincère à chaque personne de la table. Compliment bidon = gorgée.' },
  { l: 2, t: 'Montre ton dernier screenshot. Refus = 2 gorgées.' },
];

export const VERITES = [
  // ---- Soft ----
  { l: 1, t: 'Quelle est la pire chose que tu aies dite pour éviter un rencard ?' },
  { l: 1, t: 'Ton plus gros mensonge à tes parents ?' },
  { l: 1, t: 'Qui à cette table a le pire goût vestimentaire ? Argumente.' },
  { l: 1, t: 'Ta pire honte à l\'école ?' },
  { l: 1, t: 'Le dernier truc que tu as stalké sur Instagram ?' },
  { l: 1, t: 'Si tu devais supprimer quelqu\'un de cette table de tes contacts, ce serait qui ?' },
  { l: 1, t: 'Combien de fois tu t\'es endormi bourré dans un endroit chelou ? Raconte le pire.' },
  { l: 1, t: 'Ton talent caché le plus inutile ?' },
  { l: 1, t: 'Quel message tu as regretté d\'avoir envoyé ?' },
  { l: 1, t: 'Ta plus grosse peur irrationnelle ?' },
  { l: 1, t: 'Le surnom le plus gênant qu\'on t\'ait donné ?' },
  { l: 1, t: 'Qui ici tu appellerais en cas de garde à vue ?' },
  { l: 1, t: 'Ta pire habitude que personne ici ne connaît ?' },
  { l: 1, t: 'Quelle chanson tu écoutes en cachette ?' },
  { l: 1, t: 'Le truc le plus con que tu aies acheté bourré ?' },

  // ---- Hot ----
  { l: 2, t: 'Qui à cette table tu as déjà trouvé attirant(e) ? Sois précis.' },
  { l: 2, t: 'Ton pire râteau, version longue.' },
  { l: 2, t: 'La dernière fois que tu as menti à quelqu\'un de cette table ?' },
  { l: 2, t: 'Ton body count ? Réponse ou 3 gorgées.' },
  { l: 2, t: 'As-tu déjà ghosté quelqu\'un ? Pourquoi ?' },
  { l: 2, t: 'L\'endroit le plus étrange où tu as embrassé quelqu\'un ?' },
  { l: 2, t: 'Ton plus gros red flag, celui que tes ex citeraient tous ?' },
  { l: 2, t: 'Tu as déjà fait semblant d\'aimer quelqu\'un pour ne pas être seul ?' },
  { l: 2, t: 'Le pire message que tu aies envoyé à 3 h du matin ?' },
  { l: 2, t: 'Qui, ici, tu ne présenterais jamais à ta famille ? Pourquoi ?' },
  { l: 2, t: 'Ta pire soirée Tinder / Hinge / Bumble ?' },
  { l: 2, t: 'Tu as déjà pleuré à cause de quelqu\'un de cette table ?' },
  { l: 2, t: 'Ce que tu penses vraiment du dernier crush de {p} ?' },
  { l: 2, t: 'Le secret que tu caches à ton meilleur pote ?' },
  { l: 2, t: 'Quelle personne de ce bar tu aborderais si tu avais 10 gorgées de courage ?' },

  // ---- Sans honte ----
  { l: 3, t: 'Ton fantasme que tu n\'as jamais avoué ?' },
  { l: 3, t: 'La chose la plus sale que tu aies faite dans un lieu public ?' },
  { l: 3, t: 'Avec qui de cette table tu coucherais si personne ne le savait jamais ?' },
  { l: 3, t: 'Ta pire performance au lit ? Raconte.' },
  { l: 3, t: 'As-tu déjà trompé ? Ou été tenté ? Détails.' },
  { l: 3, t: 'Le truc le plus gênant qu\'un partenaire t\'ait dit pendant l\'acte ?' },
  { l: 3, t: 'Ton kink le plus inattendu ?' },
  { l: 3, t: 'Tu as déjà couché avec deux personnes de ce groupe d\'amis ? Qui ?' },
  { l: 3, t: 'La plus courte relation que tu aies eue, en heures ?' },
  { l: 3, t: 'Une chose que tu as faite bourré et jamais avouée à ton/ta partenaire ?' },
  { l: 3, t: 'Tu as déjà sexté quelqu\'un de cette table ? Ou voulu le faire ?' },
  { l: 3, t: 'Le pire endroit où tu t\'es fait surprendre ?' },
  { l: 3, t: 'Combien de personnes ici t\'ont déjà vu nu(e), volontairement ou non ?' },
  { l: 3, t: 'Ta pire honte sexuelle, celle qui te réveille la nuit ?' },
  { l: 3, t: 'Si tu devais choisir : un plan à trois avec deux personnes de la table. Lesquelles ?' },
  // ---- Ajouts ----
  { l: 1, t: 'Ton excuse la plus nulle pour annuler une soirée ?' },
  { l: 1, t: 'Le dernier mensonge que tu as dit à tes parents ?' },
  { l: 1, t: 'L\'appli sur laquelle tu perds le plus de temps, et combien d\'heures par jour ?' },
  { l: 1, t: 'La chose la plus chère que tu aies achetée après une soirée ?' },
  { l: 1, t: 'Ton pire look, et en quelle année ?' },
  { l: 1, t: 'Le film que tout le monde adore et que tu détestes ?' },
  { l: 1, t: 'Ta pire note, et dans quelle matière ?' },
  { l: 1, t: 'Le truc le plus bête pour lequel tu t\'es blessé(e) ?' },
  { l: 1, t: 'Qui à cette table a le meilleur style ?' },
  { l: 1, t: 'Ta phobie la plus ridicule ?' },
  { l: 2, t: 'Ton pire date, en trois phrases ?' },
  { l: 2, t: 'Le dernier message que tu as regretté d\'envoyer ?' },
  { l: 2, t: 'Qui à cette table tu présenterais à tes parents sans stresser ?' },
  { l: 2, t: 'Ton plus gros red flag, selon toi ?' },
  { l: 2, t: 'La dernière fois que tu as pleuré pour quelqu\'un ?' },
  { l: 2, t: 'Ce que tu regardes en premier chez quelqu\'un qui te plaît ?' },
  { l: 2, t: 'As-tu déjà été jaloux ou jalouse de quelqu\'un ici ? Pourquoi ?' },
  { l: 2, t: 'Le truc que tu fais semblant d\'aimer pour plaire ?' },
  { l: 2, t: 'Ton ex te décrirait comment, en un mot ?' },
  { l: 2, t: 'La pire chose que tu aies faite par jalousie ?' },
  { l: 3, t: 'Ton plus gros regret d\'un soir ?' },
  { l: 3, t: 'Le fantasme que tu n\'as jamais avoué ?' },
  { l: 3, t: 'La chose la plus osée que tu aies faite dans un lieu public ?' },
  { l: 3, t: 'Avec qui de la table le lendemain matin serait le plus gênant ?' },
];

export const JAMAIS = [
  // "Jamais je n'ai…" — ceux qui l'ont fait boivent.
  { l: 1, t: '…vomi dans un Uber.' },
  { l: 1, t: '…menti sur mon âge pour rentrer quelque part.' },
  { l: 1, t: '…pleuré devant un film Pixar.' },
  { l: 1, t: '…fait semblant de connaître quelqu\'un qui me disait bonjour.' },
  { l: 1, t: '…stalké un ex à 2 h du matin.' },
  { l: 1, t: '…dormi dans une baignoire.' },
  { l: 1, t: '…perdu mon téléphone en soirée.' },
  { l: 1, t: '…envoyé un message au mauvais groupe.' },
  { l: 1, t: '…fait un cul sec avant midi.' },
  { l: 1, t: '…triché à un jeu à boire.' },
  { l: 1, t: '…fini une soirée sans savoir comment j\'étais rentré.' },
  { l: 1, t: '…chanté du Céline Dion en karaoké.' },
  { l: 2, t: '…embrassé quelqu\'un de cette table.' },
  { l: 2, t: '…embrassé deux personnes la même soirée.' },
  { l: 2, t: '…ghosté quelqu\'un après un rencard.' },
  { l: 2, t: '…dragué le/la partenaire d\'un pote.' },
  { l: 2, t: '…envoyé une photo que je regrette.' },
  { l: 2, t: '…menti sur mon nombre de partenaires.' },
  { l: 2, t: '…fait semblant d\'avoir un plan pour éviter un rencard.' },
  { l: 2, t: '…eu un crush sur quelqu\'un de cette table.' },
  { l: 2, t: '…matché avec quelqu\'un de cette table sur une app.' },
  { l: 2, t: '…embrassé un inconnu dans ce bar (ou un autre bar).' },
  { l: 2, t: '…fini nu(e) dans un endroit public.' },
  { l: 2, t: '…pleuré à cause d\'un match Tinder.' },
  { l: 3, t: '…couché le premier soir.' },
  { l: 3, t: '…couché avec un(e) ex d\'un(e) ami(e).' },
  { l: 3, t: '…fait un plan à trois.' },
  { l: 3, t: '…trompé quelqu\'un.' },
  { l: 3, t: '…couché dans un lieu public.' },
  { l: 3, t: '…sexté quelqu\'un pendant un repas de famille.' },
  { l: 3, t: '…couché avec quelqu\'un de cette table.' },
  { l: 3, t: '…menti sur mon prénom à un coup d\'un soir.' },
  { l: 3, t: '…eu une relation avec quelqu\'un de plus de 10 ans d\'écart.' },
  { l: 3, t: '…fait ça dans les toilettes d\'un bar.' },
  { l: 3, t: '…regretté avec qui je me suis réveillé(e).' },
  { l: 3, t: '…utilisé un objet qui n\'était pas prévu pour ça.' },
  // ---- Ajouts ----
  { l: 1, t: '…raté mon arrêt parce que je dormais dans le métro.' },
  { l: 1, t: '…envoyé un message au mauvais groupe.' },
  { l: 1, t: '…fait semblant d\'avoir lu un livre pour briller en soirée.' },
  { l: 1, t: '…pleuré devant un dessin animé.' },
  { l: 1, t: '…oublié le prénom de quelqu\'un juste après qu\'il s\'est présenté.' },
  { l: 1, t: '…commandé à manger en rentrant de soirée et dormi avant la livraison.' },
  { l: 1, t: '…dit « j\'arrive » alors que j\'étais encore sous la douche.' },
  { l: 1, t: '…cherché mon téléphone alors qu\'il était dans ma main.' },
  { l: 1, t: '…stalké quelqu\'un jusqu\'à ses photos de 2016.' },
  { l: 1, t: '…liké une vieille photo par accident en stalkant.' },
  { l: 1, t: '…fait une nuit blanche avant un partiel.' },
  { l: 1, t: '…menti sur une note pour avoir la paix.' },
  { l: 1, t: '…séché un cours pour finir une série.' },
  { l: 1, t: '…payé une tournée que je ne pouvais pas me permettre.' },
  { l: 1, t: '…dansé sur une table.' },
  { l: 1, t: '…fait semblant d\'être au téléphone pour éviter quelqu\'un.' },
  { l: 2, t: '…embrassé quelqu\'un dont je ne connaissais pas le prénom.' },
  { l: 2, t: '…recontacté un(e) ex un soir de cuite.' },
  { l: 2, t: '…eu un date qui a duré moins de 20 minutes.' },
  { l: 2, t: '…fait croire que j\'étais célibataire.' },
  { l: 2, t: '…eu un crush sur un(e) prof.' },
  { l: 2, t: '…matché avec quelqu\'un que je connaissais déjà, et fait comme si de rien n\'était.' },
  { l: 2, t: '…embrassé deux personnes différentes dans la même soirée.' },
  { l: 2, t: '…menti sur mon âge sur une appli.' },
  { l: 2, t: '…quitté quelqu\'un par message.' },
  { l: 2, t: '…envoyé un message risqué à la mauvaise personne.' },
  { l: 3, t: '…fait ça dans une voiture.' },
  { l: 3, t: '…eu une histoire avec deux potes du même groupe.' },
  { l: 3, t: '…été surpris(e) en pleine action.' },
  { l: 3, t: '…eu un plan régulier que personne ici ne connaît.' },
];

// Pénalités variées pour le mode Cartes (au lieu de "tu bois" à chaque fois).
export const PENALITES = [
  'bois 2 gorgées',
  'bois 3 gorgées',
  'cul sec',
  'distribue 3 gorgées',
  'bois avec {p}',
  'tout le monde boit sauf toi',
  'tu bois et tu tires une carte de plus',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Remplace les placeholders d'une carte.
 * `players` : tous les prénoms, `self` : celui qui joue (exclu de {p}/{q}).
 */
export function fillCard(text, players = [], self = null) {
  const others = players.filter((p) => p !== self);
  const pool = others.length ? others : players.length ? players : ['ton voisin'];
  const p = rand(pool);
  const qPool = pool.filter((x) => x !== p);
  const q = qPool.length ? rand(qPool) : p;
  const n = 2 + Math.floor(Math.random() * 4);
  return text.replaceAll('{p}', p).replaceAll('{q}', q).replaceAll('{n}', String(n));
}
