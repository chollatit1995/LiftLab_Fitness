import { MembershipRenewal, MembershipPackage, Promotion, Sale } from "../types";
import { toISODate, todayISO } from "../dates";
import {
  applyDiscount,
  bestOfferFor,
  findPromotionByCode,
  livePromotions,
} from "../promotions";
import { sessionsFromPackage } from "../sessions";
import { withDb } from "./client";

function addDays(dateStr: string, days: number): string {
  const d = new Date(toISODate(dateStr) + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export interface RenewMemberInput {
  memberId: string;
  packageId: string;
  promoCode?: string | null;
  autoPromo?: boolean;
  renewedBy?: string | null;
}

export interface RenewMemberResult {
  member: {
    id: string;
    packageId: string;
    expiresAt: string;
    status: string;
  };
  sale: Sale;
  renewal: MembershipRenewal;
}

export async function renewMemberInDb(
  input: RenewMemberInput
): Promise<RenewMemberResult | { error: string }> {
  return withDb(async (sql) => {
    const memberRows = await sql`
      SELECT id, name, email, phone, package_id, joined_at, expires_at, status
      FROM members WHERE id = ${input.memberId} LIMIT 1
    `;
    if (memberRows.length === 0) return { error: "ไม่พบสมาชิก" };

    const member = memberRows[0];
    const packageRows = await sql`
      SELECT id, name, description, price, duration_days, session_limit, features, status, popular
      FROM membership_packages WHERE id = ${input.packageId} AND status = 'active'
      LIMIT 1
    `;
    if (packageRows.length === 0) return { error: "ไม่พบแพ็กเกจ" };

    const pkgRow = packageRows[0];
    const pkg: MembershipPackage = {
      id: pkgRow.id as string,
      name: pkgRow.name as string,
      description: pkgRow.description as string,
      price: Number(pkgRow.price),
      durationDays: Number(pkgRow.duration_days),
      sessionLimit:
        pkgRow.session_limit != null ? Number(pkgRow.session_limit) : null,
      features: pkgRow.features as string[],
      status: pkgRow.status as MembershipPackage["status"],
      popular: Boolean(pkgRow.popular),
    };

    const promoRows = await sql`
      SELECT id, title, description, discount_type, discount_value,
             package_id, code, start_date, end_date, status, highlight
      FROM promotions WHERE status = 'active'
    `;
    const promotions: Promotion[] = promoRows.map((p) => ({
      id: p.id as string,
      title: p.title as string,
      description: p.description as string,
      discountType: p.discount_type as Promotion["discountType"],
      discountValue: Number(p.discount_value),
      packageId: (p.package_id as string | null) ?? null,
      code: (p.code as string | null) ?? null,
      startDate: toISODate(p.start_date),
      endDate: toISODate(p.end_date),
      status: p.status as Promotion["status"],
      highlight: Boolean(p.highlight),
    }));

    const originalPrice = pkg.price;
    let appliedPromo: Promotion | null = null;
    let finalPrice = originalPrice;

    if (input.promoCode?.trim()) {
      appliedPromo = findPromotionByCode(
        livePromotions(promotions),
        input.promoCode,
        pkg.id
      );
      if (!appliedPromo) {
        return { error: "โค้ดโปรไม่ถูกต้องหรือใช้กับแพ็กเกจนี้ไม่ได้" };
      }
      finalPrice = applyDiscount(
        originalPrice,
        appliedPromo.discountType,
        appliedPromo.discountValue
      );
    } else if (input.autoPromo !== false) {
      const offer = bestOfferFor(pkg, promotions);
      if (offer) {
        appliedPromo = offer.promo;
        finalPrice = offer.price;
      }
    }

    const previousExpiresAt = toISODate(member.expires_at);
    const base =
      previousExpiresAt > todayISO() ? previousExpiresAt : todayISO();
    const newExpiresAt = addDays(base, pkg.durationDays);
    const renewedAt = todayISO();
    const memberName = member.name as string;
    const { sessionsTotal, sessionsUsed } = sessionsFromPackage(pkg.sessionLimit);

    const renewalId = generateId("rn");
    const saleId = generateId("sl");

    let saleItem = `ต่ออายุ ${pkg.name} (${pkg.durationDays} วัน)`;
    if (appliedPromo) {
      saleItem += ` [${appliedPromo.title}]`;
    }

    await sql.begin(async (tx) => {
      await tx`
        UPDATE members
        SET package_id = ${pkg.id},
            expires_at = ${newExpiresAt},
            status = 'active',
            sessions_total = ${sessionsTotal},
            sessions_used = ${sessionsUsed}
        WHERE id = ${input.memberId}
      `;

      await tx`
        INSERT INTO sales (id, member_id, member_name, item, amount, date, type, original_amount, promotion_id)
        VALUES (
          ${saleId}, ${input.memberId}, ${memberName}, ${saleItem},
          ${finalPrice}, ${renewedAt}, 'membership',
          ${appliedPromo ? originalPrice : null},
          ${appliedPromo?.id ?? null}
        )
      `;

      await tx`
        INSERT INTO membership_renewals (
          id, member_id, member_name, package_id, package_name,
          previous_expires_at, new_expires_at, original_price, final_price,
          promotion_id, promotion_title, renewed_at, renewed_by
        )
        VALUES (
          ${renewalId}, ${input.memberId}, ${memberName}, ${pkg.id}, ${pkg.name},
          ${previousExpiresAt}, ${newExpiresAt}, ${originalPrice}, ${finalPrice},
          ${appliedPromo?.id ?? null}, ${appliedPromo?.title ?? null},
          ${renewedAt}, ${input.renewedBy ?? null}
        )
      `;
    });

    const sale: Sale = {
      id: saleId,
      memberId: input.memberId,
      memberName,
      item: saleItem,
      amount: finalPrice,
      date: renewedAt,
      type: "membership",
      originalAmount: appliedPromo ? originalPrice : undefined,
      promotionId: appliedPromo?.id ?? null,
    };

    const renewal: MembershipRenewal = {
      id: renewalId,
      memberId: input.memberId,
      memberName,
      packageId: pkg.id,
      packageName: pkg.name,
      previousExpiresAt,
      newExpiresAt,
      originalPrice,
      finalPrice,
      promotionId: appliedPromo?.id ?? null,
      promotionTitle: appliedPromo?.title ?? null,
      renewedAt,
      renewedBy: input.renewedBy ?? null,
    };

    return {
      member: {
        id: input.memberId,
        packageId: pkg.id,
        expiresAt: newExpiresAt,
        status: "active",
        sessionsTotal,
        sessionsUsed,
      },
      sale,
      renewal,
    };
  });
}

export async function listRenewalsForMember(
  memberId: string
): Promise<MembershipRenewal[]> {
  return withDb(async (sql) => {
    const rows = await sql`
      SELECT id, member_id, member_name, package_id, package_name,
             previous_expires_at, new_expires_at, original_price, final_price,
             promotion_id, promotion_title, renewed_at, renewed_by
      FROM membership_renewals
      WHERE member_id = ${memberId}
      ORDER BY renewed_at DESC
    `;
    return rows.map(mapRenewalRow);
  });
}

export function mapRenewalRow(r: Record<string, unknown>): MembershipRenewal {
  return {
    id: r.id as string,
    memberId: r.member_id as string,
    memberName: r.member_name as string,
    packageId: r.package_id as string,
    packageName: r.package_name as string,
    previousExpiresAt: toISODate(r.previous_expires_at),
    newExpiresAt: toISODate(r.new_expires_at),
    originalPrice: Number(r.original_price),
    finalPrice: Number(r.final_price),
    promotionId: (r.promotion_id as string | null) ?? null,
    promotionTitle: (r.promotion_title as string | null) ?? null,
    renewedAt: toISODate(r.renewed_at),
    renewedBy: (r.renewed_by as string | null) ?? null,
  };
}
