export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface Adresse {
  addresse1?: string;
  addresse2?: string;
  Ville?: string;
  codePostale?: string;
  pays?: string;
}

export interface Category {
  id?: number;
  codeCategory?: string;
  designation?: string;
}

export interface Article {
  id?: number;
  codeArticle?: string;
  designation?: string;
  prixUnitaire?: number;
  tauxTva?: number;
  prixUnitaireTTc?: number;
  seuilAlerte?: number;
  photo?: string;
  category?: Category;
  idEntreprise?: number;
}

export interface Client {
  id?: number;
  nom?: string;
  prenom?: string;
  adresse?: Adresse;
  photo?: string;
  mail?: string;
  numTel?: string;
}

export interface Fournisseur {
  id?: number;
  nom?: string;
  prenom?: string;
  adresse?: Adresse;
  photo?: string;
  mail?: string;
  numTel?: string;
}

export type EtatCommande = "EN_PREPARATION" | "VALIDEE" | "LIVREE";

export interface CommandeClient {
  id?: number;
  code?: string;
  dateComande?: string;
  etatCommande?: EtatCommande;
  client?: Client;
  idEntreprise?: number;
}

export interface Vente {
  id?: number;
  code?: string;
  dateVente?: string;
  commentaire?: string;
  /** Nom du client (optionnel), information enregistrée sur le ticket/la vente. */
  nomClient?: string;
  /** Nom du vendeur ayant enregistré la vente (renseigné côté serveur). */
  nomVendeur?: string;
  idEntreprise?: number;
  ligneVentes?: LigneVente[];
}

export interface LigneVente {
  id?: number;
  article?: Article;
  quantite?: number;
  prixUnitaire?: number;
}

export interface MvtStk {
  id?: number;
  dateMvt?: string;
  quantite?: number;
  article?: Article;
  typeMvt?: string;
  sourceMvt?: string;
}

export interface Utilisateur {
  id?: number;
  nom?: string;
  prenom?: string;
  email?: string;
  motDePasse?: string;
  dateDeNaissance?: string;
  photo?: string;
  adresse?: Adresse;
  entreprise?: { id?: number; nom?: string };
  roles?: { id?: number; rolename?: string }[];
}

export interface Role {
  id?: number;
  rolename?: string;
}

export interface Dashboard {
  chiffreAffairesTotal: number;
  chiffreAffairesMoisEnCours: number;
  chiffreAffairesJourEnCours: number;
  nombreClients: number;
  nombreFournisseurs: number;
  nombreArticles: number;
  nombreCommandesClient: number;
  nombreCommandesFournisseur: number;
  nombreVentes: number;
  stockSousSeuil: number;
  valeurStock: number;
  margeMoyenne: number;
  topArticles: { idArticle: number; designation: string; codeArticle: string; quantiteVendue: number; chiffreAffaires: number }[];
  /** Ventes du jour groupées par vendeur (utile aux rôles ADMIN/MANAGER). */
  ventesDuJourParVendeur: { idVendeur: number; nomVendeur: string; nombreVentes: number; chiffreAffaires: number; articlesVendus: number }[];
  ventesParMois: { annee: number; mois: number; chiffreAffaires: number }[];
  ventesParCategorie: { idCategory: number; designation: string; chiffreAffaires: number }[];
  commandesParClient: { idClient: number; nom: string; prenom: string; nombreCommandes: number; montantTotal: number }[];
}

export interface Entreprise {
  id?: number;
  nom?: string;
  description?: string;
  adresse?: Adresse;
  codefiscale?: string;
  photo?: string;
  email?: string;
  numTel?: string;
  siteWeb?: string;
  /** Mot de passe temporaire de l'admin, renvoyé uniquement à la création de l'entreprise. */
  motDePasse?: string;
}
