const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');




// Import du modèle User
const UserModel = require('./user')(sequelize, DataTypes);
const PersonnelModel = require('./personnel')(sequelize, DataTypes);
const ClientModel = require('./client')(sequelize, DataTypes);
const EnginModel = require('./engin')(sequelize, DataTypes);
const ProfilModel = require('./profil')(sequelize, DataTypes);
const ServicePersonModel = require('./service_person')(sequelize, DataTypes);
const CongeModel = require('./conge')(sequelize, DataTypes);
const PlanificationModel = require('./planification')(sequelize, DataTypes);
const MaterielModel = require('./materiel')(sequelize, DataTypes);
const MaterielEntreeModel = require('./materiel_entree')(sequelize, DataTypes);
const MaterielSortieModel = require('./materiel_sortie')(sequelize, DataTypes);
const MaterielRebutModel = require('./materiel_rebut')(sequelize, DataTypes);
const StockSachetEntreeModel = require('./stock_sachet_entree')(sequelize, DataTypes);
const StockSachetSortieModel = require('./stock_sachet_sortie')(sequelize, DataTypes);
const TypeDepenseModel = require('./TypeDepense')(sequelize, DataTypes);
const VenteModel = require('./vente')(sequelize, DataTypes);
const PaiementModel = require('./paiement')(sequelize, DataTypes);
const ClientTmpModel = require('./client_tmp')(sequelize, DataTypes);
const VenteTmpModel = require('./vente_tmp')(sequelize, DataTypes);
const PaiementTmpModel = require('./paiement_tmp')(sequelize, DataTypes);
const MontantPersonnelModel = require('./montant_personnel')(sequelize, DataTypes);
const SalaireModel = require('./salaire')(sequelize, DataTypes);
const PersonnelAvanceModel = require('./personnel_avance')(sequelize, DataTypes);
const DepenseModel = require('./depense')(sequelize, DataTypes);
const MvtMatiereModel = require('./mvt_matiere')(sequelize, DataTypes);
const CommandeModel = require('./commande')(sequelize, DataTypes);
const TicketModel = require('./ticket')(sequelize, DataTypes);
const RevendeurModel = require('./revendeur')(sequelize, DataTypes);
const ClientClientTmpModel = require('./client_client_tmp')(sequelize, DataTypes);
const ReservationModel = require('./reservation')(sequelize, DataTypes);
//relations entre les tables
ClientModel.hasMany(VenteModel, { foreignKey: 'id_client', onDelete: 'CASCADE' });
VenteModel.belongsTo(ClientModel, { foreignKey: 'id_client' });
VenteModel.hasMany(PaiementModel, { foreignKey: 'id_vente', onDelete: 'CASCADE' });
PaiementModel.belongsTo(VenteModel, { foreignKey: 'id_vente' });
ClientTmpModel.hasMany(VenteTmpModel, { foreignKey: 'id_client', as: 'Ventes', onDelete: 'CASCADE' });
VenteTmpModel.belongsTo(ClientTmpModel, { foreignKey: 'id_client', as: 'Client' });
VenteTmpModel.hasMany(PaiementTmpModel, { foreignKey: 'id_vente', as: 'Paiements', onDelete: 'CASCADE' });
PaiementTmpModel.belongsTo(VenteTmpModel, { foreignKey: 'id_vente', as: 'vente' });
PersonnelModel.hasOne(MontantPersonnelModel, { foreignKey: 'id_personnel', onDelete: 'CASCADE' });
MontantPersonnelModel.belongsTo(PersonnelModel, { foreignKey: 'id_personnel' });

PersonnelModel.hasMany(PersonnelAvanceModel, { foreignKey: 'id_personnel', as: 'avances' });
PersonnelAvanceModel.belongsTo(PersonnelModel, { foreignKey: 'id_personnel', as: 'personnel' });

PersonnelModel.hasMany(SalaireModel, { foreignKey: 'id_personnel', as: 'salaires' });
SalaireModel.belongsTo(PersonnelModel, { foreignKey: 'id_personnel', as: 'personnel' });
DepenseModel.belongsTo(TypeDepenseModel, { foreignKey: 'id_type_depense', as: 'typeDepense' });
TypeDepenseModel.hasMany(DepenseModel, { foreignKey: 'id_type_depense', as: 'depenses' });

