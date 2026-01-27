"use server";

import { db } from "@/lib/db";
import type { Service } from "@prisma/client";

export async function getServices(): Promise<Service[]> {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return services;
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const service = await db.service.findUnique({
    where: { slug },
  });

  return service;
}

export async function getServiceById(id: string): Promise<Service | null> {
  const service = await db.service.findUnique({
    where: { id },
  });

  return service;
}
