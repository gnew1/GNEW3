import { BigNumberish, ethers } from "ethers";

export const bnToString = (value: BigNumberish): string => ethers.toBigInt(value).toString();

export const ethToWei = (value: BigNumberish): string => ethers.parseEther(bnToString(value)).toString();