DepenseModel.belongsTo(EnginModel, { foreignKey: 'id_engin', as: 'engin' });
EnginModel.hasMany(DepenseModel, { foreignKey: 'id_engin', as: 'depenses' });

PersonnelModel.belongsTo(ProfilModel, { foreignKey: 'id_profil', as: 'profil' });
ProfilModel.hasMany(PersonnelModel, { foreignKey: 'id_profil', as: 'personnels' });

PersonnelModel.hasMany(ServicePersonModel, { foreignKey: 'id_personnel', as: 'services' });
ServicePersonModel.belongsTo(PersonnelModel, { foreignKey: 'id_personnel', as: 'personnel' });

PersonnelModel.hasMany(CongeModel, { foreignKey: 'id_personnel', as: 'conges' });
CongeModel.belongsTo(PersonnelModel, { foreignKey: 'id_personnel', as: 'personnel' });

PersonnelModel.hasMany(PlanificationModel, { foreignKey: 'id_personnel', as: 'planifications' });
PlanificationModel.belongsTo(PersonnelModel, { foreignKey: 'id_personnel', as: 'personnel' });

MaterielModel.hasMany(MaterielEntreeModel, { foreignKey: 'id_materiel', as: 'entrees' });
MaterielEntreeModel.belongsTo(MaterielModel, { foreignKey: 'id_materiel', as: 'materiel' });

MaterielModel.hasMany(MaterielSortieModel, { foreignKey: 'id_materiel', as: 'sorties' });
MaterielSortieModel.belongsTo(MaterielModel, { foreignKey: 'id_materiel', as: 'materiel' });

MaterielModel.hasMany(MaterielRebutModel, { foreignKey: 'id_materiel', as: 'rebuts' });
MaterielRebutModel.belongsTo(MaterielModel, { foreignKey: 'id_materiel', as: 'materiel' });
ClientModel.hasMany(CommandeModel, { foreignKey: 'id_client', onDelete: 'CASCADE' });
CommandeModel.belongsTo(ClientModel, { foreignKey: 'id_client' });
TicketModel.belongsTo(ClientModel, { foreignKey: 'id_client' });
ClientModel.hasMany(TicketModel, { foreignKey: 'id_client', onDelete: 'CASCADE' });

// Revendeur <-> User
RevendeurModel.belongsTo(UserModel, { foreignKey: 'id_user', as: 'user' });
UserModel.hasOne(RevendeurModel, { foreignKey: 'id_user', as: 'revendeur' });


// Synchronisation automatique
/*sequelize.sync({ alter: true }) 
  .then(() => {
    console.log(' Base de données synchronisée (User).');
  })
  .catch((err) => {
    console.error(' Erreur de synchronisation :', err);
});*/

module.exports = {
  sequelize,
  User: UserModel,
  Personnel: PersonnelModel, 
  Client: ClientModel,
  Engin:EnginModel,
  Profil:ProfilModel,
  ServicePerson:ServicePersonModel,
  Conge:CongeModel,
  Planification:PlanificationModel,
  Materiel:MaterielModel,
  MaterielEntree:MaterielEntreeModel,
  MaterielSortie:MaterielSortieModel,
  MaterielRebut:MaterielRebutModel,
  StockSachetEntree:StockSachetEntreeModel,
  StockSachetSortie:StockSachetSortieModel,
  TypeDepense:TypeDepenseModel,
  Vente:VenteModel,
  Paiement:PaiementModel,
  ClientTmp: ClientTmpModel,
  VenteTmp: VenteTmpModel,
  PaiementTmp: PaiementTmpModel,
  MontantPersonnel:MontantPersonnelModel,
  PersonnelAvance:PersonnelAvanceModel,
  Salaire:SalaireModel,
  Depense:DepenseModel,
  MvtMatiere:MvtMatiereModel,
  Commande:CommandeModel,
  Ticket: TicketModel,
  Revendeur: RevendeurModel,
  ClientClientTmp: ClientClientTmpModel,
  Reservation: ReservationModel,
};
