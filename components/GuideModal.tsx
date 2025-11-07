
import React, { useState } from 'react';
import { XMarkIcon, ChevronDownIcon } from './Icons';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CollapsibleGuideSection: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, children, isOpen, onToggle }) => (
    <section className="border-b dark:border-gray-700 py-4 last:border-b-0">
        <button onClick={onToggle} className="w-full flex justify-between items-center text-left">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
            <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen mt-3' : 'max-h-0'}`}>
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-3 text-gray-600 dark:text-gray-300">
                {children}
            </div>
        </div>
    </section>
);


export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['👋 Bienvenue !']));

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(title)) {
            newSet.delete(title);
        } else {
            newSet.add(title);
        }
        return newSet;
    });
  };

  const sections = [
    {
      title: '👋 Bienvenue !',
      content: (
        <p>
          Ce guide est conçu pour vous aider à maîtriser chaque aspect de votre nouvel outil de gestion financière. Prenez quelques minutes pour le lire, vous découvrirez des fonctionnalités puissantes pour reprendre le contrôle de vos finances.
        </p>
      )
    },
    {
      title: '🧠 Concepts Clés à Comprendre',
      content: (
        <>
          <p><strong>Réel vs Potentiel :</strong> C'est la base de la prévision. Une transaction <strong>"Réelle"</strong> est déjà passée et impacte votre solde actuel. Une transaction <strong>"Potentielle"</strong> est une opération future, générée automatiquement par vos dépenses récurrentes, virements programmés ou remboursements attendus. Elle n'impacte que vos soldes prévisionnels.</p>
          <p><strong>Date d'Opération vs Date d'Effet :</strong> La <strong>date d'opération</strong> est le jour où vous avez fait l'achat. La <strong>date d'effet</strong> (ou de valeur) est le jour où l'argent quitte réellement votre compte. Cette distinction est cruciale pour un suivi précis de votre trésorerie, notamment avec les cartes à débit différé.</p>
          <p><strong>Réserves :</strong> Considérez-les comme des "enveloppes virtuelles" au sein d'un compte. C'est une façon d'isoler de l'argent pour un projet (vacances, apport) sans avoir à le déplacer physiquement. Le solde de vos réserves est inclus dans le solde total du compte mais séparé visuellement pour plus de clarté.</p>
        </>
      )
    },
    {
      title: '🚀 Mise en Route Rapide (5 minutes)',
      content: (
        <ol className="list-decimal list-inside space-y-2">
            <li><strong>Créez vos comptes :</strong> Allez dans <strong>"Patrimoine"</strong> et utilisez le bouton "+ Ajouter". Créez tous vos comptes (Courant, Livret A...). Pour le "solde initial", indiquez le <strong>solde actuel</strong> de votre relevé bancaire. C'est le point de départ de tous les calculs.</li>
            <li><strong>Définissez votre compte principal :</strong> Dans <strong>"Paramètres" &gt; "Général"</strong>, choisissez le compte que vous utilisez le plus. Il sera pré-sélectionné pour vous faire gagner du temps.</li>
            <li><strong>Programmez vos opérations fixes :</strong> Allez dans <strong>"Transactions" &gt; "Opérations Récurrentes"</strong>. Ajoutez votre salaire, loyer, abonnements... C'est l'étape la plus importante pour une prévision fiable !</li>
            <li><strong>Ajoutez vos dernières dépenses :</strong> Saisissez manuellement vos dernières opérations ou utilisez l'<strong>import CSV intelligent</strong> pour un démarrage encore plus rapide.</li>
        </ol>
      )
    },
    {
      title: '👥 Gestion Multi-Profils',
      content: (
          <>
              <p>Gérez plusieurs comptabilités de manière totalement étanche. Idéal pour un budget personnel, un budget commun, ou même pour suivre les finances d'une petite association.</p>
              <ul className="list-disc list-inside mt-2">
                  <li><strong>Créer et Gérer :</strong> Allez dans <strong>"Paramètres" &gt; "Général"</strong>. Vous pouvez y ajouter, modifier (nom, icône, couleur) et supprimer des profils.</li>
                  <li><strong>Changer de profil :</strong> Cliquez sur le nom de votre profil en haut à droite (sur ordinateur) ou dans le menu du bas (sur mobile) pour basculer instantanément.</li>
                  <li><strong>Virements entre profils :</strong> Initiez un virement depuis la fenêtre de transaction. Une dépense est créée pour vous et une "opération en attente" apparaît pour le profil destinataire, qu'il devra accepter pour finaliser le transfert.</li>
              </ul>
          </>
      )
    },
    {
        title: "🧭 Explorez l'Application : Vue par Vue",
        content: (
            <>
                <p><strong>Tableau de Bord :</strong> Votre cockpit financier. Il vous donne des indicateurs clés, la prévision de votre trésorerie et un aperçu de vos comptes. Personnalisez-le dans <strong>"Paramètres" &gt; "Tableau de Bord"</strong> !</p>
                <p><strong>Transactions :</strong> Le cœur de l'application. <strong>Astuce :</strong> sur ordinateur, <strong>double-cliquez sur une ligne</strong> pour l'éditer directement dans le tableau, comme sur un tableur !</p>
                <p><strong>Planification :</strong> Une vue calendaire puissante sur 12 mois. Analysez vos postes de dépenses, comparez les mois et identifiez où économiser. <strong>Cliquez sur une cellule pour voir le détail des transactions !</strong></p>
                <p><strong>Patrimoine :</strong> La vue d'ensemble de ce que vous possédez et ce que vous devez. Elle regroupe :
                    <ul className="list-disc list-inside mt-2">
                        <li><strong>Les Comptes :</strong> Vos actifs liquides (comptes courants, livrets). Gérez vos réserves ici.</li>
                        <li><strong>Les Emprunts :</strong> Vos passifs (crédit immobilier, auto). L'application calcule le capital restant dû automatiquement.</li>
                        <li><strong>Autres Actifs :</strong> Estimez et suivez la valeur de vos biens non-liquides (résidence principale, voiture, etc.).</li>
                    </ul>
                </p>
            </>
        )
    },
    {
        title: "⚡️ Fonctionnalités Puissantes",
        content: (
            <>
                <p><strong>Import CSV intelligent :</strong> Gagnez un temps fou en important les fichiers de votre banque. L'application essaie de deviner le mappage des colonnes et vous permet de <strong>sauvegarder vos configurations comme modèles</strong> pour les prochains imports.</p>
                <p><strong>Mode Simulation :</strong> Et si vous achetiez cette voiture ? Activez le mode simulation depuis le menu "+", ajoutez des dépenses et revenus fictifs, et observez leur impact sur votre prévision de trésorerie sans affecter vos données réelles. Vous pourrez ensuite appliquer ou annuler ces changements.</p>
                <p><strong>Automatisation & Personnalisation :</strong> Dans "Paramètres", créez des <strong>règles de catégorisation</strong> (ex: mot-clé "Netflix" &rarr; catégorie "Abonnements"). Ajoutez des <strong>champs personnalisés</strong> à vos transactions (ex: un champ "Payé par" pour les comptes joints). Personnalisez les <strong>icônes</strong> de vos catégories et comptes.</p>
            </>
        )
    },
    {
        title: "💾 Données, Sauvegarde et Archivage",
        content: (
            <>
                <p><strong>Vos données sont 100% locales et privées.</strong> Elles sont stockées uniquement dans votre navigateur. Pensez à faire des sauvegardes régulières.</p>
                <p><strong>Sauvegarde & Synchro Google Drive :</strong> Connectez votre compte pour sauvegarder vos données et les synchroniser sur plusieurs appareils. Dans les paramètres, vous pouvez forcer l'envoi ou la récupération des données pour un contrôle total.</p>
                <p><strong>Archivage :</strong> Votre application ralentit après plusieurs années de données ? La fonction d'archivage (dans <strong>"Paramètres" &gt; "Données"</strong>) est faite pour vous. Elle sauvegarde les transactions de plus de X années sur votre Google Drive, les retire de l'application active pour booster les performances, et ajuste les soldes de vos comptes pour que tout reste juste. Vous pouvez <strong>consulter une archive à tout moment</strong> en mode lecture seule, sans réimporter les données.</p>
            </>
        )
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col modal-content">
        <header className="flex justify-between items-center p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 id="guide-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100">Guide de l'Utilisateur</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fermer le guide">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
            {sections.map(section => (
                <CollapsibleGuideSection
                    key={section.title}
                    title={section.title}
                    isOpen={openSections.has(section.title)}
                    onToggle={() => toggleSection(section.title)}
                >
                    {section.content}
                </CollapsibleGuideSection>
            ))}
        </div>
      </div>
    </div>
  );
};
