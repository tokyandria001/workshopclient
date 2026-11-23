-- Défense en profondeur (Supabase) : active le Row Level Security sur toutes
-- les tables, sans aucune politique. Les rôles exposés par l'API de Supabase
-- (anon, authenticated) n'ont ainsi accès à aucune ligne, même si la Data API
-- était réactivée par erreur. Prisma se connecte avec le rôle propriétaire des
-- tables, qui n'est pas soumis au RLS : l'application n'est pas affectée.
-- Toute nouvelle table devra recevoir la même instruction dans sa migration.

ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReservationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatusChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Page" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NewsPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
-- Table d'historique de Prisma : absente de la base fantôme utilisée par
-- `migrate dev`, d'où le IF EXISTS.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
