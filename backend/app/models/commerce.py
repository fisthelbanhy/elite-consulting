"""E-commerce, catalogue produit, panier et paiements (legacy : produit, panier, payement,
immobilier, article, articlecourse, course1, course2)."""

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, Consultable, Horodatage
from app.enums import Etat, EtatCourse, EtatPaiement, OffreDemande, OuiNon
from app.models.core import FamilleArticle, Quartier
from app.models.membres import Membre


class Produit(Consultable, Base):
    """Catalogue Forever Living Products (Aloe Vera) : 3 niveaux de prix."""

    __tablename__ = "produit"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(30), default="")
    nom: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    groupe: Mapped[int] = mapped_column(SmallInteger, default=0, index=True)  # GroupeProduit
    prix_distributeur: Mapped[int] = mapped_column(BigInteger, default=0)
    prix_non_distributeur: Mapped[int] = mapped_column(BigInteger, default=0)
    prix_public: Mapped[int] = mapped_column(BigInteger, default=0)
    quantite_stock: Mapped[int] = mapped_column(default=0)
    photo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)


class Paiement(Base):
    """Journal générique des paiements (legacy `payement`), confirmé par un gestionnaire."""

    __tablename__ = "paiement"

    id: Mapped[int] = mapped_column(primary_key=True)
    membre_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"), index=True)
    type_objet: Mapped[int] = mapped_column(SmallInteger)  # TypeObjetPaye
    objet_id: Mapped[int | None] = mapped_column()  # id de l'objet payé (course, souscription…)
    date_paiement: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    mode: Mapped[int] = mapped_column(SmallInteger)  # ModePaiement
    montant: Mapped[int] = mapped_column(BigInteger)
    remarque: Mapped[str] = mapped_column(Text, default="")  # code Charden / n° de transaction
    etat: Mapped[int] = mapped_column(SmallInteger, default=EtatPaiement.NON_CONFIRME, index=True)
    confirme_par_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    date_confirmation: Mapped[datetime | None] = mapped_column(DateTime)

    membre: Mapped[Membre | None] = relationship(foreign_keys=[membre_id])
    confirme_par: Mapped[Membre | None] = relationship(foreign_keys=[confirme_par_id])


class LignePanier(Base):
    """Ligne de panier : prix figé au moment de l'ajout. Suppression physique (comme le legacy)."""

    __tablename__ = "ligne_panier"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_objet: Mapped[int] = mapped_column(SmallInteger)  # TypeObjetPaye (1 produit, 2 article)
    membre_id: Mapped[int] = mapped_column(ForeignKey("membre.id"), index=True)
    produit_id: Mapped[int | None] = mapped_column(ForeignKey("produit.id"))
    article_id: Mapped[int | None] = mapped_column(ForeignKey("article.id"))
    quantite: Mapped[int] = mapped_column(default=1)
    prix_unitaire: Mapped[int] = mapped_column(BigInteger, default=0)
    date_ajout: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    paye: Mapped[bool] = mapped_column(default=False)
    date_paiement: Mapped[date | None] = mapped_column(Date)
    paiement_id: Mapped[int | None] = mapped_column(ForeignKey("paiement.id"))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    produit: Mapped[Produit | None] = relationship()
    article: Mapped["Article | None"] = relationship()


