import { prisma } from "@/lib/db";
import { evaluateAchievements } from "@/lib/achievements";
import { broadcastChatMessageWithProfile } from "@/lib/chat-profiles";
import { creditUser } from "@/lib/ledger";
import { PLATFORM_FEE_TIP } from "@/lib/constants";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { contractsConfigured, isOnChainEnabled } from "@/lib/web3/contracts";
import { normalizeTxHash, verifyOnChainTip } from "@/lib/web3/verify-tip";
import { z } from "zod";

const schema = z.object({
  streamId: z.string(),
  amount: z.number().positive(),
  txHash: z.string().min(10),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isOnChainEnabled()) {
    return error("On-chain features are disabled", 503);
  }
  if (!contractsConfigured()) {
    return error("On-chain tipping not configured", 503);
  }

  try {
    const body = schema.parse(await request.json());
    const txHash = normalizeTxHash(body.txHash);
    if (!txHash) return error("Invalid transaction hash", 400);

    const existing = await prisma.tip.findFirst({ where: { txHash } });
    if (existing) return json({ ok: true, duplicate: true });

    const stream = await prisma.stream.findUnique({
      where: { id: body.streamId },
      include: { dj: true, collab: true },
    });
    if (!stream || stream.status !== "live") return error("Stream not live", 404);
    if (!stream.dj.walletAddress?.startsWith("0x")) {
      return error("DJ has no wallet linked", 400);
    }

    const verified = await verifyOnChainTip({
      txHash,
      expectedDj: stream.dj.walletAddress as `0x${string}`,
      expectedAmount: body.amount,
      streamId: stream.id,
    });
    if (!verified.ok) {
      return error(verified.reason, 400);
    }

    const platformFee = body.amount * PLATFORM_FEE_TIP;
    const djAmount = body.amount - platformFee;

    await prisma.tip.create({
      data: {
        fromUserId: auth.id,
        toUserId: stream.djId,
        streamId: stream.id,
        amount: body.amount,
        platformFee,
        message: body.message,
        txHash,
      },
    });

    await prisma.stream.update({
      where: { id: stream.id },
      data: { totalTips: { increment: body.amount } },
    });

    if (stream.collab?.status === "active") {
      const partnerShare = djAmount * stream.collab.splitRatio;
      const hostShare = djAmount - partnerShare;
      await creditUser(stream.djId, hostShare, "tip_received_onchain", txHash);
      await creditUser(stream.collab.partnerDjId, partnerShare, "tip_received_onchain", txHash);
    } else {
      await creditUser(stream.djId, djAmount, "tip_received_onchain", txHash);
    }

    const chatMsg = await prisma.chatMessage.create({
      data: {
        streamId: stream.id,
        userId: auth.id,
        username: auth.username,
        message: body.message ?? `tipped ${body.amount} DROP on-chain`,
        isTip: true,
        tipAmount: body.amount,
      },
    });
    await broadcastChatMessageWithProfile(stream.id, chatMsg);

    await evaluateAchievements(auth.id);
    await evaluateAchievements(stream.djId);

    return json({ ok: true, txHash, verified: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("on-chain tip sync:", e);
    return error("Sync failed", 500);
  }
}
