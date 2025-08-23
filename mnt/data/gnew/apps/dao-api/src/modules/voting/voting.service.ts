
/**
 * GNEW Project - Voting Service
 * Prompt N321
 * Implements secure vote casting, validation and tallying
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VoteResultDto } from './dto/vote-result.dto';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VotingService {
  private readonly logger = new Logger(VotingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cast a vote securely
   */
  async castVote(dto: CreateVoteDto, userId: string): Promise<{ receiptId: string }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
    });

    if (!proposal) {
      throw new BadRequestException('Proposal not found');
    }

    if (proposal.deadline < new Date()) {
      throw new BadRequestException('Voting closed');
    }

    const alreadyVoted = await this.prisma.vote.findFirst({
      where: { proposalId: dto.proposalId, voterId: userId },
    });

    if (alreadyVoted) {
      throw new BadRequestException('User already voted');
    }

    const receiptId = randomUUID();
    const hashedChoice = await bcrypt.hash(dto.choice, 12);

    await this.prisma.vote.create({
      data: {
        proposalId: dto.proposalId,
        voterId: userId,
        choice: hashedChoice,
        receiptId,
      },
    });

    this.logger.log(`Vote cast on proposal ${dto.proposalId} by ${userId}`);
    return { receiptId };
  }

  /**
   * Tally votes securely by validating hash matches
   */
  async tallyVotes(proposalId: string): Promise<VoteResultDto> {
    const votes = await this.prisma.vote.findMany({
      where: { proposalId },
    });

    if (!votes.length) {
      throw new BadRequestException('No votes found for proposal');
    }

    const counts: Record<string, number> = {};

    for (const vote of votes) {
      // In practice, hashed choices would be matched against whitelist options
      const matchedOption = await this.matchChoice(vote.choice);
      if (!matchedOption) continue;

      counts[matchedOption] = (counts[matchedOption] || 0) + 1;
    }

    return {
      proposalId,
      totalVotes: votes.length,
      results: counts,
    };
  }

  private async matchChoice(hashedChoice: string): Promise<string | null> {
    const options = ['yes', 'no', 'abstain'];
    for (const option of options) {
      const match = await bcrypt.compare(option, hashedChoice);
      if (match) return option;
    }
    return null;
  }
}