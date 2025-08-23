
type VoteOption = "yes" | "no" | "abstain";

interface Vote {
  userId: string;
  vote: VoteOption;
}

interface ProposalResults {
  proposalId: string;
  votes: Vote[];
}

const resultsStore: Record<string, ProposalResults> = {};

export async function submitVote(
  proposalId: string,
  userId: string,
  vote: VoteOption
): Promise<ProposalResults> {
  if (!resultsStore[proposalId]) {
    resultsStore[proposalId] = { proposalId, votes: [] };
  }

  // update or add vote
  const existingIndex = resultsStore[proposalId].votes.findIndex(
    (v) => v.userId === userId
  );

  if (existingIndex >= 0) {
    resultsStore[proposalId].votes[existingIndex].vote = vote;
  } else {
    resultsStore[proposalId].votes.push({ userId, vote });
  }

  return resultsStore[proposalId];
}

export async function getResults(
  proposalId: string
): Promise<{ yes: number; no: number; abstain: number }> {
  const results = resultsStore[proposalId];
  if (!results) {
    return { yes: 0, no: 0, abstain: 0 };
  }

  return results.votes.reduce(
    (acc, v) => {
      acc[v.vote]++;
      return acc;
    },
    { yes: 0, no: 0, abstain: 0 }
  );
}