class Immobilier(Horodatage, Consultable, Base):
    __tablename__ = "immobilier"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    offre_ou_recherche: Mapped[int] = mapped_column(SmallInteger, default=OffreDemande.OFFRE, index=True)
    type_transaction: Mapped[int] = mapped_column(SmallInteger, default=0)  # TypeTransaction
    type_bien: Mapped[int] = mapped_column(SmallInteger, default=0)  # TypeBien
    quartier_id: Mapped[int | None] = mapped_column(ForeignKey("quartier.id"))
    localisation: Mapped[str] = mapped_column(Text, default="")
    surface_m2: Mapped[int] = mapped_column(default=0)
    nombre_pieces: Mapped[int] = mapped_column(SmallInteger, default=0)
    nombre_chambres: Mapped[int] = mapped_column(SmallInteger, default=0)
    situation: Mapped[int] = mapped_column(SmallInteger, default=1)  # SituationBien
    prix: Mapped[int] = mapped_column(BigInteger, default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    photo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    auteur: Mapped[Membre | None] = relationship()
    quartier: Mapped[Quartier | None] = relationship()


class Article(Horodatage, Consultable, Base):
    """Petite annonce d'article neuf ou d'occasion (offre ou recherche)."""

    __tablename__ = "article"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    auteur_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    famille_id: Mapped[int | None] = mapped_column(ForeignKey("famille_article.id"))
    offre_ou_recherche: Mapped[int] = mapped_column(SmallInteger, default=OffreDemande.OFFRE, index=True)
    libelle: Mapped[str] = mapped_column(String(200))
    prix: Mapped[int] = mapped_column(BigInteger, default=0)
    quantite: Mapped[int] = mapped_column(default=0)
    neuf_ou_occasion: Mapped[int] = mapped_column(SmallInteger, default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    photo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.NON_TRAITE)

    auteur: Mapped[Membre | None] = relationship()
    famille: Mapped[FamilleArticle | None] = relationship()


class ArticleCourse(Base):
    """Catalogue d'une boutique partenaire pour le service de courses."""

    __tablename__ = "article_course"

    id: Mapped[int] = mapped_column(primary_key=True)
    boutique_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"), index=True)
    code: Mapped[str] = mapped_column(String(30), default="")
    nom: Mapped[str] = mapped_column(String(200))
    marque: Mapped[str] = mapped_column(String(120), default="")
    prix: Mapped[int] = mapped_column(BigInteger, default=0)
    disponible: Mapped[int] = mapped_column(SmallInteger, default=OuiNon.OUI)
    description: Mapped[str] = mapped_column(Text, default="")
    photo: Mapped[str | None] = mapped_column(String(255))
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    boutique: Mapped[Membre | None] = relationship()


class Course(Horodatage, Base):
    """Commande de courses/livraison (legacy `course1`)."""

    __tablename__ = "course"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), default="", index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"), index=True)
    boutique_id: Mapped[int | None] = mapped_column(ForeignKey("membre.id"))
    lieu_achat: Mapped[str] = mapped_column(Text, default="")
    date_achat: Mapped[date | None] = mapped_column(Date)
    date_livraison: Mapped[datetime | None] = mapped_column(DateTime)
    lieu_livraison: Mapped[str] = mapped_column(Text, default="")
    montant_achats: Mapped[int] = mapped_column(BigInteger, default=0)
    frais_service: Mapped[int] = mapped_column(BigInteger, default=0)
    mode_paiement: Mapped[int] = mapped_column(SmallInteger, default=0)
    paye: Mapped[int] = mapped_column(SmallInteger, default=OuiNon.NON)
    observation: Mapped[str] = mapped_column(Text, default="")
    etat_course: Mapped[int] = mapped_column(SmallInteger, default=EtatCourse.EN_ATTENTE)
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    client: Mapped[Membre | None] = relationship(foreign_keys=[client_id])
    boutique: Mapped[Membre | None] = relationship(foreign_keys=[boutique_id])
    lignes: Mapped[list["LigneCourse"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="LigneCourse.id"
    )


class LigneCourse(Base):
    """Article à acheter : `prix_plafond` = prix maximum à ne pas dépasser."""

    __tablename__ = "ligne_course"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("course.id", ondelete="CASCADE"))
    article_catalogue_id: Mapped[int | None] = mapped_column(ForeignKey("article_course.id"))
    nom_article: Mapped[str] = mapped_column(Text, default="")
    prix_plafond: Mapped[int] = mapped_column(BigInteger, default=0)
    quantite: Mapped[int] = mapped_column(default=1)
    observation: Mapped[str] = mapped_column(Text, default="")
    etat: Mapped[int] = mapped_column(SmallInteger, default=Etat.AUTORISE)

    course: Mapped[Course] = relationship(back_populates="lignes")
