import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { fromDbDate, toDbDate, type DateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

import { BLOCKING_STATUSES } from "./status";

// Lectures du back-office. Pas de contrôle d'accès ici : les pages appellent
// requireAdmin() avant.

export const LIST_LIMIT = 100;

export type ReservationFilters = {
  status?: ReservationStatus;
  /** Réservations qui chevauchent [from, to] (bornes facultatives). */
  from?: DateOnly;
  to?: DateOnly;
  /** Recherche : référence, nom, prénom, e-mail ou organisation du client. */
  query?: string;
};

export async function listReservations(filters: ReservationFilters) {
  const where: Prisma.ReservationWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.to ? { startDate: { lte: toDbDate(filters.to) } } : {}),
    ...(filters.from ? { endDate: { gte: toDbDate(filters.from) } } : {}),
  };
  const query = filters.query?.trim();
  if (query) {
    const contains = { contains: query, mode: "insensitive" as const };
    where.OR = [
      { reference: contains },
      { customer: { lastName: contains } },
      { customer: { firstName: contains } },
      { customer: { email: contains } },
      { customer: { organization: contains } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      take: LIST_LIMIT,
      select: {
        id: true,
        reference: true,
        status: true,
        startDate: true,
        endDate: true,
        totalCents: true,
        customer: {
          select: { firstName: true, lastName: true, organization: true },
        },
      },
    }),
    prisma.reservation.count({ where }),
  ]);
  return {
    total,
    rows: rows.map((r) => ({
      ...r,
      startDate: fromDbDate(r.startDate),
      endDate: fromDbDate(r.endDate),
    })),
  };
}

export async function getReservationDetail(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          resource: { select: { id: true, name: true, priceUnit: true } },
        },
      },
      history: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!reservation) return null;
  return {
    ...reservation,
    startDate: fromDbDate(reservation.startDate),
    endDate: fromDbDate(reservation.endDate),
  };
}

export type ReservationDetail = NonNullable<
  Awaited<ReturnType<typeof getReservationDetail>>
>;

const upcomingStatuses: ReservationStatus[] = [
  "EN_ATTENTE",
  "A_PAYER",
  "CONFIRMEE",
];

/** Indicateurs du tableau de bord (section 6.2). */
export async function getDashboard(today: DateOnly) {
  const todayDb = toDbDate(today);
  const [pending, upcoming, out, late, next] = await Promise.all([
    prisma.reservation.count({ where: { status: "EN_ATTENTE" } }),
    prisma.reservation.count({
      where: {
        status: { in: ["A_PAYER", "CONFIRMEE"] },
        startDate: { gte: todayDb },
      },
    }),
    prisma.reservation.count({ where: { status: "EN_COURS" } }),
    prisma.reservation.count({
      where: { status: "EN_COURS", endDate: { lt: todayDb } },
    }),
    prisma.reservation.findMany({
      where: {
        status: { in: upcomingStatuses },
        startDate: { gte: todayDb },
      },
      orderBy: { startDate: "asc" },
      take: 8,
      select: {
        id: true,
        reference: true,
        status: true,
        startDate: true,
        endDate: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);
  return {
    pending,
    upcoming,
    out,
    late,
    next: next.map((r) => ({
      ...r,
      startDate: fromDbDate(r.startDate),
      endDate: fromDbDate(r.endDate),
    })),
  };
}

/** Statuts affichés dans le planning (les fins anticipées sont masquées). */
export const PLANNING_STATUSES: ReservationStatus[] = [
  ...BLOCKING_STATUSES,
  "TERMINEE",
];

/** Réservations qui chevauchent la période affichée dans le planning. */
export async function getPlanning(from: DateOnly, to: DateOnly) {
  const rows = await prisma.reservation.findMany({
    where: {
      status: { in: PLANNING_STATUSES },
      startDate: { lte: toDbDate(to) },
      endDate: { gte: toDbDate(from) },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      reference: true,
      status: true,
      startDate: true,
      endDate: true,
      customer: { select: { lastName: true, organization: true } },
    },
  });
  return rows.map((r) => ({
    ...r,
    startDate: fromDbDate(r.startDate),
    endDate: fromDbDate(r.endDate),
  }));
}

/** Matériel actuellement sorti (réservations EN_COURS), retours en retard en premier. */
export async function getCheckedOut(today: DateOnly) {
  const rows = await prisma.reservation.findMany({
    where: { status: "EN_COURS" },
    orderBy: { endDate: "asc" },
    select: {
      id: true,
      reference: true,
      startDate: true,
      endDate: true,
      checkedOutAt: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          organization: true,
        },
      },
      items: {
        select: { quantity: true, resource: { select: { name: true } } },
      },
    },
  });
  return rows.map((r) => {
    const endDate = fromDbDate(r.endDate);
    return {
      ...r,
      startDate: fromDbDate(r.startDate),
      endDate,
      late: endDate < today,
    };
  });
}
