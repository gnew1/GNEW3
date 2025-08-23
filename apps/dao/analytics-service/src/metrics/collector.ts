
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function collectProposalMetrics() {
  const totalProposals = await prisma.proposal.count();
  const approvedProposals = await prisma.proposal.count({
    where: { status: "APPROVED" },
  });
  const rejectedProposals = await prisma.proposal.count({
    where: { status: "REJECTED" },
  });

  return {
    totalProposals,
    approvedProposals,
    rejectedProposals,
    approvalRate:
      totalProposals > 0 ? approvedProposals / totalProposals : 0,
  };
}

export async function collectVotingMetrics() {
  const totalVotes = await prisma.vote.count();
  const uniqueVoters = await prisma.vote
    .findMany({ select: { voterId: true }, distinct: ["voterId"] })
    .then((rows) => rows.length);

  return {
    totalVotes,
    uniqueVoters,
    avgVotesPerProposal:
      totalVotes > 0
        ? totalVotes /
          (await prisma.proposal.count())
        : 0,
  };
}

export async function collectSystemMetrics() {
  const users = await prisma.user.count();
  return { totalUsers: users };
}


