
interface Reward {
  memberId: string;
  token: string;
  amount: number;
  date: string;
}

interface GuildRewards {
  guildId: string;
  rewards: Reward[];
}

const rewardsStore: Record<string, GuildRewards> = {};

export async function assignReward(
  guildId: string,
  memberId: string,
  token: string,
  amount: number
): Promise<GuildRewards> {
  if (!rewardsStore[guildId]) {
    rewardsStore[guildId] = { guildId, rewards: [] };
  }

  rewardsStore[guildId].rewards.push({
    memberId,
    token,
    amount,
    date: new Date().toISOString(),
  });

  return rewardsStore[guildId];
}

export async function getGuildRewards(guildId: string): Promise<Reward[]> {
  return rewardsStore[guildId]?.rewards || [];
}


